'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'

import { getRussiaNewsTopicBadgeClass, RussiaNewsCard } from '@/components/today/RussiaNewsCard'
import { normalizeTopic, type RussiaNewsItem, type RussiaNewsTopic } from '@/lib/russia-news'

const TOPICS: Array<{ label: string; value: RussiaNewsTopic }> = [
  { label: '전체', value: '' },
  { label: '정치', value: '정치' },
  { label: '사회', value: '사회' },
  { label: '경제', value: '경제' },
  { label: '문화', value: '문화' },
  { label: '날씨', value: '날씨' },
]
const NEWS_CACHE_VERSION = '4'
const LOCAL_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const ARCHIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const PAGE_SIZE = 30

function topicButtonClass(value: RussiaNewsTopic, active: boolean): string {
  const toneClass = value
    ? getRussiaNewsTopicBadgeClass(value)
    : 'bg-zinc-200 text-zinc-900'
  return `${toneClass} border border-black/5 ${active ? 'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]' : 'hover:brightness-95'}`
}

function buildLocalCacheKey(topic: RussiaNewsTopic): string {
  return `russia-news:archive:${topic || 'all'}:v${NEWS_CACHE_VERSION}`
}

function parsePublishedAtMs(value: string): number {
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : 0
}

function sortByPublishedAtDesc(items: RussiaNewsItem[]): RussiaNewsItem[] {
  return [...items].sort((a, b) => parsePublishedAtMs(b.published_at) - parsePublishedAtMs(a.published_at))
}

function keepLastWeek(items: RussiaNewsItem[]): RussiaNewsItem[] {
  const minTime = Date.now() - ARCHIVE_WINDOW_MS
  return sortByPublishedAtDesc(items).filter((item) => parsePublishedAtMs(item.published_at) >= minTime)
}

function isFallbackPlaceholderItems(items: RussiaNewsItem[]): boolean {
  return items.length > 0 && items.every((item) => item.source_name === 'picnic-fallback')
}

function readLocalCachedNews(topic: RussiaNewsTopic): RussiaNewsItem[] {
  if (typeof window === 'undefined') return []
  const key = buildLocalCacheKey(topic)
  const raw = window.localStorage.getItem(key)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as { savedAt?: number; items?: RussiaNewsItem[] }
    if (!parsed?.savedAt || !Array.isArray(parsed?.items)) return []
    if (Date.now() - parsed.savedAt > LOCAL_CACHE_TTL_MS) {
      window.localStorage.removeItem(key)
      return []
    }
    const recentItems = keepLastWeek(parsed.items)
    if (recentItems.length === 0) {
      window.localStorage.removeItem(key)
      return []
    }
    return recentItems
  } catch {
    window.localStorage.removeItem(key)
    return []
  }
}

function writeLocalCachedNews(topic: RussiaNewsTopic, items: RussiaNewsItem[]): void {
  if (typeof window === 'undefined' || items.length === 0) return
  const recentItems = keepLastWeek(items)
  if (recentItems.length === 0) return
  window.localStorage.setItem(
    buildLocalCacheKey(topic),
    JSON.stringify({ savedAt: Date.now(), items: recentItems })
  )
}

// 링크 기준 중복 제거 (같은 기사가 다른 ID로 저장된 경우 처리)
function getNewsMergeKey(item: RussiaNewsItem): string {
  return item.link?.trim() || `${item.id}|${item.published_at}`
}

function mergeUnique(prev: RussiaNewsItem[], next: RussiaNewsItem[]): RussiaNewsItem[] {
  const map = new Map<string, RussiaNewsItem>()
  for (const item of prev) map.set(getNewsMergeKey(item), item)
  // next의 항목이 summary가 있으면 prev보다 우선 적용
  for (const item of next) {
    const key = getNewsMergeKey(item)
    const existing = map.get(key)
    if (!existing || (!existing.summary && item.summary)) {
      map.set(key, item)
    }
  }
  return keepLastWeek(Array.from(map.values()))
}

