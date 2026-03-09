'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Page')
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import OnboardingLayout from '@/components/onboarding/OnboardingLayout'
import { collectGeoSamples } from '@/lib/location/geo-sampler'

export default function OnboardingStep2() {
  const router = useRouter()
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null)
  const [isCityVerified, setIsCityVerified] = useState(false)
  const [verificationProgress, setVerificationProgress] = useState(0)

  const handleCitySelect = (city: string) => {
    setSelectedCity(city)
    setIsCityVerified(false)
    setVerificationMessage(null)
  }

  useEffect(() => {
    if (!isVerifyingLocation) {
      return
    }

    setVerificationProgress(6)

    const timer = window.setInterval(() => {
      setVerificationProgress((prev) => {
        const next = prev + Math.max(2, Math.round((96 - prev) * 0.08))
        return Math.min(96, next)
      })
    }, 450)

    return () => {
      window.clearInterval(timer)
    }
  }, [isVerifyingLocation])

  const verifyCurrentLocationForCity = async (cityValue: 'moscow' | 'spb') => {
    setIsVerifyingLocation(true)
    setVerificationProgress(8)
    setVerificationMessage('현재 위치를 확인하고 있어요...')
    setError(null)

    try {
      const samples = await collectGeoSamples({ sampleCount: 4, timeoutMs: 12000, intervalMs: 5000 })
      if (samples.length < 2) {
        setError('위치 신호가 약해요. 실외에서 다시 시도해주세요.')
        return false
      }

      const response = await fetch('/api/location/verify-city', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: cityValue, samples }),
      })

      const payload = (await response.json()) as {
        error?: string
        result?: { pass: boolean; distanceKm: number; effectiveRadiusKm: number }
      }

      if (!response.ok) {
        setVerificationProgress(0)
        setError(payload.error || '위치 검증에 실패했습니다.')
        return false
      }

      if (!payload.result?.pass) {
        setVerificationProgress(0)
        setError('선택한 도시와 현재 위치가 맞지 않습니다.')
        setVerificationMessage(null)
        return false
      }

      setVerificationProgress(100)
      setIsCityVerified(true)
      setVerificationMessage('위치 검증이 완료됐어요 ✅')
      return true
    } catch (verifyError) {
      logger.error('Location verification error:', verifyError)
      setVerificationProgress(0)
      setError('위치 검증 중 오류가 발생했습니다.')
      return false
    } finally {
      setIsVerifyingLocation(false)
      window.setTimeout(() => setVerificationProgress(0), 500)
    }
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

      if (!isCityVerified) {
        const verified = await verifyCurrentLocationForCity(cityValue)
        if (!verified) {
          return
        }
      }

      // 프로필 업데이트
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          city: cityValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        logger.error('Profile update error:', updateError)
        setError('프로필 업데이트 중 오류가 발생했습니다')
        return
      }

      // 다음 단계로 이동 (지하철역 선택)
      router.push('/onboarding/step/3')
    } catch (err) {
      logger.error('Save error:', err)
      setError('저장 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const canProceed = Boolean(selectedCity) && !isVerifyingLocation

  const handleSkip = () => {
    const confirmed = window.confirm('거주 도시 미인증 시, 서비스에 제한이 있을 수 있습니다. 계속 진행하시겠습니까?')
    if (!confirmed) {
      return
    }

    router.push('/onboarding/step/3')
  }

  return (
    <OnboardingLayout
      currentStep={2}
      totalSteps={5}
      title="어디에서 생활하고 계신가요?"
      onNext={handleNext}
      nextDisabled={!canProceed}
      nextLoading={isLoading}
      showSkip
      onSkip={handleSkip}
    >
      <div className="mb-6">
        <div className="space-y-4 mb-6">
          <button
            onClick={() => handleCitySelect('Moscow')}
            data-emoji-burst="🏛️,❄️,✨"
            className={`onboarding-choice w-full h-auto py-6 px-4 flex flex-col items-center gap-2 rounded-lg border border-transparent transition-all ${
              selectedCity === 'Moscow'
                ? 'onboarding-choice-selected bg-primary text-primary-foreground ring-2 ring-primary/50 shadow-[0_6px_18px_rgba(84,122,94,0.26)]'
                : 'border-transparent hover:bg-primary/5'
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
            data-emoji-burst="⛲,🌉,✨"
            className={`onboarding-choice w-full h-auto py-6 px-4 flex flex-col items-center gap-2 rounded-lg border border-transparent transition-all ${
              selectedCity === 'Saint Petersburg'
                ? 'onboarding-choice-selected bg-primary text-primary-foreground ring-2 ring-primary/50 shadow-[0_6px_18px_rgba(84,122,94,0.26)]'
                : 'border-transparent hover:bg-primary/5'
            }`}
          >
            <div className="text-4xl">⛲</div>
            <div className="text-center">
              <div className="font-semibold">Saint Petersburg</div>
              <div className={`text-sm ${selectedCity === 'Saint Petersburg' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>상트페테르부르크</div>
            </div>
          </button>
        </div>

        {selectedCity && (
          <div className="mb-3 space-y-2">
            <button
              type="button"
              onClick={() => verifyCurrentLocationForCity(selectedCity === 'Moscow' ? 'moscow' : 'spb')}
              disabled={isVerifyingLocation}
              className="w-full rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/15 disabled:opacity-60"
            >
              {isVerifyingLocation ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  위치 검증중...
                </span>
              ) : isCityVerified ? '위치 검증 완료됨 ✅ (다시 검증)' : '현재 위치로 도시 인증'}
            </button>

            {isVerifyingLocation && (
              <div className="relative overflow-hidden rounded-full bg-primary/10 h-2.5">
                <span
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-lime-400 to-cyan-400 transition-[width] duration-500 ease-out"
                  style={{ width: `${Math.max(0, Math.min(100, verificationProgress))}%` }}
                />
              </div>
            )}
          </div>
        )}

        {verificationMessage && (
          <div className="glass-strong rounded-lg border-0 p-3 text-center text-sm text-primary mb-3">
            <div className="inline-flex items-center gap-2">
              {isVerifyingLocation && (
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/80 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/80 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/80 animate-bounce" />
                </span>
              )}
              <span>{verificationMessage}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="glass-strong rounded-lg border-0 p-3 text-center text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </OnboardingLayout>
  )
}
