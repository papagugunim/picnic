'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Heart,
  Laptop,
  Sofa,
  Shirt,
  BookOpen,
  Dumbbell,
  Sparkles as SparklesIcon,
  Baby,
  Apple,
  Package,
  ChevronLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import ProgressBar from '@/components/onboarding/ProgressBar'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/constants'

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
  other: Package,
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
      setSelectedCategories(
        selectedCategories.filter((c) => c !== categoryValue)
      )
    } else {
      setSelectedCategories([...selectedCategories, categoryValue])
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

      // 프로필 업데이트 및 온보딩 완료 표시
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          preferred_categories: selectedCategories,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        setError('프로필 업데이트 중 오류가 발생했습니다')
        return
      }

      // 완료 페이지로 이동
      router.push('/onboarding/complete')
    } catch (err) {
      console.error('Save error:', err)
      setError('저장 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // 온보딩 완료 표시만 하고 넘어가기
        await supabase
          .from('profiles')
          .update({
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
      }

      router.push('/onboarding/complete')
    } catch (err) {
      console.error('Skip error:', err)
      router.push('/onboarding/complete')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* 프로그레스 바 */}
        <div className="mb-12">
          <ProgressBar currentStep={4} totalSteps={4} />
        </div>

        {/* 메인 콘텐츠 */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center">
              <Heart className="w-12 h-12 text-white" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            어떤 물건에 관심이 있으세요?
          </h1>

          <p className="text-lg text-muted-foreground mb-8">
            관심 카테고리를 선택하시면
            <br />
            원하는 물건을 더 쉽게 찾을 수 있어요 (선택 사항)
          </p>
        </div>

        {/* 카테고리 그리드 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategories.includes(category.value)
            const Icon = categoryIcons[category.value as keyof typeof categoryIcons]

            return (
              <button
                key={category.value}
                onClick={() => handleCategoryToggle(category.value)}
                className={`
                  glass-strong rounded-2xl p-6 text-center
                  transition-all duration-300
                  hover:scale-105 hover:shadow-lg
                  ${
                    isSelected
                      ? 'ring-4 ring-primary/50 bg-primary/10'
                      : ''
                  }
                `}
              >
                <div
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3
                    transition-colors duration-300
                    ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gradient-to-br from-orange-400 to-pink-500 text-white'
                    }
                  `}
                >
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="font-semibold text-sm">{category.label}</h3>
                {isSelected && (
                  <div className="mt-2 text-xs text-primary font-medium">
                    ✓ 선택됨
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-8 glass-strong rounded-lg p-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {/* 안내 메시지 */}
        <div className="glass-strong rounded-2xl p-6 mb-8">
          <p className="text-center text-sm text-muted-foreground">
            {selectedCategories.length > 0 ? (
              <>
                💡 {selectedCategories.length}개의 카테고리를 선택했어요!
                <br />
                나중에 설정에서 언제든지 변경할 수 있어요
              </>
            ) : (
              <>
                💡 카테고리를 선택하지 않아도 괜찮아요
                <br />
                나중에 설정에서 언제든지 추가할 수 있어요
              </>
            )}
          </p>
        </div>

        {/* 버튼 그룹 */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Button
              onClick={() => router.push('/onboarding/step/3')}
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
              disabled={isLoading}
            >
              {isLoading ? '저장 중...' : '완료하기'}
            </Button>
          </div>

          {/* 건너뛰기 버튼 */}
          <button
            onClick={handleSkip}
            className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            disabled={isLoading}
          >
            건너뛰기
          </button>
        </div>
      </div>
    </div>
  )
}
