'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Page')
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Bell, BellOff, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ImagePlus, Loader2, Package, Plus, RotateCw, Send, Wifi, WifiOff, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { useMessages, type ChatConnectionStatus } from '@/lib/hooks/useMessages'
import { useAppointment } from '@/lib/hooks/useAppointment'
import { useSale } from '@/lib/hooks/useSale'
import Link from 'next/link'
import type { ChatRoomWithProfile } from '@/types/chat'
import { getRandomLoadingMessage } from '@/lib/loading-messages'
import { getBreadEmoji } from '@/lib/bread'
import { AppointmentProposalForm } from '@/components/chat/AppointmentProposalForm'
import { AppointmentCard } from '@/components/chat/AppointmentCard'
import { ReviewModal } from '@/components/review/ReviewModal'
import { getPostStatusInfo, type PostStatus } from '@/lib/post-status'
import { toast } from 'sonner'
import { cleanupUploadedPostImages, createClientId, uploadPostImagesWithRetry } from '@/lib/post-image-upload'
import type { CreateAppointmentParams } from '@/types/purchase'

type PostWithImages = { images?: string[] | string | null } | null | undefined
type ChatImageViewerState = {
  open: boolean
  images: string[]
  index: number
}
const urlPattern = /(https?:\/\/[^\s]+)/gi
const CHAT_MAX_IMAGE_FILES = 5

const BUYER_QUICK_MESSAGE_POOL = [
  '안녕하세요! {postTitle}({priceLabel}) 아직 거래 가능할까요?',
  '{postTitle} 실사용 기간과 상태를 알려주실 수 있을까요?',
  '혹시 눈에 띄는 하자나 수리 이력은 없을까요?',
  '구성품(박스/충전기/설명서) 포함 여부를 확인하고 싶어요.',
  '추가 사진을 몇 장 더 받을 수 있을까요?',
  '오늘 저녁 거래 가능하시면 시간 맞춰볼게요.',
  '내일 오전 거래도 가능하실까요?',
  '거래 장소를 지하철역 기준으로 맞출 수 있을까요?',
  '가격 제안이 가능한지 여쭤봐도 될까요?',
  '현장 확인 후 바로 거래 가능할 것 같습니다.',
  '예약 가능하다면 언제까지 가능할까요?',
  '혹시 직거래만 가능하신가요?',
  '제품 작동 영상이나 테스트 결과가 있을까요?',
  '사용감이 가장 많은 부분을 사진으로 보여주실 수 있을까요?',
  '거래 전에 궁금한 점을 정리해서 다시 연락드릴게요.',
  '오늘 이동 가능해서 시간만 맞으면 바로 갈 수 있어요.',
  '주말 거래도 가능하신지 확인 부탁드려요.',
  '거래 확정 시 결제 방식은 어떤 걸 선호하시나요?',
  '좋은 물건이라 빠르게 결정하려고 합니다.',
  '가능하시면 구매약속 제안드려도 될까요?',
] as const

const SELLER_QUICK_MESSAGE_POOL = [
  '안녕하세요! {postTitle} 문의 주셔서 감사합니다 🙌',
  '현재 {postTitle}는 거래 가능합니다.',
  '제품 상태는 양호하고, 필요하시면 추가 사진 드릴게요.',
  '오늘 저녁/내일 오전 중 거래 가능한 시간이 있습니다.',
  '원하시면 구매약속으로 시간과 장소를 바로 확정할 수 있어요.',
  '거래 장소는 서로 이동 편한 지하철역으로 맞추겠습니다.',
  '확정하시면 다른 문의는 잠시 보류하고 예약 처리해둘게요.',
  '현장에서 상태 확인 후 거래 진행하셔도 괜찮습니다.',
  '직거래 기준으로 진행하고 있습니다.',
  '빠른 거래 원하시면 가능한 시간을 알려주세요.',
  '가격은 현재 {priceLabel} 기준으로 안내드리고 있어요.',
  '제품 확인 포인트가 있으면 미리 말씀 주세요.',
  '오늘 안에 거래 가능하면 우선순위로 맞춰드리겠습니다.',
  '내일 일정도 조율 가능하니 편한 시간 알려주세요.',
  '필요하신 각도/부분 사진 요청 주시면 바로 찍어드릴게요.',
  '구성품 포함 내역을 다시 한번 정리해드릴까요?',
  '거래 전 궁금하신 점 편하게 물어보세요.',
  '구매 의사 확정되면 구매약속으로 빠르게 진행하겠습니다.',
  '원활한 거래 위해 약속 시간 10분 전 재확인 드릴게요.',
  '좋은 거래가 되도록 끝까지 책임지고 안내드릴게요.',
] as const

