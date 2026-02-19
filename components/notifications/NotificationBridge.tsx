'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/contexts/UserContext'
import type { Notification } from '@/types/notification'

function rememberSeenNotification(seen: Set<string>, id: string) {
  seen.add(id)
  if (seen.size <= 200) return

  const oldest = seen.values().next().value
  if (typeof oldest === 'string') {
    seen.delete(oldest)
  }
}

export default function NotificationBridge() {
  const { user } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const seenNotificationIdsRef = useRef(new Set<string>())
  const pathnameRef = useRef(pathname)

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    if (!user) return

    const supabase = createClient()
    const seenNotificationIds = seenNotificationIdsRef.current

    const channel = supabase
      .channel(`notification-bridge:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const incoming = payload.new as Notification

          if (seenNotificationIds.has(incoming.id)) {
            return
          }
          rememberSeenNotification(seenNotificationIds, incoming.id)

          const currentPathname = pathnameRef.current || ''
          const isCurrentRoomMessage =
            incoming.type === 'new_message' &&
            incoming.related_room_id &&
            currentPathname === `/chats/${incoming.related_room_id}`

          if (isCurrentRoomMessage) {
            return
          }

          if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            toast(incoming.title, {
              description: incoming.message,
              action: incoming.link
                ? {
                    label: '보기',
                    onClick: () => router.push(incoming.link!),
                  }
                : undefined,
            })
          }

          if (typeof window === 'undefined' || !('Notification' in window)) {
            return
          }
          if (Notification.permission !== 'granted') {
            return
          }

          const browserNotification = new Notification(incoming.title, {
            body: incoming.message,
            icon: '/favicon.ico',
            tag: incoming.id,
          })

          browserNotification.onclick = () => {
            window.focus()
            if (incoming.link) {
              router.push(incoming.link)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router, user])

  return null
}
