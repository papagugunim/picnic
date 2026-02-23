'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('UseUnreadCount')
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/contexts/UserContext'
import type { RealtimeChannel } from '@supabase/supabase-js'

const STORAGE_KEY_PREFIX = 'cache_unread_chat_count'

function getStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}:${userId}`
}

function readCachedCount(userId: string): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(getStorageKey(userId))
    if (!raw) return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
  } catch {
    return null
  }
}

function writeCachedCount(userId: string, count: number): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getStorageKey(userId), String(Math.max(0, count)))
  } catch {
    // ignore storage errors
  }
}

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
export function useUnreadCount(enabled: boolean = true) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const { user, loading: userLoading } = useUser()
  const userId = user?.id ?? null
  const roomIdsRef = useRef<Set<string>>(new Set())
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFetchingRef = useRef(false)
  const hasQueuedFetchRef = useRef(false)

  useEffect(() => {
    let isCancelled = false

    if (userLoading) return

    if (!enabled) {
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    let subscription: RealtimeChannel | null = null
    let initTimer: ReturnType<typeof setTimeout> | null = null
    let idleHandle: number | null = null

    roomIdsRef.current = new Set()
    isFetchingRef.current = false
    hasQueuedFetchRef.current = false

    if (!userId) {
      setUnreadCount(0)
      setIsLoading(false)
      return
    }
    const currentUserId = userId

    const cached = readCachedCount(currentUserId)
    if (cached !== null) {
      setUnreadCount(cached)
      setIsLoading(false)
    }

    async function fetchUnreadCount() {
      if (isFetchingRef.current) {
        hasQueuedFetchRef.current = true
        return
      }

      const roomIds = Array.from(roomIdsRef.current)
      if (roomIds.length === 0) {
        if (!isCancelled) {
          setUnreadCount(0)
          writeCachedCount(currentUserId, 0)
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
          .neq('sender_id', currentUserId)

        if (!isCancelled) {
          const nextCount = count || 0
          setUnreadCount(nextCount)
          writeCachedCount(currentUserId, nextCount)
        }
      } catch (error) {
        logger.error('Error fetching unread count:', error)
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
            if (message.sender_id === currentUserId) return
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
            if (room.user1_id !== currentUserId && room.user2_id !== currentUserId) return
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
          .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)

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

    const startInitialize = () => {
      void initialize()
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleHandle = window.requestIdleCallback(startInitialize, { timeout: 1500 })
    } else {
      initTimer = setTimeout(startInitialize, 420)
    }

    return () => {
      isCancelled = true
      if (initTimer) {
        clearTimeout(initTimer)
      }
      if (typeof window !== 'undefined' && idleHandle !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleHandle)
      }
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current)
      }
      if (subscription) {
        supabase.removeChannel(subscription)
      }
    }
  }, [enabled, userId, userLoading])

  return { unreadCount, isLoading }
}
