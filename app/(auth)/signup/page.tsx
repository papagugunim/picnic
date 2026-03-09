import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import SignupForm from '@/components/auth/SignupForm'
import SocialLogin from '@/components/auth/SocialLogin'

export const metadata = {
  title: '회원가입 - picnic',
  description: '피크닉에 가입하세요',
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image
              src="/branding/external/bread-from-user-transparent.png"
              alt="피크닉 브레드 아이콘"
              width={44}
              height={44}
              priority
            />
            <h1 className="text-5xl font-bold home-hero-title">피크닉</h1>
          </Link>
          <p className="text-sm font-medium text-primary">
            해외 거주 도시 기반 한국인 교민 플랫폼
          </p>
          <p className="text-muted-foreground text-lg">
            피크닉 회원 가입을 진행 하겠습니다.
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
