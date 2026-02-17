'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('UseUnreadCount')
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/contexts/UserContext'

type ChatMessageRealtimeRow = {
  room_id?: string
  sender_id?: string
}

type ChatRoomRealtimeRow = {
  id?: string
  user1_id?: string
  user2_id?: string
}

/**
 * 읽지 않은 메시지 총 개수를 실시간으로 가져오는 훅
 */
export function useUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const { user, loading: userLoading } = useUser()
  const roomIdsRef = useRef<Set<string>>(new Set())
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFetchingRef = useRef(false)
  const hasQueuedFetchRef = useRef(false)

  useEffect(() => {
    if (userLoading) return

    const supabase = createClient()
    let subscription: any = null
    let isCancelled = false

    roomIdsRef.current = new Set()
    isFetchingRef.current = false
    hasQueuedFetchRef.current = false

    if (!user) {
      setUnreadCount(0)
      setIsLoading(false)
      return
    }
    const userId = user.id

    async function fetchUnreadCount() {
      if (isFetchingRef.current) {
        hasQueuedFetchRef.current = true
        return
      }

      const roomIds = Array.from(roomIdsRef.current)
      if (roomIds.length === 0) {
        if (!isCancelled) {
          setUnreadCount(0)
          setIsLoading(false)
        }
        return
      }

      isFetchingRef.current = true
      try {
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
        isFetchingRef.current = false
        if (!isCancelled) {
          setIsLoading(false)
        }
        if (hasQueuedFetchRef.current) {
          hasQueuedFetchRef.current = false
          setTimeout(() => {
            if (!isCancelled) {
              void fetchUnreadCount()
            }
          }, 0)
        }
      }
    }

    function scheduleFetch(delayMs = 120) {
      if (isCancelled) return
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current)
      }
      fetchTimerRef.current = setTimeout(() => {
        fetchTimerRef.current = null
        void fetchUnreadCount()
      }, delayMs)
    }

    async function setupRealtimeSubscription() {
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
            const message = payload.new as ChatMessageRealtimeRow | null
            if (!message?.room_id) return
            if (message.sender_id === userId) return
            if (!roomIdsRef.current.has(message.room_id)) return
            scheduleFetch(80)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_messages',
          },
          (payload) => {
            const message = payload.new as ChatMessageRealtimeRow | null
            if (!message?.room_id) return
            if (!roomIdsRef.current.has(message.room_id)) return
            scheduleFetch(120)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_rooms',
          },
          (payload) => {
            const room = payload.new as ChatRoomRealtimeRow | null
            if (!room?.id) return
            if (room.user1_id !== userId && room.user2_id !== userId) return
            roomIdsRef.current.add(room.id)
            scheduleFetch(0)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'chat_rooms',
          },
          (payload) => {
            const room = payload.old as ChatRoomRealtimeRow | null
            if (!room?.id) return
            if (roomIdsRef.current.delete(room.id)) {
              scheduleFetch(0)
            }
          }
        )
        .subscribe((status) => {
          logger.log('Unread count subscription status:', status)
        })
    }

    async function initialize() {
      try {
        setIsLoading(true)

        const { data: rooms, error: roomsError } = await supabase
          .from('chat_rooms')
          .select('id')
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

        if (roomsError) {
          throw roomsError
        }

        roomIdsRef.current = new Set((rooms || []).map((room) => room.id))

        if (roomIdsRef.current.size === 0) {
          setUnreadCount(0)
          setIsLoading(false)
        } else {
          await fetchUnreadCount()
        }
      } catch (error) {
        logger.error('Error initializing unread count:', error)
        if (!isCancelled) {
          setUnreadCount(0)
          setIsLoading(false)
        }
      }

      await setupRealtimeSubscription()
    }

    void initialize()

    return () => {
      isCancelled = true
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current)
      }
      if (subscription) {
        supabase.removeChannel(subscription)
      }
    }
  }, [user?.id, userLoading])

  return { unreadCount, isLoading }
}
