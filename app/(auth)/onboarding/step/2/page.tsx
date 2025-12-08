'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Building2, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ProgressBar from '@/components/onboarding/ProgressBar'
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* 프로그레스 바 */}
        <div className="mb-12">
          <ProgressBar currentStep={2} totalSteps={4} />
        </div>

        {/* 메인 콘텐츠 */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center">
              <MapPin className="w-12 h-12 text-white" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            어디에서 생활하고 계신가요?
          </h1>

          <p className="text-lg text-muted-foreground mb-8">
            거주 도시를 알려주시면
            <br />
            해당 지역의 거래와 소식을 보여드릴게요
          </p>
        </div>

        {/* 도시 선택 */}
        <div className="mb-8">
          <label className="block text-lg font-semibold mb-4">
            도시를 선택해주세요
          </label>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Moscow 카드 */}
            <button
              onClick={() => handleCitySelect('Moscow')}
              className={`
                glass-strong rounded-2xl p-6 text-center
                transition-all duration-300
                hover:scale-105 hover:shadow-lg
                ${
                  selectedCity === 'Moscow'
                    ? 'ring-4 ring-primary/50 bg-primary/10'
                    : ''
                }
              `}
            >
              <div className="mb-3 flex justify-center">
                <div className="text-6xl">🏛️</div>
              </div>
              <h3 className="text-xl font-bold mb-2">Moscow</h3>
              <p className="text-sm text-muted-foreground">모스크바</p>
            </button>

            {/* Saint Petersburg 카드 */}
            <button
              onClick={() => handleCitySelect('Saint Petersburg')}
              className={`
                glass-strong rounded-2xl p-6 text-center
                transition-all duration-300
                hover:scale-105 hover:shadow-lg
                ${
                  selectedCity === 'Saint Petersburg'
                    ? 'ring-4 ring-primary/50 bg-primary/10'
                    : ''
                }
              `}
            >
              <div className="mb-3 flex justify-center">
                <div className="text-6xl">⛲</div>
              </div>
              <h3 className="text-xl font-bold mb-2">Saint Petersburg</h3>
              <p className="text-sm text-muted-foreground">상트페테르부르크</p>
            </button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-8 glass-strong rounded-lg p-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {/* 안내 메시지 */}
        {canProceed && (
          <div className="glass-strong rounded-2xl p-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-center text-sm text-muted-foreground">
              <Building2 className="inline w-4 h-4 mr-1" />
              {selectedCity === 'Moscow' ? '모스크바' : '상트페테르부르크'}에서의 거래를 확인하실 수 있어요!
            </p>
          </div>
        )}

        {/* 버튼 그룹 */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Button
              onClick={() => router.push('/onboarding/step/1')}
              variant="outline"
              className="flex-1 h-14 text-base"
              disabled={isLoading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              이전
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 h-14 text-base font-semibold"
              disabled={!canProceed || isLoading}
            >
              {isLoading ? '저장 중...' : '다음'}
            </Button>
          </div>

          {/* 건너뛰기 버튼 */}
          <button
            onClick={() => router.push('/feed')}
            className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            disabled={isLoading}
          >
            나중에 하기
          </button>
        </div>
      </div>
    </div>
  )
}
