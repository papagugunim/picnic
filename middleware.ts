import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 최적화된 미들웨어
 * - 세션 검증 제거 (클라이언트/서버 컴포넌트에서 처리)
 * - 성능 헤더 추가
 * - 캐싱 전략 적용
 */
export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  const pathname = request.nextUrl.pathname

  // 1. 인증이 필요한 페이지 체크 (토큰 존재 여부만 확인)
  const protectedPaths = ['/feed', '/profile', '/settings', '/post/new', '/community/new', '/chats']
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  const accessToken = request.cookies.get('sb-access-token')?.value

  // 인증 필요한 페이지인데 토큰이 없으면 리다이렉트
  if (isProtectedPath && !accessToken) {
    return NextResponse.redirect(new URL('/login', request.url))
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

  // 압축 지원
  const acceptEncoding = request.headers.get('accept-encoding') || ''
  if (acceptEncoding.includes('br')) {
    headers.set('Content-Encoding', 'br')
  } else if (acceptEncoding.includes('gzip')) {
    headers.set('Content-Encoding', 'gzip')
  }

  // 성능 메트릭
  const duration = Date.now() - startTime
  headers.set('Server-Timing', `middleware;dur=${duration}`)

  // Preload 힌트 (중요 리소스)
  if (pathname === '/') {
    headers.set('Link', '</_next/static/css/main.css>; rel=preload; as=style')
  }

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
