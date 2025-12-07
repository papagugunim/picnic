'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, CheckCircle2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (!email) {
      router.push('/signup')
      return
    }
  }, [email, router])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleResendEmail = async () => {
    if (!email || resendCooldown > 0) return

    try {
      setIsResending(true)
      const supabase = createClient()

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (error) {
        toast.error('이메일 재전송 실패', {
          description: '잠시 후 다시 시도해주세요.',
        })
        return
      }

      toast.success('인증 이메일을 재전송했습니다!', {
        description: '메일함을 확인해주세요.',
      })
      setResendCooldown(60) // 60초 쿨다운
    } catch (err) {
      console.error('Resend error:', err)
      toast.error('이메일 재전송 중 오류가 발생했습니다')
    } finally {
      setIsResending(false)
    }
  }

  if (!email) {
    return null
  }

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

        <Card className="glass-strong">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">이메일을 확인해주세요</CardTitle>
            <CardDescription className="text-base">
              회원가입을 완료하려면 이메일 인증이 필요합니다
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                다음 이메일로 인증 링크를 보냈습니다:
              </p>
              <p className="font-semibold text-primary">{email}</p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">이메일을 확인하세요</p>
                  <p className="text-muted-foreground">
                    받은 편지함 또는 스팸 메일함을 확인해주세요
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">인증 링크를 클릭하세요</p>
                  <p className="text-muted-foreground">
                    이메일의 인증 링크를 클릭하면 자동으로 로그인됩니다
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">피크닉을 시작하세요</p>
                  <p className="text-muted-foreground">
                    인증이 완료되면 바로 서비스를 이용할 수 있습니다
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendEmail}
                disabled={isResending || resendCooldown > 0}
              >
                {isResending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    전송 중...
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {resendCooldown}초 후 재전송 가능
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    인증 이메일 재전송
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                이메일이 오지 않나요?{' '}
                <button
                  onClick={handleResendEmail}
                  disabled={resendCooldown > 0}
                  className="text-primary hover:underline font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  재전송하기
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-border text-center text-sm text-muted-foreground">
              잘못된 이메일인가요?{' '}
              <Link
                href="/signup"
                className="text-primary hover:underline font-semibold"
              >
                다시 가입하기
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
