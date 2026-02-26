import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Route')

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const supabase = await createServerClient()

    // 사용자 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다' }, { status: 401 })
    }

    const { roomId } = await context.params

    // 채팅방 존재 여부 및 권한 확인
    const { data: room, error: roomError } = await supabase
      .from('chat_rooms')
      .select('id, user1_id, user2_id, user_id, other_user_id')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: '채팅방을 찾을 수 없습니다' }, { status: 404 })
    }

    // 채팅방 참여자인지 확인
    const participants = [
      room.user1_id,
      room.user2_id,
      room.user_id,
      room.other_user_id,
    ].filter((participant): participant is string => typeof participant === 'string' && participant.length > 0)

    if (!participants.includes(user.id)) {
      return NextResponse.json({ error: '삭제 권한이 없습니다' }, { status: 403 })
    }

    // RLS 영향 없이 확실히 삭제되도록 admin client를 우선 사용
    // 서비스 키가 없으면 기존 서버 클라이언트로 폴백한다.
    let adminClientError: unknown = null
    let client = supabase

    try {
      client = createAdminClient()
    } catch (error) {
      adminClientError = error
      logger.warn('Admin client unavailable, falling back to server client:', error)
    }

    const { error: appointmentDeleteError } = await client
      .from('purchase_appointments')
      .delete()
      .eq('room_id', roomId)

    if (appointmentDeleteError) {
      logger.error('Purchase appointments deletion error:', appointmentDeleteError)
      return NextResponse.json({ error: '채팅방 삭제에 실패했습니다' }, { status: 500 })
    }

    const { error: messageDeleteError } = await client
      .from('chat_messages')
      .delete()
      .eq('room_id', roomId)

    if (messageDeleteError) {
      logger.error('Chat messages deletion error:', messageDeleteError)
      return NextResponse.json({ error: '채팅방 삭제에 실패했습니다' }, { status: 500 })
    }

    const { error: deleteError } = await client
      .from('chat_rooms')
      .delete()
      .eq('id', roomId)

    if (deleteError) {
      logger.error('Chat room deletion error:', deleteError)
      if (adminClientError) {
        logger.error('Deletion fallback used because admin client creation failed:', adminClientError)
      }
      return NextResponse.json({ error: '채팅방 삭제에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Delete chat room error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
