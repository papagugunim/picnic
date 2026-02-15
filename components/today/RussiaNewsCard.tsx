'use client'

import { ExternalLink, Eye, MapPin, Radio } from 'lucide-react'

import type { RussiaNewsItem } from '@/lib/russia-news'

interface RussiaNewsCardProps {
  item: RussiaNewsItem
  compact?: boolean
}

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

function topicBadgeClass(topic: string): string {
  if (topic === '사회') return 'bg-blue-500/10 text-blue-600 dark:text-blue-300'
  if (topic === '경제') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
  if (topic === '문화') return 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
  return 'bg-muted text-muted-foreground'
}

export function RussiaNewsCard({ item, compact = false }: RussiaNewsCardProps) {
  return (
    <article className="rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className={`rounded-full px-2 py-0.5 font-medium ${topicBadgeClass(item.topic)}`}>
          {item.topic || '기타'}
        </span>
        <span className="inline-flex items-center gap-1">
          <Radio className="h-3 w-3" />
          {item.source_kind === 'telegram' ? '텔레그램' : 'RSS'}
        </span>
        {item.is_moscow && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            모스크바
          </span>
        )}
      </div>

      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <h3 className={`font-semibold text-foreground hover:text-primary transition-colors ${compact ? 'line-clamp-2 text-sm' : 'line-clamp-2 text-[15px]'}`}>
          {item.title}
        </h3>
      </a>

      {!compact && (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {item.summary}
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
        <span className="line-clamp-1">{item.source_name}</span>
        <div className="flex items-center gap-2">
          {item.views_count !== null && item.views_count !== undefined && (
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {item.views_count.toLocaleString()}
            </span>
          )}
          <span>{formatDateTime(item.published_at)}</span>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-primary"
          >
            원문
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </article>
  )
}
