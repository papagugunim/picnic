import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import crypto from 'crypto'

function hashKakaoPassword(kakaoId: string): string {
  const secret = process.env.KAKAO_OAUTH_SECRET || process.env.KAKAO_REST_API_KEY || ''
  return crypto.createHmac('sha256', secret).update(`kakao_oauth_${kakaoId}`).digest('hex')
}

function redirectWithCleanup(url: string): NextResponse {
  const response = NextResponse.redirect(url)
  response.cookies.delete('kakao_oauth_state')
  return response
}

interface KakaoTokenResponse {
  access_token: string
  token_type: string
  refresh_token?: string
  expires_in: number
  scope?: string
}

interface KakaoUserResponse {
  id: number
  connected_at?: string
  properties?: {
    nickname?: string
    profile_image?: string
    thumbnail_image?: string
  }
  kakao_account?: {
    profile?: {
      nickname?: string
      profile_image_url?: string
      thumbnail_image_url?: string
    }
    email?: string
    email_needs_agreement?: boolean
    is_email_valid?: boolean
    is_email_verified?: boolean
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const origin = request.nextUrl.origin

  // 에러 처리
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=kakao_auth_cancelled`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=kakao_no_code`)
  }

  // CSRF 방지: state 파라미터 검증
  const state = searchParams.get('state')
  const storedState = request.cookies.get('kakao_oauth_state')?.value
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(`${origin}/login?error=kakao_csrf_error`)
  }

  const kakaoRestApiKey = process.env.KAKAO_REST_API_KEY
  const redirectUri = process.env.KAKAO_REDIRECT_URI || `${origin}/api/auth/kakao/callback`

  if (!kakaoRestApiKey) {
    return NextResponse.redirect(`${origin}/login?error=kakao_config_error`)
  }

  try {
    // 1. Access Token 요청
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: kakaoRestApiKey,
        redirect_uri: redirectUri,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Kakao token error:', errorData)
      return redirectWithCleanup(`${origin}/login?error=kakao_token_error`)
    }

    const tokenData: KakaoTokenResponse = await tokenResponse.json()
    const { access_token } = tokenData

    // 2. 사용자 정보 요청
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    if (!userResponse.ok) {
      console.error('Kakao user info error')
      return redirectWithCleanup(`${origin}/login?error=kakao_user_error`)
    }

    const userData: KakaoUserResponse = await userResponse.json()

    // 사용자 정보 추출
    const kakaoId = userData.id.toString()
    const email = userData.kakao_account?.email
    const nickname =
      userData.kakao_account?.profile?.nickname ||
      userData.properties?.nickname ||
      `kakao_${kakaoId}`
    const avatarUrl =
      userData.kakao_account?.profile?.profile_image_url ||
      userData.properties?.profile_image

    // 이메일이 없는 경우 (동의 안 함)
    if (!email) {
      return redirectWithCleanup(`${origin}/login?error=kakao_email_required`)
    }

    // 3. Supabase Auth 연동
    const supabase = await createServerClient()

    // Kakao ID를 provider_id로 사용하여 이메일 기반 로그인
    // 기존 계정이 있으면 로그인, 없으면 자동 생성
    const hashedPassword = hashKakaoPassword(kakaoId)
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: `kakao_${kakaoId}@picnic.oauth`,
      password: hashedPassword,
    })

    // 계정이 없으면 새로 생성
    if (signInError) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: `kakao_${kakaoId}@picnic.oauth`,
        password: hashedPassword,
        options: {
          data: {
            provider: 'kakao',
            kakao_id: kakaoId,
            full_name: nickname,
            avatar_url: avatarUrl,
            email: email, // 실제 이메일은 user_metadata에 저장
          },
        },
      })

      if (signUpError) {
        console.error('Supabase sign up error:', signUpError)
        return redirectWithCleanup(`${origin}/login?error=signup_error`)
      }

      // 프로필 생성 (트리거가 자동으로 처리하지만 실패할 수 있음)
      if (signUpData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: signUpData.user.id,
            email: email,
            full_name: nickname,
            avatar_url: avatarUrl,
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
        }

        // 신규 가입이므로 온보딩 시작 (닉네임 설정부터)
        return redirectWithCleanup(`${origin}/onboarding/step/1`)
      }
    }

    // 기존 사용자 - 프로필 확인
    if (authData?.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('city, onboarding_completed')
        .eq('id', authData.user.id)
        .single()

      // 프로필이 없거나 온보딩 미완료 시
      if (profileError || !profile || !profile.onboarding_completed) {
        return redirectWithCleanup(`${origin}/onboarding/step/1`)
      }

      // 온보딩 완료 사용자는 피드로
      return redirectWithCleanup(`${origin}/feed`)
    }

    // 예상치 못한 상황
    return redirectWithCleanup(`${origin}/login?error=unknown_error`)

  } catch (error) {
    console.error('Kakao OAuth error:', error)
    return redirectWithCleanup(`${origin}/login?error=server_error`)
  }
}
