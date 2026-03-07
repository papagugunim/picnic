'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Radio, RefreshCw } from 'lucide-react'

import { getRussiaNewsTopicBadgeClass, RussiaNewsCard } from '@/components/today/RussiaNewsCard'
import { normalizeTopic, type RussiaNewsItem, type RussiaNewsTopic } from '@/lib/russia-news'
import {
  fetchTodayNewsWithFallback,
  readTodayLocalCachedNews,
  writeTodayLocalCachedNews,
} from '@/lib/today/russia-news-client'

const TOPICS: Array<{ label: string; value: RussiaNewsTopic }> = [
  { label: '전체', value: '' },
  { label: '정치', value: '정치' },
  { label: '사회', value: '사회' },
  { label: '경제', value: '경제' },
  { label: '문화', value: '문화' },
  { label: '날씨', value: '날씨' },
]
const AUTO_RECOVERY_DELAY_MS = 6000

function topicButtonClass(value: RussiaNewsTopic, active: boolean): string {
  const toneClass = value
    ? getRussiaNewsTopicBadgeClass(value)
    : 'bg-zinc-200 text-zinc-900'
  return `${toneClass} border border-black/5 ${active ? 'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]' : 'hover:brightness-95'}`
}

export function RussiaNewsSection() {
  const [topic, setTopic] = useState<RussiaNewsTopic>('')
  const [items, setItems] = useState<RussiaNewsItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const latestItemsRef = useRef<RussiaNewsItem[]>([])
  const requestIdRef = useRef(0)
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const topicTouchStateRef = useRef<{
    value: RussiaNewsTopic
    startX: number
    startY: number
    moved: boolean
  } | null>(null)

  const selectTopic = useCallback((value: RussiaNewsTopic) => {
    const normalized = normalizeTopic(value)
    setTopic((prev) => (prev === normalized ? prev : normalized))
  }, [])

  useEffect(() => {
    latestItemsRef.current = items
  }, [items])

  const clearRecoveryTimer = useCallback(() => {
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current)
      recoveryTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      clearRecoveryTimer()
    }
  }, [clearRecoveryTimer])

  useEffect(() => {
    const topicsToWarm = TOPICS
      .map((entry) => entry.value)
      .filter((value): value is RussiaNewsTopic => value !== '' && readTodayLocalCachedNews(value, 1).length === 0)

    if (topicsToWarm.length === 0) return

    void Promise.allSettled(
      topicsToWarm.map(async (value) => {
        const prefetched = await fetchTodayNewsWithFallback(value, {
          limit: 8,
          cacheMode: 'force-cache',
        })
        if (prefetched.length > 0) {
          writeTodayLocalCachedNews(value, prefetched)
        }
      })
    )
  }, [])

  const fetchNews = useCallback(
    async (isManualRefresh: boolean) => {
      const requestId = ++requestIdRef.current
      clearRecoveryTimer()
      const cachedOnStart = isManualRefresh ? [] : readTodayLocalCachedNews(topic, 8)

      if (isManualRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(cachedOnStart.length === 0)
      }

      if (!isManualRefresh && cachedOnStart.length > 0) {
        setItems(cachedOnStart)
      }
      setErrorMessage(null)

      try {
        const clipped = await fetchTodayNewsWithFallback(topic, {
          limit: 8,
          cacheMode: isManualRefresh ? 'no-store' : 'default',
          bustCache: isManualRefresh,
        })
        if (requestIdRef.current !== requestId) return

        if (clipped.length > 0) {
          setItems(clipped)
          writeTodayLocalCachedNews(topic, clipped)
          setErrorMessage(null)
          return
        }

        const cachedItems = readTodayLocalCachedNews(topic, 8)
        if (cachedItems.length > 0) {
          setItems(cachedItems)
          setErrorMessage(null)
          return
        }
      } catch (error) {
        if (requestIdRef.current !== requestId) return

        const cachedItems = readTodayLocalCachedNews(topic, 8)
        if (cachedItems.length > 0) {
          setItems(cachedItems)
          setErrorMessage(null)
        } else {
          if (latestItemsRef.current.length === 0) {
            setErrorMessage(error instanceof Error ? error.message : '뉴스를 불러오지 못했습니다.')
          }

          // 첫 로딩에서 실패한 경우 자동 복구 재시도
          recoveryTimerRef.current = setTimeout(() => {
            void fetchNews(false)
          }, AUTO_RECOVERY_DELAY_MS)
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    },
    [clearRecoveryTimer, topic]
  )

  useEffect(() => {
    fetchNews(false)
  }, [fetchNews])

  return (
    <section className="rounded-lg p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-sm font-bold truncate">가장 빠른 실시간 뉴스</h2>
        </div>

        <button
          onClick={() => fetchNews(true)}
          disabled={isRefreshing}
          aria-label="새로고침"
          title="새로고침"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-0.5 touch-pan-x">
        {TOPICS.map((entry) => {
          const active = topic === entry.value
          return (
            <button
              key={entry.value || 'all'}
              type="button"
              onClick={() => selectTopic(entry.value)}
              onTouchStart={(e) => {
                const touch = e.touches[0]
                if (!touch) return
                topicTouchStateRef.current = {
                  value: entry.value,
                  startX: touch.clientX,
                  startY: touch.clientY,
                  moved: false,
                }
              }}
              onTouchMove={(e) => {
                const state = topicTouchStateRef.current
                const touch = e.touches[0]
                if (!state || !touch) return
                const movedX = Math.abs(touch.clientX - state.startX)
                const movedY = Math.abs(touch.clientY - state.startY)
                if (movedX > 16 || movedY > 16) {
                  state.moved = true
                }
              }}
              onTouchEnd={() => {
                const state = topicTouchStateRef.current
                topicTouchStateRef.current = null
                if (!state || state.value !== entry.value || state.moved) return
                selectTopic(entry.value)
              }}
              onTouchCancel={() => {
                topicTouchStateRef.current = null
              }}
              aria-pressed={active}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] leading-none font-semibold transition ${topicButtonClass(entry.value, active)}`}
            >
              {entry.label}
            </button>
          )
        })}
      </div>

      {isLoading && items.length === 0 ? (
        <div className="rounded-lg p-3 text-sm text-muted-foreground">
          뉴스를 불러오는 중입니다...
        </div>
      ) : errorMessage ? (
        <div className="rounded-lg p-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg p-3 text-sm text-muted-foreground">
          표시할 뉴스가 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {isLoading && (
            <div className="px-1 pb-1 text-[11px] text-muted-foreground">카테고리 전환 중...</div>
          )}
          {items.map((item) => (
            <RussiaNewsCard key={item.id} item={item} compact />
          ))}
        </div>
      )}

      <div className="flex items-center justify-end pt-0.5">
        <Link
          href="/today/russia-news"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          전체보기
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  )
}
