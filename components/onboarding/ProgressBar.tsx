'use client'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="w-full">
      {/* 단계 표시 */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-muted-foreground">
          {currentStep} / {totalSteps} 단계
        </span>
        <span className="text-sm font-medium text-primary">
          {Math.round(progress)}%
        </span>
      </div>

      {/* 프로그레스 바 */}
      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-400 via-pink-400 to-red-400 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 단계 점들 */}
      <div className="flex justify-between mt-4">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep

          return (
            <div key={index} className="flex flex-col items-center gap-1">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                  transition-all duration-300
                  ${isCompleted ? 'bg-primary text-primary-foreground scale-110' : ''}
                  ${isCurrent ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110' : ''}
                  ${!isCompleted && !isCurrent ? 'bg-secondary text-muted-foreground' : ''}
                `}
              >
                {isCompleted ? '✓' : stepNumber}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
