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

    async function markMessagesAsRead() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Mark unread messages as read
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('room_id', roomId)
        .eq('is_read', false)
        .neq('sender_id', user.id)
    }

    async function setupRealtimeSubscription() {
      // Subscribe to new messages in this room
      subscription = supabase
        .channel(`room-${roomId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `room_id=eq.${roomId}`,
          },
          () => {
            fetchMessages()
            markMessagesAsRead()
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
          () => {
            fetchMessages()
          }
        )
        .subscribe()
    }

    fetchMessages()
    markMessagesAsRead()
    setupRealtimeSubscription()

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription)
      }
    }
  }, [roomId, fetchMessages])

  const sendMessage = useCallback(
    async (content: string, senderId: string) => {
      if (!content.trim() || !roomId) return false

      try {
        setIsSending(true)
        const supabase = createClient()

        const { error } = await supabase.from('chat_messages').insert({
          room_id: roomId,
          sender_id: senderId,
          content: content.trim(),
        })

        if (error) {
          console.error('Send message error:', error)
          setError('메시지 전송에 실패했습니다')
          return false
        }

        await fetchMessages()
        return true
      } catch (err) {
        console.error('Send error:', err)
        setError('메시지 전송에 실패했습니다')
        return false
      } finally {
        setIsSending(false)
      }
    },
    [roomId, fetchMessages]
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
