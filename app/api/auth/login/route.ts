import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe } = await request.json()

    const supabase = await createServerClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // 탈퇴한 회원인지 확인
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('deleted_at')
        .eq('id', data.user.id)
        .single()

      if (!profileError && profile?.deleted_at) {
        // 탈퇴한 계정이면 로그아웃 처리
        await supabase.auth.signOut()

        return NextResponse.json(
          { error: '탈퇴한 계정입니다. 회원가입을 통해 다시 가입해주세요.' },
          { status: 403 }
        )
      }
    }

    // 세션 쿠키 설정
    const response = NextResponse.json({ data })

    if (data.session) {
      // 로그인 기억하기에 따라 세션 기간 설정
      // rememberMe: true -> 90일, false -> 7일
      const accessTokenMaxAge = rememberMe ? 60 * 60 * 24 * 90 : 60 * 60 * 24 * 7  // 90일 또는 7일
      const refreshTokenMaxAge = rememberMe ? 60 * 60 * 24 * 180 : 60 * 60 * 24 * 30  // 180일 또는 30일

      // access_token과 refresh_token을 쿠키에 저장
      // httpOnly: true로 XSS 공격 시 토큰 탈취 방지
      response.cookies.set('sb-access-token', data.session.access_token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: accessTokenMaxAge,
      })

      response.cookies.set('sb-refresh-token', data.session.refresh_token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: refreshTokenMaxAge,
      })
    }

    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
