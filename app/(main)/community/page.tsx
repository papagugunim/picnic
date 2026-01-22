'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Page')
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { getRandomLoadingMessage } from '@/lib/loading-messages'
import { getBreadEmoji } from '@/lib/bread'
import { getCache, setCache } from '@/lib/cache'
import { UserAvatar } from '@/components/ui/user-avatar'

interface CommunityPost {
  id: string
  title: string
  content: string
  images: string[] | null
  category: string
  created_at: string
  user_id: string
  view_count: number
  profiles: {
    full_name: string | null
    avatar_url: string | null
    matryoshka_level: number
    city: string | null
    user_role: string | null
  }
  likes_count: number
  comments_count: number
  is_liked: boolean
}

const categories = [
  { id: 'all', name: '전체', emoji: '🏘️' },
  { id: 'question', name: '질문', emoji: '❓' },
  { id: 'info', name: '정보', emoji: '💡' },
  { id: 'event', name: '이벤트', emoji: '🎉' },
  { id: 'chat', name: '잡담', emoji: '💬' },
  { id: 'lost_found', name: '분실물', emoji: '🔍' },
]

export default function CommunityPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchPosts()
  }, [selectedCategory])

  async function fetchPosts() {
    try {
      setIsLoading(true)
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUserId(user.id)

      // 캐시 확인 (5분 TTL)
      const cacheKey = `cache_community_posts_${selectedCategory}_${user.id}`
      const cached = getCache<CommunityPost[]>(cacheKey, 5 * 60 * 1000)
      if (cached && cached.length > 0) {
        logger.log('커뮤니티 게시글 캐시 히트')
        setPosts(cached)
        setIsLoading(false)
        return
      }

      // Get current user's city
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('city')
        .eq('id', user.id)
        .single()

      const userCity = currentUserProfile?.city

      // Build query
      let query = supabase
        .from('community_posts')
        .select(`
          id,
          title,
          content,
          images,
          category,
          created_at,
          user_id,
          view_count,
          profiles!community_posts_user_id_fkey (
            full_name,
            avatar_url,
            matryoshka_level,
            city,
            user_role
          )
        `)
        .order('created_at', { ascending: false })

      // Filter by category if not 'all'
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }

      const { data: postsData, error: postsError } = await query

      if (postsError) {
        logger.error('Posts fetch error:', postsError)
        return
      }

      // Filter posts by city (작성자의 도시가 현재 사용자의 도시와 일치하는 게시글만)
      const filteredByCity = userCity
        ? (postsData || []).filter((post) => {
            const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
            return author?.city === userCity
          })
        : postsData

      // 최적화: 배치 쿼리로 N+1 문제 해결
      const postIds = (filteredByCity || []).map(p => p.id)

      // 병렬로 모든 데이터 가져오기 (2개 쿼리)
      const [likesResult, commentsResult] = await Promise.all([
        // 1. 모든 좋아요 데이터 (count + 사용자 좋아요 포함)
        supabase
          .from('community_likes')
          .select('post_id, user_id')
          .in('post_id', postIds),

        // 2. 모든 댓글 count
        supabase
          .from('community_comments')
          .select('post_id')
          .in('post_id', postIds)
      ])

      const likesData = likesResult.data || []
      const commentsData = commentsResult.data || []

      // Map으로 빠른 계산
      const likesCountMap = new Map<string, number>()
      const userLikesSet = new Set<string>()

      likesData.forEach(like => {
        likesCountMap.set(like.post_id, (likesCountMap.get(like.post_id) || 0) + 1)
        if (like.user_id === user.id) {
          userLikesSet.add(like.post_id)
        }
      })

      const commentsCountMap = new Map<string, number>()
      commentsData.forEach(comment => {
        commentsCountMap.set(comment.post_id, (commentsCountMap.get(comment.post_id) || 0) + 1)
      })

      // 데이터 매핑 (O(n) 복잡도)
      const postsWithCounts = (filteredByCity || []).map(post => {
        const postAuthor = Array.isArray(post.profiles)
          ? post.profiles[0]
          : post.profiles

        return {
          ...post,
          profiles: postAuthor,
          likes_count: likesCountMap.get(post.id) || 0,
          comments_count: commentsCountMap.get(post.id) || 0,
          is_liked: userLikesSet.has(post.id),
        }
      })

      // 캐시에 저장 (5분 TTL)
      setCache(cacheKey, postsWithCounts as CommunityPost[], 5 * 60 * 1000)

      setPosts(postsWithCounts as CommunityPost[])
    } catch (err) {
      logger.error('Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function toggleLike(postId: string, currentlyLiked: boolean) {
    if (!currentUserId) return

    const supabase = createClient()

    if (currentlyLiked) {
      // Unlike
      await supabase
        .from('community_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId)
    } else {
      // Like
      await supabase
        .from('community_likes')
        .insert({
          post_id: postId,
          user_id: currentUserId,
        })
    }

    // Refresh posts
    fetchPosts()
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

  const getCategoryEmoji = (category: string) => {
    const cat = categories.find((c) => c.id === category)
    return cat?.emoji || '📌'
  }

  const getCategoryName = (category: string) => {
    const cat = categories.find((c) => c.id === category)
    return cat?.name || category
  }

  const filteredPosts = posts.filter((post) =>
    searchQuery
      ? post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  )

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="px-4 py-4">
            <h1 className="text-2xl font-bold mb-4">동네생활</h1>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="게시글 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-muted'
                  }`}
                >
                  <span className="mr-1">{category.emoji}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Posts List */}
        <div className="px-4 py-4">
          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground">
              {getRandomLoadingMessage()}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? '검색 결과가 없습니다'
                  : '아직 게시글이 없습니다'}
              </p>
              <Button onClick={() => router.push('/community/new')}>
                <Plus className="w-4 h-4 mr-2" />
                첫 게시글 작성하기
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/community/${post.id}`}
                  className="flex gap-3 py-3 hover:bg-muted/30 transition-colors"
                >
                  {/* 이미지 (있는 경우만) */}
                  {post.images && post.images.length > 0 && (
                    <div className="flex-shrink-0 w-20 h-20 bg-muted rounded-lg overflow-hidden relative">
                      <img
                        src={post.images[0]}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                      {post.images.length > 1 && (
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                          +{post.images.length - 1}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 내용 */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      {/* 카테고리 + 제목 */}
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs text-muted-foreground">
                          {getCategoryEmoji(post.category)} {getCategoryName(post.category)}
                        </span>
                      </div>
                      <h3 className="text-base font-medium line-clamp-1 mb-0.5">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-1">
                        {post.content}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        <span>{post.profiles.full_name || '익명'}</span>
                        <span> · </span>
                        <span>{formatTimeAgo(post.created_at)}</span>
                      </div>
                    </div>

                    {/* 좋아요/댓글/조회수 - 오른쪽 정렬 */}
                    <div className="flex gap-3 items-center justify-end text-xs text-muted-foreground mt-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleLike(post.id, post.is_liked)
                        }}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            post.is_liked
                              ? 'fill-red-500 text-red-500'
                              : ''
                          }`}
                        />
                        <span className={post.is_liked ? 'text-red-500' : ''}>
                          {post.likes_count || 0}
                        </span>
                      </button>

                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        {post.comments_count || 0}
                      </span>

                      <span>조회 {post.view_count || 0}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Floating Action Button */}
        <button
          onClick={() => router.push('/community/new')}
          className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center z-30"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
