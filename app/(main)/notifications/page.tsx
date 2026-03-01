'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fromNow } from '@/lib/utils/date'
import { Bell, CheckCheck, ChevronRight } from 'lucide-react'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Notification } from '@/types/notification'

type NotificationFilter = 'all' | 'likes' | 'comments' | 'chat' | 'trade' | 'system'

export default function NotificationsPage() {
  const router = useRouter()
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications()
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all')

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
      case 'content_reported':
        return '🚨'
      default:
        return '🔔'
    }
  }

  const getNotificationFilter = (type: Notification['type']): Exclude<NotificationFilter, 'all'> => {
    if (type === 'post_like' || type === 'community_like' || type === 'post_interest') {
      return 'likes'
    }
    if (type === 'community_comment') {
      return 'comments'
    }
    if (type === 'new_message') {
      return 'chat'
    }
    if (
      type === 'appointment_proposal' ||
      type === 'appointment_confirmed' ||
      type === 'appointment_cancelled' ||
      type === 'sale_completed' ||
      type === 'review_request'
    ) {
      return 'trade'
    }
    return 'system'
  }

  const getNotificationCategoryLabel = (type: Notification['type']) => {
    const category = getNotificationFilter(type)
    switch (category) {
      case 'likes':
        return '좋아요'
      case 'comments':
        return '댓글'
      case 'chat':
        return '채팅'
      case 'trade':
        return '거래'
      case 'system':
        return '시스템'
      default:
        return '알림'
    }
  }

  const getNotificationContextEmoji = (notification: Notification) => {
    switch (notification.context?.kind) {
      case 'market_post':
        return '🛍️'
      case 'community_post':
        return '🏘️'
      case 'chat_room':
        return '💬'
      default:
        return '📌'
    }
  }

  const getNotificationContextText = (notification: Notification) => {
    const context = notification.context

    if (context?.title) {
      return `${context.label} · ${context.title}`
    }
    if (context?.label) {
      return context.label
    }

    switch (notification.type) {
      case 'new_message':
      case 'appointment_proposal':
      case 'appointment_confirmed':
      case 'appointment_cancelled':
        return '채팅방에서 확인'
      case 'community_comment':
      case 'community_like':
        return '동네생활 글에서 확인'
      case 'post_like':
      case 'post_interest':
      case 'sale_completed':
      case 'review_request':
        return '중고거래 글에서 확인'
      case 'content_reported':
        return '신고된 콘텐츠 확인'
      default:
        return '알림 상세 보기'
    }
  }

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') {
      return notifications
    }

    return notifications.filter((notification) => getNotificationFilter(notification.type) === activeFilter)
  }, [activeFilter, notifications])

  const filterCounts = useMemo(() => {
    const likesCount = notifications.filter((notification) => getNotificationFilter(notification.type) === 'likes').length
    const commentsCount = notifications.filter((notification) => getNotificationFilter(notification.type) === 'comments').length
    const chatCount = notifications.filter((notification) => getNotificationFilter(notification.type) === 'chat').length
    const tradeCount = notifications.filter((notification) => getNotificationFilter(notification.type) === 'trade').length
    const systemCount = notifications.filter((notification) => getNotificationFilter(notification.type) === 'system').length

    return {
      all: notifications.length,
      likes: likesCount,
      comments: commentsCount,
      chat: chatCount,
      trade: tradeCount,
      system: systemCount,
    }
  }, [notifications])

  return (
    <div className="bg-background">
      {/* 헤더 */}
      <div className="liquid-glass-topbar sticky top-0 z-20">
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
        <div className="px-4 pb-2 max-w-screen-xl mx-auto">
          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Button
              type="button"
              size="sm"
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              className="h-8 rounded-full px-3 text-xs shrink-0"
              onClick={() => setActiveFilter('all')}
            >
              전체 {filterCounts.all}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeFilter === 'likes' ? 'default' : 'outline'}
              className="h-8 rounded-full px-3 text-xs shrink-0"
              onClick={() => setActiveFilter('likes')}
            >
              좋아요 {filterCounts.likes}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeFilter === 'comments' ? 'default' : 'outline'}
              className="h-8 rounded-full px-3 text-xs shrink-0"
              onClick={() => setActiveFilter('comments')}
            >
              댓글 {filterCounts.comments}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeFilter === 'chat' ? 'default' : 'outline'}
              className="h-8 rounded-full px-3 text-xs shrink-0"
              onClick={() => setActiveFilter('chat')}
            >
              채팅 {filterCounts.chat}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeFilter === 'trade' ? 'default' : 'outline'}
              className="h-8 rounded-full px-3 text-xs shrink-0"
              onClick={() => setActiveFilter('trade')}
            >
              거래 {filterCounts.trade}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeFilter === 'system' ? 'default' : 'outline'}
              className="h-8 rounded-full px-3 text-xs shrink-0"
              onClick={() => setActiveFilter('system')}
            >
              시스템 {filterCounts.system}
            </Button>
          </div>
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
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm">
                {activeFilter === 'likes'
                  ? '좋아요 알림이 없습니다'
                  : activeFilter === 'comments'
                    ? '댓글 알림이 없습니다'
                    : activeFilter === 'chat'
                      ? '채팅 알림이 없습니다'
                      : activeFilter === 'trade'
                        ? '거래 알림이 없습니다'
                        : activeFilter === 'system'
                          ? '시스템 알림이 없습니다'
                          : '알림이 없습니다'}
              </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`flex min-h-[78px] items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                  !notification.is_read ? 'bg-primary/5' : ''
                }`}
              >
                {/* 아바타 */}
                <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5">
                  <AvatarImage src={notification.actor?.avatar_url || undefined} />
                  <AvatarFallback>
                    <span className="text-base">
                      {getNotificationIcon(notification.type)}
                    </span>
                  </AvatarFallback>
                </Avatar>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-5 truncate">
                      {notification.message || notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground leading-none flex-shrink-0 mt-1">
                      {fromNow(notification.created_at)}
                    </p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    {notification.context?.image_url ? (
                      <img
                        src={notification.context.image_url}
                        alt=""
                        loading="lazy"
                        className="h-[18px] w-[18px] rounded object-cover flex-shrink-0 border border-border/60"
                      />
                    ) : (
                      <span className="text-xs leading-none flex-shrink-0">
                        {getNotificationContextEmoji(notification)}
                      </span>
                    )}
                    <p className="text-xs text-muted-foreground truncate">
                      {getNotificationContextText(notification)}
                    </p>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground flex-shrink-0">
                      {getNotificationCategoryLabel(notification.type)}
                    </span>
                    {notification.link && (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/80 flex-shrink-0" />
                    )}
                  </div>
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
