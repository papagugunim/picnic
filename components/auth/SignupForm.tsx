'use client'

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
  fullName: z.string().min(2, '닉네임은 최소 2자 이상이어야 합니다'),
  city: z.string().min(1, '내가 사는 도시를 선택해주세요'),
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
      fullName: '',
      city: '',
    },
  })

  // 각 필드의 값 감시
  const email = form.watch('email')
  const fullName = form.watch('fullName')
  const password = form.watch('password')
  const confirmPassword = form.watch('confirmPassword')
  const city = form.watch('city')

  // 각 단계별 유효성 체크
  const isEmailValid = email && !form.formState.errors.email
  const isFullNameValid = fullName && !form.formState.errors.fullName
  const isPasswordValid = password && confirmPassword && !form.formState.errors.password && !form.formState.errors.confirmPassword
  const isCityValid = city && !form.formState.errors.city

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
          data: {
            full_name: values.fullName,
            city: values.city,
          },
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

      // 프로필은 트리거가 자동으로 생성 (city, metro_station 포함)
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
      console.error('Signup error:', err)
      setError('회원가입 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: 이메일 */}
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

        {/* Step 2: 닉네임 (이메일이 유효할 때만 표시) */}
        {isEmailValid && (
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>닉네임</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="예: 피크닉러버"
                    {...field}
                    disabled={isLoading}
                    className="glass"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Step 3: 비밀번호 (닉네임이 유효할 때만 표시) */}
        {isEmailValid && isFullNameValid && (
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

        {/* Step 4: 도시 선택 (비밀번호가 유효할 때만 표시) */}
        {isEmailValid && isFullNameValid && isPasswordValid && (
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>내가 사는 도시</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className={`h-auto py-6 px-4 flex flex-col items-center gap-2 rounded-lg border-2 transition-all ${
                        field.value === 'moscow'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => field.onChange('moscow')}
                      disabled={isLoading}
                    >
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m5 0h1M9 13h1m5 0h1M9 17h1m5 0h1" />
                      </svg>
                      <div className="text-center">
                        <div className="font-semibold">Moscow</div>
                        <div className="text-xs text-muted-foreground">모스크바</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`h-auto py-6 px-4 flex flex-col items-center gap-2 rounded-lg border-2 transition-all ${
                        field.value === 'saint_petersburg'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => field.onChange('saint_petersburg')}
                      disabled={isLoading}
                    >
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3C6.5 3 2 6.58 2 11c0 3.07 2.87 5.67 6.84 6.65.3.06.38.13.38.29v1.73c0 .14.11.25.25.25h5.06c.14 0 .25-.11.25-.25v-1.73c0-.16.08-.23.38-.29C17.13 16.67 20 14.07 20 11c0-4.42-4.5-8-10-8z" />
                        <circle cx="12" cy="11" r="2" />
                      </svg>
                      <div className="text-center">
                        <div className="font-semibold">Saint Petersburg</div>
                        <div className="text-xs text-muted-foreground">상트페테르부르크</div>
                      </div>
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {error && (
          <div className="text-sm text-destructive text-center p-3 glass-strong rounded-lg">
            {error}
          </div>
        )}

        {/* 회원가입 버튼 (모든 단계 완료 시 표시) */}
        {isEmailValid && isFullNameValid && isPasswordValid && isCityValid && (
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
