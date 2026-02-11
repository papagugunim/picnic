'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('CommunityPage')
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll'
import { getLoadingMessage } from '@/lib/loading-messages'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useUser } from '@/lib/contexts/UserContext'
import { formatTimeAgo } from '@/lib/utils/date'
import dynamic from 'next/dynamic'
import { CommunityPostItem } from '@/components/community/CommunityPostItem'
import type { CommunityPost } from '@/components/community/CommunityPostItem'

const PostDetailModal = dynamic(() => import('@/components/community/PostDetailModal').then(m => m.PostDetailModal))
const ImageGalleryModal = dynamic(() => import('@/components/community/ImageGalleryModal').then(m => m.ImageGalleryModal))

const categories = [
  { id: 'all', name: '전체', emoji: '🏘️' },
  { id: 'chat', name: '잡담', emoji: '💬' },
  { id: 'info', name: '정보', emoji: '💡' },
  { id: 'question', name: '질문', emoji: '❓' },
  { id: 'event', name: '이벤트', emoji: '🎉' },
  { id: 'lost_found', name: '분실물', emoji: '🔍' },
]

const PAGE_SIZE = 20

interface Props {
  initialPosts: CommunityPost[]
  initialCursor: string | null
}

export default function CommunityClient({ initialPosts, initialCursor }: Props) {
  const router = useRouter()
  const { user, profile, loading: userLoading } = useUser()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const currentUserId = user?.id || null
  const userCity = profile?.city || null
  const currentUserRole = profile?.user_role || null
  const isInitialized = !userLoading

  // Image gallery state
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)

  // Post detail modal state
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const openGallery = useCallback((images: string[], index: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setGalleryImages(images)
    setGalleryIndex(index)
    setIsGalleryOpen(true)
  }, [])

  const closeGallery = useCallback(() => {
    setIsGalleryOpen(false)
  }, [])

  // Redirect if not logged in
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
    }
  }, [userLoading, user, router])

  const fetchPosts = useCallback(async (cursor: string | null) => {
    if (!user) {
      return { data: [], nextCursor: null, hasMore: false }
    }

    const supabase = createClient()

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

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: postsData, error: postsError } = await query

    if (postsError) {
      logger.error('Posts fetch error:', postsError)
      return { data: [], nextCursor: null, hasMore: false }
    }

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
  } = useInfiniteScroll<CommunityPost>({
    fetchFn: fetchPosts,
    pageSize: PAGE_SIZE,
    threshold: 300,
    enabled: isInitialized,
    initialData: initialPosts,
    initialCursor: initialCursor,
  })

  // Client-side category filtering
  const posts = useMemo(() => {
    if (selectedCategory === 'all') return allPosts
    return allPosts.filter(post => post.category === selectedCategory)
  }, [allPosts, selectedCategory])

  // Post detail modal functions with browser back button support
  const openPostModal = useCallback(async (post: CommunityPost, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setSelectedPost(post)
    setIsPostModalOpen(true)
    window.history.pushState({ modal: 'post', postId: post.id }, '')
  }, [])

  const closePostModal = useCallback(() => {
    setIsPostModalOpen(false)
    setSelectedPost(null)
  }, [])

  // Browser back button closes modal instead of navigating away
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (isPostModalOpen) {
        setIsPostModalOpen(false)
        setSelectedPost(null)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isPostModalOpen])

  const requestDeletePost = useCallback(() => {
    if (!selectedPost) return
    setShowDeleteConfirm(true)
  }, [selectedPost])

  const confirmDeletePost = useCallback(async () => {
    if (!selectedPost) return

    try {
      setIsDeleting(true)
      const supabase = createClient()

      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', selectedPost.id)

      if (error) {
        logger.error('Post deletion error:', error)
        toast.error('게시글 삭제 중 오류가 발생했습니다')
        return
      }

      closePostModal()
      refresh()
    } catch (err) {
      logger.error('Delete error:', err)
      toast.error('게시글 삭제 중 오류가 발생했습니다')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }, [selectedPost, closePostModal, refresh])

  const toggleModalLike = useCallback(async () => {
    if (!currentUserId || !selectedPost) return

    const currentlyLiked = selectedPost.is_liked

    setSelectedPost(prev => prev ? {
      ...prev,
      is_liked: !currentlyLiked,
      likes_count: currentlyLiked ? prev.likes_count - 1 : prev.likes_count + 1,
    } : null)

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
      updateItem(postId, (post) => ({
        ...post,
        is_liked: currentlyLiked,
        likes_count: currentlyLiked ? post.likes_count + 1 : post.likes_count - 1
      }))
    }
  }

  // 화면에 노출되면 조회수 증가 (세션당 게시글 1회)
  const viewedPostIds = useRef(new Set<string>())

  const handlePostView = useCallback((postId: string) => {
    if (!currentUserId || viewedPostIds.current.has(postId)) return
    viewedPostIds.current.add(postId)

    // 낙관적 UI 업데이트
    updateItem(postId, (p) => ({ ...p, view_count: (p.view_count || 0) + 1 }))

    // DB 업데이트 (fire-and-forget) - RPC 사용으로 race condition 방지
    const supabase = createClient()
    supabase.rpc('increment_community_view_count', { p_post_id: postId }).then(() => {})
  }, [currentUserId, updateItem])

  const getCategoryEmoji = (category: string) => {
    const cat = categories.find((c) => c.id === category)
    return cat?.emoji || '📌'
  }

  const getCategoryName = (category: string) => {
    const cat = categories.find((c) => c.id === category)
    return cat?.name || category
  }

  const filteredPosts = useMemo(() =>
    posts.filter((post) =>
      searchQuery
        ? post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.content.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    ), [posts, searchQuery]
  )

  const handleCommentCountChange = useCallback((count: number) => {
    if (selectedPost) {
      updateItem(selectedPost.id, (post) => ({ ...post, comments_count: count }))
    }
  }, [selectedPost, updateItem])

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="px-4 py-4">
            <h1 className="text-lg font-bold mb-4">동네생활</h1>
            <div className="text-center py-16 text-muted-foreground">
              {getLoadingMessage('post')}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-background">
            <div className="px-4 py-4">
              <h1 className="text-lg font-bold mb-4">동네생활</h1>

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
              <div>
                {filteredPosts.map((post) => (
                  <CommunityPostItem
                    key={post.id}
                    post={post}
                    onPostClick={openPostModal}
                    onLikeToggle={toggleLike}
                    onImageClick={openGallery}
                    onView={handlePostView}
                    currentUserRole={currentUserRole}
                    formatTimeAgo={formatTimeAgo}
                    getCategoryEmoji={getCategoryEmoji}
                    getCategoryName={getCategoryName}
                  />
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

        {/* Post detail modal */}
        {isPostModalOpen && selectedPost && (
          <PostDetailModal
            post={selectedPost}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onClose={closePostModal}
            onLikeToggle={toggleModalLike}
            onDelete={requestDeletePost}
            onImageClick={openGallery}
            onCommentCountChange={handleCommentCountChange}
            isDeleting={isDeleting}
            formatTimeAgo={formatTimeAgo}
            getCategoryEmoji={getCategoryEmoji}
            getCategoryName={getCategoryName}
          />
        )}

        {/* Image gallery modal */}
        {isGalleryOpen && (
          <ImageGalleryModal
            images={galleryImages}
            currentIndex={galleryIndex}
            onClose={closeGallery}
          />
        )}

        {/* Delete confirmation dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>게시글 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                정말로 이 게시글을 삭제하시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeletePost} disabled={isDeleting}>
                {isDeleting ? '삭제 중...' : '삭제'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  )
}
