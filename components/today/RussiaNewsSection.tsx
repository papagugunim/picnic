'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Radio, RefreshCw } from 'lucide-react'

import { RussiaNewsCard } from '@/components/today/RussiaNewsCard'
import { normalizeTopic, type RussiaNewsItem, type RussiaNewsTopic } from '@/lib/russia-news'

const TOPICS: Array<{ label: string; value: RussiaNewsTopic }> = [
  { label: '전체', value: '' },
  { label: '정치', value: '정치' },
  { label: '사회', value: '사회' },
  { label: '경제', value: '경제' },
  { label: '문화', value: '문화' },
  { label: '날씨', value: '날씨' },
]
const NEWS_CACHE_VERSION = '2'
const LOCAL_CACHE_TTL_MS = 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 9000
const AUTO_RECOVERY_DELAY_MS = 6000
const MAX_RETRY_PER_REQUEST = 2

function buildLocalCacheKey(topic: RussiaNewsTopic): string {
  return `russia-news:today:${topic || 'all'}:v${NEWS_CACHE_VERSION}`
}

function filterItemsByTopic(items: RussiaNewsItem[], topic: RussiaNewsTopic): RussiaNewsItem[] {
  if (!topic) return items
  return items.filter((item) => normalizeTopic(item.topic || null) === topic)
}

function readLocalCachedNews(topic: RussiaNewsTopic): RussiaNewsItem[] {
  if (typeof window === 'undefined') return []

  const key = buildLocalCacheKey(topic)
  const raw = window.localStorage.getItem(key)
  if (!raw) {
    if (!topic) return []
    return filterItemsByTopic(readLocalCachedNews(''), topic)
  }

  try {
    const parsed = JSON.parse(raw) as { savedAt?: number; items?: RussiaNewsItem[] }
    if (!parsed?.savedAt || !Array.isArray(parsed?.items)) return []
    if (Date.now() - parsed.savedAt > LOCAL_CACHE_TTL_MS) {
      window.localStorage.removeItem(key)
      if (!topic) return []
      const broad = readLocalCachedNews('')
      return broad.length > 0 ? broad : []
    }
    const filtered = filterItemsByTopic(parsed.items, topic)
    if (filtered.length > 0 || !topic) {
      return filtered
    }

    const broad = readLocalCachedNews('')
    return broad.length > 0 ? broad : []
  } catch {
    window.localStorage.removeItem(key)
    if (!topic) return []
    const broad = readLocalCachedNews('')
    return broad.length > 0 ? broad : []
  }
}

function writeLocalCachedNews(topic: RussiaNewsTopic, items: RussiaNewsItem[]): void {
  if (typeof window === 'undefined' || items.length === 0) return

  const payload = JSON.stringify({
    savedAt: Date.now(),
    items,
  })

  window.localStorage.setItem(buildLocalCacheKey(topic), payload)
  if (!topic) {
    window.localStorage.setItem(buildLocalCacheKey(''), payload)
  }
}

async function requestNews(
  endpoint: '/api/russia-news' | '/api/russia-news/archive',
  topic: RussiaNewsTopic
): Promise<RussiaNewsItem[]> {
  const url = new URL(endpoint, window.location.origin)
  url.searchParams.set('limit', '8')
  url.searchParams.set('v', NEWS_CACHE_VERSION)
  if (topic) url.searchParams.set('topic', topic)

  for (let attempt = 0; attempt < MAX_RETRY_PER_REQUEST; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      })
      const data = await response.json()

      if (!response.ok || data?.error) {
        throw new Error(data?.error || '뉴스를 불러오지 못했습니다.')
      }

      const items = Array.isArray(data?.items) ? (data.items as RussiaNewsItem[]) : []
      if (items.length > 0) {
        return items.slice(0, 8)
      }
    } catch (error) {
      const isAbort = error instanceof Error && error.name === 'AbortError'
      if (!isAbort || attempt === MAX_RETRY_PER_REQUEST - 1) {
        throw error
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  return []
}

async function requestNewsWithFallback(topic: RussiaNewsTopic): Promise<RussiaNewsItem[]> {
  const candidates: Array<{ endpoint: '/api/russia-news' | '/api/russia-news/archive'; topic: RussiaNewsTopic }> = [
    { endpoint: '/api/russia-news', topic },
    { endpoint: '/api/russia-news/archive', topic },
  ]

  if (topic) {
    candidates.push(
      { endpoint: '/api/russia-news', topic: '' },
      { endpoint: '/api/russia-news/archive', topic: '' }
    )
  }

  let lastError: unknown = null

  for (const candidate of candidates) {
    try {
      const items = await requestNews(candidate.endpoint, candidate.topic)
      if (items.length > 0) return items
    } catch (error) {
      lastError = error
    }
  }

  if (lastError instanceof Error) throw lastError
  return []
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

  const fetchNews = useCallback(
    async (isManualRefresh: boolean) => {
      const requestId = ++requestIdRef.current
      clearRecoveryTimer()

      if (isManualRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setErrorMessage(null)

      try {
        const clipped = await requestNewsWithFallback(topic)
        if (requestIdRef.current !== requestId) return

        if (clipped.length > 0) {
          setItems(clipped)
          writeLocalCachedNews(topic, clipped)
          setErrorMessage(null)
          return
        }

        const cachedItems = readLocalCachedNews(topic).slice(0, 8)
        if (cachedItems.length > 0) {
          setItems(cachedItems)
          setErrorMessage(null)
          return
        }
      } catch (error) {
        if (requestIdRef.current !== requestId) return

        const cachedItems = readLocalCachedNews(topic).slice(0, 8)
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

      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {TOPICS.map((entry) => {
          const active = topic === entry.value
          return (
            <button
              key={entry.value || 'all'}
              type="button"
              onClick={() => setTopic(normalizeTopic(entry.value))}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {entry.label}
            </button>
          )
        })}
      </div>

      {isLoading ? (
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
