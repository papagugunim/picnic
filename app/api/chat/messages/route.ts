import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('ChatMessagesAPI')

import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { SendMessageRequest, SendMessageResponse } from '@/types/chat'
import { sendPushToUser } from '@/app/api/push/send/route'

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
    const { room_id } = body
    const normalizedContent = body.content?.trim() ?? ''
    const imageUrls = (body.image_urls ?? []).filter((url): url is string => {
      if (typeof url !== 'string') return false
      const trimmed = url.trim()
      return trimmed.length > 0 && /^https?:\/\//i.test(trimmed)
    })

    if (!room_id) {
      return NextResponse.json(
        { error: 'room_id가 필요합니다' },
        { status: 400 }
      )
    }

    if (!normalizedContent && imageUrls.length === 0) {
      return NextResponse.json(
        { error: '메시지 내용 또는 이미지가 필요합니다' },
        { status: 400 }
      )
    }

    if (imageUrls.length > 5) {
      return NextResponse.json(
        { error: '이미지는 최대 5장까지 전송할 수 있습니다' },
        { status: 400 }
      )
    }

    const contentForInsert = normalizedContent || ' '

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
        content: contentForInsert,
        image_urls: imageUrls,
        is_read: false,
      })
      .select(
        `
        id,
        room_id,
        sender_id,
        content,
        image_urls,
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
        last_message: normalizedContent || (imageUrls.length > 0 ? '📷 사진' : ''),
        last_message_at: message.created_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', room_id)

    // 7. 수신자에게 Web Push 알림 전송 (비동기, 실패해도 무시)
    const recipientId = room.user1_id === user.id ? room.user2_id : room.user1_id
    const senderName = senderProfile?.full_name || '누군가'
    const pushBody = normalizedContent || '📷 사진을 보냈어요.'
    void sendPushToUser(recipientId, {
      title: `${senderName}님의 메시지`,
      body: pushBody.length > 80 ? pushBody.slice(0, 80) + '...' : pushBody,
      url: `/chats/${room_id}`,
    }).catch(() => {})

    // 8. 응답
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
