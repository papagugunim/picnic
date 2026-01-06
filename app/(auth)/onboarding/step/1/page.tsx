'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('OnboardingStep1')

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import OnboardingLayout from '@/components/onboarding/OnboardingLayout'

// 귀여운 형용사 (2-3글자)
const ADJECTIVES = [
  '귀여운', '작은', '빠른', '느린', '포근한',
  '달콤한', '차가운', '따뜻한', '밝은', '어두운',
  '신비한', '용감한', '조용한', '활발한', '순수한',
  '깜찍한', '상냥한', '씩씩한', '영리한', '멋진'
]

// 러시아 관련 명사 (2-3글자)
const NOUNS = [
  '곰', '차이', '눈송이', '별', '달',
  '네바', '볼가', '크렘린', '바이칼', '샤슬릭',
  '피로시키', '보드카', '마트료시카', '발랄라이카', '트로이카',
  '자작나무', '눈토끼', '북극곰', '호수', '성'
]

// 랜덤 닉네임 생성 (6글자 이내, 띄어쓰기 없음)
const generateRandomNickname = (): string => {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const combined = `${adjective}${noun}`

  // 6글자 이내인지 확인
  if (combined.length <= 6) {
    return combined
  }

  // 6글자 초과하면 다시 생성
  return generateRandomNickname()
}

export default function OnboardingStep1() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [suggestedNickname, setSuggestedNickname] = useState('')
  const [currentName, setCurrentName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCurrentProfile = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // 현재 프로필 이름 가져오기
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      if (profile?.full_name) {
        setCurrentName(profile.full_name)
      }

      // 랜덤 닉네임 제안
      await generateUniqueNickname()
    }

    loadCurrentProfile()
  }, [router])

  const generateUniqueNickname = async () => {
    const supabase = createClient()
    let attempts = 0
    const maxAttempts = 20

    while (attempts < maxAttempts) {
      const candidate = generateRandomNickname()

      // 중복 확인
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('full_name', candidate)
        .single()

      if (!existingProfile) {
        setSuggestedNickname(candidate)
        return
      }

      attempts++
    }

    // 20번 시도해도 유니크한 닉네임을 못 만들면 숫자 추가
    const fallback = `${generateRandomNickname()}${Math.floor(Math.random() * 100)}`
    setSuggestedNickname(fallback)
  }

  const handleUseSuggested = () => {
    setNickname(suggestedNickname)
    setError(null)
  }

  const handleRefreshSuggestion = async () => {
    setIsCheckingDuplicate(true)
    await generateUniqueNickname()
    setIsCheckingDuplicate(false)
  }

  const handleNext = async () => {
    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요')
      return
    }

    if (nickname.length < 2) {
      setError('닉네임은 최소 2자 이상이어야 합니다')
      return
    }

    if (nickname.length > 20) {
      setError('닉네임은 최대 20자까지 가능합니다')
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

      // 닉네임 중복 확인
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('full_name', nickname.trim())
        .neq('id', user.id)
        .single()

      if (existingProfile) {
        setError('이미 사용 중인 닉네임입니다')
        return
      }

      // 프로필 업데이트
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: nickname.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        logger.error('Nickname update error:', updateError)
        setError('닉네임 업데이트 중 오류가 발생했습니다')
        return
      }

      logger.log('Nickname updated successfully:', nickname.trim())

      // 다음 단계로 이동 (도시 선택)
      router.push('/onboarding/step/2')
    } catch (err) {
      logger.error('Save error:', err)
      setError('저장 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const canProceed = nickname.trim().length >= 2

  return (
    <OnboardingLayout
      currentStep={1}
      totalSteps={5}
      title="닉네임을 설정해주세요"
      onNext={handleNext}
      nextDisabled={!canProceed}
      nextLoading={isLoading}
      hidePrevious
    >
      <div className="mb-6">
        <div className="glass-strong rounded-lg p-6 mb-6">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">😊</div>
            <h2 className="text-xl font-bold mb-2">
              적당한 익명성을 유지해요
            </h2>
            <p className="text-sm text-muted-foreground mb-1">
              개인정보 보호를 위해 닉네임을 사용합니다
            </p>
            <p className="text-xs text-destructive/80">
              ⚠️ 닉네임 추후 변경 필요시, 관리자 승인을 통해서만 변경 가능 합니다.
            </p>
          </div>

          {currentName && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">현재 이름</p>
              <p className="text-sm font-medium">{currentName}</p>
            </div>
          )}

          {suggestedNickname && (
            <div className="mb-4 p-6 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-primary">추천 닉네임</p>
                <button
                  onClick={handleRefreshSuggestion}
                  disabled={isCheckingDuplicate}
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isCheckingDuplicate ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="text-center mb-4">
                <p className="text-2xl font-bold text-primary mb-4">{suggestedNickname}</p>
                <Button
                  size="lg"
                  className="w-full bg-[#8BA888] hover:bg-[#7a9777] text-white"
                  onClick={handleUseSuggested}
                  disabled={isLoading}
                >
                  사용하기
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="nickname" className="text-sm font-medium">
              닉네임
            </label>
            <Input
              id="nickname"
              type="text"
              placeholder="닉네임을 입력하세요"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canProceed && !isLoading) {
                  handleNext()
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              2-20자, 한글/영문/숫자 사용 가능
            </p>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    </OnboardingLayout>
  )
}
