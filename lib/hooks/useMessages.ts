'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChatMessageWithProfile } from '@/types/chat'

/**
 * 특정 채팅방의 메시지를 가져오고 실시간 업데이트를 제공하는 훅
 */
export function useMessages(roomId: string) {
  const [messages, setMessages] = useState<ChatMessageWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)

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
        console.error('Messages fetch error:', messagesError)
        setError('메시지를 불러오는데 실패했습니다')
        return
      }

      const formattedMessages = messagesData.map((msg: any) => ({
        ...msg,
        sender: msg.profiles,
      }))

      setMessages(formattedMessages as ChatMessageWithProfile[])
    } catch (err) {
      console.error('Fetch error:', err)
      setError('메시지를 불러오는데 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [roomId])

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
        console.error('Mark as read error:', err)
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

        console.log(`[Realtime] Connecting to room ${roomId}...`)

        // Subscribe to new messages in this room
        subscription = supabase
          .channel(`room-${roomId}-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
              filter: `room_id=eq.${roomId}`,
            },
            async (payload) => {
              console.log('[Realtime] New message received:', payload.new)
              const newMessage = payload.new

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
                  console.log('[Realtime] Message already exists (by ID), skipping')
                  return prev
                }

                const existsByContent = prev.some((msg) =>
                  msg.content === newMessage.content &&
                  msg.sender_id === newMessage.sender_id &&
                  Math.abs(new Date(msg.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 5000
                )
                if (existsByContent) {
                  console.log('[Realtime] Message already exists (by content), skipping')
                  return prev
                }

                console.log('[Realtime] Adding new message to state')
                return [...prev, messageWithProfile as ChatMessageWithProfile]
              })

              // 읽음 표시
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
              console.log('[Realtime] Message updated:', payload.new)
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
            console.log('[Realtime] Subscription status:', status)

            if (status === 'SUBSCRIBED') {
              console.log('[Realtime] Successfully connected!')
              reconnectAttempts = 0
            } else if (status === 'CLOSED') {
              console.log('[Realtime] Connection closed')
              handleReconnect()
            } else if (status === 'CHANNEL_ERROR') {
              console.error('[Realtime] Channel error:', err)
              handleReconnect()
            } else if (status === 'TIMED_OUT') {
              console.error('[Realtime] Connection timed out')
              handleReconnect()
            }
          })
      } catch (err) {
        console.error('[Realtime] Setup error:', err)
        handleReconnect()
      }
    }

    function handleReconnect() {
      if (reconnectAttempts >= maxReconnectAttempts) {
        console.log('[Realtime] Max reconnection attempts reached, giving up')
        return
      }

      reconnectAttempts++
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000) // Exponential backoff, max 30s

      console.log(`[Realtime] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`)

      reconnectTimer = setTimeout(() => {
        console.log('[Realtime] Attempting to reconnect...')
        setupRealtimeSubscription()
      }, delay)
    }

    fetchMessages()
    markMessagesAsRead()
    setupRealtimeSubscription()

    return () => {
      console.log('[Realtime] Cleaning up subscription')
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      if (subscription) {
        supabase.removeChannel(subscription)
      }
    }
  }, [roomId, fetchMessages])

  const sendMessage = useCallback(
    async (content: string, senderId: string) => {
      if (!content.trim() || !roomId) return false

      // 임시 메시지 ID 생성 (낙관적 업데이트용)
      const tempId = `temp-${Date.now()}`

      try {
        setIsSending(true)
        const supabase = createClient()

        // 발신자 프로필 정보 가져오기
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

        console.log('Adding optimistic message:', optimisticMessage)
        setMessages((prev) => [...prev, optimisticMessage])

        // 메시지 전송
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            room_id: roomId,
            sender_id: senderId,
            content: content.trim(),
          })
          .select()
          .single()

        if (error) {
          console.error('Send message error:', error)
          // 실패 시 낙관적으로 추가한 메시지 제거
          setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
          setError('메시지 전송에 실패했습니다')
          return false
        }

        console.log('Message sent successfully:', data)

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
        }

        return true
      } catch (err) {
        console.error('Send error:', err)
        // 실패 시 낙관적으로 추가한 메시지 제거
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
        setError('메시지 전송에 실패했습니다')
        return false
      } finally {
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
