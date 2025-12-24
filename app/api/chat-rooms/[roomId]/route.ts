import { createServerClient } from '@/lib/supabase/server'
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
      .select('user_id, other_user_id')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: '채팅방을 찾을 수 없습니다' }, { status: 404 })
    }

    // 채팅방 참여자인지 확인
    if (room.user_id !== user.id && room.other_user_id !== user.id) {
      return NextResponse.json({ error: '삭제 권한이 없습니다' }, { status: 403 })
    }

    // 채팅방 삭제 (메시지는 CASCADE로 자동 삭제됨)
    const { error: deleteError } = await supabase
      .from('chat_rooms')
      .delete()
      .eq('id', roomId)

    if (deleteError) {
      console.error('Chat room deletion error:', deleteError)
      return NextResponse.json({ error: '채팅방 삭제에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete chat room error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}