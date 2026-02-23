'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/contexts/UserContext'
import { createNamespacedLogger } from '@/lib/logger'
import type { Notification } from '@/types/notification'
const logger = createNamespacedLogger('UseNotifications')

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: Error | null
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refetch: () => Promise<void>
}

interface ActorProfileRow {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface MarketPostRow {
  id: string
  title: string
  images: string[] | null
}

interface CommunityPostRow {
  id: string
  title: string
  images: string[] | null
}

interface ChatRoomRow {
  id: string
  post_id: string | null
}

const extractIdFromLink = (
  link: string | null,
  prefix: '/post/' | '/community/' | '/chats/'
): string | null => {
  if (!link || !link.startsWith(prefix)) return null

  const id = link
    .slice(prefix.length)
    .split(/[/?#]/)[0]
    ?.trim()

  return id || null
}

const getFirstImageUrl = (images: string[] | null | undefined): string | null => {
  if (!Array.isArray(images) || images.length === 0) return null
  return images[0] || null
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useUser()

  const supabase = createClient()

  const hydrateNotifications = useCallback(async (rows: Notification[]): Promise<Notification[]> => {
    if (rows.length === 0) return rows

    const actorIds = new Set<string>()
    const marketPostIds = new Set<string>()
    const communityPostIds = new Set<string>()
    const roomIds = new Set<string>()

    rows.forEach((notification) => {
      if (notification.actor_id) actorIds.add(notification.actor_id)
      if (notification.related_post_id) marketPostIds.add(notification.related_post_id)
      if (notification.related_room_id) roomIds.add(notification.related_room_id)

      const postIdFromLink = extractIdFromLink(notification.link, '/post/')
      if (postIdFromLink) marketPostIds.add(postIdFromLink)

      const communityPostIdFromLink = extractIdFromLink(notification.link, '/community/')
      if (communityPostIdFromLink) communityPostIds.add(communityPostIdFromLink)

      const roomIdFromLink = extractIdFromLink(notification.link, '/chats/')
      if (roomIdFromLink) roomIds.add(roomIdFromLink)
    })

    const actorsMap = new Map<string, ActorProfileRow>()
    const marketPostsMap = new Map<string, MarketPostRow>()
    const communityPostsMap = new Map<string, CommunityPostRow>()
    const roomsMap = new Map<string, ChatRoomRow>()

    const actorIdsArray = Array.from(actorIds)
    if (actorIdsArray.length > 0) {
      const { data: actorsData, error: actorsError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', actorIdsArray)

      if (actorsError) {
        logger.warn('Failed to fetch actor profiles:', actorsError)
      } else {
        const actorRows = (actorsData || []) as ActorProfileRow[]
        actorRows.forEach((actor) => {
          actorsMap.set(actor.id, actor)
        })
      }
    }

    const marketPostIdsArray = Array.from(marketPostIds)
    if (marketPostIdsArray.length > 0) {
      const { data: marketPostsData, error: marketPostsError } = await supabase
        .from('posts')
        .select('id, title, images')
        .in('id', marketPostIdsArray)

      if (marketPostsError) {
        logger.warn('Failed to fetch market post contexts:', marketPostsError)
      } else {
        const marketPostRows = (marketPostsData || []) as MarketPostRow[]
        marketPostRows.forEach((post) => {
          marketPostsMap.set(post.id, post)
        })
      }
    }

    const communityPostIdsArray = Array.from(communityPostIds)
    if (communityPostIdsArray.length > 0) {
      const { data: communityPostsData, error: communityPostsError } = await supabase
        .from('community_posts')
        .select('id, title, images')
        .in('id', communityPostIdsArray)

      if (communityPostsError) {
        logger.warn('Failed to fetch community post contexts:', communityPostsError)
      } else {
        const communityPostRows = (communityPostsData || []) as CommunityPostRow[]
        communityPostRows.forEach((post) => {
          communityPostsMap.set(post.id, post)
        })
      }
    }

    const roomIdsArray = Array.from(roomIds)
    if (roomIdsArray.length > 0) {
      const { data: roomsData, error: roomsError } = await supabase
        .from('chat_rooms')
        .select('id, post_id')
        .in('id', roomIdsArray)

      if (roomsError) {
        logger.warn('Failed to fetch chat room contexts:', roomsError)
      } else {
        const roomRows = (roomsData || []) as ChatRoomRow[]
        roomRows.forEach((room) => {
          roomsMap.set(room.id, room)
        })

        const roomPostIds = Array.from(
          new Set(
            roomRows
              .map((room) => room.post_id)
              .filter((postId): postId is string => !!postId && !marketPostsMap.has(postId))
          )
        )

        if (roomPostIds.length > 0) {
          const { data: roomPostsData, error: roomPostsError } = await supabase
            .from('posts')
            .select('id, title, images')
            .in('id', roomPostIds)

          if (roomPostsError) {
            logger.warn('Failed to fetch post context for chat rooms:', roomPostsError)
          } else {
            const roomPostRows = (roomPostsData || []) as MarketPostRow[]
            roomPostRows.forEach((post) => {
              marketPostsMap.set(post.id, post)
            })
          }
        }
      }
    }

    return rows.map((notification) => {
      const postIdFromLink = extractIdFromLink(notification.link, '/post/')
      const communityPostIdFromLink = extractIdFromLink(notification.link, '/community/')
      const roomIdFromLink = extractIdFromLink(notification.link, '/chats/')
      const resolvedRoomId = notification.related_room_id ?? roomIdFromLink
      const resolvedPostId = notification.related_post_id ?? postIdFromLink

      let context: Notification['context'] = null

      if (communityPostIdFromLink) {
        const communityPost = communityPostsMap.get(communityPostIdFromLink)
        context = {
          kind: 'community_post',
          id: communityPostIdFromLink,
          label: '동네생활 글',
          title: communityPost?.title ?? null,
          image_url: getFirstImageUrl(communityPost?.images),
        }
      } else if (resolvedRoomId) {
        const room = roomsMap.get(resolvedRoomId)
        const roomPostId = room?.post_id ?? resolvedPostId
        const roomPost = roomPostId ? marketPostsMap.get(roomPostId) : undefined

        context = {
          kind: 'chat_room',
          id: resolvedRoomId,
          label: roomPost?.title ? '채팅 상품' : '채팅방',
          title: roomPost?.title ?? null,
          image_url: getFirstImageUrl(roomPost?.images),
        }
      } else if (resolvedPostId) {
        const marketPost = marketPostsMap.get(resolvedPostId)
        context = {
          kind: 'market_post',
          id: resolvedPostId,
          label: '중고거래 글',
          title: marketPost?.title ?? null,
          image_url: getFirstImageUrl(marketPost?.images),
        }
      } else if (notification.link) {
        context = {
          kind: 'unknown',
          id: null,
          label: '알림 상세',
          title: null,
          image_url: null,
        }
      }

      const actor = notification.actor_id ? actorsMap.get(notification.actor_id) : undefined

      return {
        ...notification,
        ...(actor ? { actor } : {}),
        context,
      }
    })
  }, [supabase])

  // 알림 조회
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!user) {
        setNotifications([])
        setUnreadCount(0)
        return
      }

      // 알림 기본 데이터 조회
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (fetchError) throw fetchError

      const hydrated = await hydrateNotifications((data || []) as Notification[])

      setNotifications(hydrated)
      setUnreadCount(hydrated.filter((notification) => !notification.is_read).length)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('알림을 불러오는데 실패했습니다'))
      logger.error('Failed to fetch notifications:', err)
    } finally {
      setIsLoading(false)
    }
  }, [hydrateNotifications, supabase, user])

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
      logger.error('Failed to mark notification as read:', err)
    }
  }, [supabase])

  // 모든 알림 읽음 처리
  const markAllAsRead = useCallback(async () => {
    if (!user) return

    try {
      // RPC 대신 직접 UPDATE 쿼리 사용 (400 에러 방지)
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (updateError) throw updateError

      // 로컬 상태 업데이트
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      )
      setUnreadCount(0)
    } catch (err) {
      logger.error('Failed to mark all notifications as read:', err)
    }
  }, [supabase, user])

  // 초기 로드 및 실시간 구독
  useEffect(() => {
    if (!user) return

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
          if (payload.new.user_id !== user.id) return

          const [newNotification] = await hydrateNotifications([payload.new as Notification])
          if (!newNotification) return

          // 새 알림을 목록 맨 앞에 추가
          setNotifications(prev => [newNotification, ...prev].slice(0, 50))
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    // 정리
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchNotifications, hydrateNotifications, supabase, user])

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
