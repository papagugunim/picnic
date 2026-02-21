'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface UploadProgressButtonProps {
  type?: 'button' | 'submit'
  className?: string
  disabled?: boolean
  isLoading: boolean
  progress: number
  idleText: string
  loadingText: string
}

export function UploadProgressButton({
  type = 'button',
  className,
  disabled = false,
  isLoading,
  progress,
  idleText,
  loadingText,
}: UploadProgressButtonProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0))
  const rocketLeft = Math.max(6, Math.min(94, clamped))

  return (
    <Button
      type={type}
      disabled={disabled}
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        isLoading && 'text-white border-transparent',
        className
      )}
    >
      {isLoading && (
        <>
          <span
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-lime-400 to-cyan-400 transition-[width] duration-500 ease-out"
            style={{ width: `${clamped}%` }}
          />
          <span
            className="absolute top-1/2 -translate-y-1/2 text-sm transition-[left] duration-500 ease-out"
            style={{ left: `${rocketLeft}%` }}
          >
            🚀
          </span>
        </>
      )}

      <span
        className={cn(
          'relative z-10 flex items-center justify-center gap-1.5 w-full',
          isLoading && 'font-semibold drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]'
        )}
      >
        {isLoading ? (
          <>
            <span>{loadingText}</span>
            <span className="animate-pulse">✨</span>
          </>
        ) : (
          <span>{idleText}</span>
        )}
      </span>
    </Button>
  )
}
