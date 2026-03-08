import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Route')

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType, User } from '@supabase/supabase-js'

type ProfileSnapshot = {
  full_name: string | null
  city: string | null
  onboarding_completed: boolean | null
}

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>

const ONBOARDING_START_PATH = '/onboarding/step/1'
const OAUTH_TRACE_COOKIE = 'picnic_oauth_trace'

function createRedirect(url: string) {
  return NextResponse.redirect(url)
}

function resolveRequestOrigin(request: NextRequest, fallbackOrigin: string) {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || 'https'

  if (host) {
    return `${proto}://${host}`
  }

  return fallbackOrigin
}

function copySetCookieHeaders(from: NextResponse, to: NextResponse) {
  const setCookie = from.headers.getSetCookie?.() ?? []

  setCookie.forEach((cookie) => {
    to.headers.append('set-cookie', cookie)
  })

  return to
}

function createRouteSupabase(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const applySupabaseCookies = (response: NextResponse) => {
    return copySetCookieHeaders(supabaseResponse, response)
  }

  return { supabase, applySupabaseCookies }
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

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  const oauthError = requestUrl.searchParams.get('error')
  const oauthErrorDescription = requestUrl.searchParams.get('error_description')
  const oauthRetry = requestUrl.searchParams.get('oauth_retry') === '1'
  const oauthTrace = requestUrl.searchParams.get('oauth_trace')
  const cookieTrace = request.cookies.get(OAUTH_TRACE_COOKIE)?.value
  const traceMismatch = Boolean(oauthTrace && cookieTrace && oauthTrace !== cookieTrace)
  const origin = resolveRequestOrigin(request, requestUrl.origin)

  if (oauthError || oauthErrorDescription) {
    const message = oauthErrorDescription || oauthError || '소셜 로그인 인증이 취소되었거나 실패했습니다'
    logger.error('OAuth provider returned error:', { oauthError, oauthErrorDescription })
    return redirectToLoginWithMessage(origin, message)
  }

  const { supabase, applySupabaseCookies } = createRouteSupabase(request)

  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as EmailOtpType,
    })

    if (error) {
      logger.error('Email verification error:', error)
      return applySupabaseCookies(redirectToLoginWithMessage(origin, '이메일 인증에 실패했습니다'))
    }

    const user = data?.user
    if (!user) {
      logger.error('No user in verification response')
      return applySupabaseCookies(redirectToLoginWithMessage(origin, '사용자 정보를 찾을 수 없습니다'))
    }

    const profile = await ensureProfile(supabase, user)
    const safeNextPath = getSafeNextPath(next)
    const redirectUrl = resolvePostAuthRedirect(origin, safeNextPath, profile)

    logger.log('Email verification redirect:', redirectUrl)
    return applySupabaseCookies(createRedirect(redirectUrl))
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      logger.error('Auth callback error:', error)

      const lowerMessage = error.message.toLowerCase()
      const isBrowserSessionIssue =
        traceMismatch ||
        lowerMessage.includes('code verifier') ||
        lowerMessage.includes('both auth code and code verifier should be non-empty') ||
        lowerMessage.includes('flow_state_not_found') ||
        lowerMessage.includes('flow state not found') ||
        lowerMessage.includes('invalid flow state')

      if (isBrowserSessionIssue) {
        if (!oauthRetry) {
          const retryUrl = `${origin}/api/auth/google?next=${encodeURIComponent(next || '/feed')}&origin=${encodeURIComponent(origin)}&retry=1`
          logger.warn('OAuth session issue detected. Retrying once automatically.', {
            retryUrl,
            traceMismatch,
            oauthTrace,
            hasCookieTrace: Boolean(cookieTrace),
          })
          return applySupabaseCookies(createRedirect(retryUrl))
        }

        return applySupabaseCookies(
          redirectToLoginWithMessage(origin, '인증 세션이 만료되었어요. 다시 시도해주세요.')
        )
      }

      return applySupabaseCookies(redirectToLoginWithMessage(origin, `인증에 실패했습니다: ${error.message}`))
    }

    const user = data?.user
    if (!user) {
      logger.error('No user in auth code response')
      return applySupabaseCookies(redirectToLoginWithMessage(origin, '사용자 정보를 찾을 수 없습니다'))
    }

    const profile = await ensureProfile(supabase, user)
    const safeNextPath = getSafeNextPath(next)
    const redirectUrl = resolvePostAuthRedirect(origin, safeNextPath, profile)

    logger.log('Code flow redirect:', redirectUrl)
    const successRedirect = createRedirect(redirectUrl)
    successRedirect.cookies.set(OAUTH_TRACE_COOKIE, '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
    return applySupabaseCookies(successRedirect)
  }

  return applySupabaseCookies(redirectToLoginWithMessage(origin, '인증 정보가 유효하지 않습니다'))
}
