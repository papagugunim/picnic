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
  containerProps: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
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

  const startY = useRef(0)
  const currentY = useRef(0)
  const isAtTop = useRef(true)

  const checkIsAtTop = useCallback(() => {
    return window.scrollY === 0
  }, [])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled || isRefreshing) return

    isAtTop.current = checkIsAtTop()
    if (!isAtTop.current) return

    startY.current = e.touches[0].clientY
    setIsPulling(true)
  }, [enabled, isRefreshing, checkIsAtTop])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || isRefreshing || !isPulling) return
    if (!isAtTop.current) return

    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current

    if (diff > 0) {
      // Apply resistance for natural feel
      const resistance = 0.5
      const distance = Math.min(diff * resistance, maxPull)
      setPullDistance(distance)

      // Prevent default scroll when pulling
      if (distance > 0) {
        e.preventDefault()
      }
    }
  }, [enabled, isRefreshing, isPulling, maxPull])

  const onTouchEnd = useCallback(async () => {
    if (!enabled || isRefreshing || !isPulling) return

    setIsPulling(false)

    if (pullDistance >= threshold) {
      setIsRefreshing(true)
      setPullDistance(threshold) // Keep at threshold during refresh

      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [enabled, isRefreshing, isPulling, pullDistance, threshold, onRefresh])

  // Reset on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!isPulling) {
        isAtTop.current = checkIsAtTop()
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isPulling, checkIsAtTop])

  return {
    pullDistance,
    isRefreshing,
    isPulling,
    containerProps: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  }
}
