import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

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

export async function GET(request: NextRequest) {
  const origin = resolveRequestOrigin(request)
  const next = request.nextUrl.searchParams.get('next') || '/feed'

  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/feed'

  const supabase = await createServerClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      queryParams: {
        prompt: 'select_account',
        access_type: 'offline',
        scope: 'openid email profile',
      },
    },
  })

  if (error || !data.url) {
    const message = error?.message || 'Google 로그인 시작에 실패했습니다'
    return NextResponse.redirect(`${origin}/login?message=${encodeURIComponent(message)}`)
  }

  return NextResponse.redirect(data.url)
}
