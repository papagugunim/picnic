'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('PostDetail')
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, MessageCircle, Heart, MoreVertical, Edit, Trash2, Bookmark, EyeOff, Eye, Flag, Tag } from 'lucide-react'
import { ImageGalleryModal } from '@/components/community/ImageGalleryModal'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { CATEGORIES, TRADE_METHODS, getCityNameInKorean } from '@/lib/constants'
import { useMetroStations } from '@/lib/hooks/useMetroStations'
import { formatTimeAgo } from '@/lib/utils/date'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { getRandomLoadingMessage } from '@/lib/loading-messages'
import { getPostStatusInfo, type PostStatus } from '@/lib/post-status'
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
import { getBreadInfo, getBreadEmoji } from '@/lib/bread'
import { getCache, setCache } from '@/lib/cache'
import { UserAvatar } from '@/components/ui/user-avatar'
import { ReportDialog } from '@/components/admin/ReportDialog'
import { useUser } from '@/lib/contexts/UserContext'

interface Post {
  id: string
  author_id: string
  title: string
  description: string
  price: number | null
  category: string
  images: string[]
  city: string
  neighborhood: string
  preferred_metro_stations: string[]
  trade_method: string[]
  status: string
  created_at: string
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
  interests_count: number
  user_liked: boolean
  user_interested: boolean
}

interface PostDetailClientProps {
  postId: string
  initialPost: Post | null
  initialLikesCount: number
  initialInterestsCount: number
  initialUserLiked: boolean
  initialUserInterested: boolean
}

