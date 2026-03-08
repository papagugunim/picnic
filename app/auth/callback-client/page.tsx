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

      if (!code) {
        router.replace('/login?message=인증 코드가 없습니다. 다시 시도해주세요.')
        return
      }

      const supabase = createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        router.replace(`/login?message=${encodeURIComponent(`인증에 실패했습니다: ${error.message}`)}`)
        return
      }

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
