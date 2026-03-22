'use client'

import { memo } from 'react'
import { Settings } from 'lucide-react'
import { NewsItem } from './types'

interface NewsAutoSlideProps {
  newsList: NewsItem[]
  onNewsClick: (news: NewsItem) => void
  canManageNotices: boolean
  onManageClick?: () => void
}

function NewsAutoSlideComponent({ newsList, onNewsClick, canManageNotices, onManageClick }: NewsAutoSlideProps) {
  if (newsList.length === 0) {
    return (
      <div className="flex items-center gap-2 py-0.5 px-0.5">
        <span className="text-xs text-muted-foreground flex-1">
          {canManageNotices ? '새 공지 사항을 추가해주세요' : '등록된 공지 사항이 없습니다'}
        </span>
        {canManageNotices && onManageClick && (
          <button
            type="button"
            onClick={onManageClick}
            className="p-1 hover:bg-muted/50 rounded-md transition-colors shrink-0"
            aria-label="공지 관리"
          >
            <Settings className="w-3.5 h-3.5 text-muted-foreground/50" />
          </button>
        )}
      </div>
    )
  }

  // 전광판 텍스트: 모든 공지를 이어붙이고 끝에 여백 추가
  const tickerText = newsList.map(n => n.summary || n.content).join('　　◆　　')
  // 글자 수에 비례한 속도 (글자당 약 0.2초, 최소 12초)
  const duration = Math.max(12, tickerText.length * 0.2)

  return (
    <div className="flex items-center gap-2 py-0.5 px-0.5">
      {/* 전광판 영역 */}
      <button
        onClick={() => onNewsClick(newsList[0])}
        className="flex-1 min-w-0 overflow-hidden text-left cursor-pointer hover:opacity-70 transition-opacity"
        aria-label="공지 사항 보기"
      >
        <span
          className="animate-news-ticker text-xs text-foreground/80"
          style={{ animationDuration: `${duration}s` }}
        >
          {tickerText}
        </span>
      </button>

      {canManageNotices && onManageClick && (
        <button
          type="button"
          onClick={onManageClick}
          className="p-1 hover:bg-muted/50 rounded-md transition-colors shrink-0"
          aria-label="공지 관리"
        >
          <Settings className="w-3.5 h-3.5 text-muted-foreground/50" />
        </button>
      )}
    </div>
  )
}

export const NewsAutoSlide = memo(NewsAutoSlideComponent)
