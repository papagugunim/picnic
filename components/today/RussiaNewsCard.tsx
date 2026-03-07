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
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const meridiem = hour >= 12 ? '오후' : '오전'
  const hour12 = hour % 12 || 12
  return `${month}/${day}/${meridiem}${hour12}시`
}

export function getRussiaNewsTopicBadgeClass(topic: string): string {
  if (topic === '정치') return 'bg-rose-100 text-rose-900'
  if (topic === '사회') return 'bg-blue-100 text-blue-900'
  if (topic === '경제') return 'bg-emerald-100 text-emerald-900'
  if (topic === '문화') return 'bg-amber-100 text-amber-900'
  if (topic === '날씨') return 'bg-cyan-100 text-cyan-900'
  return 'bg-zinc-200 text-zinc-900'
}

export function RussiaNewsCard({ item, compact = false }: RussiaNewsCardProps) {
  return (
    <article className="rounded-lg p-2.5 transition-opacity hover:opacity-85">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className={`rounded-full px-2 py-0.5 font-medium ${getRussiaNewsTopicBadgeClass(item.topic)}`}>
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
          <span className="whitespace-nowrap">{formatDateTime(item.published_at)}</span>
          {item.source_kind === 'rss' && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-primary"
            >
              원문
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
