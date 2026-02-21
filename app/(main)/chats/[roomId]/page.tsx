'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Page')
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Bell, BellOff, ChevronDown, ChevronLeft, ImagePlus, Loader2, Package, Plus, RotateCw, Send, Wifi, WifiOff, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { useMessages, type ChatConnectionStatus } from '@/lib/hooks/useMessages'
import { useAppointment } from '@/lib/hooks/useAppointment'
import { useSale } from '@/lib/hooks/useSale'
import Link from 'next/link'
import type { ChatRoomWithProfile } from '@/types/chat'
import { getRandomLoadingMessage } from '@/lib/loading-messages'
import { getBreadInfo, getBreadEmoji } from '@/lib/bread'
import { AppointmentProposalForm } from '@/components/chat/AppointmentProposalForm'
import { AppointmentCard } from '@/components/chat/AppointmentCard'
import { CompleteSaleButton } from '@/components/chat/CompleteSaleButton'
import { ReviewModal } from '@/components/review/ReviewModal'
import { getPostStatusInfo, type PostStatus } from '@/lib/post-status'
import { toast } from 'sonner'
import { cleanupUploadedPostImages, createClientId, uploadPostImagesWithRetry } from '@/lib/post-image-upload'

type PostWithImages = { images?: string[] | string | null } | null | undefined
const urlPattern = /(https?:\/\/[^\s]+)/gi
const CHAT_MAX_IMAGE_FILES = 5

function renderMessageContent(content: string) {
  return content.split(urlPattern).map((part, index) => {
    const isUrl = /^https?:\/\//i.test(part)

    if (isUrl) {
      return (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noreferrer"
        >
          {part}
        </a>
      )
    }

    return <span key={`${index}-${part.slice(0, 8)}`}>{part}</span>
  })
}

function getPostThumbnailUrl(post: PostWithImages): string | null {
  const images = post?.images

  if (Array.isArray(images)) {
    const url = images.find((img) => typeof img === 'string' && img.trim().length > 0)
    return url || null
  }

  if (typeof images === 'string') {
    const trimmed = images.trim()
    if (!trimmed) return null

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          const url = parsed.find((img) => typeof img === 'string' && img.trim().length > 0)
          return url || null
        }
      } catch {
        return null
      }
    }

    return trimmed
  }

  return null
}

function getConnectionStatusMeta(status: ChatConnectionStatus) {
  switch (status) {
    case 'live':
      return {
        label: '실시간 연결',
        textClassName: 'text-emerald-600',
        bgClassName: 'bg-emerald-50',
        Icon: Wifi,
        iconClassName: 'h-3 w-3',
      }
    case 'reconnecting':
      return {
        label: '재연결 중',
        textClassName: 'text-amber-600',
        bgClassName: 'bg-amber-50',
        Icon: RotateCw,
        iconClassName: 'h-3 w-3 animate-spin',
      }
    case 'offline':
      return {
        label: '오프라인',
        textClassName: 'text-rose-600',
        bgClassName: 'bg-rose-50',
        Icon: WifiOff,
        iconClassName: 'h-3 w-3',
      }
    default:
      return {
        label: '연결 중',
        textClassName: 'text-sky-600',
        bgClassName: 'bg-sky-50',
        Icon: RotateCw,
        iconClassName: 'h-3 w-3 animate-spin',
      }
  }
}

