'use client'

import { memo, useEffect, useState, useCallback } from 'react'
import { ChevronRight, Settings } from 'lucide-react'
import { NewsItem } from './types'

interface NewsAutoSlideProps {
  newsList: NewsItem[]
  onNewsClick: (news: NewsItem) => void
  canManageNotices: boolean
  onManageClick?: () => void
}

function NewsAutoSlideComponent({ newsList, onNewsClick, canManageNotices, onManageClick }: NewsAutoSlideProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (newsList.length <= 1) return

    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % newsList.length)
        setVisible(true)
      }, 300)
    }, 3500)

    return () => clearInterval(interval)
  }, [newsList.length])

  const handleClick = useCallback(() => {
    if (newsList.length === 0) return
    onNewsClick(newsList[currentIndex])
  }, [newsList, currentIndex, onNewsClick])

  if (newsList.length === 0) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-0.5">
        <span className="shrink-0 text-[10px] font-semibold text-orange-500 bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 rounded-full">
          공지
        </span>
        <span className="text-xs text-muted-foreground">
          {canManageNotices ? '새 공지 사항을 추가해주세요' : '등록된 공지 사항이 없습니다'}
        </span>
        {canManageNotices && onManageClick && (
          <button
            type="button"
            onClick={onManageClick}
            className="ml-auto p-1 hover:bg-muted/50 rounded-md transition-colors shrink-0"
            aria-label="공지 관리"
          >
            <Settings className="w-3.5 h-3.5 text-muted-foreground/50" />
          </button>
        )}
      </div>
    )
  }

  const currentNews = newsList[currentIndex]

  return (
    <div className="flex items-center gap-2 py-1.5 px-0.5">
      <span className="shrink-0 text-[10px] font-semibold text-orange-500 bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 rounded-full">
        공지
      </span>

      <button
        onClick={handleClick}
        className="flex-1 min-w-0 flex items-center gap-1 text-left hover:opacity-70 transition-opacity"
      >
        <span
          className={`text-xs text-foreground/80 truncate transition-opacity duration-300 ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {currentNews.summary || currentNews.content}
        </span>
        <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
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
