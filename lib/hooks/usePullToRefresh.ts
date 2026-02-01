'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  maxPull?: number
  enabled?: boolean
}

export interface UsePullToRefreshReturn {
  pullDistance: number
  isRefreshing: boolean
  isPulling: boolean
  containerRef: React.RefObject<HTMLDivElement>
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
  enabled = true,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)
  const isAtTop = useRef(true)
  const pullDistanceRef = useRef(0)

  // Keep pullDistanceRef in sync with state
  useEffect(() => {
    pullDistanceRef.current = pullDistance
  }, [pullDistance])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const checkIsAtTop = () => window.scrollY <= 0

    const handleTouchStart = (e: TouchEvent) => {
      if (!enabled || isRefreshing) return

      isAtTop.current = checkIsAtTop()
      if (!isAtTop.current) return

      startY.current = e.touches[0].clientY
      setIsPulling(true)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!enabled || isRefreshing) return
      if (!isAtTop.current) return

      currentY.current = e.touches[0].clientY
      const diff = currentY.current - startY.current

      // Only prevent default and handle pull when at top and pulling down
      if (diff > 0 && isAtTop.current) {
        const resistance = 0.5
        const distance = Math.min(diff * resistance, maxPull)
        setPullDistance(distance)

        // Only prevent scroll when actually pulling down at top
        if (distance > 10) {
          e.preventDefault()
        }
      }
    }

    const handleTouchEnd = async () => {
      if (!enabled || isRefreshing) return

      setIsPulling(false)
      const currentPullDistance = pullDistanceRef.current

      if (currentPullDistance >= threshold) {
        setIsRefreshing(true)
        setPullDistance(threshold)

        try {
          await onRefresh()
        } finally {
          setIsRefreshing(false)
          setPullDistance(0)
        }
      } else {
        setPullDistance(0)
      }
    }

    // Use native event listeners with passive: false for touchmove
    // This allows preventDefault() to work
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, isRefreshing, maxPull, threshold, onRefresh])

  return {
    pullDistance,
    isRefreshing,
    isPulling,
    containerRef,
  }
}
