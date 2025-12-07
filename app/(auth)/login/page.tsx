import Link from 'next/link'
import { Suspense } from 'react'
import LoginForm from '@/components/auth/LoginForm'
import SocialLogin from '@/components/auth/SocialLogin'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

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
            <h1 className="text-5xl font-bold gradient-text">picnic</h1>
          </Link>
          <p className="text-muted-foreground text-lg">
            러시아 한인 커뮤니티
          </p>
        </div>

        <div className="space-y-6">
          <Card className="glass-strong">
            <CardContent className="pt-6 space-y-6">
              <Suspense fallback={<div className="h-32" />}>
                <LoginForm />
              </Suspense>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 text-muted-foreground">
                    또는
                  </span>
                </div>
              </div>

              <Suspense fallback={<div className="h-32" />}>
                <SocialLogin mode="login" />
              </Suspense>
            </CardContent>
          </Card>

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
