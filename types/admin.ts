// 관리자 시스템 타입 정의

export type UserRole = 'user' | 'admin' | 'developer'
export type ReportTargetType = 'user' | 'post' | 'community_post' | 'comment'
export type ReportReason = 'spam' | 'abuse' | 'inappropriate' | 'fraud' | 'other'
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed'

export interface AdminProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  city: 'Moscow' | 'Saint Petersburg' | null
  user_role: UserRole | null
  matryoshka_level: number
  is_suspended: boolean
  suspended_at: string | null
  suspended_by: string | null
  suspension_reason: string | null
  suspension_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface Report {
  id: string
  reporter_id: string
  target_type: ReportTargetType
  target_id: string
  reason: ReportReason
  details: string | null
  status: ReportStatus
  reviewed_by: string | null
  reviewed_at: string | null
  action_taken: string | null
  created_at: string
  reporter?: {
    full_name: string | null
    avatar_url: string | null
  }
  reviewed_by_profile?: {
    full_name: string | null
  }
}

export interface AdminStats {
  total_users: number
  users_by_role: Record<string, number>
  users_by_city: Record<string, number>
  recent_signups_7d: number
  suspended_users: number
  pending_reports: number
}

export interface UserFilters {
  search?: string
  role?: UserRole | 'all'
  city?: 'Moscow' | 'Saint Petersburg' | 'all'
  status?: 'active' | 'suspended' | 'all'
}

export const REPORT_REASONS: Record<ReportReason, string> = {
  spam: '스팸/광고',
  abuse: '욕설/비방',
  inappropriate: '부적절한 내용',
  fraud: '사기 의심',
  other: '기타'
}

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: '대기중',
  reviewed: '검토완료',
  resolved: '처리완료',
  dismissed: '기각'
}

export const TARGET_TYPE_LABELS: Record<ReportTargetType, string> = {
  user: '사용자',
  post: '중고거래 게시글',
  community_post: '동네생활 게시글',
  comment: '댓글'
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  user: '일반 사용자',
  admin: '관리자',
  developer: '개발자'
}