export function RussiaNewsInfinitePage() {
  const [topic, setTopic] = useState<RussiaNewsTopic>('')
  const [items, setItems] = useState<RussiaNewsItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const lockRef = useRef(false)
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

  const fetchInitial = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    setHasMore(true)

    try {
      // 1순위: external archive (한국어 요약 포함)
      const extUrl = new URL('/api/russia-news/external', window.location.origin)
      extUrl.searchParams.set('limit', String(PAGE_SIZE))
      if (topic) extUrl.searchParams.set('topic', topic)

      const extResponse = await fetch(extUrl.toString())
      const extData = extResponse.ok ? await extResponse.json() : null
      const extItems: RussiaNewsItem[] = Array.isArray(extData?.items) ? extData.items : []

      // 2순위: 아카이브 스토어 (과거 데이터 보완)
      const archUrl = new URL('/api/russia-news/archive', window.location.origin)
      archUrl.searchParams.set('limit', String(PAGE_SIZE))
      archUrl.searchParams.set('v', NEWS_CACHE_VERSION)
      if (topic) archUrl.searchParams.set('topic', topic)

      const archResponse = await fetch(archUrl.toString())
      const archData = archResponse.ok ? await archResponse.json() : null
      const archItems: RussiaNewsItem[] = Array.isArray(archData?.items) ? archData.items : []

      // 병합: external 우선 (summary 있는 항목 유지), 중복 제거
      const merged = mergeUnique(archItems, extItems)
      const usableItems = isFallbackPlaceholderItems(merged) ? [] : keepLastWeek(merged)

      if (usableItems.length > 0) {
        setItems(usableItems)
        writeLocalCachedNews(topic, usableItems)
        const nextCursor = usableItems[usableItems.length - 1].published_at
        setCursor(nextCursor)
        setHasMore(true)
      } else {
        const cached = readLocalCachedNews(topic)
        setItems(cached)
        setCursor(cached.length > 0 ? cached[cached.length - 1].published_at : null)
        setHasMore(cached.length > 0)
      }
    } catch (error) {
      const cached = readLocalCachedNews(topic)
      if (cached.length > 0) {
        setItems(cached)
        setCursor(cached[cached.length - 1].published_at)
        setHasMore(true)
        setErrorMessage(null)
      } else {
        setItems([])
        setCursor(null)
        setHasMore(false)
        setErrorMessage(error instanceof Error ? error.message : '뉴스를 불러오지 못했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [topic])

  const fetchMore = useCallback(async () => {
    if (!hasMore || isLoading || lockRef.current) return
    if (!cursor) {
      setHasMore(false)
      return
    }

    lockRef.current = true
    setIsFetchingMore(true)

    try {
      const url = new URL('/api/russia-news/archive', window.location.origin)
      url.searchParams.set('limit', String(PAGE_SIZE))
      url.searchParams.set('v', NEWS_CACHE_VERSION)
      url.searchParams.set('cursor', cursor)
      if (topic) url.searchParams.set('topic', topic)

      const response = await fetch(url.toString())
      const data = await response.json()
      if (!response.ok || data?.error) throw new Error(data?.error || '지난 뉴스를 불러오지 못했습니다.')

      const nextItems = Array.isArray(data?.items) ? (data.items as RussiaNewsItem[]) : []
      if (nextItems.length === 0 || isFallbackPlaceholderItems(nextItems)) {
        setHasMore(false)
        return
      }

      let mergedItems: RussiaNewsItem[] = []
      let hasProgress = false

      setItems((prev) => {
        const merged = mergeUnique(prev, nextItems)
        hasProgress = merged.length > prev.length
        mergedItems = merged
        return merged
      })

      if (!hasProgress) {
        setHasMore(false)
        return
      }

      writeLocalCachedNews(topic, mergedItems)
      const nextCursor = nextItems[nextItems.length - 1].published_at
      if (!nextCursor || nextCursor === cursor) {
        setHasMore(false)
        return
      }

      setCursor(nextCursor)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '지난 뉴스를 불러오지 못했습니다.')
    } finally {
      setIsFetchingMore(false)
      lockRef.current = false
    }
  }, [cursor, hasMore, isLoading, topic])

  useEffect(() => {
    fetchInitial()
  }, [fetchInitial])

  useEffect(() => {
    const target = sentinelRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first?.isIntersecting) {
          fetchMore()
        }
      },
      {
        rootMargin: '260px',
      }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [fetchMore])

  const sectionTitle = useMemo(
    () => (topic ? `${topic} 뉴스 아카이브` : '뉴스 아카이브'),
    [topic]
  )

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <Link href="/today" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          오늘 페이지로
        </Link>

        <button
          type="button"
          onClick={async () => {
            setIsRefreshing(true)
            await fetchInitial()
            setIsRefreshing(false)
          }}
          disabled={isRefreshing}
          aria-label="새로고침"
          title="새로고침"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <section className="space-y-3">
        <h1 className="text-base font-bold">{sectionTitle}</h1>

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

        {isLoading ? (
          <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
            뉴스를 불러오는 중입니다...
          </div>
        ) : errorMessage ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
            뉴스가 없습니다.
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => (
              <RussiaNewsCard key={item.id} item={item} />
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-6 w-full" />

        {!isLoading && isFetchingMore && (
          <div className="text-center text-xs text-muted-foreground">지난 뉴스를 불러오는 중...</div>
        )}

        {!isLoading && !hasMore && items.length > 0 && (
          <div className="text-center text-xs text-muted-foreground">가장 오래된 뉴스까지 모두 확인했습니다.</div>
        )}
      </section>
    </div>
  )
}
