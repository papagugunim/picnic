'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('UseMessages')
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChatMessageWithProfile, PollMessagesResponse } from '@/types/chat'

// Feature Flag: Long Polling 사용 여부
const USE_LONG_POLLING = process.env.NEXT_PUBLIC_USE_LONG_POLLING === 'true'

/**
 * 특정 채팅방의 메시지를 가져오고 실시간 업데이트를 제공하는 훅
 */
export function useMessages(roomId: string) {
  const [messages, setMessages] = useState<ChatMessageWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const isSendingRef = useRef(false)

  // Long Polling 상태 관리
  const [lastMessageId, setLastMessageId] = useState<string | null>(null)
  const pollingRef = useRef<{
    isPolling: boolean
    abortController: AbortController | null
    retryCount: number
  }>({ isPolling: false, abortController: null, retryCount: 0 })

  const fetchMessages = useCallback(async () => {
    if (!roomId) return

    try {
      const supabase = createClient()

      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select(`
          id,
          room_id,
          sender_id,
          content,
          is_read,
          created_at,
          profiles:sender_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      if (messagesError) {
        logger.error('Messages fetch error:', messagesError)
        setError('메시지를 불러오는데 실패했습니다')
        return
      }

      const formattedMessages = messagesData.map((msg: any) => ({
        ...msg,
        sender: msg.profiles,
      }))

      setMessages(formattedMessages as ChatMessageWithProfile[])
    } catch (err) {
      logger.error('Fetch error:', err)
      setError('메시지를 불러오는데 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [roomId])

  // Long Polling 읽음 처리 함수
  const markMessagesAsReadAPI = useCallback(async () => {
    if (!roomId) return

    try {
      await fetch('/api/chat/messages/read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId }),
      })
    } catch (err) {
      logger.error('[Long Polling] Mark as read error:', err)
    }
  }, [roomId])

  // Long Polling 시작 함수
  const startPolling = useCallback(async () => {
    if (!roomId) return

    pollingRef.current.isPolling = true
    logger.log('[Long Polling] Starting poll loop')

    while (pollingRef.current.isPolling) {
      const abortController = new AbortController()
      pollingRef.current.abortController = abortController

      try {
        const params = new URLSearchParams({
          roomId,
          timeout: '30000',
          ...(lastMessageId && { lastMessageId }),
        })

        logger.log(`[Long Polling] Polling with lastMessageId: ${lastMessageId}`)

        const response = await fetch(`/api/chat/poll?${params}`, {
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data: PollMessagesResponse = await response.json()

        if (data.messages.length > 0) {
          logger.log(`[Long Polling] Received ${data.messages.length} new messages`)

          // 새 메시지 추가 (중복 방지)
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id))
            const newMessages = data.messages.filter((m) => !existingIds.has(m.id))

            if (newMessages.length === 0) {
              logger.log('[Long Polling] All messages already exist, skipping')
              return prev
            }

            logger.log(`[Long Polling] Adding ${newMessages.length} new messages`)
            return [...prev, ...newMessages]
          })

          setLastMessageId(data.lastMessageId)
          pollingRef.current.retryCount = 0

          // 읽음 처리
          await markMessagesAsReadAPI()

          // 즉시 재요청 (지연 없음)
          continue
        }

        // 새 메시지 없음 - 1초 대기 후 재시도
        logger.log('[Long Polling] No new messages, waiting 1s')
        pollingRef.current.retryCount = 0
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error: any) {
        if (error.name === 'AbortError') {
          logger.log('[Long Polling] Poll aborted')
          break
        }

        // 지수 백오프
        pollingRef.current.retryCount++
        const delay = Math.min(
          1000 * Math.pow(2, pollingRef.current.retryCount),
          30000
        )

        logger.error(`[Long Polling] Poll error, retry in ${delay}ms:`, error)

        if (pollingRef.current.retryCount > 5) {
          pollingRef.current.isPolling = false
          setError('연결이 끊어졌습니다. 새로고침해주세요.')
          break
        }

        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    logger.log('[Long Polling] Poll loop ended')
  }, [roomId, lastMessageId, markMessagesAsReadAPI])

  useEffect(() => {
    if (!roomId) return

    const supabase = createClient()
    let subscription: any = null
    let reconnectTimer: NodeJS.Timeout | null = null
    let reconnectAttempts = 0
    const maxReconnectAttempts = 5

    async function markMessagesAsRead() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Mark unread messages as read
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .eq('room_id', roomId)
          .eq('is_read', false)
          .neq('sender_id', user.id)
      } catch (err) {
        logger.error('Mark as read error:', err)
      }
    }

    async function setupRealtimeSubscription() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 기존 구독 정리
        if (subscription) {
          await supabase.removeChannel(subscription)
        }

        logger.log(`[Realtime] Connecting to room ${roomId}...`)
        logger.log(`[Realtime] User ID: ${user.id}`)

        // Subscribe to new messages in this room
        subscription = supabase
          .channel(`chat-room:${roomId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
              filter: `room_id=eq.${roomId}`,
            },
            async (payload) => {
              logger.log('[Realtime] ✅ New message received:', payload.new)
              logger.log(`[Realtime] Sender: ${payload.new.sender_id}, Current User: ${user.id}`)
              const newMessage = payload.new

              // 본인이 보낸 메시지는 무시 (이미 낙관적 업데이트로 추가됨)
              if (newMessage.sender_id === user.id) {
                logger.log('[Realtime] 📤 Own message detected (optimistic update), updating with real ID')
                // 낙관적 업데이트 메시지를 실제 ID로 교체
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id.toString().startsWith('temp-') && msg.content === newMessage.content
                      ? { ...msg, id: newMessage.id, created_at: newMessage.created_at }
                      : msg
                  )
                )
                return
              }

              // 프로필 정보 가져오기
              const { data: profileData } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('id', newMessage.sender_id)
                .single()

              const messageWithProfile = {
                ...newMessage,
                sender: profileData || {
                  id: newMessage.sender_id,
                  full_name: null,
                  avatar_url: null,
                },
              }

              // 메시지가 이미 존재하지 않으면 추가
              setMessages((prev) => {
                const existsById = prev.some((msg) => msg.id === newMessage.id)
                if (existsById) {
                  logger.log('[Realtime] ⚠️ Message already exists (by ID), skipping')
                  return prev
                }

                logger.log('[Realtime] 📥 Adding new message from other user')
                return [...prev, messageWithProfile as ChatMessageWithProfile]
              })

              // 상대방 메시지만 읽음 표시
              await markMessagesAsRead()
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'chat_messages',
              filter: `room_id=eq.${roomId}`,
            },
            (payload) => {
              logger.log('[Realtime] Message updated:', payload.new)
              const updatedMessage = payload.new
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === updatedMessage.id
                    ? { ...msg, ...updatedMessage }
                    : msg
                )
              )
            }
          )
          .subscribe((status, err) => {
            logger.log(`[Realtime] 🔔 Subscription status: ${status}`)

            if (status === 'SUBSCRIBED') {
              logger.log('[Realtime] ✅ Successfully connected! Ready to receive messages.')
              reconnectAttempts = 0
            } else if (status === 'CLOSED') {
              logger.log('[Realtime] ❌ Connection closed')
              handleReconnect()
            } else if (status === 'CHANNEL_ERROR') {
              logger.error('[Realtime] ❌ Channel error:', err)
              logger.error('[Realtime] ⚠️ Make sure Realtime is enabled for chat_messages table in Supabase Dashboard')
              handleReconnect()
            } else if (status === 'TIMED_OUT') {
              logger.error('[Realtime] ⏱️ Connection timed out')
              handleReconnect()
            }
          })
      } catch (err) {
        logger.error('[Realtime] Setup error:', err)
        handleReconnect()
      }
    }

    function handleReconnect() {
      if (reconnectAttempts >= maxReconnectAttempts) {
        logger.log('[Realtime] Max reconnection attempts reached, giving up')
        return
      }

      reconnectAttempts++
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000) // Exponential backoff, max 30s

      logger.log(`[Realtime] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`)

      reconnectTimer = setTimeout(() => {
        logger.log('[Realtime] Attempting to reconnect...')
        setupRealtimeSubscription()
      }, delay)
    }

    // Feature Flag에 따라 Realtime 또는 Long Polling 선택
    if (USE_LONG_POLLING) {
      logger.log('[Mode] Using Long Polling')
      fetchMessages().then(() => {
        // 초기 메시지 로드 후 lastMessageId 설정
        setMessages((prev) => {
          if (prev.length > 0) {
            setLastMessageId(prev[prev.length - 1].id)
          }
          return prev
        })

        // Long Polling 시작
        startPolling()
      })

      markMessagesAsRead()
    } else {
      logger.log('[Mode] Using Realtime')
      fetchMessages()
      markMessagesAsRead()
      setupRealtimeSubscription()
    }

    return () => {
      if (USE_LONG_POLLING) {
        logger.log('[Long Polling] Cleaning up')
        pollingRef.current.isPolling = false
        pollingRef.current.abortController?.abort()
      } else {
        logger.log('[Realtime] Cleaning up subscription')
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
        }
        if (subscription) {
          supabase.removeChannel(subscription)
        }
      }
    }
  }, [roomId, fetchMessages, startPolling])

  const sendMessage = useCallback(
    async (content: string, senderId: string) => {
      if (!content.trim() || !roomId) return false

      // 이미 전송 중이면 중복 방지 (useRef 사용으로 클로저 문제 해결)
      if (isSendingRef.current) {
        logger.log('[Send] ⚠️ Already sending, ignoring duplicate request')
        return false
      }

      // 임시 메시지 ID 생성 (낙관적 업데이트용)
      const tempId = `temp-${Date.now()}-${Math.random()}`

      try {
        isSendingRef.current = true
        setIsSending(true)

        logger.log('[Send] 📤 Sending message...')
        logger.log(`[Send] Mode: ${USE_LONG_POLLING ? 'Long Polling' : 'Realtime'}`)
        logger.log(`[Send] Room: ${roomId}, Sender: ${senderId}`)

        // 발신자 프로필 정보 가져오기
        const supabase = createClient()
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', senderId)
          .single()

        // 낙관적 업데이트: 즉시 UI에 메시지 추가
        const optimisticMessage: ChatMessageWithProfile = {
          id: tempId,
          room_id: roomId,
          sender_id: senderId,
          content: content.trim(),
          is_read: false,
          created_at: new Date().toISOString(),
          sender: senderProfile || {
            id: senderId,
            full_name: null,
            avatar_url: null,
          },
        }

        logger.log('[Send] ➕ Adding optimistic message to UI:', tempId)
        setMessages((prev) => [...prev, optimisticMessage])

        let data: any = null
        let error: any = null

        // Feature Flag에 따라 API 또는 Supabase 직접 호출
        if (USE_LONG_POLLING) {
          logger.log('[Send] Using API endpoint')
          try {
            const response = await fetch('/api/chat/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                room_id: roomId,
                content: content.trim(),
              }),
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || 'API error')
            }

            const result = await response.json()
            data = result.message
          } catch (err: any) {
            error = err
          }
        } else {
          logger.log('[Send] Using Supabase direct')
          const result = await supabase
            .from('chat_messages')
            .insert({
              room_id: roomId,
              sender_id: senderId,
              content: content.trim(),
            })
            .select()
            .single()

          data = result.data
          error = result.error
        }

        if (error) {
          logger.error('[Send] ❌ Send message error:', error)
          // 실패 시 낙관적으로 추가한 메시지 제거
          setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
          setError('메시지 전송에 실패했습니다')
          isSendingRef.current = false
          setIsSending(false)
          return false
        }

        logger.log('[Send] ✅ Message sent successfully! ID:', data?.id)

        // 성공 시 임시 메시지를 실제 메시지로 교체
        if (data) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempId
                ? {
                    ...data,
                    sender: senderProfile || {
                      id: senderId,
                      full_name: null,
                      avatar_url: null,
                    },
                  }
                : msg
            )
          )

          // Long Polling 모드: lastMessageId 업데이트
          if (USE_LONG_POLLING) {
            setLastMessageId(data.id)
          }
        }

        return true
      } catch (err) {
        logger.error('Send error:', err)
        // 실패 시 낙관적으로 추가한 메시지 제거
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
        setError('메시지 전송에 실패했습니다')
        return false
      } finally {
        isSendingRef.current = false
        setIsSending(false)
      }
    },
    [roomId]
  )

  return {
    messages,
    isLoading,
    error,
    isSending,
    sendMessage,
    refetch: fetchMessages,
  }
}
