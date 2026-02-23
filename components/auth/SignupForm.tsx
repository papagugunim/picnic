'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('SignupForm')
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Loader2 } from 'lucide-react'
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
import { createClient } from '@/lib/supabase/client'

const signupSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
})

type SignupFormValues = z.infer<typeof signupSchema>

export default function SignupForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange', // 실시간 validation
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  // 각 필드의 값 감시
  const email = form.watch('email')
  const password = form.watch('password')
  const confirmPassword = form.watch('confirmPassword')

  // 각 단계별 유효성 체크
  const isEmailValid = email && !form.formState.errors.email
  const isPasswordValid = password && confirmPassword && !form.formState.errors.password && !form.formState.errors.confirmPassword

  async function onSubmit(values: SignupFormValues) {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()

      // 회원가입
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding/step/1`,
        },
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('이미 등록된 이메일입니다')
        } else {
          setError('회원가입 중 오류가 발생했습니다')
        }
        return
      }

      if (!authData.user) {
        setError('회원가입 중 오류가 발생했습니다')
        return
      }

      // 프로필은 트리거가 자동으로 생성
      // 별도 작업 불필요

      // 회원가입 성공 메시지
      toast.success('회원가입이 완료되었습니다!', {
        description: '이메일을 확인해주세요.',
        duration: 3000,
      })

      // 이메일 인증 페이지로 이동
      setTimeout(() => {
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`)
      }, 1500)
    } catch (err) {
      logger.error('Signup error:', err)
      setError('회원가입 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        name="signup"
        id="signup-form"
      >
        {/* Step 1: 이메일 */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이메일로 가입하기</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  {...field}
                  disabled={isLoading}
                  className="glass"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Step 2: 비밀번호 (이메일이 유효할 때만 표시) */}
        {isEmailValid && (
          <>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...field}
                      disabled={isLoading}
                      className="glass"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호 확인</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...field}
                      disabled={isLoading}
                      className="glass"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {error && (
          <div className="text-sm text-destructive text-center p-3 glass-strong rounded-lg">
            {error}
          </div>
        )}

        {/* 회원가입 버튼 (이메일/비밀번호 유효 시 표시) */}
        {isEmailValid && isPasswordValid && (
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !form.formState.isValid}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                회원가입 중...
              </>
            ) : (
              '회원가입'
            )}
          </Button>
        )}
      </form>
    </Form>
  )
}
