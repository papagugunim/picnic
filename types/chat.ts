/**
 * 채팅 관련 타입 정의
 */

import type { PurchaseAppointment } from './purchase'

export interface ChatRoom {
  id: string
  user1_id: string
  user2_id: string
  post_id: string | null
  last_message: string | null
  last_message_at: string | null
  sale_completed_at: string | null
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  room_id: string
  sender_id: string
  content: string
  image_urls: string[]
  is_read: boolean
  created_at: string
}

export interface ChatRoomWithProfile extends ChatRoom {
  other_user: {
    id: string
    full_name: string | null
    avatar_url: string | null
    bread_level?: number
    user_role?: string | null
  }
  unread_count: number
  post?: {
    id: string
    title: string
    price: number | null
    images: string[]
    status?: string
    author_id?: string
  }
  active_appointment?: PurchaseAppointment | null
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
  content?: string
  image_urls?: string[]
}

/**
 * Long Polling API 요청/응답 타입
 */

// Polling 메시지 조회 응답
export interface PollMessagesResponse {
  messages: ChatMessageWithProfile[]
  hasMore: boolean
  lastMessageId: string | null
  lastMessageAt?: string | null
}

// 메시지 전송 요청
export interface SendMessageRequest {
  room_id: string
  content?: string
  image_urls?: string[]
}

// 메시지 전송 응답
export interface SendMessageResponse {
  message: ChatMessageWithProfile
}

// 읽음 처리 요청
export interface MarkAsReadRequest {
  room_id: string
}

// 읽음 처리 응답
export interface MarkAsReadResponse {
  updated_count: number
}
