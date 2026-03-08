import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Route')

import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EmailOtpType, User } from '@supabase/supabase-js'

type ProfileSnapshot = {
  full_name: string | null
  city: string | null
  onboarding_completed: boolean | null
}

type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>

const ONBOARDING_START_PATH = '/onboarding/step/1'

function createRedirect(url: string) {
  return NextResponse.redirect(url)
}

function redirectToLoginWithMessage(origin: string, message: string) {
  return createRedirect(`${origin}/login?message=${encodeURIComponent(message)}`)
}

function getSafeNextPath(nextParam: string | null): string | null {
  if (!nextParam) return null
  if (!nextParam.startsWith('/') || nextParam.startsWith('//')) return null
  return nextParam
}

function needsOnboarding(profile: ProfileSnapshot | null): boolean {
  return !profile?.onboarding_completed || !profile?.full_name || !profile?.city
}

async function fetchProfile(supabase: SupabaseServerClient, userId: string): Promise<ProfileSnapshot | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, city, onboarding_completed')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    logger.error('Profile fetch error:', error)
    return null
  }

  return data ?? null
}

async function ensureProfile(supabase: SupabaseServerClient, user: User): Promise<ProfileSnapshot | null> {
  const existingProfile = await fetchProfile(supabase, user.id)
  if (existingProfile) {
    return existingProfile
  }

  logger.warn('Profile not found, creating fallback profile')

  const fallbackName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    '새사용자'

  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email,
        full_name: fallbackName,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      },
      { onConflict: 'id' }
    )

  if (upsertError) {
    logger.error('Fallback profile creation failed:', upsertError)
    return null
  }

  return fetchProfile(supabase, user.id)
}

function resolvePostAuthRedirect(origin: string, safeNextPath: string | null, profile: ProfileSnapshot | null) {
  const onboardingRequired = needsOnboarding(profile)

  if (safeNextPath) {
    if (safeNextPath.startsWith('/reset-password')) {
      return `${origin}${safeNextPath}`
    }

    if (!onboardingRequired || safeNextPath.startsWith('/onboarding')) {
      return `${origin}${safeNextPath}`
    }

    logger.log('Ignoring next path because onboarding is required:', safeNextPath)
  }

  return onboardingRequired ? `${origin}${ONBOARDING_START_PATH}` : `${origin}/feed`
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  const oauthError = requestUrl.searchParams.get('error')
  const oauthErrorDescription = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin

  if (oauthError || oauthErrorDescription) {
    const message = oauthErrorDescription || oauthError || '소셜 로그인 인증이 취소되었거나 실패했습니다'
    logger.error('OAuth provider returned error:', { oauthError, oauthErrorDescription })
    return redirectToLoginWithMessage(origin, message)
  }

  const supabase = await createServerClient()

  // 이메일 확인 플로우 (token_hash + type)
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as EmailOtpType,
    })

    if (error) {
      logger.error('Email verification error:', error)
      return redirectToLoginWithMessage(origin, '이메일 인증에 실패했습니다')
    }

    const user = data?.user
    if (!user) {
      logger.error('No user in verification response')
      return redirectToLoginWithMessage(origin, '사용자 정보를 찾을 수 없습니다')
    }

    const profile = await ensureProfile(supabase, user)
    const safeNextPath = getSafeNextPath(next)
    const redirectUrl = resolvePostAuthRedirect(origin, safeNextPath, profile)

    logger.log('Email verification redirect:', redirectUrl)
    return createRedirect(redirectUrl)
  }

  // OAuth 플로우 (code) - 이메일 인증도 code로 올 수 있음
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      logger.error('Auth callback error:', error)
      return redirectToLoginWithMessage(origin, `인증에 실패했습니다: ${error.message}`)
    }

    const user = data?.user
    if (!user) {
      logger.error('No user in auth code response')
      return redirectToLoginWithMessage(origin, '사용자 정보를 찾을 수 없습니다')
    }

    const profile = await ensureProfile(supabase, user)
    const safeNextPath = getSafeNextPath(next)
    const redirectUrl = resolvePostAuthRedirect(origin, safeNextPath, profile)

    logger.log('Code flow redirect:', redirectUrl)
    return createRedirect(redirectUrl)
  }

  // token_hash나 code가 없는 경우 로그인 페이지로
  return redirectToLoginWithMessage(origin, '인증 정보가 유효하지 않습니다')
}
