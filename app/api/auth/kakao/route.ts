import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const kakaoRestApiKey = process.env.KAKAO_REST_API_KEY
  const redirectUri = process.env.KAKAO_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/kakao/callback`

  if (!kakaoRestApiKey) {
    return NextResponse.json(
      { error: 'Kakao REST API Key가 설정되지 않았습니다.' },
      { status: 500 }
    )
  }

  // Kakao OAuth 인증 URL 생성
  const kakaoAuthUrl = new URL('https://kauth.kakao.com/oauth/authorize')
  kakaoAuthUrl.searchParams.append('client_id', kakaoRestApiKey)
  kakaoAuthUrl.searchParams.append('redirect_uri', redirectUri)
  kakaoAuthUrl.searchParams.append('response_type', 'code')
  kakaoAuthUrl.searchParams.append('prompt', 'login')

  // Kakao 로그인 페이지로 리다이렉트
  return NextResponse.redirect(kakaoAuthUrl.toString())
}
