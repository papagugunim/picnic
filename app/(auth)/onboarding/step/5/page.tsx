'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import OnboardingLayout from '@/components/onboarding/OnboardingLayout'

export default function OnboardingStep5() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleNext = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        setError('온보딩 완료 처리 중 오류가 발생했습니다')
        return
      }

      router.push('/feed')
    } catch {
      setError('온보딩 완료 처리 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const regularLevels = [
    { emoji: '🍞', name: '식빵' },
    { emoji: '🥖', name: '바게트' },
    { emoji: '🥐', name: '크로아상' },
    { emoji: '🥨', name: '쁘레첼' },
    { emoji: '🥯', name: '베이글' },
  ]

  return (
    <OnboardingLayout
      currentStep={5}
      totalSteps={5}
      title="가입을 축하해요!"
      description="브레드 등급은 활동할수록 자동으로 성장합니다"
      onNext={handleNext}
      nextLabel="피크닉 시작하기"
      nextLoading={isLoading}
    >
      <div className="mb-3">
        <Card className="glass-strong">
          <CardContent className="pt-4 space-y-3">
            <div className="text-center space-y-1">
              <div className="text-4xl">🎉</div>
              <h2 className="text-lg font-bold">
                모든 준비가 완료됐어요
              </h2>
              <p className="text-base font-bold text-primary leading-tight">
                시작 등급은 식빵(🍞) 입니다
              </p>
            </div>

            <div className="rounded-lg bg-primary/5 border border-primary/15 p-3">
              <p className="text-sm font-semibold text-primary mb-2">
                브레드 등급
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {regularLevels.map((level) => (
                  <div
                    key={level.name}
                    className="rounded-md border border-border bg-background/90 px-1 py-1.5 text-center"
                  >
                    <div className="text-base leading-none">{level.emoji}</div>
                    <div className="text-[10px] mt-1 truncate">{level.name}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center rounded-lg border border-border bg-background/80 p-2.5">
              <p className="text-[11px] text-muted-foreground">
                거래/커뮤니티 활동이 쌓일수록 자동 승급됩니다.
              </p>
            </div>

            {error && (
              <div className="glass-strong rounded-lg p-2.5 text-center text-sm text-destructive">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </OnboardingLayout>
  )
}
