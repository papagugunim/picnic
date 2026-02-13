'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('UseUnreadCount')
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/contexts/UserContext'

/**
 * 읽지 않은 메시지 총 개수를 실시간으로 가져오는 훅
 */
export function useUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const { user, loading: userLoading } = useUser()

  useEffect(() => {
    if (userLoading) return

    const supabase = createClient()
    let subscription: any = null
    let isCancelled = false

    if (!user) {
      setUnreadCount(0)
      setIsLoading(false)
      return
    }
    const userId = user.id

    async function fetchUnreadCount() {
      try {
        // 내가 속한 모든 채팅방 가져오기
        const { data: rooms } = await supabase
          .from('chat_rooms')
          .select('id')
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

        if (!rooms || rooms.length === 0) {
          if (!isCancelled) {
            setUnreadCount(0)
            setIsLoading(false)
          }
          return
        }

        const roomIds = rooms.map(room => room.id)

        // 모든 채팅방의 읽지 않은 메시지 개수 합산
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .in('room_id', roomIds)
          .eq('is_read', false)
          .neq('sender_id', userId)

        if (!isCancelled) {
          setUnreadCount(count || 0)
        }
      } catch (error) {
        logger.error('Error fetching unread count:', error)
        if (!isCancelled) {
          setUnreadCount(0)
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    async function setupRealtimeSubscription() {
      // 새 메시지 수신 또는 읽음 상태 변경 시에만 다시 가져오기
      subscription = supabase
        .channel(`unread-messages-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
          },
          (payload) => {
            // 자신이 보낸 메시지는 무시
            if (payload.new && (payload.new as any).sender_id === userId) return
            logger.log('New chat message received, refetching unread count...')
            fetchUnreadCount()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_messages',
          },
          () => {
            // 읽음 상태 변경 감지 (is_read 업데이트)
            logger.log('Chat message updated, refetching unread count...')
            fetchUnreadCount()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_rooms',
          },
          () => {
            logger.log('New chat room created, refetching unread count...')
            fetchUnreadCount()
          }
        )
        .subscribe((status) => {
          logger.log('Unread count subscription status:', status)
        })
    }

    fetchUnreadCount()
    setupRealtimeSubscription()

    return () => {
      isCancelled = true
      if (subscription) {
        supabase.removeChannel(subscription)
      }
    }
  }, [user?.id, userLoading])

  return { unreadCount, isLoading }
}
