import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // 쿠키에서 토큰 가져오기
  const accessToken = request.cookies.get('sb-access-token')?.value
  const refreshToken = request.cookies.get('sb-refresh-token')?.value

  // 인증이 필요한 페이지 목록
  const protectedPaths = ['/feed', '/profile', '/settings', '/post/new', '/community/new', '/chats']
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // 인증이 필요한 페이지인데 토큰이 없으면 로그인 페이지로
  if (isProtectedPath && !accessToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 토큰이 있으면 세션 확인
  if (accessToken && refreshToken) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // 세션 설정
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      // 세션이 유효한지 확인
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        // 세션이 유효하지 않으면 쿠키 삭제하고 로그인 페이지로
        if (isProtectedPath) {
          const response = NextResponse.redirect(new URL('/login', request.url))
          response.cookies.delete('sb-access-token')
          response.cookies.delete('sb-refresh-token')
          return response
        }
      }
    } catch (error) {
      console.error('Middleware auth error:', error)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
