import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * 인증 미들웨어
 * - Supabase auth.getUser()로 실제 토큰 검증
 * - 세션 자동 갱신 (토큰 리프레시)
 * - 공개 페이지만 명시적으로 허용
 * - 보안/성능 헤더 추가
 */
export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  const pathname = request.nextUrl.pathname

  // 1. 공개 페이지 정의 (로그인 없이 접근 가능한 페이지만 나열)
  const publicPaths = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/verify-email',
    '/reset-password',
    '/auth/callback',
  ]

  // 공개 API 경로 (명시적으로 나열)
  const publicApiPaths = [
    '/api/auth/login',
    '/api/auth/signup',
    '/api/auth/kakao',
    '/api/auth/kakao/callback',
    '/api/auth/callback',
  ]

  // 2. 정적 리소스 및 SEO 파일은 통과 (Supabase 클라이언트 생성 전 조기 반환)
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname.match(/\.(jpg|jpeg|png|gif|ico|svg|webp|js|css|woff|woff2|ttf|xml|txt|webmanifest)$/)
  ) {
    return NextResponse.next()
  }

  // 3. 공개 페이지/API인지 확인 (Supabase 클라이언트 생성 전 조기 반환)
  const isPublicPage = publicPaths.some(path => pathname === path)
  const isPublicApi = publicApiPaths.some(path => pathname === path || pathname.startsWith(path + '/'))
  const isPublicPath = isPublicPage || isPublicApi

  // 공개 경로는 Supabase 인증 검증 없이 바로 통과 (100-200ms 절약)
  if (isPublicPath) {
    const response = NextResponse.next({ request })
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    const duration = Date.now() - startTime
    response.headers.set('Server-Timing', `middleware;dur=${duration}`)
    return response
  }

  // 4. Supabase 세션 갱신 및 인증 검증 (비공개 경로만)
  let supabaseResponse = NextResponse.next({ request })
  const applySupabaseCookies = (response: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach(cookie => {
      response.cookies.set(cookie.name, cookie.value)
    })
    return response
  }

  const supabase = createServerClient(
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

  // 실제 토큰 검증 (만료된 토큰 자동 갱신 포함)
  const { data: { user } } = await supabase.auth.getUser()

  // 5. 인증되지 않은 사용자 → 로그인으로 리다이렉트 (공개 경로는 이미 위에서 반환됨)
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return applySupabaseCookies(NextResponse.redirect(loginUrl))
  }

  // 6. 온보딩 가드
  const isOnboardingPath = pathname.startsWith('/onboarding')
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  const onboardingCompleted = !!profile?.onboarding_completed

  if (!onboardingCompleted && !isOnboardingPath) {
    const onboardingUrl = new URL('/onboarding/step/1', request.url)
    return applySupabaseCookies(NextResponse.redirect(onboardingUrl))
  }

  if (onboardingCompleted && isOnboardingPath) {
    const feedUrl = new URL('/feed', request.url)
    return applySupabaseCookies(NextResponse.redirect(feedUrl))
  }

  // 7. 보안 헤더 추가
  const headers = new Headers(supabaseResponse.headers)
  headers.set('X-Frame-Options', 'DENY')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('X-XSS-Protection', '1; mode=block')

  // 캐싱 전략
  if (pathname.startsWith('/api/')) {
    headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30')
  }

  // 성능 메트릭
  const duration = Date.now() - startTime
  headers.set('Server-Timing', `middleware;dur=${duration}`)

  return new NextResponse(supabaseResponse.body, {
    status: supabaseResponse.status,
    statusText: supabaseResponse.statusText,
    headers,
  })
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
