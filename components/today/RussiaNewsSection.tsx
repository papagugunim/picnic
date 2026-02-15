'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, RefreshCw } from 'lucide-react'

import { RussiaNewsCard } from '@/components/today/RussiaNewsCard'
import { normalizeTopic, type RussiaNewsItem, type RussiaNewsTopic } from '@/lib/russia-news'

const TOPICS: Array<{ label: string; value: RussiaNewsTopic }> = [
  { label: '전체', value: '' },
  { label: '사회', value: '사회' },
  { label: '경제', value: '경제' },
  { label: '문화', value: '문화' },
]

function formatDateTime(value: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const meridiem = hour >= 12 ? '오후' : '오전'
  const hour12 = hour % 12 || 12
  return `${month}/${day}/${meridiem}${hour12}시`
}

export function RussiaNewsSection() {
  const [topic, setTopic] = useState<RussiaNewsTopic>('')
  const [items, setItems] = useState<RussiaNewsItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchNews = useCallback(
    async (isManualRefresh: boolean) => {
      if (isManualRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setErrorMessage(null)

      try {
        const url = new URL('/api/russia-news', window.location.origin)
        url.searchParams.set('limit', '8')
        if (topic) url.searchParams.set('topic', topic)

        const response = await fetch(url.toString(), { method: 'GET' })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data?.error || '뉴스를 불러오지 못했습니다.')
        }

        const nextItems = Array.isArray(data?.items) ? (data.items as RussiaNewsItem[]) : []
        setItems(nextItems.slice(0, 8))
      } catch (error) {
        setItems([])
        setErrorMessage(error instanceof Error ? error.message : '뉴스를 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [topic]
  )

  useEffect(() => {
    fetchNews(false)
  }, [fetchNews])

  const latestPublishedAt = useMemo(() => {
    if (items.length === 0) return null
    return items[0]?.published_at || null
  }, [items])

  return (
    <section className="glass-strong rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">가장 빠른 실시간 뉴스</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            사회·경제·문화 중심, 3시간 단위 업데이트
          </p>
          {latestPublishedAt && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              최신 업데이트: {formatDateTime(latestPublishedAt)}
            </p>
          )}
        </div>

        <button
          onClick={() => fetchNews(true)}
          disabled={isRefreshing}
          aria-label="새로고침"
          title="새로고침"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
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
          표시할 뉴스가 없습니다.
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <RussiaNewsCard key={item.id} item={item} compact />
          ))}
        </div>
      )}

      <div className="flex items-center pt-1">
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
