'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Page')
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Laptop,
  Sofa,
  Shirt,
  BookOpen,
  Dumbbell,
  Sparkles as SparklesIcon,
  Baby,
  Apple,
  Car,
  Home,
  Briefcase,
  Luggage,
  Landmark,
  Package,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/constants'
import OnboardingLayout from '@/components/onboarding/OnboardingLayout'

// 카테고리별 아이콘 매칭
const categoryIcons = {
  electronics: Laptop,
  furniture: Sofa,
  clothing: Shirt,
  books: BookOpen,
  sports: Dumbbell,
  beauty: SparklesIcon,
  baby: Baby,
  food: Apple,
  vehicles: Car,
  realestate: Home,
  jobs: Briefcase,
  handcarry: Luggage,
  finance: Landmark,
  other: Package,
}

const categoryBurstEmojis: Record<string, string[]> = {
  electronics: ['💻', '⚡', '✨'],
  furniture: ['🛋️', '🏠', '✨'],
  clothing: ['👕', '🧥', '✨'],
  books: ['📚', '✍️', '✨'],
  sports: ['🏃', '🏋️', '✨'],
  beauty: ['💄', '💅', '✨'],
  baby: ['🧸', '🍼', '✨'],
  food: ['🍲', '🥟', '✨'],
  vehicles: ['🚗', '🛵', '✨'],
  realestate: ['🏡', '🪟', '✨'],
  jobs: ['💼', '📈', '✨'],
  handcarry: ['🧳', '✈️', '✨'],
  finance: ['💳', '📊', '✨'],
  other: ['🎁', '⭐', '✨'],
}

export default function OnboardingStep4() {
  const router = useRouter()
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 기존 선호 카테고리 가져오기
  useEffect(() => {
    async function fetchUserProfile() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_categories')
        .eq('id', user.id)
        .single()

      if (profile?.preferred_categories) {
        setSelectedCategories(profile.preferred_categories)
      }
    }

    fetchUserProfile()
  }, [router])

  const handleCategoryToggle = (categoryValue: string) => {
    if (selectedCategories.includes(categoryValue)) {
      // 이미 선택된 카테고리 제거
      setSelectedCategories(
        selectedCategories.filter((c) => c !== categoryValue)
      )
    } else {
      // 새 카테고리 추가 (최대 5개)
      if (selectedCategories.length < 5) {
        setSelectedCategories([...selectedCategories, categoryValue])
      } else {
        setError('최대 5개까지 선택할 수 있습니다')
        setTimeout(() => setError(null), 2000)
      }
    }
  }

  const handleNext = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('로그인이 필요합니다')
        return
      }

      // 프로필 업데이트
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          preferred_categories: selectedCategories,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        logger.error('Profile update error:', updateError)
        setError('프로필 업데이트 중 오류가 발생했습니다')
        return
      }

      // 다음 단계로 이동 (빵 등급 안내)
      router.push('/onboarding/step/5')
    } catch (err) {
      logger.error('Save error:', err)
      setError('저장 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    // 카테고리 선택을 건너뛰고 다음 단계로 (빵 등급 안내)
    router.push('/onboarding/step/5')
  }

  return (
    <OnboardingLayout
      currentStep={4}
      totalSteps={5}
      title="관심 카테고리 (최대 5개)"
      description={
        selectedCategories.length > 0
          ? `${selectedCategories.length}/5 선택됨`
          : undefined
      }
      onNext={handleNext}
      nextLabel="완료"
      nextLoading={isLoading}
      showSkip
      onSkip={handleSkip}
    >
      <div className="mb-6">
        <div className="grid grid-cols-3 gap-3 mb-6">
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategories.includes(category.value)
            const Icon = categoryIcons[category.value as keyof typeof categoryIcons]

            return (
              <button
                key={category.value}
                onClick={() => handleCategoryToggle(category.value)}
                data-emoji-burst={categoryBurstEmojis[category.value]?.join(',') ?? '✨,🍞'}
                className={`onboarding-choice h-auto py-4 px-2 flex flex-col items-center gap-2 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'onboarding-choice-selected border-primary bg-primary text-primary-foreground ring-2 ring-primary/50 shadow-[0_6px_18px_rgba(84,122,94,0.26)]'
                    : 'border-border hover:border-primary/50 hover:bg-primary/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium text-center leading-tight">{category.label}</span>
              </button>
            )
          })}
        </div>

        {error && (
          <div className="glass-strong rounded-lg p-3 text-center text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </OnboardingLayout>
  )
}
