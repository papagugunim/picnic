'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Send, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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

export default function ChatRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string

  const [room, setRoom] = useState<ChatRoomWithProfile | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { messages, isSending, sendMessage } = useMessages(roomId)
  const { appointment, proposeAppointment, respondToAppointment } = useAppointment(roomId)
  const { completeSale, createReview } = useSale()

  useEffect(() => {
    fetchRoom()
  }, [roomId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 모바일 키보드 대응
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return

    const handleResize = () => {
      // 키보드가 올라오면 스크롤
      if (document.activeElement === inputRef.current) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
        }, 100)
      }
    }

    window.visualViewport.addEventListener('resize', handleResize)
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize)
    }
  }, [])

  async function fetchRoom() {
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
        console.error('Room fetch error:', roomError)
        router.push('/chats')
        return
      }

      // Get other user's profile
      const otherUserId = roomData.user1_id === user.id ? roomData.user2_id : roomData.user1_id

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, matryoshka_level, user_role')
        .eq('id', otherUserId)
        .single()

      // Get related post if exists
      let postData = null
      if (roomData.post_id) {
        const { data } = await supabase
          .from('posts')
          .select('id, title, price, images, status, author_id')
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
          matryoshka_level: 0,
          user_role: null
        },
        unread_count: 0,
        post: postData,
      })
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !currentUserId) return

    const success = await sendMessage(newMessage, currentUserId)
    if (success) {
      setNewMessage('')
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }

  async function handleCompleteSale() {
    if (!room?.post || !currentUserId) return

    try {
      await completeSale(
        room.post.id,
        roomId,
        room.other_user.id,
        currentUserId
      )
      // 채팅방 정보 다시 불러오기
      await fetchRoom()
    } catch (error) {
      throw error
    }
  }

  async function handleCreateReview(
    postId: string,
    reviewerId: string,
    revieweeId: string,
    rating: number,
    comment?: string
  ) {
    await createReview(postId, reviewerId, revieweeId, rating, comment)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none bg-background border-b border-border">
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
                  {getBreadEmoji(room.other_user.matryoshka_level || 1, room.other_user.user_role || undefined)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {getBreadInfo(room.other_user.matryoshka_level || 1, room.other_user.user_role || undefined).name}
              </div>
            </div>
          </Link>

          {/* 구매약속 & 판매완료 버튼 */}
          <div className="flex gap-2">
            {/* 구매자: 구매약속 잡기 버튼 (판매완료 아닐 때만) */}
            {isBuyer && !isSold && currentUserId && room.post && (
              <AppointmentProposalForm
                roomId={roomId}
                postId={room.post.id}
                currentUserId={currentUserId}
                otherUserId={room.other_user.id}
                onPropose={proposeAppointment}
              />
            )}

            {/* 판매자: 판매완료 버튼 (약속 확정 후, 판매완료 안 했을 때만) */}
            {isSeller && isAppointmentConfirmed && !isSold && currentUserId && room.post && (
              <CompleteSaleButton
                postId={room.post.id}
                roomId={roomId}
                buyerId={room.other_user.id}
                sellerId={currentUserId}
                onComplete={handleCompleteSale}
                onReviewRequest={() => setShowReviewModal(true)}
              />
            )}
          </div>
        </div>

        {/* Related Post Banner */}
        {room.post && (
          <Link
            href={`/post/${room.post.id}`}
            className="flex items-center gap-3 px-4 py-2 bg-muted/50 border-t border-border hover:bg-muted transition-colors"
          >
            {room.post.images && room.post.images.length > 0 ? (
              <img
                src={room.post.images[0]}
                alt={room.post.title}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate flex items-center gap-2">
                {room.post.title}
                {isSold && (
                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">판매완료</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {room.post.price === 0 || room.post.price === null
                  ? '무료나눔'
                  : `${room.post.price.toLocaleString()}₽`}
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && !appointment ? (
          <div className="text-center py-16 text-muted-foreground h-full flex items-center justify-center">
            메시지를 보내서 대화를 시작해보세요
          </div>
        ) : (
          <div className="space-y-4 min-h-full flex flex-col justify-end">
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

                  <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-2 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isOwnMessage && (
                        message.sender.avatar_url ? (
                          <img
                            src={message.sender.avatar_url}
                            alt={message.sender.full_name || '사용자'}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
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

      {/* Message Input */}
      <div className="flex-none bg-background border-t border-border p-4 safe-area-bottom">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            placeholder="메시지를 입력하세요..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={1}
            className="resize-none text-base"
            style={{ fontSize: '16px' }}
            onFocus={() => {
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
              }, 100)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            size="icon"
            className="flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
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
