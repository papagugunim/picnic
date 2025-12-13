import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  const origin = requestUrl.origin

  const supabase = createServerClient()

  // 이메일 확인 플로우 (token_hash + type)
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })

    if (error) {
      console.error('Email verification error:', error)
      return NextResponse.redirect(`${origin}/login?message=이메일 인증에 실패했습니다`)
    }

    // 이메일 확인 성공
    console.log('Email verification success:', data)

    // 세션이 생성되었는지 확인
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      console.log('Session created successfully')
      // welcome 페이지로 리다이렉트
      return NextResponse.redirect(`${origin}/welcome`)
    } else {
      console.log('Session not created, redirecting to login')
      // 세션이 없으면 로그인 페이지로
      return NextResponse.redirect(`${origin}/login?message=로그인해주세요`)
    }
  }

  // OAuth 플로우 (code)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/login?message=인증에 실패했습니다`)
    }

    // 로그인 성공 후 프로필 확인
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // 프로필이 있는지 확인
      const { data: profile } = await supabase
        .from('profiles')
        .select('city, full_name')
        .eq('id', user.id)
        .single()

      // 프로필이 없거나 필수 정보가 없으면 회원가입 페이지로
      if (!profile || !profile.city || !profile.full_name) {
        return NextResponse.redirect(`${origin}/signup?message=프로필 정보를 입력해주세요`)
      }

      // next 파라미터가 있으면 해당 페이지로, 없으면 welcome 페이지로
      const redirectUrl = next ? `${origin}${next}` : `${origin}/welcome`
      return NextResponse.redirect(redirectUrl)
    }
  }

  // token_hash나 code가 없는 경우 로그인 페이지로
  return NextResponse.redirect(`${origin}/login?message=인증 정보가 유효하지 않습니다`)
}
