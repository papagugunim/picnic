import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Route')

import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  const origin = requestUrl.origin

  const supabase = await createServerClient()

  // 이메일 확인 플로우 (token_hash + type)
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })

    if (error) {
      logger.error('Email verification error:', error)
      return NextResponse.redirect(`${origin}/login?message=이메일 인증에 실패했습니다`)
    }

    // 이메일 확인 성공
    logger.log('Email verification success:', data)

    // verifyOtp의 응답에서 사용자 정보 확인
    const user = data?.user
    if (!user) {
      logger.error('No user in verification response')
      return NextResponse.redirect(`${origin}/login?message=사용자 정보를 찾을 수 없습니다`)
    }

    logger.log('User verified:', user.id)

    // 프로필 생성 시간 확인하여 신규 회원인지 판단
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('created_at, full_name, city')
      .eq('id', user.id)
      .single()

    if (profileError) {
      logger.error('Profile fetch error:', profileError)
      // 프로필이 없으면 회원가입 페이지로
      return NextResponse.redirect(`${origin}/signup?message=프로필을 생성해주세요`)
    }

    logger.log('Profile found:', profile)

    // 신규 회원 판단: 프로필 생성 후 30분 이내면 신규 회원으로 간주
    const createdAt = new Date(profile.created_at)
    const now = new Date()
    const diffInMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60)

    logger.log(`Profile age: ${diffInMinutes} minutes`)

    if (diffInMinutes < 30) {
      logger.log('New user detected, redirecting to step/1')
      return NextResponse.redirect(`${origin}/onboarding/step/1`)
    }

    // 기존 회원은 welcome 페이지로
    logger.log('Existing user, redirecting to welcome')
    return NextResponse.redirect(`${origin}/welcome`)
  }

  // OAuth 플로우 (code) - 이메일 인증도 code로 올 수 있음
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      logger.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/login?message=인증에 실패했습니다`)
    }

    // 로그인 성공 후 프로필 확인
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      logger.log('User authenticated via code:', user.id)

      // 프로필 조회 (created_at 포함)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('created_at, city, full_name')
        .eq('id', user.id)
        .single()

      // 프로필이 없는 경우 (트리거 실패 시 Fallback)
      if (profileError || !profile) {
        logger.warn('Profile not found, attempting to create:', profileError)

        // 프로필 직접 생성 시도
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
          })

        if (createError) {
          logger.error('Profile creation failed:', createError)
          return NextResponse.redirect(`${origin}/login?message=프로필 생성에 실패했습니다`)
        }

        // 신규 OAuth 사용자는 닉네임 설정부터 시작 (step/1)
        logger.log('New OAuth user created, redirecting to step/1')
        return NextResponse.redirect(`${origin}/onboarding/step/1`)
      }

      // 프로필은 있지만 필수 정보가 없는 경우
      if (!profile.city) {
        logger.log('Profile incomplete (no city), redirecting to step/1')
        return NextResponse.redirect(`${origin}/onboarding/step/1`)
      }

      if (!profile.full_name) {
        logger.log('Profile incomplete (no full_name), redirecting to step/1')
        return NextResponse.redirect(`${origin}/onboarding/step/1`)
      }

      logger.log('Profile found:', profile)

      // 신규 회원 판단: 프로필 생성 후 30분 이내면 신규 회원으로 간주
      const createdAt = new Date(profile.created_at)
      const now = new Date()
      const diffInMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60)

      logger.log(`Profile age: ${diffInMinutes} minutes`)

      // next 파라미터가 있으면 우선
      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      // 신규 회원이면 온보딩으로 (step/1)
      if (diffInMinutes < 30) {
        logger.log('New user detected (code flow), redirecting to step/1')
        return NextResponse.redirect(`${origin}/onboarding/step/1`)
      }

      // 기존 회원은 welcome 페이지로
      logger.log('Existing user (code flow), redirecting to welcome')
      return NextResponse.redirect(`${origin}/welcome`)
    }
  }

  // token_hash나 code가 없는 경우 로그인 페이지로
  return NextResponse.redirect(`${origin}/login?message=인증 정보가 유효하지 않습니다`)
}
