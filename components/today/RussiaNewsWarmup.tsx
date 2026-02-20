'use client'

import { useEffect, useRef } from 'react'

import { useUser } from '@/lib/contexts/UserContext'
import { createNamespacedLogger } from '@/lib/logger'
import { shouldWarmupTodayNews, warmupTodayNewsCache } from '@/lib/today/russia-news-client'

const logger = createNamespacedLogger('RussiaNewsWarmup')

export function RussiaNewsWarmup() {
  const { user, loading } = useUser()
  const warmedUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (loading) return

    if (!user?.id) {
      warmedUserIdRef.current = null
      return
    }

    if (!shouldWarmupTodayNews()) {
      warmedUserIdRef.current = user.id
      return
    }

    if (warmedUserIdRef.current === user.id) {
      return
    }

    const timer = window.setTimeout(() => {
      void warmupTodayNewsCache()
        .then(() => {
          warmedUserIdRef.current = user.id
        })
        .catch((error) => {
          logger.warn('뉴스 캐시 선로딩 실패:', error)
        })
    }, 900)

    return () => {
      window.clearTimeout(timer)
    }
  }, [loading, user?.id])

  return null
}
