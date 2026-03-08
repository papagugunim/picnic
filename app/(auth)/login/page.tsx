import Link from 'next/link'
import { Suspense } from 'react'
import LoginForm from '@/components/auth/LoginForm'
import SocialLogin from '@/components/auth/SocialLogin'

export const metadata = {
  title: '로그인 - picnic',
  description: '피크닉에 로그인하세요',
}

type LoginPageProps = {
  searchParams?: Promise<{ message?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = (await searchParams) || {}
  const message = resolvedSearchParams.message

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block">
            <h1 className="text-5xl font-bold home-hero-title">피크닉</h1>
          </Link>
          <p className="text-sm font-medium text-primary">
            해외 거주 도시 기반 한국인 교민 플랫폼
          </p>
        </div>

        <div className="space-y-6">
          {message && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {message}
            </div>
          )}

          <Suspense fallback={<div className="h-32" />}>
            <LoginForm />
          </Suspense>

          <p className="text-center text-sm text-muted-foreground">또는</p>

          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Google 로그인 시 Google 인증 정책에 따라 주소에 <span className="font-medium">supabase.co</span>가 표시될 수 있으며,
            피크닉 공식 인증 절차의 정상 동작입니다.
          </div>

          <Suspense fallback={<div className="h-16" />}>
            <SocialLogin mode="login" providers={['google']} />
          </Suspense>

          <div className="text-center text-sm text-muted-foreground">
            계정이 없으신가요?{' '}
            <Link
              href="/signup"
              className="text-primary hover:underline font-semibold"
            >
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
