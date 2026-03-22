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
  // 한글 약 9px, 기타 약 6px 기준으로 픽셀 너비 추정
  const estimatedPx = tickerText.split('').reduce((acc, ch) => {
    return acc + (/[\u3131-\uD79D]/.test(ch) ? 9 : 6)
  }, 0)
  // 글자 수에 비례한 속도 (추정 픽셀 기준, 초당 약 80px)
  const duration = Math.max(10, Math.round(estimatedPx / 80))

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
          style={{
            animationDuration: `${duration}s`,
            ['--ticker-end' as string]: `-${estimatedPx + 40}px`,
          } as React.CSSProperties}
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
