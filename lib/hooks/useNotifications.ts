'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types/notification'

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: Error | null
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refetch: () => Promise<void>
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  // 알림 조회
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setNotifications([])
        setUnreadCount(0)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:profiles!actor_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (fetchError) throw fetchError

      setNotifications(data || [])
      setUnreadCount((data || []).filter(n => !n.is_read).length)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('알림을 불러오는데 실패했습니다'))
      console.error('Failed to fetch notifications:', err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // 개별 알림 읽음 처리
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (updateError) throw updateError

      // 로컬 상태 업데이트
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }, [supabase])

  // 모든 알림 읽음 처리
  const markAllAsRead = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: updateError } = await supabase
        .rpc('mark_all_notifications_as_read', { p_user_id: user.id })

      if (updateError) throw updateError

      // 로컬 상태 업데이트
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      )
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }, [supabase])

  // 초기 로드 및 실시간 구독
  useEffect(() => {
    fetchNotifications()

    // 실시간 구독
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        async (payload) => {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user || payload.new.user_id !== user.id) return

          // actor 정보 가져오기
          let newNotification = payload.new as Notification

          if (payload.new.actor_id) {
            const { data: actorData } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', payload.new.actor_id)
              .single()

            if (actorData) {
              newNotification = {
                ...newNotification,
                actor: actorData
              }
            }
          }

          // 새 알림을 목록 맨 앞에 추가
          setNotifications(prev => [newNotification, ...prev])
          setUnreadCount(prev => prev + 1)

          // 브라우저 알림 (권한이 있는 경우)
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: newNotification.actor?.avatar_url || '/icon.png',
              tag: newNotification.id,
            })
          }
        }
      )
      .subscribe()

    // 정리
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchNotifications, supabase])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  }
}
