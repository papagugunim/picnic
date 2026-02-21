import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('ChatPollAPI')

import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { PollMessagesResponse } from '@/types/chat'

type RawProfileRow = {
  id: string
  full_name: string | null
  avatar_url: string | null
}

type RawPolledMessageRow = {
  id: string
  room_id: string
  sender_id: string
  content: string
  image_urls: string[] | null
  is_read: boolean
  created_at: string
  profiles: RawProfileRow | RawProfileRow[] | null
}

/**
 * Long Polling 메시지 조회 엔드포인트
 * GET /api/chat/poll?roomId={id}&lastMessageId={id}&timeout={ms}
 *
 * 새 메시지가 있으면 즉시 응답, 없으면 최대 timeout까지 대기
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient()

    // 1. 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.error('Authentication failed:', authError)
      return NextResponse.json({ error: '인증되지 않은 사용자입니다' }, { status: 401 })
    }

    // 2. Query 파라미터 파싱
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const lastMessageId = searchParams.get('lastMessageId')
    const lastMessageAtParam = searchParams.get('lastMessageAt')
    const timeoutParam = searchParams.get('timeout')

    if (!roomId) {
      return NextResponse.json({ error: 'roomId가 필요합니다' }, { status: 400 })
    }

    // Vercel 제약사항: Pro 60초, Hobby 10초 → 실제 timeout 30초로 제한 (DB 부하 감소)
    const timeout = Math.min(
      timeoutParam ? parseInt(timeoutParam) : 25000,
      30000
    )

    logger.log(`[Poll] Starting poll for room ${roomId}, timeout: ${timeout}ms`)

    // 3. 채팅방 권한 확인
    const { data: room, error: roomError } = await supabase
      .from('chat_rooms')
      .select('user1_id, user2_id')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      logger.error('Room not found:', roomError)
      return NextResponse.json({ error: '채팅방을 찾을 수 없습니다' }, { status: 404 })
    }

    // 권한 확인
    if (room.user1_id !== user.id && room.user2_id !== user.id) {
      logger.error(`User ${user.id} not authorized for room ${roomId}`)
      return NextResponse.json({ error: '채팅방 접근 권한이 없습니다' }, { status: 403 })
    }

    // 4. Long Polling 로직
    const startTime = Date.now()
    const pollInterval = 2000 // 2초마다 체크 (DB 부하 감소)
    const maxIterations = Math.floor(timeout / pollInterval)

    // 클라이언트가 마지막 메시지 시각을 같이 보내면 추가 조회를 건너뛴다.
    let lastMessageTime: string | null = null
    if (lastMessageAtParam && !Number.isNaN(Date.parse(lastMessageAtParam))) {
      lastMessageTime = lastMessageAtParam
    } else if (lastMessageId) {
      const { data: lastMsg } = await supabase
        .from('chat_messages')
        .select('created_at')
        .eq('id', lastMessageId)
        .single()

      if (lastMsg) {
        lastMessageTime = lastMsg.created_at
      }
    }

    for (let i = 0; i < maxIterations; i++) {
      // 5. 새 메시지 조회
      let query = supabase
        .from('chat_messages')
        .select(
          `
          id,
          room_id,
          sender_id,
          content,
          image_urls,
          is_read,
          created_at,
          profiles:sender_id (
            id,
            full_name,
            avatar_url
          )
        `
        )
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      // lastMessageTime 이후의 메시지만 가져오기
      if (lastMessageTime) {
        query = query.gt('created_at', lastMessageTime)
      }

      const { data: messages, error: messagesError } = await query

      if (messagesError) {
        logger.error('Messages query error:', messagesError)
        return NextResponse.json({ error: '메시지 조회에 실패했습니다' }, { status: 500 })
      }

      // 6. 새 메시지가 있으면 즉시 응답
      if (messages && messages.length > 0) {
        const formattedMessages = (messages as RawPolledMessageRow[]).map((msg) => {
          const senderProfile = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles

          return {
            id: msg.id,
            room_id: msg.room_id,
            sender_id: msg.sender_id,
            content: msg.content,
            image_urls: msg.image_urls ?? [],
            is_read: msg.is_read,
            created_at: msg.created_at,
            sender: senderProfile || {
              id: msg.sender_id,
              full_name: null,
              avatar_url: null,
            },
          }
        })

        const response: PollMessagesResponse = {
          messages: formattedMessages,
          hasMore: false,
          lastMessageId: messages[messages.length - 1].id,
          lastMessageAt: messages[messages.length - 1].created_at,
        }

        logger.log(`[Poll] Found ${messages.length} new messages, responding immediately`)
        return NextResponse.json(response)
      }

      // 7. Vercel 타임아웃 체크 (안전 마진 5초)
      const elapsed = Date.now() - startTime
      if (elapsed > timeout - 5000) {
        logger.log(`[Poll] Approaching timeout (${elapsed}ms), breaking`)
        break
      }

      // 8. 대기
      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    }

    // 9. 타임아웃 - 빈 응답
    const response: PollMessagesResponse = {
      messages: [],
      hasMore: false,
      lastMessageId: lastMessageId,
      lastMessageAt: lastMessageTime,
    }

    logger.log('[Poll] Timeout reached, no new messages')
    return NextResponse.json(response)
  } catch (error) {
    logger.error('Poll endpoint error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
