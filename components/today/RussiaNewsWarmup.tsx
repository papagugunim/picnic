'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

import { useUser } from '@/lib/contexts/UserContext'
import { createNamespacedLogger } from '@/lib/logger'
import { shouldWarmupTodayNews, warmupTodayNewsCache } from '@/lib/today/russia-news-client'

const logger = createNamespacedLogger('RussiaNewsWarmup')

function isLowBandwidthConnection() {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string }
  }
  const connection = nav.connection
  if (!connection) return false
  if (connection.saveData) return true
  return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g'
}

export function RussiaNewsWarmup() {
  const { user, loading } = useUser()
  const pathname = usePathname()
  const warmedUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (loading) return

    if (!user?.id) {
      warmedUserIdRef.current = null
      return
    }

    if (pathname?.startsWith('/today')) {
      return
    }

    if (!shouldWarmupTodayNews()) {
      warmedUserIdRef.current = user.id
      return
    }

    if (warmedUserIdRef.current === user.id) {
      return
    }

    if (isLowBandwidthConnection()) {
      return
    }

    let timer: ReturnType<typeof setTimeout> | null = null
    let idleHandle: number | null = null
    const runWarmup = () => {
      void warmupTodayNewsCache()
        .then(() => {
          warmedUserIdRef.current = user.id
        })
        .catch((error) => {
          logger.warn('뉴스 캐시 선로딩 실패:', error)
        })
    }

    if ('requestIdleCallback' in window) {
      idleHandle = window.requestIdleCallback(runWarmup, { timeout: 2000 })
    } else {
      timer = setTimeout(runWarmup, 1100)
    }

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
      if (idleHandle !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleHandle)
      }
    }
  }, [loading, pathname, user?.id])

  return null
}
