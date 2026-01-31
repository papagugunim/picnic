'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('CommunityDetailPage')
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Heart, MessageCircle, MoreVertical, Trash2, EyeOff, Eye, Edit, X, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { getRandomLoadingMessage } from '@/lib/loading-messages'
import { getBreadEmoji } from '@/lib/bread'
import { CommentSection } from '@/components/comment/CommentSection'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ReportDialog } from '@/components/admin/ReportDialog'

interface CommunityPost {
  id: string
  title: string
  content: string
  images: string[] | null
  category: string
  created_at: string
  user_id: string
  is_hidden: boolean
  hidden_at: string | null
  hidden_by: string | null
  view_count: number
  profiles: {
    full_name: string | null
    avatar_url: string | null
    bread_level: number
    user_role: string | null
  }
  likes_count: number
  comments_count: number
  is_liked: boolean
}

const categories = {
  question: { name: '질문', emoji: '❓' },
  info: { name: '정보', emoji: '💡' },
  event: { name: '이벤트', emoji: '🎉' },
  chat: { name: '잡담', emoji: '💬' },
  lost_found: { name: '분실물', emoji: '🔍' },
}

export default function CommunityPostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string

  const [post, setPost] = useState<CommunityPost | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [commentCount, setCommentCount] = useState(0)

  // Image gallery state
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)

  const openGallery = useCallback((images: string[], index: number) => {
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

  // Keyboard events
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
    fetchPost()
  }, [postId])

  async function fetchPost() {
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

      // Get current user's role
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user.id)
        .single()

      setCurrentUserRole(currentUserProfile?.user_role || null)

      // Get post
      const { data: postData, error: postError } = await supabase
        .from('community_posts')
        .select(`
          id,
          title,
          content,
          images,
          category,
          created_at,
          user_id,
          is_hidden,
          hidden_at,
          hidden_by,
          view_count,
          profiles!community_posts_user_id_fkey (
            full_name,
            avatar_url,
            bread_level,
            user_role
          )
        `)
        .eq('id', postId)
        .single()

      if (postError) {
        logger.error('Post fetch error:', postError)
        return
      }

      // Get likes count and check if user liked
      const [likesResult, userLikeResult, commentsResult] = await Promise.all([
        supabase
          .from('community_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId),
        supabase
          .from('community_likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('community_comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId)
      ])

      // Extract author profile
      const author = Array.isArray(postData.profiles)
        ? postData.profiles[0]
        : postData.profiles

      setPost({
        ...postData,
        profiles: author,
        likes_count: likesResult.count || 0,
        comments_count: commentsResult.count || 0,
        is_liked: !!userLikeResult.data,
      } as CommunityPost)

      setCommentCount(commentsResult.count || 0)

      // Increment view count (only if not author)
      if (postData.user_id !== user.id) {
        await supabase
          .from('community_posts')
          .update({ view_count: (postData.view_count || 0) + 1 })
          .eq('id', postId)
      }
    } catch (err) {
      logger.error('Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function togglePostLike() {
    if (!currentUserId || !post) return

    // Optimistic update
    setPost(prev => prev ? {
      ...prev,
      is_liked: !prev.is_liked,
      likes_count: prev.is_liked ? prev.likes_count - 1 : prev.likes_count + 1,
    } : null)

    try {
      const supabase = createClient()

      if (post.is_liked) {
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
      setPost(prev => prev ? {
        ...prev,
        is_liked: post.is_liked,
        likes_count: post.likes_count,
      } : null)
    }
  }

  async function deletePost() {
    if (!post || !confirm('정말로 이 게시글을 삭제하시겠습니까?')) return

    try {
      setIsDeleting(true)
      const supabase = createClient()

      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId)

      if (error) {
        logger.error('Post deletion error:', error)
        alert('게시글 삭제 중 오류가 발생했습니다')
        return
      }

      router.push('/community')
      router.refresh()
    } catch (err) {
      logger.error('Delete error:', err)
      alert('게시글 삭제 중 오류가 발생했습니다')
    } finally {
      setIsDeleting(false)
    }
  }

  async function toggleHidden() {
    if (!post || !currentUserId) return

    const willHide = !post.is_hidden
    const confirmMessage = willHide
      ? '이 게시글을 숨기시겠습니까? 숨긴 게시글은 관리자만 볼 수 있습니다.'
      : '이 게시글을 다시 표시하시겠습니까?'

    if (!confirm(confirmMessage)) return

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('community_posts')
        .update({
          is_hidden: willHide,
          hidden_at: willHide ? new Date().toISOString() : null,
          hidden_by: willHide ? currentUserId : null,
        })
        .eq('id', postId)

      if (error) {
        logger.error('Toggle hidden error:', error)
        alert('게시글 숨김 처리 중 오류가 발생했습니다')
        return
      }

      fetchPost()
    } catch (err) {
      logger.error('Toggle hidden error:', err)
      alert('게시글 숨김 처리 중 오류가 발생했습니다')
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">{getRandomLoadingMessage()}</div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">게시글을 찾을 수 없습니다</p>
          <Button onClick={() => router.push('/community')}>
            동네생활로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  const isAuthor = currentUserId === post.user_id
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'developer'
  const canManage = isAuthor || isAdmin
  const category = categories[post.category as keyof typeof categories]

  return (
    <div className="bg-background pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">동네생활</h1>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAuthor && (
                    <>
                      <DropdownMenuItem onClick={() => router.push(`/community/${postId}/edit`)}>
                        <Edit className="w-4 h-4 mr-2" />
                        수정
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={deletePost}
                        disabled={isDeleting}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {isDeleting ? '삭제 중...' : '삭제'}
                      </DropdownMenuItem>
                    </>
                  )}
                  {isAdmin && (
                    <>
                      {isAuthor && <DropdownMenuSeparator />}
                      <DropdownMenuItem onClick={toggleHidden}>
                        {post.is_hidden ? (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            게시글 표시
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-4 h-4 mr-2" />
                            게시글 숨김
                          </>
                        )}
                      </DropdownMenuItem>
                      {!isAuthor && (
                        <DropdownMenuItem
                          onClick={deletePost}
                          disabled={isDeleting}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {isDeleting ? '삭제 중...' : '관리자 삭제'}
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  {!isAuthor && (
                    <>
                      {(isAdmin || canManage) && <DropdownMenuSeparator />}
                      <DropdownMenuItem onClick={() => setIsReportDialogOpen(true)}>
                        <Flag className="w-4 h-4 mr-2" />
                        신고하기
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </div>

        {/* Post Content */}
        <div className="p-4">
          {/* Author Info */}
          <div className="flex items-start gap-3 mb-4">
            <Link href={`/profile/${post.user_id}`}>
              {post.profiles.avatar_url ? (
                <Image
                  src={post.profiles.avatar_url}
                  alt={post.profiles.full_name || '사용자'}
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold">
                  {post.profiles.full_name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </Link>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${post.user_id}`}
                  className="font-semibold hover:underline flex items-center gap-1"
                >
                  <span>{post.profiles.full_name || '익명'}</span>
                  <span className="text-base">{getBreadEmoji(post.profiles.bread_level, post.profiles.user_role || undefined)}</span>
                </Link>
                <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">
                  {category.emoji} {category.name}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {formatTimeAgo(post.created_at)}
              </div>
            </div>
          </div>

          {/* Hidden Badge */}
          {post.is_hidden && isAdmin && (
            <div className="inline-block px-3 py-1 bg-destructive/10 text-destructive rounded-full text-sm font-medium flex items-center gap-1 mb-4">
              <EyeOff className="w-4 h-4" />
              숨김 (관리자만 표시)
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl font-bold mb-4">{post.title}</h1>

          {/* Content */}
          <div className="prose prose-sm max-w-none mb-6 whitespace-pre-wrap">
            {post.content}
          </div>

          {/* Images */}
          {post.images && post.images.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-6">
              {post.images.map((image, idx) => (
                <div
                  key={idx}
                  onClick={() => openGallery(post.images!, idx)}
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
              onClick={togglePostLike}
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <Heart
                className={`w-6 h-6 ${
                  post.is_liked
                    ? 'fill-red-500 text-red-500'
                    : 'text-muted-foreground'
                }`}
              />
              <span className={post.is_liked ? 'text-red-500 font-semibold' : 'text-muted-foreground'}>
                {post.likes_count}
              </span>
            </button>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="w-6 h-6" />
              <span>{commentCount}</span>
            </div>

            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>조회</span>
              <span>{post.view_count || 0}</span>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <CommentSection
          postId={postId}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onCommentCountChange={setCommentCount}
        />
      </div>

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

      {/* 신고 다이얼로그 */}
      <ReportDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        targetType="community_post"
        targetId={postId}
      />
    </div>
  )
}
