'use client'

import { RefreshCw } from 'lucide-react'
import { usePullToRefresh } from '@/lib/hooks/usePullToRefresh'
import { cn } from '@/lib/utils'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  threshold?: number
  maxPull?: number
  enabled?: boolean
  className?: string
}

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  maxPull = 120,
  enabled = true,
  className,
}: PullToRefreshProps) {
  const { pullDistance, isRefreshing, isPulling, containerRef } = usePullToRefresh({
    onRefresh,
    threshold,
    maxPull,
    enabled,
  })

  const progress = Math.min(pullDistance / threshold, 1)
  const shouldShowIndicator = pullDistance > 10 || isRefreshing

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute left-1/2 -translate-x-1/2 z-40 flex items-center justify-center',
          'transition-opacity duration-200',
          shouldShowIndicator ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          top: Math.max(pullDistance - 50, 10),
        }}
      >
        <div
          className={cn(
            'w-10 h-10 rounded-full bg-background shadow-lg border border-border',
            'flex items-center justify-center'
          )}
        >
          <RefreshCw
            className={cn(
              'w-5 h-5 text-primary transition-transform duration-200',
              isRefreshing && 'animate-spin'
            )}
            style={{
              transform: isRefreshing
                ? undefined
                : `rotate(${progress * 360}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content with pull transform */}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  )
}
