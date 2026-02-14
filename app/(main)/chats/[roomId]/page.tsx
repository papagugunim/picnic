'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Page')
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronDown, ChevronLeft, Loader2, Package, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { useMessages } from '@/lib/hooks/useMessages'
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

type PostWithImages = { images?: string[] | string | null } | null | undefined

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
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

  const {
    messages,
    isLoading: isMessagesLoading,
    isSending,
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

  // iOS 키보드 대응 - visualViewport resize만 사용해 불필요한 스크롤 이벤트 갱신을 줄임
  useEffect(() => {
    if (typeof window === 'undefined') return

    const viewport = window.visualViewport
    if (!viewport) return

    const handleViewportResize = () => {
      if (keyboardRafRef.current !== null) {
        cancelAnimationFrame(keyboardRafRef.current)
      }

      keyboardRafRef.current = requestAnimationFrame(() => {
        const keyboardDelta = Math.max(window.innerHeight - viewport.height, 0)
        setKeyboardHeight(keyboardDelta > 50 ? keyboardDelta : 0)
      })
    }

    handleViewportResize()
    viewport.addEventListener('resize', handleViewportResize)

    return () => {
      viewport.removeEventListener('resize', handleViewportResize)
      if (keyboardRafRef.current !== null) {
        cancelAnimationFrame(keyboardRafRef.current)
      }
    }
  }, [])

  async function handleSendMessage() {
    if (!newMessage.trim() || !currentUserId) return

    const success = await sendMessage(newMessage, currentUserId)
    if (success) {
      setNewMessage('')
      requestAnimationFrame(() => {
        scrollToBottom('smooth')
      })
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
  const postThumbnailUrl = room?.post ? getPostThumbnailUrl(room.post) : null

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
      style={{ height: keyboardHeight > 0 ? `calc(100dvh - ${keyboardHeight}px)` : '100dvh' }}
    >
      {/* Header / Product info - 스크롤 다운 시 숨김 */}
      <div
        className={`flex-shrink-0 overflow-hidden bg-background transition-[max-height,opacity,transform,border-color] duration-300 ease-out ${
          isChatInfoHidden
            ? 'max-h-0 opacity-0 -translate-y-1 border-b border-transparent pointer-events-none'
            : 'max-h-[220px] opacity-100 translate-y-0 border-b border-border'
        }`}
      >
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <Link href={`/profile/${room.other_user.id}`} className="flex items-center gap-3 flex-1">
              {room.other_user.avatar_url ? (
                <img
                  src={room.other_user.avatar_url}
                  alt={room.other_user.full_name || '사용자'}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                  {room.other_user.full_name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <div>
                <div className="font-semibold flex items-center gap-1">
                  {room.other_user.full_name || '익명'}
                  <span className="text-base">
                    {getBreadEmoji(room.other_user.bread_level || 1, room.other_user.user_role || undefined)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {getBreadInfo(room.other_user.bread_level || 1, room.other_user.user_role || undefined).name}
                </div>
              </div>
            </Link>

            {/* 판매완료 버튼 (판매자만, 약속 확정 후) */}
            {isSeller && isAppointmentConfirmed && !isSold && currentUserId && room.post && (
              <CompleteSaleButton
                onReviewRequest={() => setShowReviewModal(true)}
              />
            )}
          </div>

          {/* Related Post Banner */}
          {room.post && (
            <Link
              href={`/post/${room.post.id}`}
              className="flex items-center gap-3 px-4 py-2 bg-background border-t border-border hover:bg-muted transition-colors"
            >
              {postThumbnailUrl ? (
                <img
                  src={postThumbnailUrl}
                  alt={room.post.title}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {room.post.title}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>
                    {room.post.price === 0 || room.post.price === null
                      ? '무료나눔'
                      : `${room.post.price.toLocaleString()}₽`}
                  </span>
                  {room.post.status && (
                    <span className={`px-2 py-0.5 rounded-full ${getPostStatusInfo(room.post.status as PostStatus).bgColor} ${getPostStatusInfo(room.post.status as PostStatus).textColor} font-medium`}>
                      {getPostStatusInfo(room.post.status as PostStatus).label}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Messages - inner scroll */}
      <div className="relative flex-1">
        <div ref={messagesContainerRef} className="h-full overflow-y-auto overscroll-none">
          <div className="max-w-screen-xl mx-auto p-4">
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
              <div className="space-y-4">
                {/* 약속 카드 (있을 경우 맨 위에 표시) */}
                {appointment && currentUserId && (
                  <AppointmentCard
                    appointment={appointment}
                    currentUserId={currentUserId}
                    onRespond={respondToAppointment}
                  />
                )}

                {/* 메시지 목록 */}
                {messages.map((message, index) => {
                  const isOwnMessage = message.sender_id === currentUserId
                  const showDate = index === 0 ||
                    new Date(messages[index - 1].created_at).toDateString() !==
                    new Date(message.created_at).toDateString()

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

                      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-2 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                          {!isOwnMessage && (
                            message.sender.avatar_url ? (
                              <img
                                src={message.sender.avatar_url}
                                alt={message.sender.full_name || '사용자'}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                {message.sender.full_name?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )
                          )}

                          <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                            {!isOwnMessage && (
                              <span className="text-xs text-muted-foreground mb-1 px-1">
                                {message.sender.full_name || '익명'}
                              </span>
                            )}
                            <div className={`px-4 py-2 rounded-2xl ${
                              isOwnMessage
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            </div>
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

      {/* Message Input - 고정되지 않음 */}
      <div className="flex-shrink-0 bg-background border-t border-border">
        <div className="max-w-screen-xl mx-auto px-3 py-2">
          {/* 구매약속 잡기 버튼 (구매자만, 판매완료 아닐 때) */}
          {isBuyer && !isSold && currentUserId && room.post && room.post.author_id && (
            <div className="mb-2">
              <AppointmentProposalForm
                roomId={roomId}
                postId={room.post.id}
                postAuthorId={room.post.author_id}
                currentUserId={currentUserId}
                otherUserId={room.other_user.id}
                onPropose={proposeAppointment}
              />
            </div>
          )}

          <div className="flex gap-2 items-center">
            <Input
              ref={inputRef}
              placeholder="메시지를 입력하세요..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onFocus={() => {
                requestAnimationFrame(() => {
                  scrollToBottom('smooth')
                })
              }}
              className="flex-1 h-10"
              style={{ fontSize: '16px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (!isSending && newMessage.trim()) {
                    handleSendMessage()
                  }
                }
              }}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              size="icon"
              className="flex-shrink-0 h-10 w-10"
            >
              <Send className="w-4 h-4" />
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
