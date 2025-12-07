import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 세션 갱신
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 인증이 필요한 페이지 보호
  const protectedPaths = ['/feed', '/post', '/chats', '/profile', '/settings', '/welcome', '/onboarding']
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // 인증되지 않은 사용자가 보호된 페이지에 접근하려고 하면 로그인 페이지로 리다이렉트
  if (isProtectedPath && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  // 인증된 사용자가 로그인/회원가입 페이지에 접근하려고 하면 피드로 리다이렉트
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') && user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/feed'
    return NextResponse.redirect(redirectUrl)
  }

  // 온보딩 체크: 인증된 사용자가 온보딩을 완료하지 않았으면 온보딩으로 리다이렉트
  if (user) {
    // 프로필에서 온보딩 완료 여부 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()

    const isOnboardingPath = request.nextUrl.pathname.startsWith('/onboarding')
    const isAuthCallbackPath = request.nextUrl.pathname.startsWith('/auth/callback')

    // 온보딩이 완료되지 않았고, 온보딩 페이지나 인증 콜백이 아니면 온보딩으로 리다이렉트
    if (!profile?.onboarding_completed && !isOnboardingPath && !isAuthCallbackPath) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/onboarding/step/1'
      return NextResponse.redirect(redirectUrl)
    }

    // 온보딩이 완료되었는데 온보딩 페이지에 접근하려고 하면 피드로 리다이렉트
    if (profile?.onboarding_completed && isOnboardingPath) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/feed'
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
