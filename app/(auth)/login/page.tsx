import Link from 'next/link'
import { Suspense } from 'react'
import LoginForm from '@/components/auth/LoginForm'
import SocialLogin from '@/components/auth/SocialLogin'

export const metadata = {
  title: '로그인 - picnic',
  description: '피크닉에 로그인하세요',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block">
            <h1 className="text-5xl font-bold home-hero-title">picnic</h1>
          </Link>
        </div>

        <div className="space-y-6">
          <Suspense fallback={<div className="h-32" />}>
            <LoginForm />
          </Suspense>

          <p className="text-center text-sm text-muted-foreground">또는</p>

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
