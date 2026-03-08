import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
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
      },
    },
  })

  if (error || !data.url) {
    const message = error?.message || 'Google 로그인 시작에 실패했습니다'
    return NextResponse.redirect(`${origin}/login?message=${encodeURIComponent(message)}`)
  }

  return NextResponse.redirect(data.url)
}
