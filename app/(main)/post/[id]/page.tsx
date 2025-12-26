'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, MapPin, Clock, MessageCircle, Heart, MoreVertical, Edit, Trash2, Bookmark, EyeOff, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { CATEGORIES, TRADE_METHODS, MOSCOW_METRO_STATIONS, SPB_METRO_STATIONS } from '@/lib/constants'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { getRandomLoadingMessage } from '@/lib/loading-messages'
import { getBreadInfo, getBreadEmoji } from '@/lib/bread'
import { getCache, setCache } from '@/lib/cache'

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
  profiles: {
    full_name: string | null
    avatar_url: string | null
    matryoshka_level: number
    user_role: string | null
  }
  likes_count: number
  interests_count: number
  user_liked: boolean
  user_interested: boolean
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string

  const [post, setPost] = useState<Post | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [isStartingChat, setIsStartingChat] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

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

      // 캐시 확인 (5분 TTL)
      const cacheKey = `cache_post_detail_${postId}`
      const cached = getCache<Post>(cacheKey, 5 * 60 * 1000)
      if (cached) {
        console.log('게시글 상세 캐시 히트')
        setPost(cached)
        setIsLoading(false)
        return
      }

      // Get current user's role
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user.id)
        .single()

      setCurrentUserRole(currentUserProfile?.user_role || null)

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
          profiles!posts_author_id_fkey (
            full_name,
            avatar_url,
            matryoshka_level,
            user_role
          )
        `)
        .eq('id', postId)
        .single()

      if (postError) {
        console.error('Post fetch error:', postError)
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
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function startChat() {
    if (!post) return

    try {
      setIsStartingChat(true)
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Call the database function to get or create chat room
      const { data, error } = await supabase.rpc('get_or_create_chat_room', {
        p_user1_id: user.id,
        p_user2_id: post.author_id,
        p_post_id: postId,
      })

      if (error) {
        console.error('Chat room creation error:', error)
        return
      }

      // Navigate to chat room
      router.push(`/chats/${data}`)
    } catch (err) {
      console.error('Start chat error:', err)
    } finally {
      setIsStartingChat(false)
    }
  }

  async function deletePost() {
    if (!post || !confirm('정말로 이 게시글을 삭제하시겠습니까?')) return

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
          console.error('Image deletion error:', storageError)
        }
      }

      // Delete post from database
      const { error: postError } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (postError) {
        console.error('Post deletion error:', postError)
        alert('게시글 삭제 중 오류가 발생했습니다')
        return
      }

      // Navigate to feed
      router.push('/feed')
      router.refresh()
    } catch (err) {
      console.error('Delete error:', err)
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
        .from('posts')
        .update({
          is_hidden: willHide,
          hidden_at: willHide ? new Date().toISOString() : null,
          hidden_by: willHide ? currentUserId : null,
        })
        .eq('id', postId)

      if (error) {
        console.error('Toggle hidden error:', error)
        alert('게시글 숨김 처리 중 오류가 발생했습니다')
        return
      }

      // Refresh post data
      fetchPost()
    } catch (err) {
      console.error('Toggle hidden error:', err)
      alert('게시글 숨김 처리 중 오류가 발생했습니다')
    }
  }

  async function toggleLike() {
    if (!post) return

    try {
      const currentLiked = post.user_liked

      // 낙관적 업데이트
      setPost({
        ...post,
        user_liked: !currentLiked,
        likes_count: currentLiked ? post.likes_count - 1 : post.likes_count + 1
      })

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

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
      console.error('Toggle like error:', err)
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
    if (!post) return

    try {
      const currentInterested = post.user_interested

      // 낙관적 업데이트
      setPost({
        ...post,
        user_interested: !currentInterested,
        interests_count: currentInterested ? post.interests_count - 1 : post.interests_count + 1
      })

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

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
      console.error('Toggle interest error:', err)
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

  const getCategoryLabel = (value: string) => {
    const category = CATEGORIES.find((cat) => cat.value === value)
    return category?.label || value
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
    if (!touchStart || !touchEnd || !post) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      // 왼쪽으로 스와이프 = 다음 이미지
      setSelectedImageIndex((prev) =>
        prev === post.images.length - 1 ? 0 : prev + 1
      )
    }
    if (isRightSwipe) {
      // 오른쪽으로 스와이프 = 이전 이미지
      setSelectedImageIndex((prev) =>
        prev === 0 ? post.images.length - 1 : prev - 1
      )
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <div className="max-w-4xl mx-auto">
          {/* Header Skeleton */}
          <div className="sticky top-0 z-40 bg-background border-b border-border">
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
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
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
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">중고거래</h1>
            {canManage ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
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
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="w-10" />
            )}
          </div>
        </div>

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <div className="relative">
            <div
              className="aspect-square bg-muted relative"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <Image
                src={post.images[selectedImageIndex]}
                alt={post.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-contain"
                priority={selectedImageIndex === 0}
              />
            </div>

            {/* Previous/Next buttons */}
            {post.images.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImageIndex((prev) =>
                    prev === 0 ? post.images.length - 1 : prev - 1
                  )}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSelectedImageIndex((prev) =>
                    prev === post.images.length - 1 ? 0 : prev + 1
                  )}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Image indicators */}
            {post.images.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                {post.images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === selectedImageIndex
                        ? 'bg-white'
                        : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Image counter */}
            {post.images.length > 1 && (
              <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded">
                {selectedImageIndex + 1} / {post.images.length}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {/* Author Info */}
          <Link
            href={`/profile/${post.author_id}`}
            className="flex items-center gap-3 mb-4 pb-4 border-b border-border"
          >
            {post.profiles.avatar_url ? (
              <div className="w-12 h-12 rounded-full overflow-hidden relative flex-shrink-0">
                <Image
                  src={post.profiles.avatar_url}
                  alt={post.profiles.full_name || '사용자'}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold">
                {post.profiles.full_name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {post.profiles.full_name || '익명'}
                </span>
                <span className="text-lg">
                  {getBreadEmoji(post.profiles.matryoshka_level, post.profiles.user_role || undefined)}
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
          <div className="prose prose-sm max-w-none mb-6 whitespace-pre-wrap border-b border-border pb-6">
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
                    const stationInfo = getMetroStationInfo(station, post.city)
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

          {/* 좋아요/관심 버튼 */}
          <div className="border-t border-border pt-4 mb-6">
            <div className="flex gap-4">
              <button
                onClick={toggleLike}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <Heart
                  className={`w-5 h-5 ${post.user_liked ? 'fill-red-500 text-red-500' : ''}`}
                />
                {post.likes_count > 0 && (
                  <span className={post.user_liked ? 'text-red-500 font-medium' : ''}>
                    {post.likes_count}
                  </span>
                )}
              </button>

              <button
                onClick={toggleInterest}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <Bookmark
                  className={`w-5 h-5 ${post.user_interested ? 'fill-primary text-primary' : ''}`}
                />
                {post.interests_count > 0 && (
                  <span className={post.user_interested ? 'text-primary font-medium' : ''}>
                    {post.interests_count}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        {!isAuthor && post.status !== 'sold' && (
          <div className="fixed bottom-16 left-0 right-0 bg-background border-t border-border p-4 z-30">
            <div className="max-w-4xl mx-auto flex gap-2">
              <Button
                onClick={startChat}
                disabled={isStartingChat}
                className="flex-1 h-14 text-lg"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                {isStartingChat ? getRandomLoadingMessage() : '채팅하기'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
