export type NotificationType =
  | 'new_message'
  | 'appointment_proposal'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'sale_completed'
  | 'review_request'
  | 'post_like'
  | 'post_interest'
  | 'community_comment'
  | 'community_like'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  is_read: boolean
  actor_id: string | null
  related_post_id: string | null
  related_room_id: string | null
  created_at: string
  actor?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
}

export interface NotificationWithActor extends Notification {
  actor: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
}
