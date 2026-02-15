'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'

import { RussiaNewsCard } from '@/components/today/RussiaNewsCard'
import { normalizeTopic, type RussiaNewsItem, type RussiaNewsTopic } from '@/lib/russia-news'

const TOPICS: Array<{ label: string; value: RussiaNewsTopic }> = [
  { label: '전체', value: '' },
  { label: '사회', value: '사회' },
  { label: '경제', value: '경제' },
  { label: '문화', value: '문화' },
  { label: '날씨', value: '날씨' },
]

function mergeUnique(prev: RussiaNewsItem[], next: RussiaNewsItem[]): RussiaNewsItem[] {
  const map = new Map<string, RussiaNewsItem>()
  for (const item of prev) map.set(item.id, item)
  for (const item of next) map.set(item.id, item)
  return Array.from(map.values())
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

  const fetchInitial = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    setHasMore(true)

    try {
      const url = new URL('/api/russia-news', window.location.origin)
      url.searchParams.set('limit', '20')
      if (topic) url.searchParams.set('topic', topic)

      const response = await fetch(url.toString())
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || '뉴스를 불러오지 못했습니다.')

      const firstItems = Array.isArray(data?.items) ? (data.items as RussiaNewsItem[]) : []
      setItems(firstItems)
      const nextCursor = firstItems.length > 0 ? firstItems[firstItems.length - 1].published_at : null
      setCursor(nextCursor)
      setHasMore(firstItems.length > 0)
    } catch (error) {
      setItems([])
      setCursor(null)
      setHasMore(false)
      setErrorMessage(error instanceof Error ? error.message : '뉴스를 불러오지 못했습니다.')
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
      url.searchParams.set('limit', '20')
      url.searchParams.set('cursor', cursor)
      if (topic) url.searchParams.set('topic', topic)

      const response = await fetch(url.toString())
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || '지난 뉴스를 불러오지 못했습니다.')

      const nextItems = Array.isArray(data?.items) ? (data.items as RussiaNewsItem[]) : []
      if (nextItems.length === 0) {
        setHasMore(false)
        return
      }

      setItems((prev) => mergeUnique(prev, nextItems))
      setCursor(nextItems[nextItems.length - 1].published_at)
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
    () => (topic ? `가장 빠른 ${topic} 뉴스` : '가장 빠른 실시간 뉴스 아카이브'),
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

      <section className="glass-strong rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-2">
          <div>
            <h1 className="text-base font-bold">{sectionTitle}</h1>
            <p className="mt-1 text-xs text-muted-foreground">정치 제외 · 사회/경제/문화/날씨 중심 · 무한 스크롤</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {TOPICS.map((entry) => {
            const active = topic === entry.value
            return (
              <button
                key={entry.value || 'all'}
                type="button"
                onClick={() => setTopic(normalizeTopic(entry.value))}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
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
