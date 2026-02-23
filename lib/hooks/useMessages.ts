'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('UseMessages')
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChatMessageWithProfile, PollMessagesResponse } from '@/types/chat'

// Feature Flag: Long Polling 사용 여부
const USE_LONG_POLLING = process.env.NEXT_PUBLIC_USE_LONG_POLLING === 'true'
const MESSAGES_PAGE_SIZE = 40

type RawProfileRow = {
  id: string
  full_name: string | null
  avatar_url: string | null
}

type RawMessageRow = {
  id: string
  room_id: string
  sender_id: string
  content: string
  image_urls: string[] | null
  is_read: boolean
  created_at: string
  profiles: RawProfileRow | RawProfileRow[] | null
}

type InsertedMessageRow = {
  id: string
  room_id: string
  sender_id: string
  content: string
  image_urls: string[] | null
  is_read: boolean
  created_at: string
}

interface SendMessageInput {
  senderId: string
  content?: string
  imageUrls?: string[]
}

export type ChatConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'offline'

/**
 * 특정 채팅방의 메시지를 가져오고 실시간 업데이트를 제공하는 훅
 */
export function useMessages(roomId: string) {
  const [messages, setMessages] = useState<ChatMessageWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [hasOlderMessages, setHasOlderMessages] = useState(false)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ChatConnectionStatus>('connecting')
  const isSendingRef = useRef(false)
  const loadedCountRef = useRef(0)
  const latestMessageIdRef = useRef<string | null>(null)
  const latestMessageAtRef = useRef<string | null>(null)
  const senderProfileCacheRef = useRef<Map<string, RawProfileRow>>(new Map())
  const supabase = useMemo(() => createClient(), [])

  // Long Polling 상태 관리
  const pollingRef = useRef<{
    isPolling: boolean
    abortController: AbortController | null
    retryCount: number
  }>({ isPolling: false, abortController: null, retryCount: 0 })

  const formatMessages = useCallback((messagesData: RawMessageRow[]) => {
    return messagesData.map((message) => {
      const senderProfile = Array.isArray(message.profiles)
        ? message.profiles[0]
        : message.profiles

      if (senderProfile?.id) {
        senderProfileCacheRef.current.set(senderProfile.id, senderProfile)
      }

      return {
        id: message.id,
        room_id: message.room_id,
        sender_id: message.sender_id,
        content: message.content,
        image_urls: message.image_urls ?? [],
        is_read: message.is_read,
        created_at: message.created_at,
        sender: senderProfile || {
          id: message.sender_id,
          full_name: null,
          avatar_url: null,
        },
      }
    })
  }, [])

  const fetchMessages = useCallback(async () => {
    if (!roomId) return

    try {
      setIsLoading(true)
      setError(null)

      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select(`
          id,
          room_id,
          sender_id,
          content,
          image_urls,
          is_read,
          created_at,
          profiles:sender_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .range(0, MESSAGES_PAGE_SIZE - 1)

      if (messagesError) {
        logger.error('Messages fetch error:', messagesError)
        setError('메시지를 불러오는데 실패했습니다')
        return
      }

      const loadedMessages = (messagesData ?? []) as RawMessageRow[]
      const formattedMessages = formatMessages([...loadedMessages].reverse())

      setMessages(formattedMessages)
      loadedCountRef.current = loadedMessages.length
      setHasOlderMessages(loadedMessages.length === MESSAGES_PAGE_SIZE)

      const newestMessageId = formattedMessages[formattedMessages.length - 1]?.id ?? null
      const newestMessageAt = formattedMessages[formattedMessages.length - 1]?.created_at ?? null
      latestMessageIdRef.current = newestMessageId
      latestMessageAtRef.current = newestMessageAt
    } catch (err) {
      logger.error('Fetch error:', err)
      setError('메시지를 불러오는데 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [roomId, formatMessages, supabase])

  const loadOlderMessages = useCallback(async () => {
    if (!roomId || isLoadingOlder || !hasOlderMessages) return

    try {
      setIsLoadingOlder(true)
      const start = loadedCountRef.current
      const end = start + MESSAGES_PAGE_SIZE - 1

      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select(`
          id,
          room_id,
          sender_id,
          content,
          image_urls,
          is_read,
          created_at,
          profiles:sender_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .range(start, end)

      if (messagesError) {
        logger.error('Older messages fetch error:', messagesError)
        setError('이전 메시지를 불러오는데 실패했습니다')
        return
      }

      const olderMessages = (messagesData ?? []) as RawMessageRow[]
      const formattedOlderMessages = formatMessages([...olderMessages].reverse())

      setMessages((prev) => {
        if (formattedOlderMessages.length === 0) return prev

        const existingIds = new Set(prev.map((message) => message.id))
        const uniqueOlderMessages = formattedOlderMessages.filter(
          (message) => !existingIds.has(message.id)
        )

        if (uniqueOlderMessages.length === 0) return prev
        return [...uniqueOlderMessages, ...prev]
      })

      loadedCountRef.current += olderMessages.length
      setHasOlderMessages(olderMessages.length === MESSAGES_PAGE_SIZE)
    } catch (err) {
      logger.error('Older fetch error:', err)
      setError('이전 메시지를 불러오는데 실패했습니다')
    } finally {
      setIsLoadingOlder(false)
    }
  }, [roomId, isLoadingOlder, hasOlderMessages, formatMessages, supabase])

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
    setConnectionStatus('connecting')
    logger.log('[Long Polling] Starting poll loop')

    while (pollingRef.current.isPolling) {
      const abortController = new AbortController()
      pollingRef.current.abortController = abortController

      try {
        const currentLastMessageId = latestMessageIdRef.current
        const currentLastMessageAt = latestMessageAtRef.current
        const params = new URLSearchParams({
          roomId,
          timeout: '30000',
          ...(currentLastMessageId && { lastMessageId: currentLastMessageId }),
          ...(currentLastMessageAt && { lastMessageAt: currentLastMessageAt }),
        })

        logger.log(`[Long Polling] Polling with lastMessageId: ${currentLastMessageId}`)

        const response = await fetch(`/api/chat/poll?${params}`, {
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data: PollMessagesResponse = await response.json()
        setConnectionStatus('live')

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
            loadedCountRef.current += newMessages.length
            return [...prev, ...newMessages]
          })

          const latestMessageId =
            data.lastMessageId ?? data.messages[data.messages.length - 1]?.id ?? null
          const latestMessageAt =
            data.lastMessageAt ?? data.messages[data.messages.length - 1]?.created_at ?? null
          latestMessageIdRef.current = latestMessageId
          latestMessageAtRef.current = latestMessageAt
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
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
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
          setConnectionStatus('offline')
          break
        }

        setConnectionStatus('reconnecting')
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    logger.log('[Long Polling] Poll loop ended')
  }, [roomId, markMessagesAsReadAPI])

  useEffect(() => {
    if (!roomId) return

    setMessages([])
    setError(null)
    setHasOlderMessages(false)
    setIsLoadingOlder(false)
    setIsLoading(true)
    setConnectionStatus('connecting')
    loadedCountRef.current = 0
    latestMessageIdRef.current = null
    latestMessageAtRef.current = null
    senderProfileCacheRef.current = new Map()

    const currentPollingRef = pollingRef.current
    let subscription: ReturnType<typeof supabase.channel> | null = null
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
        setConnectionStatus('connecting')

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
                setMessages((prev) => {
                  let targetIndex = -1
                  for (let i = prev.length - 1; i >= 0; i -= 1) {
                    if (prev[i]?.id.toString().startsWith('temp-') && prev[i]?.sender_id === user.id) {
                      targetIndex = i
                      break
                    }
                  }

                  if (targetIndex === -1) return prev

                  const next = [...prev]
                  next[targetIndex] = {
                    ...next[targetIndex],
                    id: newMessage.id,
                    content: newMessage.content,
                    image_urls: Array.isArray((newMessage as { image_urls?: unknown }).image_urls)
                      ? (((newMessage as { image_urls?: unknown }).image_urls as string[]) ?? [])
                      : [],
                    created_at: newMessage.created_at,
                  }

                  return next
                })
                latestMessageIdRef.current = newMessage.id
                latestMessageAtRef.current = newMessage.created_at
                return
              }

              let profileData = senderProfileCacheRef.current.get(newMessage.sender_id) || null
              if (!profileData) {
                const { data } = await supabase
                  .from('profiles')
                  .select('id, full_name, avatar_url')
                  .eq('id', newMessage.sender_id)
                  .single()
                profileData = data
                if (profileData?.id) {
                  senderProfileCacheRef.current.set(profileData.id, profileData)
                }
              }

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
                loadedCountRef.current += 1
                latestMessageIdRef.current = newMessage.id
                latestMessageAtRef.current = newMessage.created_at
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
              setConnectionStatus('live')
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
        setConnectionStatus('offline')
        return
      }

      reconnectAttempts++
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000) // Exponential backoff, max 30s

      logger.log(`[Realtime] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`)
      setConnectionStatus('reconnecting')

      reconnectTimer = setTimeout(() => {
        logger.log('[Realtime] Attempting to reconnect...')
        setupRealtimeSubscription()
      }, delay)
    }

    // Feature Flag에 따라 Realtime 또는 Long Polling 선택
    if (USE_LONG_POLLING) {
      logger.log('[Mode] Using Long Polling')
      fetchMessages().then(() => {
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
        currentPollingRef.isPolling = false
        currentPollingRef.abortController?.abort()
      } else {
        logger.log('[Realtime] Cleaning up subscription')
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
        }
        if (subscription) {
          supabase.removeChannel(subscription)
        }
      }
      setConnectionStatus('offline')
    }
  }, [roomId, fetchMessages, startPolling, supabase])

  const sendMessage = useCallback(
    async ({ senderId, content, imageUrls }: SendMessageInput) => {
      const trimmedContent = content?.trim() ?? ''
      const normalizedImageUrls = (imageUrls ?? []).filter((url) => typeof url === 'string' && url.trim().length > 0)
      if ((!trimmedContent && normalizedImageUrls.length === 0) || !roomId) return false

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

        // 발신자 프로필 정보 캐시 사용 (없으면 1회 조회)
        let senderProfile = senderProfileCacheRef.current.get(senderId) || null
        if (!senderProfile) {
          const { data } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', senderId)
            .single()
          senderProfile = data
          if (senderProfile?.id) {
            senderProfileCacheRef.current.set(senderProfile.id, senderProfile)
          }
        }

        // 낙관적 업데이트: 즉시 UI에 메시지 추가
        const optimisticMessage: ChatMessageWithProfile = {
          id: tempId,
          room_id: roomId,
          sender_id: senderId,
          content: trimmedContent,
          image_urls: normalizedImageUrls,
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
        loadedCountRef.current += 1

        let data: InsertedMessageRow | null = null
        let sendError: Error | null = null

        // Feature Flag에 따라 API 또는 Supabase 직접 호출
        if (USE_LONG_POLLING) {
          logger.log('[Send] Using API endpoint')
          try {
            const response = await fetch('/api/chat/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                room_id: roomId,
                content: trimmedContent,
                image_urls: normalizedImageUrls,
              }),
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || 'API error')
            }

            const result = (await response.json()) as { message: InsertedMessageRow }
            data = result.message
          } catch (err: unknown) {
            sendError = err instanceof Error ? err : new Error('API error')
          }
        } else {
          logger.log('[Send] Using Supabase direct')
          const result = await supabase
            .from('chat_messages')
              .insert({
                room_id: roomId,
                sender_id: senderId,
                content: trimmedContent || ' ',
                image_urls: normalizedImageUrls,
              })
              .select()
              .single()

          data = result.data as InsertedMessageRow | null
          sendError = result.error ? new Error(result.error.message) : null
        }

        if (sendError) {
          logger.error('[Send] ❌ Send message error:', sendError)
          // 실패 시 낙관적으로 추가한 메시지 제거
          setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
          loadedCountRef.current = Math.max(loadedCountRef.current - 1, 0)
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
                    image_urls: data.image_urls ?? [],
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
            latestMessageIdRef.current = data.id
            latestMessageAtRef.current = data.created_at
          }
        }

        return true
      } catch (err) {
        logger.error('Send error:', err)
        // 실패 시 낙관적으로 추가한 메시지 제거
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
        loadedCountRef.current = Math.max(loadedCountRef.current - 1, 0)
        setError('메시지 전송에 실패했습니다')
        return false
      } finally {
        isSendingRef.current = false
        setIsSending(false)
      }
    },
    [roomId, supabase]
  )

  return {
    messages,
    isLoading,
    error,
    isSending,
    connectionStatus,
    hasOlderMessages,
    isLoadingOlder,
    loadOlderMessages,
    sendMessage,
    refetch: fetchMessages,
  }
}
