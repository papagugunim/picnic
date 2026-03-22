'use client'

import { ExternalLink } from 'lucide-react'

import type { RussiaNewsItem } from '@/lib/russia-news'

interface RussiaNewsCardProps {
  item: RussiaNewsItem
  compact?: boolean
  onClick?: () => void
}

function formatDateTime(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const meridiem = hour >= 12 ? '오후' : '오전'
  const hour12 = hour % 12 || 12
  return `${month}/${day} ${meridiem}${hour12}:${String(minute).padStart(2, '0')}`
}

export function getRussiaNewsTopicBadgeClass(topic: string): string {
  if (topic === '정치') return 'bg-rose-100 text-rose-900'
  if (topic === '사회') return 'bg-blue-100 text-blue-900'
  if (topic === '경제') return 'bg-emerald-100 text-emerald-900'
  if (topic === '문화') return 'bg-amber-100 text-amber-900'
  if (topic === '날씨') return 'bg-cyan-100 text-cyan-900'
  return 'bg-zinc-200 text-zinc-900'
}

export function RussiaNewsCard({ item, compact = false, onClick }: RussiaNewsCardProps) {
  const dateStr = formatDateTime(item.published_at)

  return (
    <article
      className="py-3 [&:not(:last-child)]:border-b border-border cursor-pointer active:bg-muted/30 transition-colors"
      onClick={onClick}
    >
      {/* 메타 정보: 토픽 · 소스 · 원문링크 · 날짜 */}
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className={`shrink-0 rounded-full px-2 py-0.5 font-medium ${getRussiaNewsTopicBadgeClass(item.topic)}`}>
          {item.topic || '기타'}
        </span>
        {item.source_name && (
          <span className="font-medium text-foreground/70">{item.source_name}</span>
        )}
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-muted-foreground hover:text-primary"
            onClick={(e) => e.stopPropagation()}
            aria-label="원문 보기"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {dateStr && (
          <span className="ml-auto shrink-0 whitespace-nowrap">{dateStr}</span>
        )}
      </div>

      {/* 제목 */}
      <h3 className={`font-semibold text-foreground leading-snug ${compact ? 'line-clamp-2 text-sm' : 'line-clamp-2 text-[14px]'}`}>
        {item.title}
      </h3>

      {/* 요약 본문 */}
      {!compact && item.summary && item.summary !== item.title && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
          {item.summary}
        </p>
      )}
    </article>
  )
}
