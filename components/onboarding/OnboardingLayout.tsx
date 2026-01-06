'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OnboardingLayoutProps {
  currentStep: number
  totalSteps: number
  title: string
  description?: string
  children: React.ReactNode
  onNext?: () => void | Promise<void>
  onPrevious?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  nextLoading?: boolean
  showSkip?: boolean
  onSkip?: () => void
  hidePrevious?: boolean
  hideNext?: boolean
}

export default function OnboardingLayout({
  currentStep,
  totalSteps,
  title,
  description,
  children,
  onNext,
  onPrevious,
  nextLabel = '다음',
  nextDisabled = false,
  nextLoading = false,
  showSkip = false,
  onSkip,
  hidePrevious = false,
  hideNext = false,
}: OnboardingLayoutProps) {
  const router = useRouter()

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious()
    } else {
      router.back()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        {/* 상단 헤더 */}
        <div className="text-center space-y-3 mb-8">
          <h1 className="text-4xl font-bold gradient-text">picnic</h1>

          {/* 프로그레스 인디케이터 */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index + 1 === currentStep
                    ? 'w-8 bg-primary'
                    : index + 1 < currentStep
                    ? 'w-2 bg-primary/60'
                    : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>

          {/* 스텝 번호 */}
          <p className="text-sm text-muted-foreground">
            {currentStep} / {totalSteps}
          </p>

          {/* 타이틀 */}
          <p className="text-muted-foreground text-lg">
            {title}
          </p>

          {/* 설명 */}
          {description && (
            <p className="text-sm text-muted-foreground/80">
              {description}
            </p>
          )}
        </div>

        {/* 컨텐츠 */}
        {children}

        {/* 하단 버튼 */}
        <div className="space-y-3">
          <div className="flex gap-3">
            {/* 이전 버튼 */}
            {!hidePrevious && currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="flex items-center gap-1"
                disabled={nextLoading}
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </Button>
            )}

            {/* 다음 버튼 */}
            {!hideNext && (
              <Button
                onClick={onNext}
                className="flex-1"
                disabled={nextDisabled || nextLoading}
              >
                {nextLoading ? '처리 중...' : nextLabel}
              </Button>
            )}
          </div>

          {/* 건너뛰기 버튼 */}
          {showSkip && onSkip && (
            <button
              onClick={onSkip}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              disabled={nextLoading}
            >
              건너뛰기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
