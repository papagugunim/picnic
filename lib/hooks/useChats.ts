'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChatRoomWithProfile } from '@/types/chat'
import { getCache, setCache } from '@/lib/cache'

/**
 * 채팅방 목록을 가져오고 실시간 업데이트를 제공하는 훅
 */
export function useChats() {
  const [chatRooms, setChatRooms] = useState<ChatRoomWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchChatRooms = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setChatRooms([])
        setIsLoading(false)
        return
      }

      // 캐시 확인 (3분 TTL - 채팅방은 자주 변경되므로 짧게 설정)
      const chatCacheKey = `cache_chat_rooms_${user.id}`
      const cached = getCache<ChatRoomWithProfile[]>(chatCacheKey, 3 * 60 * 1000)
      if (cached && cached.length > 0) {
        console.log('채팅방 목록 캐시 히트')
        setChatRooms(cached)
        setIsLoading(false)
        // 캐시 사용 후에도 백그라운드에서 업데이트
        // return 하지 않고 계속 진행
      }

      // Get chat rooms where user is either user1 or user2
      const { data: roomsData, error: roomsError } = await supabase
        .from('chat_rooms')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })

      if (roomsError) {
        console.error('Rooms fetch error:', roomsError)
        setError('채팅방 목록을 불러오는데 실패했습니다')
        return
      }

      // 최적화: 배치 쿼리로 N+1 문제 해결
      const otherUserIds = (roomsData || []).map(room =>
        room.user1_id === user.id ? room.user2_id : room.user1_id
      )
      const roomIds = (roomsData || []).map(room => room.id)
      const postIds = (roomsData || [])
        .filter(room => room.post_id)
        .map(room => room.post_id)

      // 병렬로 모든 데이터 가져오기 (3개 쿼리)
      const [profilesResult, messagesResult, postsResult] = await Promise.all([
        // 1. 모든 사용자 프로필 한번에 조회
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url, matryoshka_level, user_role')
          .in('id', otherUserIds),

        // 2. 모든 unread 메시지 한번에 조회
        supabase
          .from('chat_messages')
          .select('room_id, is_read, sender_id')
          .in('room_id', roomIds)
          .eq('is_read', false)
          .neq('sender_id', user.id),

        // 3. 관련 게시글 한번에 조회
        postIds.length > 0
          ? supabase
              .from('posts')
              .select('id, title, price, images')
              .in('id', postIds)
          : Promise.resolve({ data: [] })
      ])

      const profilesData = profilesResult.data || []
      const messagesData = messagesResult.data || []
      const postsData = postsResult.data || []

      // Map으로 빠른 조회
      const profilesMap = new Map(profilesData.map(p => [p.id, p]))
      const postsMap = new Map(postsData.map(p => [p.id, p]))

      // room별 unread count 계산
      const unreadCountMap = new Map<string, number>()
      messagesData.forEach(msg => {
        unreadCountMap.set(msg.room_id, (unreadCountMap.get(msg.room_id) || 0) + 1)
      })

      // 데이터 매핑 (O(n) 복잡도)
      const roomsWithDetails = (roomsData || []).map(room => {
        const otherUserId = room.user1_id === user.id ? room.user2_id : room.user1_id
        const profile = profilesMap.get(otherUserId)
        const post = room.post_id ? postsMap.get(room.post_id) : null

        return {
          ...room,
          other_user: profile || {
            id: otherUserId,
            full_name: null,
            avatar_url: null,
            matryoshka_level: 0
          },
          unread_count: unreadCountMap.get(room.id) || 0,
          post: post || null,
        }
      })

      // 캐시에 저장 (3분 TTL)
      setCache(chatCacheKey, roomsWithDetails as ChatRoomWithProfile[], 3 * 60 * 1000)

      setChatRooms(roomsWithDetails as ChatRoomWithProfile[])
    } catch (err) {
      console.error('Fetch error:', err)
      setError('채팅방 목록을 불러오는데 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    let subscription: any = null

    async function setupRealtimeSubscription() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Subscribe to changes in chat_rooms and chat_messages
      subscription = supabase
        .channel(`chat-rooms-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_rooms',
          },
          () => {
            console.log('Chat room changed, refetching...')
            fetchChatRooms()
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_messages',
          },
          () => {
            console.log('Chat message changed, refetching...')
            fetchChatRooms()
          }
        )
        .subscribe((status) => {
          console.log('Chat rooms subscription status:', status)
        })
    }

    fetchChatRooms()
    setupRealtimeSubscription()

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription)
      }
    }
  }, [fetchChatRooms, supabase])

  return { chatRooms, isLoading, error, mutate: fetchChatRooms }
}
