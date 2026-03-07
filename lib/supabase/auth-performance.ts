import type { SupabaseClient } from '@supabase/supabase-js'

type ClaimsPayload = {
  sub?: string
  exp?: number
  role?: string
  [key: string]: unknown
}

function extractClaimsUserId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const claims = (payload as { claims?: ClaimsPayload }).claims
  if (!claims?.sub || typeof claims.sub !== 'string') return null
  return claims.sub
}

/**
 * Supabase Auth 성능 최적화용 헬퍼
 *
 * 1) getClaims() 가능 시 우선 사용 (로컬 검증 경로)
 * 2) 실패/미지원 시 getUser() fallback (호환성 보장)
 */
export async function getAuthUserIdFast(supabase: SupabaseClient): Promise<string | null> {
  const authAny = supabase.auth as unknown as {
    getClaims?: () => Promise<{ data?: unknown; error?: unknown }>
    getUser: () => Promise<{ data: { user: { id: string } | null } }>
  }

  if (typeof authAny.getClaims === 'function') {
    try {
      const { data, error } = await authAny.getClaims()
      if (!error) {
        const userId = extractClaimsUserId(data)
        if (userId) return userId
      }
    } catch {
      // fallback to getUser
    }
  }

  const {
    data: { user },
  } = await authAny.getUser()

  return user?.id ?? null
}
