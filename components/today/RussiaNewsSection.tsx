'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, RefreshCw } from 'lucide-react'

import { RussiaNewsCard } from '@/components/today/RussiaNewsCard'
import { DEFAULT_RUSSIA_NEWS_BASE_URL, normalizeTopic, type RussiaNewsItem, type RussiaNewsTopic } from '@/lib/russia-news'

const TOPICS: Array<{ label: string; value: RussiaNewsTopic }> = [
  { label: '전체', value: '' },
  { label: '사회', value: '사회' },
  { label: '경제', value: '경제' },
  { label: '문화', value: '문화' },
]

const EXTERNAL_NEWS_URL = process.env.NEXT_PUBLIC_RUSSIA_NEWS_EXTERNAL_URL || DEFAULT_RUSSIA_NEWS_BASE_URL

function formatDateTime(value: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
        setItems(nextItems)
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
          <h2 className="text-sm font-bold">모스크바 실시간 뉴스</h2>
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
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          새로고침
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

      <div className="flex items-center justify-between pt-1">
        <Link
          href="/today/russia-news"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          피크닉에서 전체 보기
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>

        <a
          href={EXTERNAL_NEWS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          뉴스 전용 페이지
        </a>
      </div>
    </section>
  )
}
