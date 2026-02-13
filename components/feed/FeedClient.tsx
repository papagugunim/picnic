'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('FeedClient')
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Plus, Heart, Bookmark, BarChart2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll'
import { getNearbyMetroStations, hasNearbyStation } from '@/lib/metro-utils'
import { getPostStatusInfo, type PostStatus } from '@/lib/post-status'
import { useUser } from '@/lib/contexts/UserContext'
import { formatTimeAgo } from '@/lib/utils/date'
import { getCityNameInKorean } from '@/lib/constants'
import { getRandomLoadingMessage } from '@/lib/loading-messages'

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
  view_count: number
  profiles: {
    full_name: string | null
  }
  likes_count: number
  interests_count: number
  user_liked: boolean
  user_interested: boolean
}

const categories = [
  { id: 'all', label: '최신순' },
  { id: 'nearby', label: '가까운 동네' },
  { id: 'free', label: '무료나눔' },
]

const PAGE_SIZE = 20

interface FeedClientProps {
  initialPosts: Post[]
  initialCursor: string | null
  initialCity: string | null
}

export default function FeedClient({ initialPosts, initialCursor, initialCity }: FeedClientProps) {
  const [selectedTab, setSelectedTab] = useState<'all' | 'nearby' | 'free'>('all')
  const { user, profile, loading: userLoading } = useUser()

  const userCity = profile?.city || null
  const userStations = profile?.preferred_metro_stations || []
  const isInitialized = !userLoading

  const fetchPosts = useCallback(async (cursor: string | null) => {
    if (!user) {
      return { data: [], nextCursor: null, hasMore: false }
    }

    const supabase = createClient()

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
        view_count,
        profiles:author_id (
          full_name
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (userCity) {
      query = query.eq('city', userCity)
    }

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: postsData, error } = await query

    if (error || !postsData) {
      logger.error('Posts fetch error:', error)
      return { data: [], nextCursor: null, hasMore: false }
    }

    const postIds = postsData.map((p: any) => p.id)

    if (postIds.length === 0) {
      return { data: [], nextCursor: null, hasMore: false }
    }

    const [likesResult, interestsResult] = await Promise.all([
      supabase
        .from('post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds),
      supabase
        .from('post_interests')
        .select('post_id, user_id')
        .in('post_id', postIds)
    ])

    const likesData = likesResult.data || []
    const interestsData = interestsResult.data || []

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

    const postsWithReactions = postsData.map((post: any) => ({
      ...post,
      likes_count: likesCountMap.get(post.id) || 0,
      interests_count: interestsCountMap.get(post.id) || 0,
      user_liked: userLikesSet.has(post.id),
      user_interested: userInterestsSet.has(post.id),
    })) as Post[]

    const nextCursor = postsData.length === PAGE_SIZE
      ? postsData[postsData.length - 1].created_at
      : null

    return {
      data: postsWithReactions,
      nextCursor,
      hasMore: postsData.length === PAGE_SIZE,
    }
  }, [userCity, user])

  const {
    data: allPosts,
    isLoading,
    isFetchingMore,
    isRefreshing,
    hasMore,
    sentinelRef,
    refresh,
    updateItem,
    reset,
  } = useInfiniteScroll<Post>({
    fetchFn: fetchPosts,
    pageSize: PAGE_SIZE,
    threshold: 300,
    enabled: isInitialized,
    initialData: initialPosts,
    initialCursor,
  })

  // Reset only when city changes (not tab - tabs filter client-side)
  const previousCityRef = useRef<string | null>(initialCity)

  useEffect(() => {
    if (!isInitialized) return
    if (previousCityRef.current === userCity) return

    previousCityRef.current = userCity
    reset()
  }, [isInitialized, userCity, reset])

  // Nearby 필터용 역 목록 (async lazy load)
  const [nearbyStationsList, setNearbyStationsList] = useState<string[]>([])

  useEffect(() => {
    if (userStations.length > 0 && userCity) {
      getNearbyMetroStations(userStations, userCity, 5).then(setNearbyStationsList)
    }
  }, [userStations, userCity])

  // Filter posts based on selected tab - memoized to prevent recalculation
  const posts = useMemo(() => {
    if (allPosts.length === 0) return []

    switch (selectedTab) {
      case 'nearby':
        if (nearbyStationsList.length > 0) {
          return allPosts.filter(post =>
            hasNearbyStation(post.preferred_metro_stations, nearbyStationsList)
          )
        }
        return allPosts

      case 'free':
        return allPosts.filter(post => post.price === 0 || post.price === null)

      case 'all':
      default:
        return allPosts
    }
  }, [allPosts, selectedTab, nearbyStationsList])

  async function toggleLike(postId: string, currentlyLiked: boolean) {
    if (!user) return

    // Optimistic update
    updateItem(postId, (post) => ({
      ...post,
      user_liked: !currentlyLiked,
      likes_count: currentlyLiked ? post.likes_count - 1 : post.likes_count + 1
    }))

    try {
      const supabase = createClient()

      if (currentlyLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId)
      } else {
        await supabase
          .from('post_likes')
          .insert({ user_id: user.id, post_id: postId })
      }
    } catch (err) {
      logger.error('Toggle like error:', err)
      // Revert on error
      updateItem(postId, (post) => ({
        ...post,
        user_liked: currentlyLiked,
        likes_count: currentlyLiked ? post.likes_count + 1 : post.likes_count - 1
      }))
    }
  }

  async function toggleInterest(postId: string, currentlyInterested: boolean) {
    if (!user) return

    // Optimistic update
    updateItem(postId, (post) => ({
      ...post,
      user_interested: !currentlyInterested,
      interests_count: currentlyInterested ? post.interests_count - 1 : post.interests_count + 1
    }))

    try {
      const supabase = createClient()

      if (currentlyInterested) {
        await supabase
          .from('post_interests')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId)
      } else {
        await supabase
          .from('post_interests')
          .insert({ user_id: user.id, post_id: postId })
      }
    } catch (err) {
      logger.error('Toggle interest error:', err)
      // Revert on error
      updateItem(postId, (post) => ({
        ...post,
        user_interested: currentlyInterested,
        interests_count: currentlyInterested ? post.interests_count + 1 : post.interests_count - 1
      }))
    }
  }

  if (isLoading && initialPosts.length === 0) {
    return (
      <div>
        {/* Skeleton loading */}
        <div className="divide-y divide-border">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex gap-4 p-4 animate-pulse">
              <div className="flex-shrink-0 w-28 h-28 bg-muted rounded-xl" />
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
    <div>
        {/* Category filter */}
        <div className="bg-background">
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedTab(category.id as 'all' | 'nearby' | 'free')}
                className={`
                  px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                  ${
                    category.id === selectedTab
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

        {/* Refreshing indicator */}
        {isRefreshing && (
          <div className="flex items-center justify-center py-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            <span className="text-sm">새로고침 중...</span>
          </div>
        )}

        {/* Posts list */}
        {posts.length === 0 ? (
          isLoading || !isInitialized ? (
            <div className="text-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">{getRandomLoadingMessage()}</p>
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">아직 게시글이 없습니다</p>
              <Link href="/post/new">
                <Button>첫 게시글 작성하기</Button>
              </Link>
            </div>
          )
        ) : (
          <div>
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="flex gap-3 p-3 hover:bg-muted/30 transition-colors"
              >
                {/* Image */}
                <div className="flex-shrink-0 w-24 h-24 bg-muted rounded-lg overflow-hidden relative">
                  {post.images && post.images.length > 0 ? (
                    <Image
                      src={post.images[0]}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 96px, 96px"
                      className="object-cover"
                      loading="lazy"
                      quality={75}
                      placeholder="blur"
                      blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      이미지 없음
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="text-base font-normal line-clamp-2 mb-0.5">
                      {post.title}
                    </h3>
                    <div className="text-xs text-muted-foreground mb-0.5">
                      <span>{getCityNameInKorean(post.city)}</span>
                      <span> · </span>
                      <span>{formatTimeAgo(post.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-bold">
                        {post.price === 0 || post.price === null
                          ? '무료나눔'
                          : `${post.price.toLocaleString()}₽`}
                      </p>
                      {post.status && post.status !== 'active' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getPostStatusInfo(post.status as PostStatus).bgColor} ${getPostStatusInfo(post.status as PostStatus).textColor} font-medium`}>
                          {getPostStatusInfo(post.status as PostStatus).label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 items-center justify-end text-xs text-muted-foreground">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleLike(post.id, post.user_liked)
                      }}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                      aria-label="좋아요"
                    >
                      <Heart
                        className={`w-4 h-4 ${post.user_liked ? 'fill-red-500 text-red-500' : ''}`}
                      />
                      <span className={post.user_liked ? 'text-red-500' : ''}>
                        {post.likes_count || 0}
                      </span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleInterest(post.id, post.user_interested)
                      }}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                      aria-label="관심 등록"
                    >
                      <Bookmark
                        className={`w-4 h-4 ${post.user_interested ? 'fill-primary text-primary' : ''}`}
                      />
                      <span className={post.user_interested ? 'text-primary' : ''}>
                        {post.interests_count || 0}
                      </span>
                    </button>

                    {profile?.user_role === 'developer' && (
                      <div className="flex items-center gap-1">
                        <BarChart2 className="w-4 h-4" />
                        <span>{post.view_count || 0}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="h-1" />

            {/* Loading more indicator */}
            {isFetchingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* End of list indicator */}
            {!hasMore && posts.length > 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                모든 게시글을 불러왔습니다
              </div>
            )}
          </div>
        )}

        {/* FAB button */}
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
