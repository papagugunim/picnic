'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('OnboardingStep1')

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import OnboardingLayout from '@/components/onboarding/OnboardingLayout'

const MAX_NICKNAME_LENGTH = 20
const MAX_SUGGESTION_LENGTH = 12

// 러시아 도시/지역 감성 단어
const RUSSIAN_CITY_WORDS = [
  '모스크바',
  '네바',
  '카잔',
  '소치',
  '우랄',
  '볼가',
  '바이칼',
  '알타이',
  '시베리아',
  '크렘린',
]

// 러시아 음식 감성 단어
const RUSSIAN_FOOD_WORDS = [
  '보르시',
  '블린',
  '피로시키',
  '샤슬릭',
  '펠메니',
  '바레니키',
  '시르니키',
  '메도빅',
  '프리니키',
  '크바스',
]

// 러시아 자연/분위기 감성 단어
const RUSSIAN_NATURE_WORDS = [
  '자작',
  '설원',
  '백야',
  '오로라',
  '눈송이',
  '별빛',
  '눈토끼',
  '북극곰',
  '소나무',
  '들꽃',
]

const SOFT_MOOD_WORDS = [
  '포근한',
  '몽글한',
  '반짝이는',
  '해맑은',
  '고요한',
  '따스한',
  '아늑한',
  '산뜻한',
  '사뿐한',
  '달빛',
]

const CUTE_SUFFIXES = [
  '요정',
  '친구',
  '토끼',
  '곰',
  '냥이',
  '구름',
  '바람',
  '별',
  '달',
  '방울',
]

const pickRandom = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]

const buildNicknameCandidate = (): string => {
  const themePools = [RUSSIAN_CITY_WORDS, RUSSIAN_FOOD_WORDS, RUSSIAN_NATURE_WORDS]
  const theme = pickRandom(pickRandom(themePools))
  const mood = pickRandom(SOFT_MOOD_WORDS)
  const suffix = pickRandom(CUTE_SUFFIXES)

  const candidates = [
    `${mood}${theme}`,
    `${theme}${suffix}`,
    `${mood}${theme}${suffix}`,
  ]
    .map((value) => value.replace(/\s+/g, ''))
    .filter((value) => value.length >= 2 && value.length <= MAX_SUGGESTION_LENGTH)

  if (candidates.length > 0) {
    return pickRandom(candidates)
  }

  return `${theme}${suffix}`.slice(0, MAX_SUGGESTION_LENGTH)
}

export default function OnboardingStep1() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [suggestedNickname, setSuggestedNickname] = useState('')
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

      // 랜덤 닉네임 제안
      const initialSuggestion = await generateUniqueNickname()
      setSuggestedNickname(initialSuggestion)
      setNickname((prev) => (prev.trim().length > 0 ? prev : initialSuggestion))
    }

    loadCurrentProfile()
  }, [router])

  const isNicknameTaken = async (
    supabase: ReturnType<typeof createClient>,
    candidate: string
  ) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('full_name', candidate)
      .limit(1)

    if (error) {
      logger.error('Suggested nickname duplicate check error:', error)
      // 중복 체크 실패 시 안전하게 "이미 사용 중"으로 간주
      return true
    }

    return (data?.length ?? 0) > 0
  }

  const generateUniqueNickname = async (): Promise<string> => {
    const supabase = createClient()
    const maxAttempts = 40

    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      const candidate = buildNicknameCandidate()
      const taken = await isNicknameTaken(supabase, candidate)

      if (!taken) {
        return candidate
      }
    }

    // 기본 조합에서 실패하면 숫자를 붙여 최종 재시도
    for (let attempts = 0; attempts < 40; attempts++) {
      const fallback = `${buildNicknameCandidate()}${Math.floor(10 + Math.random() * 90)}`.slice(
        0,
        MAX_NICKNAME_LENGTH
      )
      const taken = await isNicknameTaken(supabase, fallback)

      if (!taken) {
        return fallback
      }
    }

    // 최후 예비값 (충돌 가능성 매우 낮음)
    const emergency = `피크닉${Math.floor(10000 + Math.random() * 90000)}`
    return emergency
  }

  const handleRefreshSuggestion = async () => {
    try {
      setIsCheckingDuplicate(true)
      const nextSuggestion = await generateUniqueNickname()
      setSuggestedNickname(nextSuggestion)
      setNickname(nextSuggestion)
      setError(null)
    } finally {
      setIsCheckingDuplicate(false)
    }
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

    const confirmed = window.confirm(`정말 "${nickname.trim()}" 닉네임을 사용하시겠습니까?`)
    if (!confirmed) {
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
      const { data: existingProfiles, error: duplicateCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('full_name', nickname.trim())
        .neq('id', user.id)
        .limit(1)

      if (duplicateCheckError) {
        logger.error('Nickname duplicate check error:', duplicateCheckError)
        setError('닉네임 확인 중 오류가 발생했습니다')
        return
      }

      if ((existingProfiles?.length ?? 0) > 0) {
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
      title="닉네임 설정"
      onNext={handleNext}
      nextDisabled={!canProceed}
      nextLoading={isLoading}
      hidePrevious
    >
      <div className="mb-4">
        <div className="glass-strong rounded-lg border-0 p-4 space-y-4">
          <div className="text-center space-y-1">
            <div className="text-3xl">😊</div>
            <p className="text-sm font-semibold">닉네임으로 안전하게 활동해요</p>
            <p className="text-xs text-muted-foreground">닉네임 변경은 관리자 승인 후 가능합니다.</p>
          </div>

          {suggestedNickname && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="mb-2 text-center">
                <p className="text-xs font-medium text-primary">추천 닉네임</p>
              </div>
              <div className="space-y-3">
                <p className="text-center text-lg font-bold text-primary truncate">{suggestedNickname}</p>
                <button
                  type="button"
                  onClick={handleRefreshSuggestion}
                  disabled={isCheckingDuplicate}
                  className="mx-auto flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-60"
                >
                  <RefreshCw className={`w-5 h-5 ${isCheckingDuplicate ? 'animate-spin' : ''}`} />
                  랜덤 다시 뽑기
                </button>
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
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>2-20자 사용 가능</span>
              <span>{nickname.length}/20</span>
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-destructive/10 text-destructive rounded-lg text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    </OnboardingLayout>
  )
}
