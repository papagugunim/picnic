'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingComplete() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [router])

  const handleStart = () => {
    router.push('/feed')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center space-y-3 mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-5xl font-bold gradient-text">picnic</h1>
          </Link>
        </div>

        <Card className="glass-strong mb-6">
          <CardContent className="pt-6 space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-3">
                모든 준비가 완료되었어요!
              </h2>
              <p className="text-muted-foreground">
                이제 피크닉에서 즐거운 시간을 보내세요
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg glass">
                <div className="text-2xl">🏠</div>
                <div>
                  <div className="font-medium">중고 거래</div>
                  <div className="text-sm text-muted-foreground">
                    우리 동네에서 안전하게
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg glass">
                <div className="text-2xl">💬</div>
                <div>
                  <div className="font-medium">커뮤니티</div>
                  <div className="text-sm text-muted-foreground">
                    이웃과 소통하고 정보 공유
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg glass">
                <div className="text-2xl">🍞</div>
                <div>
                  <div className="font-medium">빵 등급</div>
                  <div className="text-sm text-muted-foreground">
                    활동하며 등급 성장
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleStart}
          className="w-full"
        >
          피크닉 시작하기
        </Button>
      </div>
    </div>
  )
}
