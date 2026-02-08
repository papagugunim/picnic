import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  const kakaoRestApiKey = process.env.KAKAO_REST_API_KEY
  const redirectUri = process.env.KAKAO_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/kakao/callback`

  if (!kakaoRestApiKey) {
    return NextResponse.json(
      { error: 'Kakao REST API Key가 설정되지 않았습니다.' },
      { status: 500 }
    )
  }

  // CSRF 방지를 위한 state 파라미터 생성
  const state = crypto.randomBytes(32).toString('hex')

  // Kakao OAuth 인증 URL 생성
  const kakaoAuthUrl = new URL('https://kauth.kakao.com/oauth/authorize')
  kakaoAuthUrl.searchParams.append('client_id', kakaoRestApiKey)
  kakaoAuthUrl.searchParams.append('redirect_uri', redirectUri)
  kakaoAuthUrl.searchParams.append('response_type', 'code')
  kakaoAuthUrl.searchParams.append('prompt', 'login')
  kakaoAuthUrl.searchParams.append('state', state)

  // state를 쿠키에 저장하여 callback에서 검증
  const response = NextResponse.redirect(kakaoAuthUrl.toString())
  response.cookies.set('kakao_oauth_state', state, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10분
  })

  return response
}
