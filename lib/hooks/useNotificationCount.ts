'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/contexts/UserContext'

/**
 * 읽지 않은 알림 개수만 경량으로 가져오는 훅
 * TopBar 등 count만 필요한 곳에서 useNotifications 대신 사용
 */
export function useNotificationCount() {
  const [unreadCount, setUnreadCount] = useState(0)
  const { user } = useUser()

  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      return
    }

    const supabase = createClient()

    async function fetchCount() {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_read', false)

      if (!error) {
        setUnreadCount(count || 0)
      }
    }

    fetchCount()

    // 새 알림 INSERT 시에만 count 갱신
    const channel = supabase
      .channel(`notification-count-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          setUnreadCount(prev => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // 읽음 처리 시 count 재조회
          fetchCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  return { unreadCount }
}
