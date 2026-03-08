import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'

function copySetCookieHeaders(from: NextResponse, to: NextResponse) {
  const setCookie = from.headers.getSetCookie?.() ?? []

  setCookie.forEach((cookie) => {
    to.headers.append('set-cookie', cookie)
  })

  return to
}

function resolveRequestOrigin(request: NextRequest) {
  const requestedOrigin = request.nextUrl.searchParams.get('origin')

  if (requestedOrigin) {
    try {
      const parsed = new URL(requestedOrigin)
      const allowedHosts = new Set(['mypicnic.vercel.app', 'picnic-wheat.vercel.app'])

      if (allowedHosts.has(parsed.host)) {
        return parsed.origin
      }
    } catch {
      // fallback below
    }
  }

  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || 'https'

  if (host) {
    return `${proto}://${host}`
  }

  return request.nextUrl.origin
}

const OAUTH_TRACE_COOKIE = 'picnic_oauth_trace'

export async function GET(request: NextRequest) {
  const origin = resolveRequestOrigin(request)
  const next = request.nextUrl.searchParams.get('next') || '/feed'
  const retry = request.nextUrl.searchParams.get('retry') === '1' ? '1' : '0'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/feed'
  const trace = crypto.randomUUID()

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

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}&oauth_retry=${retry}&oauth_trace=${encodeURIComponent(trace)}`,
      queryParams: {
        prompt: 'select_account',
        access_type: 'offline',
        scope: 'openid email profile',
      },
    },
  })

  const redirectTo = error || !data.url
    ? `${origin}/login?message=${encodeURIComponent(error?.message || 'Google 로그인 시작에 실패했습니다')}`
    : data.url

  const redirectResponse = NextResponse.redirect(redirectTo)

  redirectResponse.cookies.set(OAUTH_TRACE_COOKIE, trace, {
    path: '/',
    maxAge: 60 * 10,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  redirectResponse.headers.set('Cache-Control', 'no-store')

  // PKCE(code_verifier) 쿠키 속성(max-age/sameSite/secure/path)을 보존해서 전달
  return copySetCookieHeaders(supabaseResponse, redirectResponse)
}
