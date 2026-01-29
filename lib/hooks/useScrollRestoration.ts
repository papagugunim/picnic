'use client'

import { useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'

interface ScrollPosition {
  x: number
  y: number
  timestamp: number
}

const SCROLL_POSITIONS_KEY = 'picnic_scroll_positions'
const MAX_ENTRIES = 20
const MAX_AGE_MS = 30 * 60 * 1000 // 30 minutes

function getStoredPositions(): Record<string, ScrollPosition> {
  if (typeof window === 'undefined') return {}

  try {
    const stored = sessionStorage.getItem(SCROLL_POSITIONS_KEY)
    if (!stored) return {}

    const positions: Record<string, ScrollPosition> = JSON.parse(stored)
    const now = Date.now()

    // Clean up old entries
    const cleaned: Record<string, ScrollPosition> = {}
    for (const [key, value] of Object.entries(positions)) {
      if (now - value.timestamp < MAX_AGE_MS) {
        cleaned[key] = value
      }
    }

    return cleaned
  } catch {
    return {}
  }
}

function savePosition(key: string, position: ScrollPosition): void {
  if (typeof window === 'undefined') return

  try {
    const positions = getStoredPositions()
    positions[key] = position

    // Limit entries
    const entries = Object.entries(positions)
    if (entries.length > MAX_ENTRIES) {
      // Remove oldest entries
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      const toKeep = entries.slice(-MAX_ENTRIES)
      const cleaned = Object.fromEntries(toKeep)
      sessionStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(cleaned))
    } else {
      sessionStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(positions))
    }
  } catch {
    // Ignore storage errors
  }
}

function getPosition(key: string): ScrollPosition | null {
  const positions = getStoredPositions()
  return positions[key] || null
}

function clearPosition(key: string): void {
  if (typeof window === 'undefined') return

  try {
    const positions = getStoredPositions()
    delete positions[key]
    sessionStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(positions))
  } catch {
    // Ignore storage errors
  }
}

export interface UseScrollRestorationOptions {
  key?: string
  enabled?: boolean
  delay?: number
}

export interface UseScrollRestorationReturn {
  saveScrollPosition: () => void
  restoreScrollPosition: () => void
  clearScrollPosition: () => void
}

export function useScrollRestoration({
  key,
  enabled = true,
  delay = 100,
}: UseScrollRestorationOptions = {}): UseScrollRestorationReturn {
  const pathname = usePathname()
  const scrollKey = key || pathname
  const hasRestoredRef = useRef(false)

  const saveScrollPosition = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return

    savePosition(scrollKey, {
      x: window.scrollX,
      y: window.scrollY,
      timestamp: Date.now(),
    })
  }, [scrollKey, enabled])

  const restoreScrollPosition = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return

    const position = getPosition(scrollKey)
    if (position) {
      // Use requestAnimationFrame for smoother restoration
      requestAnimationFrame(() => {
        window.scrollTo(position.x, position.y)
      })
    }
  }, [scrollKey, enabled])

  const clearScrollPosition = useCallback(() => {
    if (!enabled) return
    clearPosition(scrollKey)
  }, [scrollKey, enabled])

  // Save position on scroll (debounced)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    let timeoutId: NodeJS.Timeout

    const handleScroll = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(saveScrollPosition, 150)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(timeoutId)
    }
  }, [enabled, saveScrollPosition])

  // Restore position on mount
  useEffect(() => {
    if (!enabled || hasRestoredRef.current) return

    const timeoutId = setTimeout(() => {
      restoreScrollPosition()
      hasRestoredRef.current = true
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [enabled, delay, restoreScrollPosition])

  // Save position before unload
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const handleBeforeUnload = () => {
      saveScrollPosition()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [enabled, saveScrollPosition])

  return {
    saveScrollPosition,
    restoreScrollPosition,
    clearScrollPosition,
  }
}
