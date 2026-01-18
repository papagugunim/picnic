import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('ChatReadAPI')

import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { MarkAsReadRequest, MarkAsReadResponse } from '@/types/chat'

/**
 * 메시지 읽음 처리 엔드포인트
 * PATCH /api/chat/messages/read
 * Body: { room_id: string }
 *
 * 해당 채팅방의 상대방 메시지를 읽음 처리
 */
export async function PATCH(request: Request) {
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
    const body: MarkAsReadRequest = await request.json()
    const { room_id } = body

    if (!room_id) {
      return NextResponse.json({ error: 'room_id가 필요합니다' }, { status: 400 })
    }

    logger.log(`[Read] User ${user.id} marking messages as read in room ${room_id}`)

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

    // 4. 읽지 않은 상대방 메시지 읽음 처리
    const { data: updatedMessages, error: updateError } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('room_id', room_id)
      .eq('is_read', false)
      .neq('sender_id', user.id) // 본인이 보낸 메시지는 제외
      .select('id')

    if (updateError) {
      logger.error('Mark as read error:', updateError)
      return NextResponse.json(
        { error: '읽음 처리에 실패했습니다' },
        { status: 500 }
      )
    }

    const updatedCount = updatedMessages ? updatedMessages.length : 0

    // 5. 응답
    const response: MarkAsReadResponse = {
      updated_count: updatedCount,
    }

    logger.log(`[Read] Marked ${updatedCount} messages as read`)
    return NextResponse.json(response)
  } catch (error) {
    logger.error('Mark as read error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
