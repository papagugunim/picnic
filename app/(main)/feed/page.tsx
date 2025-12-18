'use client'

import { useState, useEffect } from 'react'
import { Plus, Heart, Bookmark } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { MOSCOW_METRO_STATIONS, SPB_METRO_STATIONS } from '@/lib/constants'

interface Post {
  id: string
  title: string
  price: number | null
  city: string
  neighborhood: string
  preferred_metro_stations: string[]
  created_at: string
  images: string[]
  status: string
  profiles: {
    full_name: string | null
  }
  likes_count: number
  interests_count: number
  user_liked: boolean
  user_interested: boolean
}

const categories = [
  { id: 'all', label: '전체' },
  { id: 'nearby', label: '가까운 동네' },
  { id: 'recent', label: '방금 전' },
]

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userCity, setUserCity] = useState<string | null>(null)

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    try {
      setIsLoading(true)
      const supabase = createClient()

      // UserContext에서 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsLoading(false)
        return
      }

      // 프로필 정보 가져오기
      const { data: profile } = await supabase
        .from('profiles')
        .select('city')
        .eq('id', user.id)
        .single()

      const cityFilter = profile?.city
      if (cityFilter) {
        setUserCity(cityFilter)
      }

      // 최적화: 단일 쿼리로 게시글과 좋아요/관심 정보를 함께 가져오기
      let query = supabase
        .from('posts')
        .select(`
          id,
          title,
          price,
          city,
          neighborhood,
          preferred_metro_stations,
          created_at,
          images,
          status,
          profiles:author_id (
            full_name
          )
        `)
        .eq('status', 'active')

      if (cityFilter) {
        query = query.eq('city', cityFilter)
      }

      const { data: postsData, error } = await query
        .order('created_at', { ascending: false })
        .limit(20)

      if (error || !postsData) {
        console.error('Posts fetch error:', error)
        setIsLoading(false)
        return
      }

      const postIds = postsData.map((p: any) => p.id)

      // 병렬로 모든 반응 데이터 가져오기 (2개 쿼리로 통합)
      const [likesResult, interestsResult] = await Promise.all([
        // 좋아요 데이터 (모든 게시글 + 사용자 좋아요 포함)
        supabase
          .from('post_likes')
          .select('post_id, user_id')
          .in('post_id', postIds),
        // 관심 데이터 (모든 게시글 + 사용자 관심 포함)
        supabase
          .from('post_interests')
          .select('post_id, user_id')
          .in('post_id', postIds)
      ])

      const likesData = likesResult.data || []
      const interestsData = interestsResult.data || []

      // Map으로 count 계산 최적화
      const likesCountMap = new Map<string, number>()
      const interestsCountMap = new Map<string, number>()
      const userLikesSet = new Set<string>()
      const userInterestsSet = new Set<string>()

      likesData.forEach(like => {
        likesCountMap.set(like.post_id, (likesCountMap.get(like.post_id) || 0) + 1)
        if (like.user_id === user.id) {
          userLikesSet.add(like.post_id)
        }
      })

      interestsData.forEach(interest => {
        interestsCountMap.set(interest.post_id, (interestsCountMap.get(interest.post_id) || 0) + 1)
        if (interest.user_id === user.id) {
          userInterestsSet.add(interest.post_id)
        }
      })

      // 데이터 매핑 (O(n) 복잡도)
      const postsWithReactions = postsData.map((post: any) => ({
        ...post,
        likes_count: likesCountMap.get(post.id) || 0,
        interests_count: interestsCountMap.get(post.id) || 0,
        user_liked: userLikesSet.has(post.id),
        user_interested: userInterestsSet.has(post.id),
      }))

      setPosts(postsWithReactions as Post[])
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return '방금 전'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`
    return date.toLocaleDateString('ko-KR')
  }

  const getCityNameInKorean = (city: string) => {
    const cityMap: { [key: string]: string } = {
      'moscow': '모스크바',
      'saint_petersburg': '상트페테르부르크',
      'vladivostok': '블라디보스토크',
      'khabarovsk': '하바롭스크',
      'irkutsk': '이르쿠츠크',
    }
    return cityMap[city.toLowerCase()] || city
  }

  const getMetroStationInfo = (value: string, city: string) => {
    const stations = city.toLowerCase() === 'moscow' ? MOSCOW_METRO_STATIONS : SPB_METRO_STATIONS
    const station = stations.find((s) => s.value === value)

    if (!station) return null

    // label 형식: "한글 / 러시아어 / 영어"에서 한글 부분만 추출
    const koreanName = station.label.split(' / ')[0]

    return {
      koreanName,
      lineColor: station.lineColor,
      line: station.line,
    }
  }

  async function toggleLike(postId: string, currentlyLiked: boolean) {
    try {
      // 낙관적 업데이트: UI 먼저 업데이트
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                user_liked: !currentlyLiked,
                likes_count: currentlyLiked ? post.likes_count - 1 : post.likes_count + 1
              }
            : post
        )
      )

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      if (currentlyLiked) {
        // 좋아요 취소
        await supabase
          .from('post_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId)
      } else {
        // 좋아요 추가
        await supabase
          .from('post_likes')
          .insert({ user_id: user.id, post_id: postId })
      }
    } catch (err) {
      console.error('Toggle like error:', err)
      // 실패 시 원래 상태로 복구
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                user_liked: currentlyLiked,
                likes_count: currentlyLiked ? post.likes_count + 1 : post.likes_count - 1
              }
            : post
        )
      )
    }
  }

  async function toggleInterest(postId: string, currentlyInterested: boolean) {
    try {
      // 낙관적 업데이트: UI 먼저 업데이트
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                user_interested: !currentlyInterested,
                interests_count: currentlyInterested ? post.interests_count - 1 : post.interests_count + 1
              }
            : post
        )
      )

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      if (currentlyInterested) {
        // 관심 취소
        await supabase
          .from('post_interests')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId)
      } else {
        // 관심 추가
        await supabase
          .from('post_interests')
          .insert({ user_id: user.id, post_id: postId })
      }
    } catch (err) {
      console.error('Toggle interest error:', err)
      // 실패 시 원래 상태로 복구
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                user_interested: currentlyInterested,
                interests_count: currentlyInterested ? post.interests_count + 1 : post.interests_count - 1
              }
            : post
        )
      )
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        {/* Skeleton 로딩 */}
        <div className="divide-y divide-border">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex gap-4 p-4 animate-pulse">
              {/* 이미지 Skeleton */}
              <div className="flex-shrink-0 w-28 h-28 bg-muted rounded-xl" />

              {/* 내용 Skeleton */}
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-6 bg-muted rounded w-1/4" />
                <div className="flex gap-2">
                  <div className="h-6 bg-muted rounded w-16" />
                  <div className="h-6 bg-muted rounded w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* 카테고리 필터 */}
      <div className="sticky top-14 z-30 bg-background border-b border-border">
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`
                px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${
                  category.id === 'all'
                    ? 'bg-foreground text-background'
                    : 'bg-secondary text-secondary-foreground hover:bg-muted'
                }
              `}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* 게시물 목록 */}
      {posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">아직 게시글이 없습니다</p>
          <Link href="/post/new">
            <Button>첫 게시글 작성하기</Button>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {posts.map((post) => (
            <div key={post.id} className="hover:bg-muted/30 transition-colors">
              <Link
                href={`/post/${post.id}`}
                className="flex gap-4 p-4"
              >
                {/* 이미지 */}
                <div className="flex-shrink-0 w-28 h-28 bg-muted rounded-xl overflow-hidden relative">
                  {post.images && post.images.length > 0 ? (
                    <Image
                      src={post.images[0]}
                      alt={post.title}
                      fill
                      sizes="112px"
                      className="object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      이미지 없음
                    </div>
                  )}
                </div>

                {/* 내용 */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="text-base font-normal line-clamp-2 mb-1">
                      {post.title}
                    </h3>
                    <div className="text-sm text-muted-foreground mb-1">
                      <span>{getCityNameInKorean(post.city)}</span>
                      <span> · </span>
                      <span>{formatTimeAgo(post.created_at)}</span>
                    </div>
                    <p className="text-lg font-bold">
                      {post.price === 0 || post.price === null
                        ? '무료나눔'
                        : `${post.price.toLocaleString()}₽`}
                    </p>
                  </div>
                </div>
              </Link>

              {/* 좋아요/관심 버튼 */}
              <div className="px-4 pb-3 flex gap-4 items-center text-sm">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleLike(post.id, post.user_liked)
                  }}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Heart
                    className={`w-5 h-5 ${post.user_liked ? 'fill-red-500 text-red-500' : ''}`}
                  />
                  {post.likes_count > 0 && (
                    <span className={post.user_liked ? 'text-red-500' : ''}>
                      {post.likes_count}
                    </span>
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleInterest(post.id, post.user_interested)
                  }}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Bookmark
                    className={`w-5 h-5 ${post.user_interested ? 'fill-primary text-primary' : ''}`}
                  />
                  {post.interests_count > 0 && (
                    <span className={post.user_interested ? 'text-primary' : ''}>
                      {post.interests_count}
                    </span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB 버튼 */}
      <Button
        asChild
        className="fab flex items-center justify-center"
      >
        <Link href="/post/new">
          <Plus className="w-6 h-6" />
          <span className="sr-only">글쓰기</span>
        </Link>
      </Button>
    </div>
  )
}
