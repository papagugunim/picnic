'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react'

import { getRussiaNewsTopicBadgeClass } from '@/components/today/RussiaNewsCard'
import type { RussiaNewsItem } from '@/lib/russia-news'

function formatDateFull(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const meridiem = hour >= 12 ? '오후' : '오전'
  const hour12 = hour % 12 || 12
  return `${month}/${day} ${meridiem} ${hour12}:${String(minute).padStart(2, '0')}`
}

interface Props {
  items: RussiaNewsItem[]
  initialIndex: number
  onClose: () => void
}

export function RussiaNewsModal({ items, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex)
  const item = items[index]

  const touchStartX = useRef<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1))
  }, [])

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(items.length - 1, i + 1))
  }, [items.length])

  // 키보드 네비게이션
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, goPrev, goNext])

  // 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // 인덱스 바뀔 때 패널 맨 위로 스크롤
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 })
  }, [index])

  if (!item) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      onClick={onClose}
    >
      {/* 백드롭 */}
      <div className="absolute inset-0 bg-black/60" />

      {/* 패널 */}
      <div
        ref={panelRef}
        className="relative z-10 w-full max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-background"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
          touchStartX.current = null
          if (dx > 60) goPrev()
          else if (dx < -60) goNext()
        }}
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-xs text-muted-foreground">
            {index + 1} / {items.length}
          </span>
          <div className="flex items-center gap-2">
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
                aria-label="원문 보기"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
              aria-label="닫기"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="px-4 pb-6">
          {/* 메타 */}
          <div className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={`shrink-0 rounded-full px-2 py-0.5 font-medium ${getRussiaNewsTopicBadgeClass(item.topic)}`}>
              {item.topic || '기타'}
            </span>
            {item.source_name && (
              <span className="font-medium text-foreground/70">{item.source_name}</span>
            )}
            <span className="ml-auto shrink-0 whitespace-nowrap">{formatDateFull(item.published_at)}</span>
          </div>

          {/* 제목 */}
          <h2 className="text-[15px] font-bold leading-snug text-foreground mb-3">
            {item.title}
          </h2>

          {/* 본문 요약 */}
          {item.summary && item.summary !== item.title && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {item.summary}
            </p>
          )}
        </div>

        {/* 이전/다음 네비게이션 */}
        <div className="sticky bottom-0 flex items-center justify-between border-t border-border bg-background px-4 py-3">
          <button
            type="button"
            onClick={goPrev}
            disabled={index === 0}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </button>
          <div className="flex gap-1">
            {items.slice(Math.max(0, index - 2), Math.min(items.length, index + 3)).map((_, i) => {
              const realIdx = Math.max(0, index - 2) + i
              return (
                <button
                  key={realIdx}
                  type="button"
                  onClick={() => setIndex(realIdx)}
                  className={`h-1.5 rounded-full transition-all ${realIdx === index ? 'w-4 bg-primary' : 'w-1.5 bg-border'}`}
                  aria-label={`${realIdx + 1}번째 뉴스`}
                />
              )
            })}
          </div>
          <button
            type="button"
            onClick={goNext}
            disabled={index === items.length - 1}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground disabled:opacity-30"
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
