import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 인증 미들웨어
 * - 모든 내부 페이지 보호
 * - 공개 페이지만 명시적으로 허용
 * - 성능 헤더 추가
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
    '/api/auth',
  ]

  // 2. 정적 리소스는 통과
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(jpg|jpeg|png|gif|ico|svg|webp|js|css|woff|woff2|ttf)$/)
  ) {
    return NextResponse.next()
  }

  // 3. 공개 페이지인지 확인
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(path))

  // 4. 공개 페이지가 아니면 인증 필수
  if (!isPublicPath) {
    // Supabase 인증 쿠키 확인
    const cookies = request.cookies.getAll()

    // 모든 Supabase 관련 쿠키 체크 (더 넓은 범위)
    const hasAuthToken = cookies.some(cookie => {
      const name = cookie.name.toLowerCase()
      return (
        name.includes('sb-') &&
        (name.includes('auth-token') || name.includes('access-token'))
      ) || name.includes('supabase-auth-token')
    })

    // 인증 토큰이 없으면 로그인 페이지로 리다이렉트
    if (!hasAuthToken) {
      console.log(`[Auth Middleware] Redirecting unauthenticated request: ${pathname}`)
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    console.log(`[Auth Middleware] Authenticated request: ${pathname}`)
  }

  // 2. 응답 생성
  const response = NextResponse.next()

  // 3. 성능 최적화 헤더 추가
  const headers = new Headers(response.headers)

  // 보안 헤더
  headers.set('X-Frame-Options', 'DENY')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('X-XSS-Protection', '1; mode=block')

  // 캐싱 전략
  if (pathname.startsWith('/api/')) {
    // API 응답: 짧은 캐시 + stale-while-revalidate
    headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30')
  } else if (pathname.match(/\.(jpg|jpeg|png|gif|ico|svg|webp)$/)) {
    // 이미지: 장기 캐시
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  } else if (pathname.match(/\.(js|css|woff|woff2|ttf)$/)) {
    // JS/CSS/폰트: 중기 캐시
    headers.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400')
  }

  // 성능 메트릭
  const duration = Date.now() - startTime
  headers.set('Server-Timing', `middleware;dur=${duration}`)

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
