import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

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
      // access_token과 refresh_token을 쿠키에 저장
      // httpOnly를 false로 설정하여 클라이언트에서도 접근 가능하게 함
      response.cookies.set('sb-access-token', data.session.access_token, {
        path: '/',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })

      response.cookies.set('sb-refresh-token', data.session.refresh_token, {
        path: '/',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
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
