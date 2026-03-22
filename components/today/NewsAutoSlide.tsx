'use client'

import { memo, useEffect, useState, useCallback } from 'react'
import { Settings } from 'lucide-react'
import { NewsItem } from './types'

interface NewsAutoSlideProps {
  newsList: NewsItem[]
  onNewsClick: (news: NewsItem) => void
  canManageNotices: boolean
  onManageClick?: () => void
}

// 뉴스 자동 슬라이드 컴포넌트 - 3초마다 리렌더링되므로 별도 분리
function NewsAutoSlideComponent({ newsList, onNewsClick, canManageNotices, onManageClick }: NewsAutoSlideProps) {
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0)

  // 3초마다 뉴스 자동 슬라이드
  useEffect(() => {
    if (newsList.length <= 1) return

    const newsInterval = setInterval(() => {
      setCurrentNewsIndex(prev => (prev + 1) % newsList.length)
    }, 3000)

    return () => clearInterval(newsInterval)
  }, [newsList.length])

  const handleIndicatorClick = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentNewsIndex(index)
  }, [])

  const handleNewsClick = useCallback((news: NewsItem) => {
    onNewsClick(news)
  }, [onNewsClick])

  if (newsList.length === 0) {
    return (
      <div className="relative rounded-lg bg-muted/20 p-3 min-h-[72px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 rounded-full shrink-0">공지</span>
          <p className="text-sm text-muted-foreground">
            {canManageNotices ? '새 공지 사항을 추가해주세요' : '등록된 공지 사항이 없습니다'}
          </p>
        </div>
        {canManageNotices && onManageClick && (
          <button
            type="button"
            onClick={onManageClick}
            className="p-1.5 hover:bg-muted/50 rounded-lg transition-colors shrink-0"
            aria-label="공지 관리"
          >
            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative rounded-lg overflow-hidden">
      {/* 슬라이드 카드들 */}
      <div className="relative min-h-[72px]">
        {newsList.map((news, index) => (
          <button
            key={news.id}
            onClick={() => handleNewsClick(news)}
            className={`absolute inset-0 w-full h-full text-left px-3 pt-3 pb-6 hover:bg-muted/30 cursor-pointer
              transition-opacity duration-500 ease-in-out
              ${index === currentNewsIndex
                ? 'opacity-100 z-10'
                : 'opacity-0 z-0 pointer-events-none'
              }`}
          >
            {/* 공지 배지 */}
            <span className="inline-block text-[10px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 rounded-full mr-1.5 align-middle leading-none">
              공지
            </span>
            <span className="text-sm text-muted-foreground align-middle line-clamp-2 leading-relaxed">
              {news.summary || news.content}
            </span>
          </button>
        ))}
      </div>

      {/* 하단 바: 도트 인디케이터 (좌) + 관리 버튼 (우) */}
      <div className="absolute bottom-1.5 inset-x-3 flex items-center justify-between z-20">
        {newsList.length > 1 ? (
          <div className="flex items-center gap-1">
            {newsList.map((_, index) => (
              <button
                key={index}
                onClick={(e) => handleIndicatorClick(index, e)}
                className={`rounded-full transition-all duration-300 ${
                  index === currentNewsIndex
                    ? 'w-3 h-1.5 bg-orange-400 dark:bg-orange-500'
                    : 'w-1.5 h-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40'
                }`}
                aria-label={`공지 사항 ${index + 1}`}
              />
            ))}
          </div>
        ) : (
          <div />
        )}
        {canManageNotices && onManageClick && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onManageClick() }}
            className="p-1 hover:bg-muted/50 rounded-md transition-colors"
            aria-label="공지 관리"
          >
            <Settings className="w-3 h-3 text-muted-foreground/50" />
          </button>
        )}
      </div>
    </div>
  )
}

// memo로 불필요한 리렌더링 방지
export const NewsAutoSlide = memo(NewsAutoSlideComponent)
