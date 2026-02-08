'use client'

import { useState, useCallback, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

interface ImageGalleryModalProps {
  images: string[]
  currentIndex: number
  onClose: () => void
}

export function ImageGalleryModal({ images, currentIndex, onClose }: ImageGalleryModalProps) {
  const [galleryIndex, setGalleryIndex] = useState(currentIndex)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const minSwipeDistance = 50

  const goToPrevImage = useCallback(() => {
    setGalleryIndex(prev => (prev === 0 ? images.length - 1 : prev - 1))
  }, [images.length])

  const goToNextImage = useCallback(() => {
    setGalleryIndex(prev => (prev === images.length - 1 ? 0 : prev + 1))
  }, [images.length])

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      goToNextImage()
    }
    if (isRightSwipe) {
      goToPrevImage()
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevImage()
      if (e.key === 'ArrowRight') goToNextImage()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPrevImage, goToNextImage])

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideCloseButton
        className="fixed inset-0 max-w-none w-screen h-screen translate-x-0 translate-y-0 left-0 top-0 bg-black p-0 border-0 rounded-none gap-0"
      >
        <VisuallyHidden>
          <DialogTitle>이미지 갤러리</DialogTitle>
        </VisuallyHidden>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
          <span className="text-white text-sm">
            {galleryIndex + 1} / {images.length}
          </span>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="닫기"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Image area */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <Image
            src={images[galleryIndex]}
            alt={`이미지 ${galleryIndex + 1}`}
            fill
            sizes="100vw"
            className="object-contain"
            quality={85}
            priority
          />
        </div>

        {/* Previous button */}
        {images.length > 1 && (
          <button
            onClick={goToPrevImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
            aria-label="이전 이미지"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}

        {/* Next button */}
        {images.length > 1 && (
          <button
            onClick={goToNextImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
            aria-label="다음 이미지"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        )}

        {/* Bottom indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 z-10">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setGalleryIndex(idx)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === galleryIndex ? 'bg-white' : 'bg-white/50'
                }`}
                aria-label={`이미지 ${idx + 1}번으로 이동`}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
