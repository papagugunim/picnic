'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingStep2() {
  const router = useRouter()
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCitySelect = (city: string) => {
    setSelectedCity(city)
  }

  const handleNext = async () => {
    if (!selectedCity) {
      setError('도시를 선택해주세요')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()

      // 현재 사용자 가져오기
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('로그인이 필요합니다')
        return
      }

      // 데이터베이스 형식에 맞게 도시 값 변환 (moscow, spb)
      const cityValue = selectedCity === 'Moscow' ? 'moscow' : 'spb'

      // 프로필 업데이트
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          city: cityValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        setError('프로필 업데이트 중 오류가 발생했습니다')
        return
      }

      // 다음 단계로 이동
      router.push('/onboarding/step/3')
    } catch (err) {
      console.error('Save error:', err)
      setError('저장 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const canProceed = selectedCity

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center space-y-3 mb-8">
          <h1 className="text-4xl font-bold gradient-text">picnic</h1>
          <p className="text-muted-foreground">
            어디에서 생활하고 계신가요?
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <button
            onClick={() => handleCitySelect('Moscow')}
            className={`w-full h-auto py-6 px-4 flex flex-col items-center gap-2 rounded-lg border-2 transition-all ${
              selectedCity === 'Moscow'
                ? 'border-primary bg-primary text-primary-foreground ring-2 ring-primary/50'
                : 'border-border hover:border-primary/50 hover:bg-primary/5'
            }`}
          >
            <div className="text-4xl">🏛️</div>
            <div className="text-center">
              <div className="font-semibold">Moscow</div>
              <div className={`text-sm ${selectedCity === 'Moscow' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>모스크바</div>
            </div>
          </button>

          <button
            onClick={() => handleCitySelect('Saint Petersburg')}
            className={`w-full h-auto py-6 px-4 flex flex-col items-center gap-2 rounded-lg border-2 transition-all ${
              selectedCity === 'Saint Petersburg'
                ? 'border-primary bg-primary text-primary-foreground ring-2 ring-primary/50'
                : 'border-border hover:border-primary/50 hover:bg-primary/5'
            }`}
          >
            <div className="text-4xl">⛲</div>
            <div className="text-center">
              <div className="font-semibold">Saint Petersburg</div>
              <div className={`text-sm ${selectedCity === 'Saint Petersburg' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>상트페테르부르크</div>
            </div>
          </button>
        </div>

        {error && (
          <div className="mb-6 glass-strong rounded-lg p-3 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          onClick={handleNext}
          className="w-full mb-4"
          disabled={!canProceed || isLoading}
        >
          {isLoading ? '저장 중...' : '다음'}
        </Button>

        <button
          onClick={() => router.push('/feed')}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          disabled={isLoading}
        >
          건너뛰기
        </button>
      </div>
    </div>
  )
}
