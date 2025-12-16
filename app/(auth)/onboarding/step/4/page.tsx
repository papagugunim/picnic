'use client'

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
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  vehicles: Car,
  realestate: Home,
  jobs: Briefcase,
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center space-y-3 mb-8">
          <h1 className="text-4xl font-bold gradient-text">picnic</h1>
          <p className="text-muted-foreground">
            관심 카테고리 (최대 5개)
          </p>
          {selectedCategories.length > 0 && (
            <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              {selectedCategories.length}/5
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategories.includes(category.value)
            const Icon = categoryIcons[category.value as keyof typeof categoryIcons]

            return (
              <button
                key={category.value}
                onClick={() => handleCategoryToggle(category.value)}
                className={`h-auto py-4 px-2 flex flex-col items-center gap-2 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground ring-2 ring-primary/50'
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
          <div className="mb-4 glass-strong rounded-lg p-3 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          onClick={handleNext}
          className="w-full mb-4"
          disabled={isLoading}
        >
          {isLoading ? '저장 중...' : '완료'}
        </Button>

        <button
          onClick={handleSkip}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          disabled={isLoading}
        >
          건너뛰기
        </button>
      </div>
    </div>
  )
}
