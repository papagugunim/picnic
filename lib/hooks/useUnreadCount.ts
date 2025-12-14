'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * 읽지 않은 메시지 총 개수를 실시간으로 가져오는 훅
 */
export function useUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let subscription: any = null

    async function fetchUnreadCount() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setUnreadCount(0)
          setIsLoading(false)
          return
        }

        // 내가 속한 모든 채팅방 가져오기
        const { data: rooms } = await supabase
          .from('chat_rooms')
          .select('id')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

        if (!rooms || rooms.length === 0) {
          setUnreadCount(0)
          setIsLoading(false)
          return
        }

        const roomIds = rooms.map(room => room.id)

        // 모든 채팅방의 읽지 않은 메시지 개수 합산
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .in('room_id', roomIds)
          .eq('is_read', false)
          .neq('sender_id', user.id)

        setUnreadCount(count || 0)
      } catch (error) {
        console.error('Error fetching unread count:', error)
        setUnreadCount(0)
      } finally {
        setIsLoading(false)
      }
    }

    async function setupRealtimeSubscription() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 새로운 메시지가 추가되거나 읽음 상태가 변경되면 다시 가져오기
      subscription = supabase
        .channel(`unread-messages-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_messages',
          },
          () => {
            console.log('Chat message changed, refetching unread count...')
            fetchUnreadCount()
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_rooms',
          },
          () => {
            console.log('Chat room changed, refetching unread count...')
            fetchUnreadCount()
          }
        )
        .subscribe((status) => {
          console.log('Unread count subscription status:', status)
        })
    }

    fetchUnreadCount()
    setupRealtimeSubscription()

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription)
      }
    }
  }, [])

  return { unreadCount, isLoading }
}
