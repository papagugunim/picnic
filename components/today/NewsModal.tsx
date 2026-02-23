'use client'

import { memo, useCallback, useEffect, useMemo, useState, type TouchEvent } from 'react'
import { X, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { NewsItem } from './types'

interface NewsModalProps {
  newsList: NewsItem[]
  initialNewsId: string
  canManageNotices: boolean
  onClose: () => void
  onEdit: (news: NewsItem) => void
  onDelete: (newsId: string) => void
}

function NewsModalComponent({
  newsList,
  initialNewsId,
  canManageNotices,
  onClose,
  onEdit,
  onDelete,
}: NewsModalProps) {
  const initialIndex = useMemo(() => {
    const foundIndex = newsList.findIndex((item) => item.id === initialNewsId)
    return foundIndex >= 0 ? foundIndex : 0
  }, [newsList, initialNewsId])

  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

  useEffect(() => {
    if (newsList.length === 0) return
    if (currentIndex < newsList.length) return
    setCurrentIndex(newsList.length - 1)
  }, [currentIndex, newsList.length])

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  const hasMultiple = newsList.length > 1
  const currentNews = newsList[currentIndex]

  const handlePrev = useCallback(() => {
    if (!hasMultiple) return
    setCurrentIndex((prev) => (prev - 1 + newsList.length) % newsList.length)
  }, [hasMultiple, newsList.length])

  const handleNext = useCallback(() => {
    if (!hasMultiple) return
    setCurrentIndex((prev) => (prev + 1) % newsList.length)
  }, [hasMultiple, newsList.length])

  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    setTouchStartX(e.touches[0]?.clientX ?? null)
  }, [])

  const handleTouchEnd = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null || !hasMultiple) return

    const touchEndX = e.changedTouches[0]?.clientX ?? touchStartX
    const deltaX = touchStartX - touchEndX

    if (Math.abs(deltaX) > 40) {
      if (deltaX > 0) {
        handleNext()
      } else {
        handlePrev()
      }
    }

    setTouchStartX(null)
  }, [handleNext, handlePrev, hasMultiple, touchStartX])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrev, onClose])

  if (!currentNews) return null

  const formattedDate = new Date(currentNews.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg h-[min(78dvh,680px)] min-h-[440px] rounded-2xl border border-border/60 bg-background text-foreground shadow-xl flex flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border/60 px-4 py-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">공지 사항 {currentIndex + 1} / {newsList.length}</p>
            <h2 className="text-sm font-semibold truncate">공지 사항 보기</h2>
          </div>
          <div className="flex items-center gap-1">
            {canManageNotices && (
              <>
                <button
                  onClick={() => onEdit(currentNews)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  aria-label="공지 사항 수정"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(currentNews.id)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors text-destructive"
                  aria-label="공지 사항 삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto px-4 py-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <h3 className="text-lg font-bold leading-snug mb-2">{currentNews.title}</h3>
          <p className="text-xs text-muted-foreground mb-4">{formattedDate}</p>
          <p className="whitespace-pre-wrap text-sm leading-6">{currentNews.content}</p>
        </div>

        <div className="border-t border-border/60 px-3 py-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={!hasMultiple}
            className="h-9 w-9 flex items-center justify-center rounded-full border border-border bg-muted/40 disabled:opacity-40"
            aria-label="이전 공지"
          >
            <ChevronLeft className="w-4.5 h-4.5" />
          </button>

          <div className="flex-1 flex justify-center gap-1.5">
            {newsList.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setCurrentIndex(index)}
                className={`h-2.5 rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-5 bg-primary'
                    : 'w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
                aria-label={`공지 사항 ${index + 1} 보기`}
              >
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={!hasMultiple}
            className="h-9 w-9 flex items-center justify-center rounded-full border border-border bg-muted/40 disabled:opacity-40"
            aria-label="다음 공지"
          >
            <ChevronRight className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export const NewsModal = memo(NewsModalComponent)
