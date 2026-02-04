'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('CommunityPage')
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, Plus, Search, BarChart2, X, ChevronLeft, ChevronRight, Loader2, MoreVertical, Trash2, Edit, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { createClient } from '@/lib/supabase/client'
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll'
import { useScrollRestoration } from '@/lib/hooks/useScrollRestoration'
import Link from 'next/link'
import Image from 'next/image'
import { getLoadingMessage } from '@/lib/loading-messages'
import { getBreadEmoji } from '@/lib/bread'
import { UserAvatar } from '@/components/ui/user-avatar'
import { CommentSection } from '@/components/comment/CommentSection'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

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
    bread_level: number
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

const PAGE_SIZE = 20

export default function CommunityPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userCity, setUserCity] = useState<string | null>(null)
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set())
  const [isInitialized, setIsInitialized] = useState(false)

  // Image gallery state
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // Post detail modal state
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [modalCommentCount, setModalCommentCount] = useState(0)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useScrollRestoration({ key: 'community-page' })

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

  // Swipe handlers
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

  // Initialize user data
  useEffect(() => {
    async function initUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setCurrentUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('city, user_role')
        .eq('id', user.id)
        .single()

      if (profile?.city) {
        setUserCity(profile.city)
      }
      if (profile?.user_role) {
        setCurrentUserRole(profile.user_role)
      }
      setIsInitialized(true)
    }

    initUser()
  }, [router])

  const fetchPosts = useCallback(async (cursor: string | null) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { data: [], nextCursor: null, hasMore: false }
    }

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
          bread_level,
          city,
          user_role
        )
      `)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    // Filter by category if not 'all'
    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory)
    }

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: postsData, error: postsError } = await query

    if (postsError) {
      logger.error('Posts fetch error:', postsError)
      return { data: [], nextCursor: null, hasMore: false }
    }

    // Filter posts by city
    const filteredByCity = userCity
      ? (postsData || []).filter((post) => {
          const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
          return author?.city === userCity
        })
      : postsData

    const postIds = (filteredByCity || []).map(p => p.id)

    if (postIds.length === 0) {
      return { data: [], nextCursor: null, hasMore: false }
    }

    // Fetch likes and comments in parallel
    const [likesResult, commentsResult] = await Promise.all([
      supabase
        .from('community_likes')
        .select('post_id, user_id')
        .in('post_id', postIds),
      supabase
        .from('community_comments')
        .select('post_id')
        .in('post_id', postIds)
    ])

    const likesData = likesResult.data || []
    const commentsData = commentsResult.data || []

    // Build maps for fast lookup
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

    // Map data
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
    }) as CommunityPost[]

    const nextCursor = postsData && postsData.length === PAGE_SIZE
      ? postsData[postsData.length - 1].created_at
      : null

    return {
      data: postsWithCounts,
      nextCursor,
      hasMore: (postsData?.length || 0) === PAGE_SIZE,
    }
  }, [selectedCategory, userCity])

  const {
    data: posts,
    isLoading,
    isFetchingMore,
    isRefreshing,
    hasMore,
    sentinelRef,
    refresh,
    updateItem,
    reset,
  } = useInfiniteScroll<CommunityPost>({
    fetchFn: fetchPosts,
    pageSize: PAGE_SIZE,
    threshold: 300,
    enabled: isInitialized,
  })

  // Reset when category changes
  useEffect(() => {
    if (isInitialized) {
      reset()
    }
  }, [selectedCategory])

  // Post detail modal functions
  const openPostModal = useCallback(async (post: CommunityPost, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setSelectedPost(post)
    setModalCommentCount(post.comments_count)
    setIsPostModalOpen(true)
    document.body.style.overflow = 'hidden'

    // Increment view count if not author
    if (currentUserId && post.user_id !== currentUserId) {
      const supabase = createClient()
      await supabase
        .from('community_posts')
        .update({ view_count: (post.view_count || 0) + 1 })
        .eq('id', post.id)

      // Update local state
      updateItem(post.id, (p) => ({ ...p, view_count: (p.view_count || 0) + 1 }))
    }
  }, [currentUserId, updateItem])

  const closePostModal = useCallback(() => {
    setIsPostModalOpen(false)
    setSelectedPost(null)
    document.body.style.overflow = ''
  }, [])

  // Keyboard events for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isGalleryOpen) {
          closeGallery()
        } else if (isPostModalOpen) {
          closePostModal()
        }
      }
      if (isGalleryOpen) {
        if (e.key === 'ArrowLeft') goToPrevImage()
        if (e.key === 'ArrowRight') goToNextImage()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isGalleryOpen, isPostModalOpen, closeGallery, closePostModal, goToPrevImage, goToNextImage])

  // Delete post from modal
  const deletePostFromModal = useCallback(async () => {
    if (!selectedPost || !confirm('정말로 이 게시글을 삭제하시겠습니까?')) return

    try {
      setIsDeleting(true)
      const supabase = createClient()

      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', selectedPost.id)

      if (error) {
        logger.error('Post deletion error:', error)
        alert('게시글 삭제 중 오류가 발생했습니다')
        return
      }

      closePostModal()
      refresh()
    } catch (err) {
      logger.error('Delete error:', err)
      alert('게시글 삭제 중 오류가 발생했습니다')
    } finally {
      setIsDeleting(false)
    }
  }, [selectedPost, closePostModal, refresh])

  // Toggle like from modal
  const toggleModalLike = useCallback(async () => {
    if (!currentUserId || !selectedPost) return

    const currentlyLiked = selectedPost.is_liked

    // Optimistic update for modal
    setSelectedPost(prev => prev ? {
      ...prev,
      is_liked: !currentlyLiked,
      likes_count: currentlyLiked ? prev.likes_count - 1 : prev.likes_count + 1,
    } : null)

    // Also update in list
    updateItem(selectedPost.id, (post) => ({
      ...post,
      is_liked: !currentlyLiked,
      likes_count: currentlyLiked ? post.likes_count - 1 : post.likes_count + 1
    }))

    try {
      const supabase = createClient()

      if (currentlyLiked) {
        await supabase
          .from('community_likes')
          .delete()
          .eq('post_id', selectedPost.id)
          .eq('user_id', currentUserId)
      } else {
        await supabase
          .from('community_likes')
          .insert({
            post_id: selectedPost.id,
            user_id: currentUserId,
          })
      }
    } catch (err) {
      logger.error('Toggle like error:', err)
      // Revert on error
      setSelectedPost(prev => prev ? {
        ...prev,
        is_liked: currentlyLiked,
        likes_count: currentlyLiked ? prev.likes_count + 1 : prev.likes_count - 1,
      } : null)
      updateItem(selectedPost.id, (post) => ({
        ...post,
        is_liked: currentlyLiked,
        likes_count: currentlyLiked ? post.likes_count + 1 : post.likes_count - 1
      }))
    }
  }, [currentUserId, selectedPost, updateItem])

  async function toggleLike(postId: string, currentlyLiked: boolean) {
    if (!currentUserId) return

    // Optimistic update
    updateItem(postId, (post) => ({
      ...post,
      is_liked: !currentlyLiked,
      likes_count: currentlyLiked ? post.likes_count - 1 : post.likes_count + 1
    }))

    try {
      const supabase = createClient()

      if (currentlyLiked) {
        await supabase
          .from('community_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId)
      } else {
        await supabase
          .from('community_likes')
          .insert({
            post_id: postId,
            user_id: currentUserId,
          })
      }
    } catch (err) {
      logger.error('Toggle like error:', err)
      // Revert on error
      updateItem(postId, (post) => ({
        ...post,
        is_liked: currentlyLiked,
        likes_count: currentlyLiked ? post.likes_count + 1 : post.likes_count - 1
      }))
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

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="px-4 py-4">
            <h1 className="text-2xl font-bold mb-4">동네생활</h1>
            <div className="text-center py-16 text-muted-foreground">
              {getLoadingMessage('post')}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={refresh} enabled={!isLoading}>
      <div className="bg-background">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-background">
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

          {/* Refreshing indicator */}
          {isRefreshing && (
            <div className="flex items-center justify-center py-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span className="text-sm">새로고침 중...</span>
            </div>
          )}

          {/* Posts List */}
          <div className="py-2">
            {filteredPosts.length === 0 ? (
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
                      onClick={() => openPostModal(post)}
                    >
                      {/* Profile photo */}
                      <Link
                        href={`/profile/${post.user_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-shrink-0"
                      >
                        <UserAvatar
                          src={post.profiles.avatar_url}
                          alt={post.profiles.full_name || '사용자'}
                          breadLevel={post.profiles.bread_level}
                          size="md"
                        />
                      </Link>

                      {/* Content area */}
                      <div className="flex-1 min-w-0">
                        {/* Header: name + category + time */}
                        <div className="flex items-center gap-1 text-sm mb-1">
                          <Link
                            href={`/profile/${post.user_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-bold hover:underline truncate"
                          >
                            {post.profiles.full_name || '익명'}
                          </Link>
                          <span className="text-base flex-shrink-0">
                            {getBreadEmoji(post.profiles.bread_level, post.profiles.user_role || undefined)}
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

                        {/* Title */}
                        <h3 className="font-semibold text-[15px] mb-1">
                          {post.title}
                        </h3>

                        {/* Body */}
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

                        {/* Images */}
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
                                <Image
                                  src={image}
                                  alt={`이미지 ${idx + 1}`}
                                  fill
                                  sizes="(max-width: 768px) 50vw, 400px"
                                  className="object-cover"
                                  loading="lazy"
                                  quality={75}
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

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-4 text-muted-foreground">
                          <button
                            onClick={(e) => openPostModal(post, e)}
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

                {/* Sentinel for infinite scroll */}
                <div ref={sentinelRef} className="h-1" />

                {/* Loading more indicator */}
                {isFetchingMore && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* End of list indicator */}
                {!hasMore && filteredPosts.length > 0 && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    모든 게시글을 불러왔습니다
                  </div>
                )}
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

        {/* Post detail modal - Fullscreen */}
        {isPostModalOpen && selectedPost && (
          <div
            className="fixed inset-0 bg-background z-50 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header - Fixed */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background flex-shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closePostModal}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-lg font-semibold">동네생활</h1>
              </div>
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {currentUserId === selectedPost.user_id && (
                      <>
                        <DropdownMenuItem onClick={() => {
                          closePostModal()
                          router.push(`/community/${selectedPost.id}/edit`)
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={deletePostFromModal}
                          disabled={isDeleting}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {isDeleting ? '삭제 중...' : '삭제'}
                        </DropdownMenuItem>
                      </>
                    )}
                    {(currentUserRole === 'admin' || currentUserRole === 'developer') && currentUserId !== selectedPost.user_id && (
                      <>
                        <DropdownMenuItem
                          onClick={deletePostFromModal}
                          disabled={isDeleting}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {isDeleting ? '삭제 중...' : '관리자 삭제'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {currentUserId !== selectedPost.user_id && (
                      <DropdownMenuItem onClick={() => {
                        closePostModal()
                        router.push(`/community/${selectedPost.id}`)
                      }}>
                        <Flag className="w-4 h-4 mr-2" />
                        신고하기
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* Post Content */}
              <div className="p-4 max-w-3xl mx-auto">
                {/* Author Info */}
                <div className="flex items-start gap-3 mb-4">
                  <Link href={`/profile/${selectedPost.user_id}`} onClick={closePostModal}>
                    <UserAvatar
                      src={selectedPost.profiles.avatar_url}
                      alt={selectedPost.profiles.full_name || '사용자'}
                      breadLevel={selectedPost.profiles.bread_level}
                      size="lg"
                    />
                  </Link>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/profile/${selectedPost.user_id}`}
                        onClick={closePostModal}
                        className="font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>{selectedPost.profiles.full_name || '익명'}</span>
                        <span className="text-base">{getBreadEmoji(selectedPost.profiles.bread_level, selectedPost.profiles.user_role || undefined)}</span>
                      </Link>
                      <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">
                        {getCategoryEmoji(selectedPost.category)} {getCategoryName(selectedPost.category)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatTimeAgo(selectedPost.created_at)}
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold mb-4">{selectedPost.title}</h1>

                {/* Content */}
                <div className="prose prose-sm max-w-none mb-6 whitespace-pre-wrap">
                  {selectedPost.content}
                </div>

                {/* Images */}
                {selectedPost.images && selectedPost.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-6">
                    {selectedPost.images.map((image, idx) => (
                      <div
                        key={idx}
                        onClick={(e) => openGallery(selectedPost.images!, idx, e)}
                        className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <Image
                          src={image}
                          alt={`이미지 ${idx + 1}`}
                          fill
                          sizes="(max-width: 768px) 50vw, 400px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-6 py-4 border-y border-border">
                  <button
                    onClick={toggleModalLike}
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    <Heart
                      className={`w-6 h-6 ${
                        selectedPost.is_liked
                          ? 'fill-red-500 text-red-500'
                          : 'text-muted-foreground'
                      }`}
                    />
                    <span className={selectedPost.is_liked ? 'text-red-500 font-semibold' : 'text-muted-foreground'}>
                      {selectedPost.likes_count}
                    </span>
                  </button>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageCircle className="w-6 h-6" />
                    <span>{modalCommentCount}</span>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span>조회</span>
                    <span>{selectedPost.view_count || 0}</span>
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div className="max-w-3xl mx-auto">
                <CommentSection
                  postId={selectedPost.id}
                  currentUserId={currentUserId}
                  isAdmin={currentUserRole === 'admin' || currentUserRole === 'developer'}
                  isFullscreen={true}
                  onCommentCountChange={(count) => {
                    setModalCommentCount(count)
                    updateItem(selectedPost.id, (post) => ({ ...post, comments_count: count }))
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Image gallery modal */}
        {isGalleryOpen && (
          <div
            className="fixed inset-0 z-50 bg-black"
            onClick={closeGallery}
          >
            {/* Header */}
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

            {/* Image area */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={galleryImages[galleryIndex]}
                alt={`이미지 ${galleryIndex + 1}`}
                fill
                sizes="100vw"
                className="object-contain"
                quality={85}
                priority
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Previous button */}
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

            {/* Next button */}
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

            {/* Bottom indicators */}
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
    </PullToRefresh>
  )
}
