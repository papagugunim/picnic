'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChatRoomWithProfile } from '@/types/chat'

/**
 * 채팅방 목록을 가져오고 실시간 업데이트를 제공하는 훅
 */
export function useChats() {
  const [chatRooms, setChatRooms] = useState<ChatRoomWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let subscription: any = null

    async function fetchChatRooms() {
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

        // For each room, get the other user's profile and unread count
        const roomsWithDetails = await Promise.all(
          (roomsData || []).map(async (room) => {
            const otherUserId = room.user1_id === user.id ? room.user2_id : room.user1_id

            // Get other user's profile
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, matryoshka_level')
              .eq('id', otherUserId)
              .single()

            // Get unread messages count
            const { count: unreadCount } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('room_id', room.id)
              .eq('is_read', false)
              .neq('sender_id', user.id)

            // Get related post if exists
            let postData = null
            if (room.post_id) {
              const { data } = await supabase
                .from('posts')
                .select('id, title, price, images')
                .eq('id', room.post_id)
                .single()

              postData = data
            }

            return {
              ...room,
              other_user: profileData || {
                id: otherUserId,
                full_name: null,
                avatar_url: null,
                matryoshka_level: 0
              },
              unread_count: unreadCount || 0,
              post: postData,
            }
          })
        )

        setChatRooms(roomsWithDetails as ChatRoomWithProfile[])
      } catch (err) {
        console.error('Fetch error:', err)
        setError('채팅방 목록을 불러오는데 실패했습니다')
      } finally {
        setIsLoading(false)
      }
    }

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
  }, [])

  return { chatRooms, isLoading, error, refetch: () => {} }
}