function createSeededRng(seedInput: string) {
  let seed = 0
  for (let idx = 0; idx < seedInput.length; idx += 1) {
    seed = (seed * 31 + seedInput.charCodeAt(idx)) | 0
  }

  return () => {
    seed = (seed * 1664525 + 1013904223) | 0
    return (seed >>> 0) / 4294967296
  }
}

function shuffleBySeed<T>(items: readonly T[], seedInput: string): T[] {
  const next = [...items]
  const rng = createSeededRng(seedInput)

  for (let idx = next.length - 1; idx > 0; idx -= 1) {
    const swapIndex = Math.floor(rng() * (idx + 1))
    const temp = next[idx]
    next[idx] = next[swapIndex]
    next[swapIndex] = temp
  }

  return next
}

function applyQuickMessageTemplate(template: string, postTitle: string, priceLabel: string) {
  return template
    .replace(/\{postTitle\}/g, postTitle)
    .replace(/\{priceLabel\}/g, priceLabel)
}

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
  const [hasCurrentUserReviewed, setHasCurrentUserReviewed] = useState(false)
  const [isCheckingReviewState, setIsCheckingReviewState] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [isChatInfoHidden, setIsChatInfoHidden] = useState(false)
  const [isAppointmentCardHidden, setIsAppointmentCardHidden] = useState(false)
  const [pendingMessageCount, setPendingMessageCount] = useState(0)
  const [showComposerTools, setShowComposerTools] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([])
  const [pendingImagePreviewUrls, setPendingImagePreviewUrls] = useState<string[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [composerHeight, setComposerHeight] = useState(84)
  const [imageViewer, setImageViewer] = useState<ChatImageViewerState>({
    open: false,
    images: [],
    index: 0,
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const composerRef = useRef<HTMLDivElement>(null)
  const imageViewerTouchStartXRef = useRef<number | null>(null)
  const previousMessagesMetaRef = useRef<{ firstId: string | null; lastId: string | null; count: number }>({
    firstId: null,
    lastId: null,
    count: 0,
  })
  const keyboardRafRef = useRef<number | null>(null)
  const scrollRafRef = useRef<number | null>(null)
  const lastMessagesScrollTopRef = useRef(0)
  const isLoadingOlderRef = useRef(false)
  const isChatInfoHiddenRef = useRef(false)
  const isAppointmentCardHiddenRef = useRef(false)
  const isAtBottomRef = useRef(true)
  const isInputFocusedRef = useRef(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
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
  const { createReviewAndCompleteSale, createReview, checkReviewExists } = useSale()

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
    isAtBottomRef.current = true
    setIsChatInfoHidden(false)
    isChatInfoHiddenRef.current = false
    setIsAppointmentCardHidden(false)
    isAppointmentCardHiddenRef.current = false
    setShowComposerTools(false)
    setPendingImageFiles([])
    setImageViewer({ open: false, images: [], index: 0 })
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
    setPendingMessageCount((count) => (count === 0 ? count : 0))
    if (!isAtBottomRef.current) {
      isAtBottomRef.current = true
      setIsAtBottom(true)
    }
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

    const applyChatInfoHidden = (nextHidden: boolean) => {
      if (isChatInfoHiddenRef.current === nextHidden) return
      isChatInfoHiddenRef.current = nextHidden
      setIsChatInfoHidden(nextHidden)
    }

    const applyAppointmentCardHidden = (nextHidden: boolean) => {
      if (isAppointmentCardHiddenRef.current === nextHidden) return
      isAppointmentCardHiddenRef.current = nextHidden
      setIsAppointmentCardHidden(nextHidden)
    }

    const applyAtBottom = (nextAtBottom: boolean) => {
      if (isAtBottomRef.current === nextAtBottom) return
      isAtBottomRef.current = nextAtBottom
      setIsAtBottom(nextAtBottom)
    }

    const handleScroll = () => {
      if (scrollRafRef.current !== null) return

      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null
        const currentScrollTop = container.scrollTop
        const scrollDiff = currentScrollTop - lastMessagesScrollTopRef.current
        const hasMeaningfulDownScroll = scrollDiff > 6
        const hasMeaningfulUpScroll = scrollDiff < -8

        if (currentScrollTop < 20 || hasMeaningfulUpScroll) {
          applyChatInfoHidden(false)
        } else if (hasMeaningfulDownScroll || currentScrollTop > 48) {
          applyChatInfoHidden(true)
        }

        if (currentScrollTop < 24) {
          applyAppointmentCardHidden(false)
        } else if (scrollDiff > 5) {
          applyAppointmentCardHidden(true)
        } else if (scrollDiff < -5) {
          applyAppointmentCardHidden(false)
        }

        lastMessagesScrollTopRef.current = currentScrollTop
        const nearBottom = isNearBottom()
        applyAtBottom(nearBottom)

        if (nearBottom) {
          setPendingMessageCount((count) => (count === 0 ? count : 0))
        }
      })
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current)
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

  // iOS 키보드 대응 - visualViewport 높이 기준 + fallback
  useEffect(() => {
    if (typeof window === 'undefined') return

    const viewport = window.visualViewport
    const syncViewport = (visibleHeight: number, offsetTop = 0) => {
      if (keyboardRafRef.current !== null) {
        cancelAnimationFrame(keyboardRafRef.current)
      }

      keyboardRafRef.current = requestAnimationFrame(() => {
        const nextViewportHeight = Math.max(visibleHeight, 320)
        const keyboardDelta = Math.max(window.innerHeight - nextViewportHeight - offsetTop, 0)
        const nextKeyboardHeight =
          isInputFocusedRef.current && keyboardDelta > 120
            ? keyboardDelta
            : 0
        setKeyboardHeight((prev) => {
          if (Math.abs(prev - nextKeyboardHeight) < 1) return prev
          return nextKeyboardHeight
        })
      })
    }

    if (viewport) {
      const handleViewportChange = () => {
        syncViewport(viewport.height, viewport.offsetTop)
      }
      handleViewportChange()
      viewport.addEventListener('resize', handleViewportChange)
      viewport.addEventListener('scroll', handleViewportChange)
      window.addEventListener('orientationchange', handleViewportChange)

      return () => {
        viewport.removeEventListener('resize', handleViewportChange)
        viewport.removeEventListener('scroll', handleViewportChange)
        window.removeEventListener('orientationchange', handleViewportChange)
        if (keyboardRafRef.current !== null) {
          cancelAnimationFrame(keyboardRafRef.current)
        }
      }
    }

    const handleResizeFallback = () => {
      setKeyboardHeight(0)
    }
    handleResizeFallback()
    window.addEventListener('resize', handleResizeFallback)
    return () => {
      window.removeEventListener('resize', handleResizeFallback)
      if (keyboardRafRef.current !== null) {
        cancelAnimationFrame(keyboardRafRef.current)
      }
    }
  }, [])

  useEffect(() => {
    isInputFocusedRef.current = isInputFocused
    if (!isInputFocused) {
      setKeyboardHeight(0)
    }
  }, [isInputFocused])

  useEffect(() => {
    const composer = composerRef.current
    if (!composer) return

    const syncComposerHeight = () => {
      const nextHeight = Math.max(composer.getBoundingClientRect().height, 64)
      setComposerHeight((prev) => (Math.abs(prev - nextHeight) < 1 ? prev : nextHeight))
    }

    syncComposerHeight()

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      syncComposerHeight()
    })
    observer.observe(composer)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (keyboardHeight > 0 || isInputFocused) {
      setShowComposerTools(false)
    }
  }, [keyboardHeight, isInputFocused])

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
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 34), 120)
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

  const openImageViewer = useCallback((images: string[], startIndex: number) => {
    if (images.length === 0) return
    const safeIndex = Math.max(0, Math.min(images.length - 1, startIndex))
    setImageViewer({
      open: true,
      images,
      index: safeIndex,
    })
  }, [])

  const updateImageViewerIndex = useCallback((nextIndex: number) => {
    setImageViewer((prev) => {
      if (prev.images.length === 0) return prev
      const safeIndex = Math.max(0, Math.min(prev.images.length - 1, nextIndex))
      if (safeIndex === prev.index) return prev
      return {
        ...prev,
        index: safeIndex,
      }
    })
  }, [])

  const moveImageViewerBy = useCallback((delta: number) => {
    setImageViewer((prev) => {
      if (prev.images.length === 0) return prev
      const safeIndex = Math.max(0, Math.min(prev.images.length - 1, prev.index + delta))
      if (safeIndex === prev.index) return prev
      return {
        ...prev,
        index: safeIndex,
      }
    })
  }, [])

  const closeImageViewer = useCallback(() => {
    setImageViewer((prev) => ({
      ...prev,
      open: false,
    }))
  }, [])

  useEffect(() => {
    if (!imageViewer.open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        moveImageViewerBy(-1)
      } else if (event.key === 'ArrowRight') {
        moveImageViewerBy(1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [imageViewer.open, moveImageViewerBy])

  const handleImageViewerTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    imageViewerTouchStartXRef.current = event.touches[0]?.clientX ?? null
  }, [])

  const handleImageViewerTouchEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const startX = imageViewerTouchStartXRef.current
    imageViewerTouchStartXRef.current = null
    if (startX === null) return
    const endX = event.changedTouches[0]?.clientX ?? startX
    const diffX = endX - startX

    if (Math.abs(diffX) < 48) return
    if (diffX > 0) {
      moveImageViewerBy(-1)
      return
    }
    moveImageViewerBy(1)
  }, [moveImageViewerBy])

  const dismissKeyboardIfFocused = useCallback(() => {
    if (!isInputFocused) return
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
      activeElement.blur()
    }
    setIsInputFocused(false)
    setKeyboardHeight(0)
  }, [isInputFocused])

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

  const formatAppointmentSummary = useCallback((appointmentDate: string, location?: string | null) => {
    const parsed = new Date(appointmentDate)
    const dateLabel = Number.isNaN(parsed.getTime())
      ? appointmentDate
      : parsed.toLocaleString('ko-KR', {
          month: 'numeric',
          day: 'numeric',
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
    const locationLabel = (location || '').trim() || '장소 협의 중'
    return `${dateLabel} · ${locationLabel}`
  }, [])

  const sendSystemChatMessage = useCallback(async (content: string) => {
    if (!currentUserId) return false
    return sendMessage({
      senderId: currentUserId,
      content,
    })
  }, [currentUserId, sendMessage])

  const handleProposeAppointment = useCallback(async (params: CreateAppointmentParams) => {
    const appointmentId = await proposeAppointment(params)
    const summary = formatAppointmentSummary(params.appointment_date, params.location)
    await sendSystemChatMessage(`📅 구매약속을 제안했어요.\n${summary}`)
    return appointmentId
  }, [formatAppointmentSummary, proposeAppointment, sendSystemChatMessage])

  const handleRespondAppointment = useCallback(async (appointmentId: string, status: 'confirmed' | 'cancelled') => {
    const result = await respondToAppointment(appointmentId, status)
    if (!result) return result

    if (status === 'confirmed') {
      const summary = appointment
        ? formatAppointmentSummary(appointment.appointment_date, appointment.location)
        : '약속 일정이 확정되었습니다.'
      await sendSystemChatMessage(`✅ 구매약속이 확정되었어요.\n${summary}`)
      return result
    }

    if (status === 'cancelled') {
      await sendSystemChatMessage('❌ 구매약속이 거절되었어요.\n필요하면 새로운 시간으로 다시 제안해 주세요.')
    }

    return result
  }, [appointment, formatAppointmentSummary, respondToAppointment, sendSystemChatMessage])

  async function handleCreateReview(
    postId: string,
    reviewerId: string,
    revieweeId: string,
    rating: number,
    comment?: string
  ) {
    if (!room?.post || !currentUserId) return

    try {
      const alreadyReviewed = await checkReviewExists(postId, reviewerId, revieweeId)
      if (alreadyReviewed) {
        setHasCurrentUserReviewed(true)
        toast.message('이미 거래 리뷰를 작성했습니다')
        return
      }

      if (isSeller && !isSold) {
        // 판매자: 리뷰 작성 + 판매완료를 한 번에 처리
        await createReviewAndCompleteSale(
          room.post.id,
          roomId,
          room.other_user.id,
          currentUserId,
          rating,
          comment
        )
        await sendSystemChatMessage('✅ 거래가 완료되었고 거래 리뷰가 등록되었습니다.')
      } else {
        // 구매자(또는 판매완료 후): 리뷰 작성만 진행
        await createReview(postId, reviewerId, revieweeId, rating, comment)
        await sendSystemChatMessage('⭐ 거래 리뷰가 등록되었습니다. 소중한 후기 감사합니다!')
      }

      setHasCurrentUserReviewed(true)
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
  const showSellerCompletionCta = Boolean(isSeller && isAppointmentConfirmed && !isSold)
  const showReviewAfterSaleCta = Boolean(
    isSold && room?.post && currentUserId && !hasCurrentUserReviewed && !isCheckingReviewState
  )
  const showFloatingReviewCard = Boolean(
    showSellerCompletionCta || showReviewAfterSaleCta || (isSold && hasCurrentUserReviewed)
  )
  const reviewPostId = room?.post?.id || null
  const revieweeUserId = room?.other_user?.id || null
  const postThumbnailUrl = room?.post ? getPostThumbnailUrl(room.post) : null
  const connectionStatusMeta = getConnectionStatusMeta(connectionStatus)
  const ConnectionStatusIcon = connectionStatusMeta.Icon
  const showEnableNotificationButton =
    notificationPermission !== 'unsupported' && notificationPermission !== 'granted'

  useEffect(() => {
    let isCancelled = false

    async function syncReviewState() {
      if (!reviewPostId || !currentUserId || !revieweeUserId) {
        setHasCurrentUserReviewed(false)
        return
      }

      try {
        setIsCheckingReviewState(true)
        const reviewed = await checkReviewExists(reviewPostId, currentUserId, revieweeUserId)
        if (!isCancelled) {
          setHasCurrentUserReviewed(reviewed)
        }
      } finally {
        if (!isCancelled) {
          setIsCheckingReviewState(false)
        }
      }
    }

    void syncReviewState()

    return () => {
      isCancelled = true
    }
  }, [checkReviewExists, currentUserId, reviewPostId, revieweeUserId])
  const quickMessageTemplates = useMemo(() => {
    const postTitle = room?.post?.title?.trim() || '상품'
    const priceLabel =
      room?.post?.price === 0 || room?.post?.price === null || room?.post?.price === undefined
        ? '무료나눔'
        : `${room.post.price.toLocaleString()}₽`
    const pool = isSeller ? SELLER_QUICK_MESSAGE_POOL : BUYER_QUICK_MESSAGE_POOL
    const seed = `${roomId}:${isSeller ? 'seller' : 'buyer'}:${room?.post?.id || 'no-post'}`
    const shuffled = shuffleBySeed(pool, seed)
    const pickCount = 3 + Math.floor(createSeededRng(`${seed}:pick-count`)() * 2) // 3~4개 노출
    return shuffled.slice(0, pickCount).map((template) => applyQuickMessageTemplate(template, postTitle, priceLabel))
  }, [isSeller, room?.post?.id, room?.post?.price, room?.post?.title, roomId])
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
  const showFloatingCards = Boolean(currentUserId && (showFloatingAppointment || showFloatingReviewCard))
  const imageViewerImageCount = imageViewer.images.length
  const activeImageViewerUrl = imageViewer.images[imageViewer.index] || null
  const canMoveImageViewerPrev = imageViewer.index > 0
  const canMoveImageViewerNext = imageViewer.index < imageViewer.images.length - 1
  const reviewModalCopy = useMemo(() => {
    if (isSeller && !isSold) {
      return {
        title: '거래 평가 및 판매완료',
        description: `${room?.other_user.full_name || '상대방'}님과의 거래는 어떠셨나요? 리뷰를 작성하면 판매가 완료됩니다.`,
        submitLabel: '리뷰 남기고 판매완료',
        successMessage: '판매가 완료되었습니다! 리뷰가 작성되었습니다.',
        errorMessage: '판매완료 처리에 실패했습니다.',
      }
    }

    return {
      title: '거래 리뷰 작성',
      description: `${room?.other_user.full_name || '상대방'}님과의 거래 후기를 남겨주세요.`,
      submitLabel: '리뷰 남기기',
      successMessage: '거래 리뷰가 등록되었습니다.',
      errorMessage: '리뷰 작성에 실패했습니다.',
    }
  }, [isSeller, isSold, room?.other_user.full_name])

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
    <div className="fixed inset-0 flex min-h-0 flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="z-30 flex-shrink-0 liquid-glass-topbar">
        <div className="mx-auto flex max-w-screen-xl items-center gap-2 px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-8 w-8 shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          {room.post ? (
            <Link
              href={`/post/${room.post.id}`}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-muted/70"
            >
              {postThumbnailUrl ? (
                <img
                  src={postThumbnailUrl}
                  alt={room.post.title}
                  className="h-9 w-9 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{room.post.title}</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="truncate">
                    {room.post.price === 0 || room.post.price === null
                      ? '무료나눔'
                      : `${room.post.price.toLocaleString()}₽`}
                  </span>
                  {room.post.status && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 font-medium ${getPostStatusInfo(room.post.status as PostStatus).bgColor} ${getPostStatusInfo(room.post.status as PostStatus).textColor}`}
                    >
                      {getPostStatusInfo(room.post.status as PostStatus).label}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">채팅</p>
            </div>
          )}

          <div
            className={`flex shrink-0 items-center gap-1 overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-out ${
              isChatInfoHidden
                ? 'pointer-events-none max-w-0 translate-x-2 opacity-0'
                : 'max-w-[164px] translate-x-0 opacity-100'
            }`}
          >
            <Link href={`/profile/${room.other_user.id}`} className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted/70">
              {room.other_user.avatar_url ? (
                <img
                  src={room.other_user.avatar_url}
                  alt={room.other_user.full_name || '사용자'}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-xs font-bold text-white">
                  {room.other_user.full_name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-sm font-semibold leading-none">
                  <span className="max-w-[74px] truncate">{room.other_user.full_name || '익명'}</span>
                  <span className="text-sm leading-none">
                    {getBreadEmoji(room.other_user.bread_level || 1, room.other_user.user_role || undefined)}
                  </span>
                </div>
              </div>
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-1">
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

            {isSeller && isAppointmentConfirmed && !isSold && currentUserId && room.post && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-emerald-600"
                onClick={() => setShowReviewModal(true)}
                aria-label="거래 완료 및 리뷰 작성"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages - inner scroll */}
      <div
        ref={messagesContainerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain',
          scrollPaddingBottom: `${composerHeight + 28}px`,
        }}
        onPointerDown={dismissKeyboardIfFocused}
        onTouchStart={dismissKeyboardIfFocused}
      >
        <div className="max-w-screen-xl mx-auto px-3 py-3">
          <div ref={topSentinelRef} className="h-px" />

          {showFloatingCards && (
            <div
              className={`sticky top-2 z-20 overflow-hidden transition-[max-height,opacity,transform,margin] duration-200 ease-out ${
                isAppointmentCardHidden
                  ? 'pointer-events-none -translate-y-1 max-h-0 opacity-0 mb-0'
                  : 'translate-y-0 max-h-[320px] opacity-100 mb-3'
              }`}
            >
              <div className="space-y-2">
                {showFloatingAppointment && appointment && currentUserId && (
                  <AppointmentCard
                    appointment={appointment}
                    currentUserId={currentUserId}
                    onRespond={handleRespondAppointment}
                    compact
                    className="mx-0"
                  />
                )}

                {showFloatingReviewCard && (
                  <div className="liquid-glass-card rounded-xl px-3 py-2.5">
                    <p className="text-xs font-medium text-foreground">
                      {showSellerCompletionCta
                        ? '거래가 끝났다면 리뷰 작성과 함께 판매완료를 처리해주세요.'
                        : showReviewAfterSaleCta
                          ? '거래가 완료되었습니다. 상대방 리뷰를 남겨주세요.'
                          : '거래 리뷰를 작성했습니다. 감사합니다!'}
                    </p>
                    {(showSellerCompletionCta || showReviewAfterSaleCta) && (
                      <Button
                        type="button"
                        size="sm"
                        className="mt-2 h-8 rounded-full px-3 text-xs"
                        onClick={() => setShowReviewModal(true)}
                        disabled={isCheckingReviewState}
                      >
                        {showSellerCompletionCta ? '거래완료 + 리뷰' : '거래 리뷰 남기기'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

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
                  <div className="mb-3 flex justify-start">
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
                    <div key={message.id}>
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
                                className={`flex max-w-[70vw] gap-1.5 overflow-x-auto rounded-2xl border border-border/70 bg-muted/20 p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                                  isOwnMessage ? 'self-end' : 'self-start'
                                }`}
                              >
                                {messageImageUrls.map((imageUrl, imageIndex) => (
                                  <button
                                    key={`${message.id}-image-${imageIndex}`}
                                    type="button"
                                    onClick={() => openImageViewer(messageImageUrls, imageIndex)}
                                    className={`group relative shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted ${
                                      messageImageUrls.length === 1
                                        ? 'h-[184px] w-[184px]'
                                        : messageImageUrls.length >= 5
                                          ? 'h-[58px] w-[58px]'
                                          : messageImageUrls.length >= 3
                                            ? 'h-[70px] w-[70px]'
                                            : 'h-[88px] w-[88px]'
                                    }`}
                                    aria-label={`채팅 이미지 ${imageIndex + 1} 보기`}
                                  >
                                    <img
                                      src={imageUrl}
                                      alt={`채팅 이미지 ${imageIndex + 1}`}
                                      className="block h-full w-full object-cover transition-transform duration-150 group-active:scale-95"
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  </button>
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
                <div ref={messagesEndRef} className="h-px" />
              </div>
            )}
          </div>
        </div>

      {pendingMessageCount > 0 && (
        <div
          className="absolute inset-x-0 z-40 flex justify-center pointer-events-none"
          style={{ bottom: `calc(${composerHeight + keyboardHeight + 10}px + env(safe-area-inset-bottom))` }}
        >
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

      {/* Message Input - 모바일 키보드/안전영역 대응 */}
      <div
        ref={composerRef}
        className="z-30 flex-shrink-0 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85"
        style={{
          marginBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0px',
          transition: 'margin-bottom 120ms ease-out',
        }}
      >
        <div
          className="max-w-screen-xl mx-auto px-3"
          style={{
            paddingTop: keyboardHeight > 0 ? '6px' : '8px',
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

          {canProposeAppointment && room?.post && currentUserId && !isInputFocused && keyboardHeight === 0 && (
            <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <AppointmentProposalForm
                roomId={roomId}
                postId={room.post.id}
                currentUserId={currentUserId}
                otherUserId={room.other_user.id}
                onPropose={handleProposeAppointment}
                triggerLabel={hasActiveAppointment ? '약속 다시 제안' : '구매약속 제안'}
                triggerVariant="secondary"
                triggerSize="sm"
                triggerClassName="shrink-0 rounded-full h-8 px-3 text-xs font-medium"
                showTriggerIcon={false}
              />
              {!hasActiveAppointment && quickMessageTemplates.slice(0, 4).map((template) => (
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
              {isUploadingImages && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="inline-block animate-bounce">🚀</span>
                  <span>사진 전송 중입니다. 잠시만 기다려주세요.</span>
                </div>
              )}
            </div>
          )}

          {showComposerTools && keyboardHeight === 0 && (
            <div className="mb-2 rounded-2xl border border-border bg-muted/40 p-2.5">
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
            className={`flex items-center gap-1.5 rounded-2xl border px-2 py-1.5 transition-colors ${
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

            <div className="flex min-h-[34px] min-w-0 flex-1 items-center">
              <Textarea
                ref={messageInputRef}
                placeholder="메시지 보내기"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onFocus={() => {
                  setIsInputFocused(true)
                  requestAnimationFrame(() => {
                    scrollToBottom('auto')
                  })
                }}
                onBlur={() => {
                  setIsInputFocused(false)
                  setKeyboardHeight(0)
                }}
                rows={1}
                className="min-h-[34px] max-h-[120px] resize-none border-0 bg-transparent px-1 py-[6px] text-[16px] leading-[22px] placeholder:leading-[22px] focus-visible:ring-0 focus-visible:ring-offset-0"
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
              {isUploadingImages ? <span className="inline-block animate-pulse text-base leading-none">🚀</span> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={imageViewer.open}
        onOpenChange={(open) => {
          if (!open) {
            closeImageViewer()
          }
        }}
      >
        <DialogContent
          hideCloseButton
          className="h-[100dvh] w-screen max-w-none gap-0 rounded-none border-0 bg-black/95 p-0 text-white"
        >
          <div className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <span className="text-sm font-medium">
              {imageViewerImageCount > 0 ? `${imageViewer.index + 1} / ${imageViewerImageCount}` : ''}
            </span>
            <button
              type="button"
              onClick={closeImageViewer}
              className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="이미지 뷰어 닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
            onTouchStart={handleImageViewerTouchStart}
            onTouchEnd={handleImageViewerTouchEnd}
          >
            {activeImageViewerUrl && (
              <img
                src={activeImageViewerUrl}
                alt={`채팅 이미지 크게 보기 ${imageViewer.index + 1}`}
                className="max-h-full w-auto max-w-full object-contain select-none"
                draggable={false}
              />
            )}

            {imageViewerImageCount > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => moveImageViewerBy(-1)}
                  disabled={!canMoveImageViewerPrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white transition-opacity disabled:cursor-default disabled:opacity-30"
                  aria-label="이전 이미지"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveImageViewerBy(1)}
                  disabled={!canMoveImageViewerNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white transition-opacity disabled:cursor-default disabled:opacity-30"
                  aria-label="다음 이미지"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {imageViewerImageCount > 1 && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {imageViewer.images.map((imageUrl, index) => (
                <button
                  key={`${imageUrl}-${index}`}
                  type="button"
                  onClick={() => updateImageViewerIndex(index)}
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                    imageViewer.index === index ? 'border-white' : 'border-white/30'
                  }`}
                  aria-label={`${index + 1}번 이미지 보기`}
                >
                  <img
                    src={imageUrl}
                    alt={`채팅 이미지 썸네일 ${index + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      {currentUserId && room.post && (
        <ReviewModal
          open={showReviewModal}
          onOpenChange={setShowReviewModal}
          postId={room.post.id}
          reviewerId={currentUserId}
          revieweeId={room.other_user.id}
          revieweeName={room.other_user.full_name || '익명'}
          title={reviewModalCopy.title}
          description={reviewModalCopy.description}
          submitLabel={reviewModalCopy.submitLabel}
          successMessage={reviewModalCopy.successMessage}
          errorMessage={reviewModalCopy.errorMessage}
          onSubmit={handleCreateReview}
        />
      )}
    </div>
  )
}
