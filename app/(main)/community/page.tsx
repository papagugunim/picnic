'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Page')
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, Plus, Search, BarChart2, X, ChevronLeft, ChevronRight } from 'lucide-react'
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
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set())

  // 이미지 갤러리 상태
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const toggleExpand = useCallback((postId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setExpandedPosts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })
  }, [])

  const openGallery = useCallback((images: string[], index: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setGalleryImages(images)
    setGalleryIndex(index)
    setIsGalleryOpen(true)
    document.body.style.overflow = 'hidden'
  }, [])

  const closeGallery = useCallback(() => {
    setIsGalleryOpen(false)
    document.body.style.overflow = ''
  }, [])

  const goToPrevImage = useCallback(() => {
    setGalleryIndex(prev => (prev === 0 ? galleryImages.length - 1 : prev - 1))
  }, [galleryImages.length])

  const goToNextImage = useCallback(() => {
    setGalleryIndex(prev => (prev === galleryImages.length - 1 ? 0 : prev + 1))
  }, [galleryImages.length])

  // 스와이프 핸들러
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      goToNextImage()
    }
    if (isRightSwipe) {
      goToPrevImage()
    }
  }

  // 키보드 이벤트
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isGalleryOpen) return
      if (e.key === 'Escape') closeGallery()
      if (e.key === 'ArrowLeft') goToPrevImage()
      if (e.key === 'ArrowRight') goToNextImage()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isGalleryOpen, closeGallery, goToPrevImage, goToNextImage])

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
        <div className="py-2">
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
              {filteredPosts.map((post) => {
                const isExpanded = expandedPosts.has(post.id)
                const contentLength = post.content.length
                const shouldTruncate = contentLength > 150

                return (
                  <article
                    key={post.id}
                    className="flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/community/${post.id}`)}
                  >
                    {/* 프로필 사진 */}
                    <Link
                      href={`/profile/${post.user_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0"
                    >
                      <UserAvatar
                        src={post.profiles.avatar_url}
                        alt={post.profiles.full_name || '사용자'}
                        matryoshkaLevel={post.profiles.matryoshka_level}
                        size="md"
                      />
                    </Link>

                    {/* 콘텐츠 영역 */}
                    <div className="flex-1 min-w-0">
                      {/* 상단: 이름 + 카테고리 + 시간 */}
                      <div className="flex items-center gap-1 text-sm mb-1">
                        <Link
                          href={`/profile/${post.user_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold hover:underline truncate"
                        >
                          {post.profiles.full_name || '익명'}
                        </Link>
                        <span className="text-base flex-shrink-0">
                          {getBreadEmoji(post.profiles.matryoshka_level, post.profiles.user_role || undefined)}
                        </span>
                        <span className="text-muted-foreground flex-shrink-0">·</span>
                        <span className="text-xs px-1.5 py-0.5 bg-secondary rounded-full text-muted-foreground flex-shrink-0">
                          {getCategoryEmoji(post.category)} {getCategoryName(post.category)}
                        </span>
                        <span className="text-muted-foreground flex-shrink-0">·</span>
                        <span className="text-muted-foreground flex-shrink-0">
                          {formatTimeAgo(post.created_at)}
                        </span>
                      </div>

                      {/* 제목 */}
                      <h3 className="font-semibold text-[15px] mb-1">
                        {post.title}
                      </h3>

                      {/* 본문 */}
                      <div className="text-[15px] leading-relaxed mb-2">
                        {shouldTruncate && !isExpanded ? (
                          <>
                            <span className="whitespace-pre-wrap">{post.content.slice(0, 150)}...</span>
                            <button
                              onClick={(e) => toggleExpand(post.id, e)}
                              className="text-primary hover:underline ml-1"
                            >
                              더 보기
                            </button>
                          </>
                        ) : (
                          <span className="whitespace-pre-wrap">{post.content}</span>
                        )}
                      </div>

                      {/* 이미지 */}
                      {post.images && post.images.length > 0 && (
                        <div className={`mb-3 rounded-2xl overflow-hidden border border-border ${
                          post.images.length === 1 ? '' :
                          post.images.length === 2 ? 'grid grid-cols-2 gap-0.5' :
                          post.images.length === 3 ? 'grid grid-cols-2 gap-0.5' :
                          'grid grid-cols-2 gap-0.5'
                        }`}>
                          {post.images.slice(0, 4).map((image, idx) => (
                            <div
                              key={idx}
                              onClick={(e) => openGallery(post.images!, idx, e)}
                              className={`relative bg-muted cursor-pointer hover:opacity-90 transition-opacity ${
                                post.images!.length === 1 ? 'aspect-video' :
                                post.images!.length === 3 && idx === 0 ? 'row-span-2 aspect-square' :
                                'aspect-square'
                              }`}
                            >
                              <img
                                src={image}
                                alt={`이미지 ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              {idx === 3 && post.images!.length > 4 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xl">
                                  +{post.images!.length - 4}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 액션 버튼들 */}
                      <div className="flex items-center justify-end gap-4 text-muted-foreground">
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            router.push(`/community/${post.id}`)
                          }}
                          className="flex items-center gap-2 p-2 -ml-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors group"
                        >
                          <MessageCircle className="w-[18px] h-[18px]" />
                          <span className="text-sm">{post.comments_count || 0}</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleLike(post.id, post.is_liked)
                          }}
                          className={`flex items-center gap-2 p-2 rounded-full hover:bg-red-500/10 transition-colors group ${
                            post.is_liked ? 'text-red-500' : 'hover:text-red-500'
                          }`}
                        >
                          <Heart className={`w-[18px] h-[18px] ${post.is_liked ? 'fill-current' : ''}`} />
                          <span className="text-sm">{post.likes_count || 0}</span>
                        </button>

                        <div className="flex items-center gap-2 p-2 rounded-full">
                          <BarChart2 className="w-[18px] h-[18px]" />
                          <span className="text-sm">{post.view_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
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

      {/* 이미지 갤러리 모달 */}
      {isGalleryOpen && (
        <div
          className="fixed inset-0 z-50 bg-black"
          onClick={closeGallery}
        >
          {/* 헤더 */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
            <span className="text-white text-sm">
              {galleryIndex + 1} / {galleryImages.length}
            </span>
            <button
              onClick={closeGallery}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* 이미지 영역 */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={galleryImages[galleryIndex]}
              alt={`이미지 ${galleryIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* 이전 버튼 */}
          {galleryImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                goToPrevImage()
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* 다음 버튼 */}
          {galleryImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                goToNextImage()
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* 하단 인디케이터 */}
          {galleryImages.length > 1 && (
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
              {galleryImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation()
                    setGalleryIndex(idx)
                  }}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === galleryIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
