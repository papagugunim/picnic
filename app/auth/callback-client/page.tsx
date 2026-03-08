'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CallbackClientContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const run = async () => {
      const code = searchParams.get('code')
      const next = searchParams.get('next') || '/feed'
      const query = searchParams.toString()

      console.log('[OAuth Debug] callback-client landed', {
        hasCode: Boolean(code),
        next,
        path: window.location.pathname,
        host: window.location.host,
      })

      if (!code) {
        router.replace('/login?message=인증 코드가 없습니다. 다시 시도해주세요.')
        return
      }

      const supabase = createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('[OAuth Debug] client exchange failed, fallback to server callback', {
          message: error.message,
          name: error.name,
          host: window.location.host,
          href: window.location.href,
        })

        // 브라우저 PKCE 교환 실패 시 서버 콜백으로 한번 더 시도
        router.replace(query ? `/auth/callback?${query}` : '/auth/callback')
        return
      }

      console.log('[OAuth Debug] client exchange success, redirecting', { next })
      router.replace(next.startsWith('/') ? next : '/feed')
    }

    void run()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      로그인 인증을 처리하고 있습니다...
    </div>
  )
}

export default function AuthCallbackClientPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
          로그인 인증을 준비하고 있습니다...
        </div>
      }
    >
      <CallbackClientContent />
    </Suspense>
  )
}
