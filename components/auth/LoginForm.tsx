'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Loader2 } from 'lucide-react'

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
import { getRandomLoadingMessage } from '@/lib/loading-messages'

const loginSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPasswordField, setShowPasswordField] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // 저장된 이메일 불러오기
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail')
    if (savedEmail) {
      form.setValue('email', savedEmail)
      setRememberMe(true)
      // 유효한 이메일이면 비밀번호 필드 바로 표시
      if (z.string().email().safeParse(savedEmail).success) {
        setShowPasswordField(true)
      }
    }
  }, [])

  // 이메일 필드 감시
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'email') {
        const email = value.email || ''
        const isValidEmail = z.string().email().safeParse(email).success
        setShowPasswordField(isValidEmail)
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  async function onSubmit(values: LoginFormValues) {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMessage = result.error || '로그인 중 오류가 발생했습니다'

        // 이메일 확인이 안 된 경우
        if (errorMessage.includes('Email not confirmed')) {
          setError('이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.')
          return
        }

        // 잘못된 이메일/비밀번호
        if (errorMessage.includes('Invalid login credentials')) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다')
          return
        }

        setError(errorMessage)
        return
      }

      console.log('Login success:', result.data)

      // 로그인 기억하기 처리
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', values.email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }

      // 클라이언트의 Supabase 세션도 설정
      if (result.data?.session) {
        const supabase = createClient()
        await supabase.auth.setSession({
          access_token: result.data.session.access_token,
          refresh_token: result.data.session.refresh_token,
        })
      }

      router.push('/feed')
      router.refresh()
    } catch (err) {
      console.error('Login exception:', err)
      setError('로그인 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
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

        {showPasswordField && (
          <>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="animate-in">
                  <div className="flex items-center justify-between">
                    <FormLabel>비밀번호</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-primary hover:underline"
                    >
                      비밀번호 찾기
                    </Link>
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...field}
                      disabled={isLoading}
                      className="glass"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center space-x-2 animate-in">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
              <label
                htmlFor="remember"
                className="text-sm text-muted-foreground cursor-pointer select-none"
              >
                로그인 기억하기
              </label>
            </div>
          </>
        )}

        {error && (
          <div className="text-sm text-destructive text-center p-3 glass-strong rounded-lg">
            {error}
          </div>
        )}

        {showPasswordField && (
          <Button
            type="submit"
            className="w-full animate-in"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {getRandomLoadingMessage()}
              </>
            ) : (
              '로그인'
            )}
          </Button>
        )}
      </form>
    </Form>
  )
}