export default function ChatRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string

  const [room, setRoom] = useState<ChatRoomWithProfile | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [isChatInfoHidden, setIsChatInfoHidden] = useState(false)
  const [pendingMessageCount, setPendingMessageCount] = useState(0)
  const [showComposerTools, setShowComposerTools] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([])
  const [pendingImagePreviewUrls, setPendingImagePreviewUrls] = useState<string[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const previousMessagesMetaRef = useRef<{ firstId: string | null; lastId: string | null; count: number }>({
    firstId: null,
    lastId: null,
    count: 0,
  })
  const keyboardRafRef = useRef<number | null>(null)
  const scrollRafRef = useRef<number | null>(null)
  const scrollIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastMessagesScrollTopRef = useRef(0)
  const isLoadingOlderRef = useRef(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')
  const [isRequestingNotificationPermission, setIsRequestingNotificationPermission] = useState(false)

  const {
    messages,
    isLoading: isMessagesLoading,
    isSending,
    connectionStatus,
    hasOlderMessages,
    isLoadingOlder,
    loadOlderMessages,
    sendMessage,
  } = useMessages(roomId)
  const { appointment, proposeAppointment, respondToAppointment } = useAppointment(roomId)
  const { createReviewAndCompleteSale } = useSale()

  const fetchRoom = useCallback(async () => {
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

      // Get chat room
      const { data: roomData, error: roomError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (roomError) {
        logger.error('Room fetch error:', roomError)
        router.push('/chats')
        return
      }

      // Get other user's profile
      const otherUserId = roomData.user1_id === user.id ? roomData.user2_id : roomData.user1_id

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bread_level, user_role')
        .eq('id', otherUserId)
        .single()

      // Get related post if exists
      let postData = null
      if (roomData.post_id) {
        const { data } = await supabase
          .from('posts')
          .select('id, title, price, images, status, author_id, preferred_metro_stations')
          .eq('id', roomData.post_id)
          .single()

        postData = data
      }

      setRoom({
        ...roomData,
        other_user: profileData || {
          id: otherUserId,
          full_name: null,
          avatar_url: null,
          bread_level: 0,
          user_role: null
        },
        unread_count: 0,
        post: postData,
      })
    } catch (err) {
      logger.error('Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [roomId, router])

  useEffect(() => {
    setIsInitialLoad(true)
    setPendingMessageCount(0)
    setIsAtBottom(true)
    setIsChatInfoHidden(false)
    setShowComposerTools(false)
    setPendingImageFiles([])
    lastMessagesScrollTopRef.current = 0
    previousMessagesMetaRef.current = { firstId: null, lastId: null, count: 0 }
    fetchRoom()
  }, [fetchRoom])

  const isNearBottom = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return true

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    return distanceFromBottom < 120
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' })
    setPendingMessageCount(0)
    setIsAtBottom(true)
  }, [])

  const handleLoadOlderMessages = useCallback(async () => {
    if (!hasOlderMessages || isLoadingOlder || isLoadingOlderRef.current) return

    const container = messagesContainerRef.current
    const previousScrollHeight = container?.scrollHeight ?? 0
    const previousScrollTop = container?.scrollTop ?? 0

    isLoadingOlderRef.current = true
    await loadOlderMessages()

    requestAnimationFrame(() => {
      const currentContainer = messagesContainerRef.current
      if (!currentContainer) return

      const nextScrollHeight = currentContainer.scrollHeight
      currentContainer.scrollTop = nextScrollHeight - previousScrollHeight + previousScrollTop
    })

    isLoadingOlderRef.current = false
  }, [hasOlderMessages, isLoadingOlder, loadOlderMessages])

  useEffect(() => {
    isLoadingOlderRef.current = isLoadingOlder
  }, [isLoadingOlder])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      if (scrollRafRef.current !== null) return

      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null
        const currentScrollTop = container.scrollTop
        const scrollDiff = currentScrollTop - lastMessagesScrollTopRef.current
        const hasMeaningfulDownScroll = scrollDiff > 8
        const hasMeaningfulUpScroll = scrollDiff < -5

        if (currentScrollTop < 16 || hasMeaningfulUpScroll) {
          setIsChatInfoHidden(false)
        } else if (hasMeaningfulDownScroll) {
          setIsChatInfoHidden(true)
        }

        lastMessagesScrollTopRef.current = currentScrollTop
        const nearBottom = isNearBottom()
        setIsAtBottom(nearBottom)

        if (nearBottom) {
          setPendingMessageCount(0)
        }

        if (scrollIdleTimerRef.current) {
          clearTimeout(scrollIdleTimerRef.current)
        }
        scrollIdleTimerRef.current = setTimeout(() => {
          setIsChatInfoHidden(false)
        }, 180)
      })
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current)
      }
      if (scrollIdleTimerRef.current) {
        clearTimeout(scrollIdleTimerRef.current)
      }
    }
  }, [roomId, isNearBottom])

  useEffect(() => {
    if (!hasOlderMessages) return

    const container = messagesContainerRef.current
    const sentinel = topSentinelRef.current
    if (!container || !sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadOlderMessages()
        }
      },
      {
        root: container,
        rootMargin: '120px 0px 0px 0px',
      }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasOlderMessages, handleLoadOlderMessages, messages.length])

  useEffect(() => {
    const firstId = messages[0]?.id ?? null
    const lastId = messages[messages.length - 1]?.id ?? null
    const previousMeta = previousMessagesMetaRef.current

    if (messages.length === 0) {
      previousMessagesMetaRef.current = { firstId, lastId, count: 0 }
      return
    }

    if (previousMeta.count === 0) {
      requestAnimationFrame(() => {
        scrollToBottom('auto')
      })
      setIsInitialLoad(false)
      previousMessagesMetaRef.current = { firstId, lastId, count: messages.length }
      return
    }

    const hasAppendedMessages =
      previousMeta.lastId !== null &&
      lastId !== null &&
      previousMeta.lastId !== lastId

    if (hasAppendedMessages) {
      const addedCount = Math.max(messages.length - previousMeta.count, 1)

      if (isAtBottom || isInitialLoad) {
        scrollToBottom(isInitialLoad ? 'auto' : 'smooth')
        if (isInitialLoad) {
          setIsInitialLoad(false)
        }
      } else {
        setPendingMessageCount((count) => count + addedCount)
      }
    }

    previousMessagesMetaRef.current = { firstId, lastId, count: messages.length }
  }, [messages, isAtBottom, isInitialLoad, scrollToBottom])

  // iOS 키보드 대응 - visualViewport 높이 기반으로 실제 보이는 영역을 사용
  useEffect(() => {
    if (typeof window === 'undefined') return

    const viewport = window.visualViewport
    if (!viewport) return

    const handleViewportChange = () => {
      if (keyboardRafRef.current !== null) {
        cancelAnimationFrame(keyboardRafRef.current)
      }

      keyboardRafRef.current = requestAnimationFrame(() => {
        const visibleHeight = Math.max(viewport.height, 320)
        setViewportHeight(visibleHeight)
        const keyboardDelta = Math.max(window.innerHeight - viewport.height - viewport.offsetTop, 0)
        setKeyboardHeight(keyboardDelta > 50 ? keyboardDelta : 0)
      })
    }

    handleViewportChange()
    viewport.addEventListener('resize', handleViewportChange)
    viewport.addEventListener('scroll', handleViewportChange)

    return () => {
      viewport.removeEventListener('resize', handleViewportChange)
      viewport.removeEventListener('scroll', handleViewportChange)
      if (keyboardRafRef.current !== null) {
        cancelAnimationFrame(keyboardRafRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isInputFocused) return

    const timer = setTimeout(() => {
      scrollToBottom('auto')
    }, 80)

    return () => clearTimeout(timer)
  }, [keyboardHeight, isInputFocused, scrollToBottom])

  useEffect(() => {
    const nextPreviewUrls = pendingImageFiles.map((file) => URL.createObjectURL(file))
    setPendingImagePreviewUrls(nextPreviewUrls)

    return () => {
      nextPreviewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [pendingImageFiles])

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported')
      return
    }
    setNotificationPermission(Notification.permission)
  }, [])

  const adjustMessageInputHeight = useCallback(() => {
    const textarea = messageInputRef.current
    if (!textarea) return

    textarea.style.height = '0px'
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 24), 120)
    textarea.style.height = `${nextHeight}px`
  }, [])

  useEffect(() => {
    adjustMessageInputHeight()
  }, [newMessage, adjustMessageInputHeight])

  const handleRequestBrowserNotifications = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('이 브라우저는 알림을 지원하지 않습니다')
      return
    }

    try {
      setIsRequestingNotificationPermission(true)
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)

      if (permission === 'granted') {
        toast.success('채팅 알림을 켰습니다')
      } else if (permission === 'denied') {
        toast.error('브라우저 설정에서 알림 허용 후 사용할 수 있습니다')
      }
    } finally {
      setIsRequestingNotificationPermission(false)
    }
  }, [])

  const openImagePicker = useCallback(() => {
    imageInputRef.current?.click()
  }, [])

  const removePendingImage = useCallback((indexToRemove: number) => {
    setPendingImageFiles((prev) => prev.filter((_, index) => index !== indexToRemove))
  }, [])

  const handleSelectImages = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (selectedFiles.length === 0) return

    const onlyImageFiles = selectedFiles.filter((file) => file.type.startsWith('image/'))
    if (onlyImageFiles.length < selectedFiles.length) {
      toast.error('이미지 파일만 첨부할 수 있습니다')
    }

    setPendingImageFiles((prev) => {
      const remainingSlots = CHAT_MAX_IMAGE_FILES - prev.length
      if (remainingSlots <= 0) {
        toast.error(`이미지는 최대 ${CHAT_MAX_IMAGE_FILES}장까지 첨부할 수 있습니다`)
        return prev
      }

      const accepted = onlyImageFiles.slice(0, remainingSlots)
      if (onlyImageFiles.length > remainingSlots) {
        toast.error(`이미지는 최대 ${CHAT_MAX_IMAGE_FILES}장까지 첨부할 수 있습니다`)
      }

      return [...prev, ...accepted]
    })
  }, [])

  async function handleSendMessage() {
    const trimmedMessage = newMessage.trim()
    if ((!trimmedMessage && pendingImageFiles.length === 0) || !currentUserId) return

    const supabase = createClient()
    let uploadedImagePaths: string[] = []
    let uploadedImageUrls: string[] = []

    try {
      if (pendingImageFiles.length > 0) {
        setIsUploadingImages(true)
        const uploadBatchId = createClientId()
        const uploadedImages = await uploadPostImagesWithRetry({
          supabase,
          userId: currentUserId,
          scope: 'chat',
          entityId: `${roomId}-${uploadBatchId}`,
          files: pendingImageFiles,
        })

        uploadedImagePaths = uploadedImages.map((item) => item.path)
        uploadedImageUrls = uploadedImages.map((item) => item.url)
      }

      const success = await sendMessage({
        senderId: currentUserId,
        content: trimmedMessage,
        imageUrls: uploadedImageUrls,
      })

      if (!success) {
        await cleanupUploadedPostImages(supabase, uploadedImagePaths)
        toast.error('메시지 전송에 실패했습니다')
        return
      }

      setNewMessage('')
      setPendingImageFiles([])
      setShowComposerTools(false)
      requestAnimationFrame(() => {
        scrollToBottom('smooth')
      })
    } catch (error) {
      logger.error('Send message with images error:', error)
      await cleanupUploadedPostImages(supabase, uploadedImagePaths)
      toast.error(error instanceof Error ? error.message : '사진 전송 중 오류가 발생했습니다')
    } finally {
      setIsUploadingImages(false)
    }
  }

  async function handleCreateReview(
    postId: string,
    reviewerId: string,
    revieweeId: string,
    rating: number,
    comment?: string
  ) {
    if (!room?.post || !currentUserId) return

    try {
      // 리뷰 작성 및 판매완료 처리를 동시에 수행
      await createReviewAndCompleteSale(
        room.post.id,
        roomId,
        room.other_user.id, // buyerId
        currentUserId, // sellerId
        rating,
        comment
      )
      // 채팅방 정보 다시 불러오기
      await fetchRoom()
    } catch (error) {
      throw error
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 판매자인지 확인
  const isSeller = room?.post?.author_id === currentUserId
  // 구매자인지 확인
  const isBuyer = !isSeller && room?.post
  // 판매완료 여부
  const isSold = room?.post?.status === 'sold'
  // 약속 확정 여부
  const isAppointmentConfirmed = appointment?.status === 'confirmed'
  const hasActiveAppointment = appointment?.status === 'proposed' || appointment?.status === 'confirmed'
  const canProposeAppointment = Boolean(isBuyer && !isSold && currentUserId && room?.post && room.post.author_id)
  const postThumbnailUrl = room?.post ? getPostThumbnailUrl(room.post) : null
  const connectionStatusMeta = getConnectionStatusMeta(connectionStatus)
  const ConnectionStatusIcon = connectionStatusMeta.Icon
  const showEnableNotificationButton =
    notificationPermission !== 'unsupported' && notificationPermission !== 'granted'
  const quickMessageTemplates = useMemo(() => {
    const postTitle = room?.post?.title?.trim() || '상품'
    const priceLabel =
      room?.post?.price === 0 || room?.post?.price === null || room?.post?.price === undefined
        ? '무료나눔'
        : `${room.post.price.toLocaleString()}₽`

    if (isSeller) {
      return [
        `안녕하세요! ${postTitle} 문의 주셔서 감사합니다 🙌`,
        '거래 가능한 시간은 오늘 저녁/내일 오전입니다. 편한 시간을 알려주세요.',
        '원하시면 제품 상태를 확인할 수 있게 추가 사진을 보내드릴게요.',
      ]
    }

    return [
      `안녕하세요! ${postTitle}(${priceLabel}) 아직 거래 가능할까요?`,
      '오늘 저녁 또는 내일 오전에 거래 가능하실까요?',
      '거래 가능한 장소를 알려주시면 맞춰서 이동할게요.',
    ]
  }, [isSeller, room?.post?.price, room?.post?.title])
  const insertMessageTemplate = useCallback(
    (template: string) => {
      setNewMessage((prev) => (prev.trim().length > 0 ? `${prev.trim()}\n${template}` : template))
      setShowComposerTools(false)
      requestAnimationFrame(() => {
        messageInputRef.current?.focus()
        scrollToBottom('smooth')
      })
    },
    [scrollToBottom]
  )
  const canSendMessage = (newMessage.trim().length > 0 || pendingImageFiles.length > 0) && !isSending && !isUploadingImages
  const showFloatingAppointment = Boolean(appointment && currentUserId)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">{getRandomLoadingMessage()}</div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">채팅방을 찾을 수 없습니다</p>
          <Button onClick={() => router.push('/chats')}>
            채팅 목록으로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col bg-background"
      style={{ height: viewportHeight ? `${viewportHeight}px` : '100dvh' }}
    >
      {/* Header / Product info */}
      <div className="flex-shrink-0 border-b border-border bg-background">
        <div
          className={`overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out ${
            isChatInfoHidden
              ? 'max-h-0 opacity-0 -translate-y-1 pointer-events-none'
              : 'max-h-[120px] opacity-100 translate-y-0'
          }`}
        >
          <div className="max-w-screen-xl mx-auto">
            <div className="flex items-center gap-2 px-4 py-2.5">
              <Link href={`/profile/${room.other_user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                {room.other_user.avatar_url ? (
                  <img
                    src={room.other_user.avatar_url}
                    alt={room.other_user.full_name || '사용자'}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {room.other_user.full_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold flex items-center gap-1">
                    <span className="truncate">{room.other_user.full_name || '익명'}</span>
                    <span className="text-base">
                      {getBreadEmoji(room.other_user.bread_level || 1, room.other_user.user_role || undefined)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getBreadInfo(room.other_user.bread_level || 1, room.other_user.user_role || undefined).name}
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-1.5">
                <div
                  className={`hidden sm:flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${connectionStatusMeta.textClassName} ${connectionStatusMeta.bgClassName}`}
                >
                  <ConnectionStatusIcon className={connectionStatusMeta.iconClassName} />
                  <span>{connectionStatusMeta.label}</span>
                </div>

                {showEnableNotificationButton && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={handleRequestBrowserNotifications}
                    disabled={isRequestingNotificationPermission}
                  >
                    {notificationPermission === 'denied' ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  </Button>
                )}
              </div>

              {isSeller && isAppointmentConfirmed && !isSold && currentUserId && room.post && (
                <CompleteSaleButton onReviewRequest={() => setShowReviewModal(true)} />
              )}
            </div>
          </div>
        </div>

        <div className="max-w-screen-xl mx-auto">
          {room.post ? (
            <div className="flex items-center gap-2 border-t border-border/60 px-3 py-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="h-8 w-8 shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <Link
                href={`/post/${room.post.id}`}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-muted transition-colors"
              >
                {postThumbnailUrl ? (
                  <img
                    src={postThumbnailUrl}
                    alt={room.post.title}
                    className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{room.post.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>
                      {room.post.price === 0 || room.post.price === null
                        ? '무료나눔'
                        : `${room.post.price.toLocaleString()}₽`}
                    </span>
                    {room.post.status && (
                      <span className={`px-1.5 py-0.5 rounded-full ${getPostStatusInfo(room.post.status as PostStatus).bgColor} ${getPostStatusInfo(room.post.status as PostStatus).textColor} font-medium`}>
                        {getPostStatusInfo(room.post.status as PostStatus).label}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="h-8 w-8 shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-sm font-medium truncate">
                {room.other_user.full_name || '익명'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Messages - inner scroll */}
      <div className="relative flex-1">
        {appointment && currentUserId && (
          <div className="pointer-events-none absolute inset-x-3 top-2 z-20">
            <AppointmentCard
              appointment={appointment}
              currentUserId={currentUserId}
              onRespond={respondToAppointment}
              compact
              className="pointer-events-auto"
            />
          </div>
        )}

        <div ref={messagesContainerRef} className="h-full overflow-y-auto overscroll-none">
          <div className={`max-w-screen-xl mx-auto p-4 ${showFloatingAppointment ? 'pt-24' : ''}`}>
            <div ref={topSentinelRef} className="h-px" />

            {isLoadingOlder && (
              <div className="flex items-center justify-center py-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-xs">이전 메시지 불러오는 중...</span>
              </div>
            )}

            {hasOlderMessages && !isLoadingOlder && messages.length > 0 && (
              <div className="flex justify-center pb-3">
                <button
                  type="button"
                  onClick={handleLoadOlderMessages}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  이전 메시지 더 보기
                </button>
              </div>
            )}

            {isMessagesLoading && messages.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">메시지를 불러오는 중...</span>
              </div>
            ) : messages.length === 0 && !appointment ? (
              <div className="text-center py-16 text-muted-foreground">
                메시지를 보내서 대화를 시작해보세요
              </div>
            ) : (
              <div className="space-y-0">
                {connectionStatus !== 'live' && (
                  <div className="sticky top-2 z-10 flex justify-center mb-3">
                    <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${connectionStatusMeta.textClassName} ${connectionStatusMeta.bgClassName}`}>
                      <ConnectionStatusIcon className={connectionStatusMeta.iconClassName} />
                      {connectionStatusMeta.label}
                    </div>
                  </div>
                )}

                {/* 메시지 목록 */}
                {messages.map((message, index) => {
                  const isOwnMessage = message.sender_id === currentUserId
                  const previousMessage = messages[index - 1]
                  const nextMessage = messages[index + 1]
                  const showDate = index === 0 ||
                    new Date(previousMessage.created_at).toDateString() !==
                    new Date(message.created_at).toDateString()
                  const groupedWithPrevious =
                    !!previousMessage &&
                    previousMessage.sender_id === message.sender_id &&
                    new Date(message.created_at).getTime() - new Date(previousMessage.created_at).getTime() < 5 * 60 * 1000
                  const groupedWithNext =
                    !!nextMessage &&
                    nextMessage.sender_id === message.sender_id &&
                    new Date(nextMessage.created_at).getTime() - new Date(message.created_at).getTime() < 5 * 60 * 1000
                  const showSenderName = !isOwnMessage && !groupedWithPrevious
                  const showAvatar = !isOwnMessage && !groupedWithNext
                  const showMessageMeta = !groupedWithNext
                  const messageImageUrls = Array.isArray(message.image_urls)
                    ? message.image_urls.filter((url) => typeof url === 'string' && url.trim().length > 0)
                    : []
                  const hasMessageImages = messageImageUrls.length > 0
                  const showTextContent = message.content.trim().length > 0

                  return (
                    <div
                      key={message.id}
                      style={{
                        contentVisibility: 'auto',
                        containIntrinsicSize: '120px',
                      }}
                    >
                      {showDate && (
                        <div className="text-center my-4">
                          <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                            {new Date(message.created_at).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      )}

                      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${groupedWithPrevious ? 'mt-1' : 'mt-3'}`}>
                        <div className={`flex gap-2 max-w-[80%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                          {!isOwnMessage && (
                            <div className="w-8 flex-shrink-0">
                              {showAvatar ? (
                                message.sender.avatar_url ? (
                                  <img
                                    src={message.sender.avatar_url}
                                    alt={message.sender.full_name || '사용자'}
                                    className="w-8 h-8 rounded-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                                    {message.sender.full_name?.charAt(0).toUpperCase() || '?'}
                                  </div>
                                )
                              ) : null}
                            </div>
                          )}
                          <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                            {showSenderName && (
                              <span className="text-xs text-muted-foreground mb-1 px-1">
                                {message.sender.full_name || '익명'}
                              </span>
                            )}
                            {hasMessageImages && (
                              <div
                                className={`grid gap-1.5 overflow-hidden rounded-2xl border ${
                                  messageImageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                                }`}
                              >
                                {messageImageUrls.map((imageUrl, imageIndex) => (
                                  <a
                                    key={`${message.id}-image-${imageIndex}`}
                                    href={imageUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block overflow-hidden bg-muted"
                                  >
                                    <img
                                      src={imageUrl}
                                      alt={`채팅 이미지 ${imageIndex + 1}`}
                                      className="block w-full h-auto max-h-[220px] object-cover"
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  </a>
                                ))}
                              </div>
                            )}
                            {showTextContent && (
                              <div className={`px-3.5 py-2 rounded-2xl ${
                                isOwnMessage
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-secondary'
                              } ${hasMessageImages ? 'mt-1.5' : ''}`}>
                                <p
                                  className={`text-sm whitespace-pre-wrap break-words [&_a]:underline [&_a]:underline-offset-2 [&_a]:font-medium [&_a]:break-all ${
                                    isOwnMessage ? '[&_a]:text-primary-foreground' : '[&_a]:text-primary'
                                  }`}
                                >
                                  {renderMessageContent(message.content)}
                                </p>
                              </div>
                            )}
                            {showMessageMeta && (
                              <div className="flex items-center gap-1 mt-1 px-1">
                                {isOwnMessage && (
                                  <span className="text-xs text-muted-foreground">
                                    {message.is_read ? '읽음' : '안읽음'}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(message.created_at)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {pendingMessageCount > 0 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none">
            <Button
              type="button"
              size="sm"
              onClick={() => scrollToBottom('smooth')}
              className="pointer-events-auto rounded-full shadow-md h-9 px-4"
            >
              새 메시지 {pendingMessageCount}개
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Message Input - 모바일 키보드/안전영역 대응 */}
      <div className="flex-shrink-0 bg-background border-t border-border">
        <div
          className="max-w-screen-xl mx-auto px-3 pt-2"
          style={{
            paddingBottom: keyboardHeight > 0 ? '8px' : 'calc(0.5rem + env(safe-area-inset-bottom))',
          }}
        >
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleSelectImages}
          />

          {canProposeAppointment && room?.post && currentUserId && (
            <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <AppointmentProposalForm
                roomId={roomId}
                postId={room.post.id}
                currentUserId={currentUserId}
                otherUserId={room.other_user.id}
                onPropose={proposeAppointment}
                triggerLabel={hasActiveAppointment ? '약속 다시 제안' : '구매약속 제안'}
                triggerVariant="secondary"
                triggerSize="sm"
                triggerClassName="shrink-0 rounded-full h-8 px-3 text-xs font-medium"
                showTriggerIcon={false}
              />
              {!hasActiveAppointment && quickMessageTemplates.slice(1).map((template) => (
                <Button
                  key={template}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 rounded-full px-3 text-xs font-normal"
                  onClick={() => insertMessageTemplate(template)}
                >
                  {template}
                </Button>
              ))}
            </div>
          )}

          {pendingImageFiles.length > 0 && (
            <div className="mb-2 rounded-2xl border border-border bg-muted/40 p-2.5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-medium text-muted-foreground">
                  첨부 사진 {pendingImageFiles.length}/{CHAT_MAX_IMAGE_FILES}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] text-muted-foreground"
                  onClick={() => setPendingImageFiles([])}
                >
                  모두 삭제
                </Button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {pendingImagePreviewUrls.map((previewUrl, index) => (
                  <div
                    key={`${previewUrl}-${index}`}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
                  >
                    <img
                      src={previewUrl}
                      alt={`첨부 이미지 ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full"
                      onClick={() => removePendingImage(index)}
                      aria-label={`첨부 이미지 ${index + 1} 제거`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showComposerTools && (
            <div className="mb-2 rounded-2xl border border-border bg-muted/40 p-2.5">
              <p className="mb-2 text-[11px] font-medium text-muted-foreground">빠른 도구</p>
              <div className="mb-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full px-3 text-xs font-normal"
                  onClick={openImagePicker}
                  disabled={pendingImageFiles.length >= CHAT_MAX_IMAGE_FILES}
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  사진 추가
                </Button>
              </div>
              <p className="mb-2 text-[11px] font-medium text-muted-foreground">빠른 메시지</p>
              <div className="flex flex-wrap gap-2">
                {quickMessageTemplates.map((template) => (
                  <Button
                    key={template}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full px-3 text-xs font-normal"
                    onClick={() => insertMessageTemplate(template)}
                  >
                    {template}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div
            className={`flex items-end gap-1.5 rounded-2xl border px-2 py-1.5 transition-colors ${
              isInputFocused ? 'border-ring ring-1 ring-ring' : 'border-input'
            }`}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={`h-9 w-9 rounded-full text-muted-foreground ${
                showComposerTools ? 'bg-accent text-foreground' : ''
              }`}
              onClick={() => setShowComposerTools((prev) => !prev)}
              aria-label="빠른 메시지 열기"
            >
              <Plus className="h-5 w-5" />
            </Button>

            <div className="min-w-0 flex-1">
              <Textarea
                ref={messageInputRef}
                placeholder="메시지 보내기"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onFocus={() => {
                  setIsInputFocused(true)
                  requestAnimationFrame(() => {
                    scrollToBottom('smooth')
                  })
                }}
                onBlur={() => setIsInputFocused(false)}
                rows={1}
                className="min-h-[24px] max-h-[120px] resize-none border-0 bg-transparent px-1 py-1 text-[16px] leading-5 focus-visible:ring-0 focus-visible:ring-offset-0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    if (canSendMessage) {
                      handleSendMessage()
                    }
                  }
                }}
              />
            </div>

            <Button
              type="button"
              onClick={handleSendMessage}
              disabled={!canSendMessage}
              size="icon"
              className="h-9 w-9 flex-shrink-0 rounded-full"
            >
              {isUploadingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {currentUserId && room.post && (
        <ReviewModal
          open={showReviewModal}
          onOpenChange={setShowReviewModal}
          postId={room.post.id}
          reviewerId={currentUserId}
          revieweeId={room.other_user.id}
          revieweeName={room.other_user.full_name || '익명'}
          onSubmit={handleCreateReview}
        />
      )}
    </div>
  )
}
