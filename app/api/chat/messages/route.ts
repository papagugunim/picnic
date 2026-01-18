import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('ChatMessagesAPI')

import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { SendMessageRequest, SendMessageResponse } from '@/types/chat'

/**
 * 메시지 전송 엔드포인트
 * POST /api/chat/messages
 * Body: { room_id: string, content: string }
 *
 * Supabase 클라이언트 직접 호출을 대체
 * sender_id는 인증된 사용자에서 자동 추출
 */
export async function POST(request: Request) {
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

    // 2. Request Body 파싱
    const body: SendMessageRequest = await request.json()
    const { room_id, content } = body

    if (!room_id || !content || !content.trim()) {
      return NextResponse.json(
        { error: 'room_id와 content가 필요합니다' },
        { status: 400 }
      )
    }

    logger.log(`[Send] User ${user.id} sending message to room ${room_id}`)

    // 3. 채팅방 존재 및 권한 확인
    const { data: room, error: roomError } = await supabase
      .from('chat_rooms')
      .select('user1_id, user2_id')
      .eq('id', room_id)
      .single()

    if (roomError || !room) {
      logger.error('Room not found:', roomError)
      return NextResponse.json({ error: '채팅방을 찾을 수 없습니다' }, { status: 404 })
    }

    // 권한 확인
    if (room.user1_id !== user.id && room.user2_id !== user.id) {
      logger.error(`User ${user.id} not authorized for room ${room_id}`)
      return NextResponse.json({ error: '채팅방 접근 권한이 없습니다' }, { status: 403 })
    }

    // 4. 메시지 삽입
    const { data: message, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        room_id,
        sender_id: user.id,
        content: content.trim(),
        is_read: false,
      })
      .select(
        `
        id,
        room_id,
        sender_id,
        content,
        is_read,
        created_at
      `
      )
      .single()

    if (insertError) {
      logger.error('Message insert error:', insertError)
      return NextResponse.json({ error: '메시지 전송에 실패했습니다' }, { status: 500 })
    }

    // 5. 발신자 프로필 정보 가져오기
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', user.id)
      .single()

    // 6. 채팅방 last_message, last_message_at 업데이트
    await supabase
      .from('chat_rooms')
      .update({
        last_message: content.trim(),
        last_message_at: message.created_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', room_id)

    // 7. 응답
    const response: SendMessageResponse = {
      message: {
        ...message,
        sender: senderProfile || {
          id: user.id,
          full_name: null,
          avatar_url: null,
        },
      },
    }

    logger.log(`[Send] Message ${message.id} sent successfully`)
    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    logger.error('Send message error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
