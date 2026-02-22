import Link from 'next/link'
import { Suspense } from 'react'
import SignupForm from '@/components/auth/SignupForm'
import SocialLogin from '@/components/auth/SocialLogin'
import PicnicWordmark from '@/components/branding/PicnicWordmark'

export const metadata = {
  title: '회원가입 - picnic',
  description: '피크닉에 가입하세요',
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex justify-center">
            <h1 className="sr-only">picnic</h1>
            <PicnicWordmark className="w-[180px] home-hero-wordmark" />
          </Link>
          <p className="text-muted-foreground text-lg">
            피크닉에 오신 것을 환영합니다
          </p>
        </div>

        <div className="space-y-6">
          <Suspense fallback={<div className="h-96" />}>
            <SignupForm />
          </Suspense>

          <p className="text-center text-sm text-muted-foreground">또는</p>

          <Suspense fallback={<div className="h-16" />}>
            <SocialLogin mode="signup" providers={['google']} />
          </Suspense>

          <div className="text-center text-sm text-muted-foreground">
            이미 계정이 있으신가요?{' '}
            <Link
              href="/login"
              className="text-primary hover:underline font-semibold"
            >
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
