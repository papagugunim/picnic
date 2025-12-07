'use client'

import { useState } from 'react'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { ArrowLeft, Mail, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

const forgotPasswordSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  async function onSubmit(values: ForgotPasswordFormValues) {
    try {
      setIsLoading(true)
      const supabase = createClient()

      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        toast.error('이메일 전송 실패', {
          description: '잠시 후 다시 시도해주세요.',
        })
        return
      }

      setEmailSent(true)
      toast.success('이메일을 전송했습니다!', {
        description: '메일함을 확인해주세요.',
      })
    } catch (err) {
      console.error('Reset password error:', err)
      toast.error('오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
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
                비밀번호 재설정 링크를 보냈습니다
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  다음 이메일로 비밀번호 재설정 링크를 보냈습니다:
                </p>
                <p className="font-semibold text-primary">{form.getValues('email')}</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p className="mb-2">• 받은 편지함 또는 스팸 메일함을 확인해주세요</p>
                <p className="mb-2">• 이메일의 링크를 클릭하여 비밀번호를 재설정하세요</p>
                <p>• 링크는 1시간 동안 유효합니다</p>
              </div>

              <div className="pt-4 border-t border-border">
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    로그인으로 돌아가기
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl">비밀번호 찾기</CardTitle>
            <CardDescription>
              가입하신 이메일 주소를 입력하시면
              <br />
              비밀번호 재설정 링크를 보내드립니다
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이메일</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="name@example.com"
                          {...field}
                          disabled={isLoading}
                          className="glass"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !form.formState.isValid}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      전송 중...
                    </>
                  ) : (
                    '비밀번호 재설정 이메일 보내기'
                  )}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  <Link href="/login" className="flex items-center justify-center gap-2 text-primary hover:underline">
                    <ArrowLeft className="w-4 h-4" />
                    로그인으로 돌아가기
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