export default function PostDetailClient({
  postId,
  initialPost,
  initialLikesCount,
  initialInterestsCount,
  initialUserLiked,
  initialUserInterested,
}: PostDetailClientProps) {
  const router = useRouter()
  const { user, profile, loading: userLoading } = useUser()

  const [post, setPost] = useState<Post | null>(initialPost ? {
    ...initialPost,
    likes_count: initialLikesCount,
    interests_count: initialInterestsCount,
    user_liked: initialUserLiked,
    user_interested: initialUserInterested,
  } : null)
  const [isLoading, setIsLoading] = useState(!initialPost)
  const [isStartingChat, setIsStartingChat] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showHiddenConfirm, setShowHiddenConfirm] = useState(false)

  const currentUserId = user?.id || null
  const currentUserRole = profile?.user_role || null

  useEffect(() => {
    if (!userLoading) {
      if (!user) {
        router.push('/login')
        return
      }
      // 초기 데이터가 없는 경우에만 fetch
      if (!initialPost) {
        fetchPost()
      } else {
        // 조회수 증가 (본인 게시글이 아닌 경우에만) - RPC로 원자적 증가
        if (initialPost.author_id !== user.id) {
          const supabase = createClient()
          supabase.rpc('increment_post_view_count', { p_post_id: postId }).then(() => {})
        }
      }
    }
  }, [postId, userLoading, user])

  async function fetchPost() {
    if (!user) return

    try {
      setIsLoading(true)
      const supabase = createClient()

      // 캐시 확인 (5분 TTL)
      const cacheKey = `cache_post_detail_${postId}`
      const cached = getCache<Post>(cacheKey, 5 * 60 * 1000)
      if (cached) {
        logger.log('게시글 상세 캐시 히트')
        setPost(cached)
        setIsLoading(false)

        // 캐시 히트해도 조회수는 증가 (본인 게시글이 아닌 경우) - RPC로 원자적 증가
        if (cached.author_id !== user.id) {
          supabase.rpc('increment_post_view_count', { p_post_id: postId }).then(() => {
            setCache(cacheKey, { ...cached, view_count: (cached.view_count || 0) + 1 }, 5 * 60 * 1000)
          })
        }
        return
      }

      // Get post
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(`
          id,
          author_id,
          title,
          description,
          price,
          category,
          images,
          city,
          neighborhood,
          preferred_metro_stations,
          trade_method,
          status,
          created_at,
          is_hidden,
          hidden_at,
          hidden_by,
          view_count,
          profiles!posts_author_id_fkey (
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

      // Get likes count
      const { data: likesData } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)

      // Get interests count
      const { data: interestsData } = await supabase
        .from('post_interests')
        .select('id')
        .eq('post_id', postId)

      // Check if user liked
      const { data: userLikeData } = await supabase
        .from('post_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .maybeSingle()

      // Check if user interested
      const { data: userInterestData } = await supabase
        .from('post_interests')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .maybeSingle()

      // Extract author profile (Supabase returns it as array)
      const author = Array.isArray(postData.profiles)
        ? postData.profiles[0]
        : postData.profiles

      const postWithDetails = {
        ...postData,
        profiles: author,
        likes_count: likesData?.length || 0,
        interests_count: interestsData?.length || 0,
        user_liked: !!userLikeData,
        user_interested: !!userInterestData,
      } as Post

      // 캐시에 저장 (5분 TTL)
      setCache(cacheKey, postWithDetails, 5 * 60 * 1000)

      setPost(postWithDetails)

      // 조회수 증가 (본인 게시글이 아닌 경우에만) - RPC로 원자적 증가
      if (postData.author_id !== user.id) {
        supabase.rpc('increment_post_view_count', { p_post_id: postId }).then(() => {})
      }
    } catch (err) {
      logger.error('Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function startChat() {
    if (!post || !user) return

    try {
      setIsStartingChat(true)
      const supabase = createClient()

      // Call the database function to get or create chat room
      const { data, error } = await supabase.rpc('get_or_create_chat_room', {
        p_user1_id: user.id,
        p_user2_id: post.author_id,
        p_post_id: postId,
      })

      if (error) {
        logger.error('Chat room creation error:', error)
        return
      }

      // Navigate to chat room
      router.push(`/chats/${data}`)
    } catch (err) {
      logger.error('Start chat error:', err)
    } finally {
      setIsStartingChat(false)
    }
  }

  function requestDeletePost() {
    if (!post) return
    setShowDeleteConfirm(true)
  }

  async function confirmDeletePost() {
    if (!post) return

    try {
      setIsDeleting(true)
      const supabase = createClient()

      // Delete post images from storage
      if (post.images && post.images.length > 0) {
        const filePaths = post.images.map((url) => {
          const urlObj = new URL(url)
          const pathParts = urlObj.pathname.split('/post-images/')
          return pathParts[1]
        })

        const { error: storageError } = await supabase.storage
          .from('post-images')
          .remove(filePaths)

        if (storageError) {
          logger.error('Image deletion error:', storageError)
        }
      }

      // Delete post from database
      const { error: postError } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (postError) {
        logger.error('Post deletion error:', postError)
        toast.error('게시글 삭제 중 오류가 발생했습니다')
        return
      }

      // Navigate to feed
      router.push('/feed')
      router.refresh()
    } catch (err) {
      logger.error('Delete error:', err)
      toast.error('게시글 삭제 중 오류가 발생했습니다')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  function requestToggleHidden() {
    if (!post || !currentUserId) return
    setShowHiddenConfirm(true)
  }

  async function confirmToggleHidden() {
    if (!post || !currentUserId) return

    const willHide = !post.is_hidden

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('posts')
        .update({
          is_hidden: willHide,
          hidden_at: willHide ? new Date().toISOString() : null,
          hidden_by: willHide ? currentUserId : null,
        })
        .eq('id', postId)

      if (error) {
        logger.error('Toggle hidden error:', error)
        toast.error('게시글 숨김 처리 중 오류가 발생했습니다')
        return
      }

      // Refresh post data
      fetchPost()
    } catch (err) {
      logger.error('Toggle hidden error:', err)
      toast.error('게시글 숨김 처리 중 오류가 발생했습니다')
    } finally {
      setShowHiddenConfirm(false)
    }
  }

  async function changePostStatus(newStatus: PostStatus) {
    if (!post || !currentUserId) return

    const prevStatus = post.status
    // 낙관적 업데이트
    setPost({ ...post, status: newStatus })

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('posts')
        .update({ status: newStatus })
        .eq('id', postId)

      if (error) {
        logger.error('Change post status error:', error)
        toast.error('상태 변경 중 오류가 발생했습니다')
        setPost({ ...post, status: prevStatus })
        return
      }

      const statusInfo = getPostStatusInfo(newStatus)
      toast.success(`${statusInfo.label}(으)로 변경되었습니다`)
    } catch (err) {
      logger.error('Change post status error:', err)
      toast.error('상태 변경 중 오류가 발생했습니다')
      setPost({ ...post, status: prevStatus })
    }
  }

  async function toggleLike() {
    if (!post || !user) return

    try {
      const currentLiked = post.user_liked

      // 낙관적 업데이트
      setPost({
        ...post,
        user_liked: !currentLiked,
        likes_count: currentLiked ? post.likes_count - 1 : post.likes_count + 1
      })

      const supabase = createClient()

      if (currentLiked) {
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
      // 실패 시 원래 상태로 복구
      if (post) {
        setPost({
          ...post,
          user_liked: post.user_liked,
          likes_count: post.user_liked ? post.likes_count + 1 : post.likes_count - 1
        })
      }
    }
  }

  async function toggleInterest() {
    if (!post || !user) return

    try {
      const currentInterested = post.user_interested

      // 낙관적 업데이트
      setPost({
        ...post,
        user_interested: !currentInterested,
        interests_count: currentInterested ? post.interests_count - 1 : post.interests_count + 1
      })

      const supabase = createClient()

      if (currentInterested) {
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
      // 실패 시 원래 상태로 복구
      if (post) {
        setPost({
          ...post,
          user_interested: post.user_interested,
          interests_count: post.user_interested ? post.interests_count + 1 : post.interests_count - 1
        })
      }
    }
  }

  const getCategoryLabel = (value: string) => {
    const category = CATEGORIES.find((cat) => cat.value === value)
    return category?.label || value
  }

  const metroStations = useMetroStations(post?.city)

  const getMetroStationInfo = (value: string) => {
    const station = metroStations.find((s) => s.value === value)

    if (!station) return null

    // label 형식: "한글 / 러시아어 / 영어"에서 한글 부분만 추출
    const koreanName = station.label.split(' / ')[0]

    return {
      koreanName,
      lineColor: station.lineColor,
      line: station.line,
    }
  }

  // 스크롤 스냅 기반 슬라이더 - 스크롤 끝나면 인덱스 업데이트
  const handleSliderScroll = useCallback(() => {
    const el = sliderRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    setSelectedImageIndex(idx)
  }, [])

  if (isLoading) {
    return (
      <div className="bg-background pb-20">
        <div className="max-w-4xl mx-auto">
          {/* Header Skeleton */}
          <div className="bg-background">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="w-10 h-10 bg-muted rounded animate-pulse" />
              <div className="h-6 bg-muted rounded w-24 animate-pulse" />
              <div className="w-10 h-10 bg-muted rounded animate-pulse" />
            </div>
          </div>

          {/* Image Skeleton */}
          <div className="aspect-square bg-muted animate-pulse" />

          {/* Content Skeleton */}
          <div className="p-4 space-y-4">
            {/* Author Info Skeleton */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-muted rounded w-32 animate-pulse" />
                <div className="h-4 bg-muted rounded w-48 animate-pulse" />
              </div>
            </div>

            {/* Title & Price Skeleton */}
            <div className="space-y-2">
              <div className="h-8 bg-muted rounded w-3/4 animate-pulse" />
              <div className="h-10 bg-muted rounded w-40 animate-pulse" />
            </div>

            {/* Description Skeleton */}
            <div className="space-y-2 pt-4">
              <div className="h-4 bg-muted rounded w-full animate-pulse" />
              <div className="h-4 bg-muted rounded w-full animate-pulse" />
              <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">게시글을 찾을 수 없습니다</p>
          <Button onClick={() => router.push('/feed')}>
            피드로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  const isAuthor = currentUserId === post.author_id
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'developer'
  const canManage = isAuthor || isAdmin

  return (
    <div className="bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-background">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              aria-label="뒤로 가기"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">중고거래</h1>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="더보기">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAuthor && (
                    <>
                      <DropdownMenuItem onClick={() => router.push(`/post/edit/${postId}`)}>
                        <Edit className="w-4 h-4 mr-2" />
                        수정
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={requestDeletePost}
                        disabled={isDeleting}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {isDeleting ? '삭제 중...' : '삭제'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {post.status === 'active' && (
                        <>
                          <DropdownMenuItem onClick={() => changePostStatus('reserved')}>
                            <Tag className="w-4 h-4 mr-2 text-orange-500" />
                            예약중으로 변경
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => changePostStatus('sold')}>
                            <Tag className="w-4 h-4 mr-2 text-gray-500" />
                            판매완료로 변경
                          </DropdownMenuItem>
                        </>
                      )}
                      {post.status === 'reserved' && (
                        <>
                          <DropdownMenuItem onClick={() => changePostStatus('active')}>
                            <Tag className="w-4 h-4 mr-2 text-green-500" />
                            판매중으로 변경
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => changePostStatus('sold')}>
                            <Tag className="w-4 h-4 mr-2 text-gray-500" />
                            판매완료로 변경
                          </DropdownMenuItem>
                        </>
                      )}
                      {post.status === 'sold' && (
                        <DropdownMenuItem onClick={() => changePostStatus('active')}>
                          <Tag className="w-4 h-4 mr-2 text-green-500" />
                          판매중으로 변경
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  {isAdmin && (
                    <>
                      {isAuthor && <DropdownMenuSeparator />}
                      <DropdownMenuItem onClick={requestToggleHidden}>
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
                          onClick={requestDeletePost}
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

        {/* Images - 스와이프 슬라이더 */}
        {post.images && post.images.length > 0 && (
          <div className="relative">
            <div
              ref={sliderRef}
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
              onScroll={handleSliderScroll}
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {post.images.map((image, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 w-full aspect-square bg-background relative snap-center cursor-pointer"
                  onClick={() => setIsGalleryOpen(true)}
                >
                  <Image
                    src={image}
                    alt={`${post.title} ${idx + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-contain"
                    priority={idx === 0}
                  />
                </div>
              ))}
            </div>

            {/* Image counter */}
            {post.images.length > 1 && (
              <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded">
                {selectedImageIndex + 1} / {post.images.length}
              </div>
            )}

            {/* Bottom indicators */}
            {post.images.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                {post.images.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === selectedImageIndex ? 'bg-foreground' : 'bg-foreground/30'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {/* Author Info */}
          <Link
            href={`/profile/${post.author_id}`}
            className="flex items-center gap-3 mb-4"
          >
            <UserAvatar
              src={post.profiles.avatar_url}
              alt={post.profiles.full_name || '사용자'}
              breadLevel={post.profiles.bread_level}
              size="lg"
            />

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {post.profiles.full_name || '익명'}
                </span>
                <span className="text-lg">
                  {getBreadEmoji(post.profiles.bread_level, post.profiles.user_role || undefined)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {getCityNameInKorean(post.city)} · {formatTimeAgo(post.created_at)}
              </div>
            </div>
          </Link>

          {/* Title & Price */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
            <div className="text-3xl font-bold text-primary">
              {post.price === 0 || post.price === null
                ? '무료나눔'
                : `${post.price.toLocaleString()}₽`}
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex gap-2 mb-4">
            {post.status === 'reserved' && (
              <div className="inline-block px-3 py-1 bg-orange-500/10 text-orange-700 rounded-full text-sm font-medium">
                예약중
              </div>
            )}
            {post.status === 'sold' && (
              <div className="inline-block px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm font-medium">
                판매완료
              </div>
            )}
            {post.is_hidden && isAdmin && (
              <div className="inline-block px-3 py-1 bg-destructive/10 text-destructive rounded-full text-sm font-medium flex items-center gap-1">
                <EyeOff className="w-4 h-4" />
                숨김 (관리자만 표시)
              </div>
            )}
          </div>

          {/* Description */}
          <div className="prose prose-sm max-w-none mb-6 whitespace-pre-wrap">
            {post.description}
          </div>

          {/* Details */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground w-24">카테고리</span>
              <span className="font-medium">{getCategoryLabel(post.category)}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground w-24">거래 지역</span>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-secondary rounded-md text-xs">
                  {getCityNameInKorean(post.city)}
                </span>
                {post.preferred_metro_stations && post.preferred_metro_stations.length > 0 && (
                  post.preferred_metro_stations.map((station) => {
                    const stationInfo = getMetroStationInfo(station)
                    if (!stationInfo) return null

                    return (
                      <span
                        key={station}
                        className="px-2 py-1 rounded-md text-xs flex items-center gap-1.5"
                        style={{
                          backgroundColor: `${stationInfo.lineColor}20`,
                          border: `1px solid ${stationInfo.lineColor}`,
                          color: stationInfo.lineColor
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: stationInfo.lineColor }}
                        />
                        {stationInfo.koreanName}
                      </span>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* 좋아요/관심/조회수 버튼 */}
          <div className="mb-6">
            <div className="flex gap-4 items-center">
              <button
                onClick={toggleLike}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                aria-label="좋아요"
              >
                <Heart
                  className={`w-5 h-5 ${post.user_liked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
                />
                {post.likes_count > 0 && (
                  <span className={post.user_liked ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
                    {post.likes_count}
                  </span>
                )}
              </button>

              <button
                onClick={toggleInterest}
                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                aria-label="관심 등록"
              >
                <Bookmark
                  className={`w-5 h-5 ${post.user_interested ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
                />
                {post.interests_count > 0 && (
                  <span className={post.user_interested ? 'text-primary font-medium' : 'text-muted-foreground'}>
                    {post.interests_count}
                  </span>
                )}
              </button>

              {currentUserRole === 'developer' && (
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <span>조회</span>
                  <span>{post.view_count || 0}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 채팅하기 버튼 */}
        {!isAuthor && post.status !== 'sold' && (
          <div className="px-4 pb-6">
            <Button
              onClick={startChat}
              disabled={isStartingChat}
              className="w-full h-11"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              {isStartingChat ? getRandomLoadingMessage() : '채팅하기'}
            </Button>
          </div>
        )}
      </div>

      {/* 신고 다이얼로그 */}
      <ReportDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        targetType="post"
        targetId={postId}
      />

      {/* 삭제 확인 다이얼로그 */}
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

      {/* 숨김 확인 다이얼로그 */}
      <AlertDialog open={showHiddenConfirm} onOpenChange={setShowHiddenConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>게시글 {post?.is_hidden ? '표시' : '숨김'}</AlertDialogTitle>
            <AlertDialogDescription>
              {post?.is_hidden
                ? '이 게시글을 다시 표시하시겠습니까?'
                : '이 게시글을 숨기시겠습니까? 숨긴 게시글은 관리자만 볼 수 있습니다.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggleHidden}>
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 이미지 갤러리 모달 */}
      {isGalleryOpen && post && post.images.length > 0 && (
        <ImageGalleryModal
          images={post.images}
          currentIndex={selectedImageIndex}
          onClose={() => setIsGalleryOpen(false)}
        />
      )}
    </div>
  )
}
