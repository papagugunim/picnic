'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChatRoomWithProfile } from '@/types/chat'
import { getCache, setCache } from '@/lib/cache'
import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('useChats')
const CHAT_ROOMS_PAGE_SIZE = 20

interface FetchOptions {
  append?: boolean
  useCache?: boolean
}

type ChatRoomRow = {
  id: string
  user1_id: string
  user2_id: string
  post_id: string | null
  [key: string]: unknown
}

/**
 * 채팅방 목록을 가져오고 페이지 단위 로딩을 제공하는 훅
 */
export function useChats() {
  const [chatRooms, setChatRooms] = useState<ChatRoomWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()
  const offsetRef = useRef(0)

  const buildRoomsWithDetails = useCallback(
    async (roomsData: ChatRoomRow[], userId: string): Promise<ChatRoomWithProfile[]> => {
      if (roomsData.length === 0) return []

      const otherUserIds = roomsData.map((room) =>
        room.user1_id === userId ? room.user2_id : room.user1_id
      )
      const roomIds = roomsData.map((room) => room.id)
      const postIds = roomsData
        .filter((room) => room.post_id)
        .map((room) => room.post_id)

      const [profilesResult, messagesResult, postsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bread_level, user_role')
          .in('id', otherUserIds),

        supabase
          .from('chat_messages')
          .select('room_id, is_read, sender_id')
          .in('room_id', roomIds)
          .eq('is_read', false)
          .neq('sender_id', userId),

        postIds.length > 0
          ? supabase
              .from('posts')
              .select('id, title, price, images, status')
              .in('id', postIds)
          : Promise.resolve({ data: [] }),
      ])

      const profilesData = profilesResult.data || []
      const messagesData = messagesResult.data || []
      const postsData = postsResult.data || []

      const profilesMap = new Map(profilesData.map((profile) => [profile.id, profile]))
      const postsMap = new Map(postsData.map((post) => [post.id, post]))

      const unreadCountMap = new Map<string, number>()
      messagesData.forEach((message) => {
        unreadCountMap.set(message.room_id, (unreadCountMap.get(message.room_id) || 0) + 1)
      })

      return roomsData.map((room) => {
        const otherUserId = room.user1_id === userId ? room.user2_id : room.user1_id
        const profile = profilesMap.get(otherUserId)
        const post = room.post_id ? postsMap.get(room.post_id) : null

        return {
          ...room,
          other_user: profile || {
            id: otherUserId,
            full_name: null,
            avatar_url: null,
            bread_level: 0,
          },
          unread_count: unreadCountMap.get(room.id) || 0,
          post: post || null,
        }
      }) as ChatRoomWithProfile[]
    },
    [supabase]
  )

  const fetchChatRooms = useCallback(
    async ({ append = false, useCache = false }: FetchOptions = {}) => {
      try {
        if (append) {
          setIsFetchingMore(true)
        } else {
          setIsLoading(true)
          setError(null)
        }

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setChatRooms([])
          setHasMore(false)
          offsetRef.current = 0
          return
        }

        const chatCacheKey = `cache_chat_rooms_${user.id}`
        if (!append && useCache) {
          const cached = getCache<ChatRoomWithProfile[]>(chatCacheKey, 3 * 60 * 1000)
          if (cached && cached.length > 0) {
            logger.log('채팅방 목록 캐시 히트')
            setChatRooms(cached)
            offsetRef.current = cached.length
            setHasMore(cached.length >= CHAT_ROOMS_PAGE_SIZE)
            setIsLoading(false)
          }
        }

        const start = append ? offsetRef.current : 0
        const end = start + CHAT_ROOMS_PAGE_SIZE - 1

        const { data: roomsData, error: roomsError } = await supabase
          .from('chat_rooms')
          .select('*')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .order('updated_at', { ascending: false })
          .range(start, end)

        if (roomsError) {
          logger.error('Rooms fetch error:', roomsError)
          setError('채팅방 목록을 불러오는데 실패했습니다')
          return
        }

        const nextRooms = await buildRoomsWithDetails((roomsData || []) as ChatRoomRow[], user.id)

        setChatRooms((prev) => {
          if (!append) return nextRooms

          const seen = new Set(prev.map((room) => room.id))
          const uniqueNextRooms = nextRooms.filter((room) => !seen.has(room.id))
          return [...prev, ...uniqueNextRooms]
        })

        offsetRef.current = start + (roomsData?.length || 0)
        setHasMore((roomsData?.length || 0) === CHAT_ROOMS_PAGE_SIZE)

        if (!append) {
          setCache(chatCacheKey, nextRooms, 3 * 60 * 1000)
        }
      } catch (err) {
        logger.error('Fetch error:', err)
        setError('채팅방 목록을 불러오는데 실패했습니다')
      } finally {
        if (append) {
          setIsFetchingMore(false)
        } else {
          setIsLoading(false)
        }
      }
    },
    [buildRoomsWithDetails, supabase]
  )

  const mutate = useCallback(async () => {
    offsetRef.current = 0
    await fetchChatRooms({ append: false, useCache: false })
  }, [fetchChatRooms])

  const loadMore = useCallback(async () => {
    if (isLoading || isFetchingMore || !hasMore) return
    await fetchChatRooms({ append: true, useCache: false })
  }, [fetchChatRooms, hasMore, isFetchingMore, isLoading])

  useEffect(() => {
    logger.log('Loading chat rooms with pagination')
    fetchChatRooms({ append: false, useCache: true })
  }, [fetchChatRooms])

  return {
    chatRooms,
    isLoading,
    isFetchingMore,
    hasMore,
    error,
    mutate,
    loadMore,
  }
}
