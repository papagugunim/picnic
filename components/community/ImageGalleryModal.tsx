'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
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
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const lastPinchDistance = useRef(0)
  const lastTouchCenter = useRef({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const swipeStartX = useRef<number | null>(null)
  const swipeCurrentX = useRef<number | null>(null)
  const isZoomed = scale > 1

  const resetZoom = useCallback(() => {
    setScale(1)
    setTranslate({ x: 0, y: 0 })
  }, [])

  const goToPrevImage = useCallback(() => {
    resetZoom()
    setGalleryIndex(prev => (prev === 0 ? images.length - 1 : prev - 1))
  }, [images.length, resetZoom])

  const goToNextImage = useCallback(() => {
    resetZoom()
    setGalleryIndex(prev => (prev === images.length - 1 ? 0 : prev + 1))
  }, [images.length, resetZoom])

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 핀치 시작
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDistance.current = Math.sqrt(dx * dx + dy * dy)
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      }
    } else if (e.touches.length === 1) {
      if (isZoomed) {
        // 확대 상태에서 드래그
        isDragging.current = true
        dragStart.current = {
          x: e.touches[0].clientX - translate.x,
          y: e.touches[0].clientY - translate.y,
        }
      } else {
        // 스와이프 시작
        swipeStartX.current = e.touches[0].clientX
        swipeCurrentX.current = e.touches[0].clientX
      }
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 핀치 줌
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (lastPinchDistance.current > 0) {
        const newScale = Math.min(Math.max(scale * (distance / lastPinchDistance.current), 1), 4)
        setScale(newScale)
        if (newScale === 1) {
          setTranslate({ x: 0, y: 0 })
        }
      }
      lastPinchDistance.current = distance
    } else if (e.touches.length === 1) {
      if (isZoomed && isDragging.current) {
        // 확대 상태에서 이동
        setTranslate({
          x: e.touches[0].clientX - dragStart.current.x,
          y: e.touches[0].clientY - dragStart.current.y,
        })
      } else if (!isZoomed) {
        swipeCurrentX.current = e.touches[0].clientX
      }
    }
  }

  const onTouchEnd = () => {
    lastPinchDistance.current = 0
    isDragging.current = false

    if (!isZoomed && swipeStartX.current !== null && swipeCurrentX.current !== null) {
      const distance = swipeStartX.current - swipeCurrentX.current
      if (distance > 50) goToNextImage()
      else if (distance < -50) goToPrevImage()
    }
    swipeStartX.current = null
    swipeCurrentX.current = null
  }

  // 더블탭으로 줌 토글
  const lastTap = useRef(0)
  const handleTap = (e: React.TouchEvent) => {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      // 더블탭
      if (isZoomed) {
        resetZoom()
      } else {
        setScale(2.5)
      }
    }
    lastTap.current = now
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevImage()
      if (e.key === 'ArrowRight') goToNextImage()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPrevImage, goToNextImage, onClose])

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
          className="absolute inset-0 flex items-center justify-center overflow-hidden touch-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={(e) => { onTouchEnd(); handleTap(e) }}
        >
          <div
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transition: isDragging.current ? 'none' : 'transform 0.2s ease-out',
              width: '100%',
              height: '100%',
              position: 'relative',
            }}
          >
            <Image
              src={images[galleryIndex]}
              alt={`이미지 ${galleryIndex + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
              quality={85}
              priority
              draggable={false}
            />
          </div>
        </div>

        {/* Bottom indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 z-10">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => { resetZoom(); setGalleryIndex(idx) }}
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
