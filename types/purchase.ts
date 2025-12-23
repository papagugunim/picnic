/**
 * 구매약속 관련 타입 정의
 */

export type AppointmentStatus = 'proposed' | 'confirmed' | 'cancelled' | 'completed'

export interface PurchaseAppointment {
  id: string
  room_id: string
  post_id: string
  appointment_date: string
  location: string
  memo: string | null
  status: AppointmentStatus
  proposer_id: string
  responder_id: string
  created_at: string
  responded_at: string | null
  updated_at: string
}

export interface PurchaseAppointmentWithProfiles extends PurchaseAppointment {
  proposer: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  responder: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
}

export interface CreateAppointmentParams {
  room_id: string
  post_id: string
  appointment_date: string
  location: string
  memo?: string
  proposer_id: string
  responder_id: string
}

export interface RespondToAppointmentParams {
  appointment_id: string
  status: 'confirmed' | 'cancelled'
}

export interface CompleteSaleParams {
  post_id: string
  room_id: string
  buyer_id: string
  seller_id: string
}

export interface CreateReviewParams {
  post_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment?: string
}
