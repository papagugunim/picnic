'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

interface InlineImageCarouselProps {
  images: string[]
  onImageClick?: (index: number, event: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
  maxHeightClassName?: string
  stopPropagation?: boolean
}

export function InlineImageCarousel({
  images,
  onImageClick,
  className,
  maxHeightClassName = 'max-h-[520px]',
  stopPropagation = false,
}: InlineImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchEndX, setTouchEndX] = useState<number | null>(null)

  const imageCount = images.length
  const hasMultiple = imageCount > 1
  const imageKey = useMemo(() => images.join('|'), [images])

  useEffect(() => {
    setCurrentIndex(0)
  }, [imageKey])

  const goToPrev = useCallback(() => {
    if (!hasMultiple) return
    setCurrentIndex((prev) => (prev === 0 ? imageCount - 1 : prev - 1))
  }, [hasMultiple, imageCount])

  const goToNext = useCallback(() => {
    if (!hasMultiple) return
    setCurrentIndex((prev) => (prev === imageCount - 1 ? 0 : prev + 1))
  }, [hasMultiple, imageCount])

  const stopEvent = (event: React.SyntheticEvent) => {
    if (!stopPropagation) return
    event.preventDefault()
    event.stopPropagation()
  }

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!hasMultiple) return
    setTouchEndX(null)
    setTouchStartX(event.targetTouches[0].clientX)
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!hasMultiple) return
    setTouchEndX(event.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!hasMultiple || touchStartX === null || touchEndX === null) return
    const distance = touchStartX - touchEndX
    const minSwipeDistance = 40
    if (distance > minSwipeDistance) goToNext()
    if (distance < -minSwipeDistance) goToPrev()
  }

  if (imageCount === 0) return null

  return (
    <div
      className={cn('relative rounded-2xl overflow-hidden border border-border bg-muted/40', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            className="relative min-w-full bg-muted"
            onClick={(event) => {
              stopEvent(event)
              onImageClick?.(index, event)
            }}
          >
            <img
              src={image}
              alt={`이미지 ${index + 1}`}
              loading="lazy"
              className={cn('block w-full h-auto object-contain select-none', maxHeightClassName)}
              draggable={false}
            />
          </button>
        ))}
      </div>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={(event) => {
              stopEvent(event)
              goToPrev()
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label="이전 이미지"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              stopEvent(event)
              goToNext()
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label="다음 이미지"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/35">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={(event) => {
                  stopEvent(event)
                  setCurrentIndex(index)
                }}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors',
                  index === currentIndex ? 'bg-white' : 'bg-white/55'
                )}
                aria-label={`이미지 ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
