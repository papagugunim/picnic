'use client'

import { memo, useEffect, useState, useCallback } from 'react'
import { NewsItem } from './types'

interface NewsAutoSlideProps {
  newsList: NewsItem[]
  onNewsClick: (news: NewsItem) => void
  canManageNotices: boolean
}

// 뉴스 자동 슬라이드 컴포넌트 - 3초마다 리렌더링되므로 별도 분리
function NewsAutoSlideComponent({ newsList, onNewsClick, canManageNotices }: NewsAutoSlideProps) {
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0)

  // 3초마다 뉴스 자동 슬라이드
  useEffect(() => {
    if (newsList.length <= 1) return

    const newsInterval = setInterval(() => {
      setCurrentNewsIndex(prev => (prev + 1) % newsList.length)
    }, 3000)

    return () => clearInterval(newsInterval)
  }, [newsList.length])

  // 인디케이터 클릭 핸들러
  const handleIndicatorClick = useCallback((index: number) => {
    setCurrentNewsIndex(index)
  }, [])

  // 뉴스 클릭 핸들러
  const handleNewsClick = useCallback((news: NewsItem) => {
    onNewsClick(news)
  }, [onNewsClick])

  if (newsList.length === 0) {
    return (
      <div className="h-[112px] flex items-center justify-center rounded-lg bg-muted/20">
        <p className="text-sm text-muted-foreground">
          {canManageNotices ? '새 공지 사항을 추가해주세요' : '등록된 공지 사항이 없습니다'}
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* 뉴스 카드 - 페이드 애니메이션, 높이 고정 */}
      <div className="relative h-[88px]">
        {newsList.map((news, index) => (
          <button
            key={news.id}
            onClick={() => handleNewsClick(news)}
            className={`absolute inset-0 w-full h-full text-left p-3 rounded-lg hover:bg-muted/50 cursor-pointer
              transition-opacity duration-500 ease-in-out
              ${index === currentNewsIndex
                ? 'opacity-100 z-10'
                : 'opacity-0 z-0 pointer-events-none'
              }`}
          >
            <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
              {news.summary || news.content}
            </p>
          </button>
        ))}
      </div>

      {/* 인디케이터 */}
      {newsList.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {newsList.map((_, index) => (
            <button
              key={index}
              onClick={() => handleIndicatorClick(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentNewsIndex
                  ? 'bg-primary scale-110'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              aria-label={`공지 사항 ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// memo로 불필요한 리렌더링 방지
export const NewsAutoSlide = memo(NewsAutoSlideComponent)
