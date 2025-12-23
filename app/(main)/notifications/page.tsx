'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Notification } from '@/types/notification'

export default function NotificationsPage() {
  const router = useRouter()
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications()

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'new_message':
        return '💬'
      case 'appointment_proposal':
      case 'appointment_confirmed':
        return '📅'
      case 'appointment_cancelled':
        return '❌'
      case 'sale_completed':
        return '✅'
      case 'review_request':
        return '⭐'
      case 'post_like':
      case 'community_like':
        return '❤️'
      case 'post_interest':
        return '👀'
      case 'community_comment':
        return '💭'
      default:
        return '🔔'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between h-14 px-4 max-w-screen-xl mx-auto">
          <h1 className="text-lg font-bold">알림</h1>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              모두 읽음
            </Button>
          )}
        </div>
      </div>

      {/* 알림 목록 */}
      <div className="max-w-screen-xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm">알림이 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                  !notification.is_read ? 'bg-primary/5' : ''
                }`}
              >
                {/* 아바타 */}
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={notification.actor?.avatar_url || undefined} />
                  <AvatarFallback>
                    <span className="text-lg">
                      {getNotificationIcon(notification.type)}
                    </span>
                  </AvatarFallback>
                </Avatar>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-0.5">
                    {notification.title}
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                      locale: ko,
                    })}
                  </p>
                </div>

                {/* 읽음 표시 */}
                {!notification.is_read && (
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
