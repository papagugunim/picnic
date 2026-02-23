'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/contexts/UserContext'

const STORAGE_KEY_PREFIX = 'cache_notification_count'

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

/**
 * 읽지 않은 알림 개수만 경량으로 가져오는 훅
 * TopBar 등 count만 필요한 곳에서 useNotifications 대신 사용
 */
export function useNotificationCount(enabled: boolean = true) {
  const [unreadCount, setUnreadCount] = useState(0)
  const { user } = useUser()

  useEffect(() => {
    if (!enabled || !user) {
      setUnreadCount(0)
      return
    }

    const userId = user.id
    const cached = readCachedCount(userId)
    if (cached !== null) {
      setUnreadCount(cached)
    }

    const supabase = createClient()
    let fetchTimer: ReturnType<typeof setTimeout> | null = null
    let idleHandle: number | null = null

    async function fetchCount() {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (!error) {
        const nextCount = count || 0
        setUnreadCount(nextCount)
        writeCachedCount(userId, nextCount)
      }
    }

    const startFetch = () => {
      void fetchCount()
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleHandle = window.requestIdleCallback(startFetch, { timeout: 1200 })
    } else {
      fetchTimer = setTimeout(startFetch, 350)
    }

    // 새 알림 INSERT 시에만 count 갱신
    const channel = supabase
      .channel(`notification-count-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setUnreadCount((prev) => {
            const next = prev + 1
            writeCachedCount(userId, next)
            return next
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // 읽음 처리 시 count 재조회
          fetchCount()
        }
      )
      .subscribe()

    return () => {
      if (fetchTimer) {
        clearTimeout(fetchTimer)
      }
      if (typeof window !== 'undefined' && idleHandle !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleHandle)
      }
      supabase.removeChannel(channel)
    }
  }, [enabled, user])

  return { unreadCount }
}
