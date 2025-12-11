/**
 * 채팅 관련 타입 정의
 */

export interface ChatRoom {
  id: string
  user1_id: string
  user2_id: string
  post_id: string | null
  last_message: string | null
  last_message_at: string | null
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  room_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
}

export interface ChatRoomWithProfile extends ChatRoom {
  other_user: {
    id: string
    full_name: string | null
    avatar_url: string | null
    matryoshka_level?: number
  }
  unread_count: number
  post?: {
    id: string
    title: string
    price: number | null
    images: string[]
  }
}

export interface ChatMessageWithProfile extends ChatMessage {
  sender: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
}

/**
 * 채팅방 생성 파라미터
 */
export interface CreateChatRoomParams {
  p_user1_id: string
  p_user2_id: string
  p_post_id?: string
}

/**
 * 메시지 전송 파라미터
 */
export interface SendMessageParams {
  room_id: string
  sender_id: string
  content: string
}
