'use client'

import { useState, useRef, useEffect } from 'react'
import { Trash2 } from 'lucide-react'

interface SwipeableChatItemProps {
  children: React.ReactNode
  onDelete: () => void
}

export function SwipeableChatItem({ children, onDelete }: SwipeableChatItemProps) {
  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)
  const currentX = useRef(0)
  const itemRef = useRef<HTMLDivElement>(null)

  const DELETE_BUTTON_WIDTH = 80

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return

    currentX.current = e.touches[0].clientX
    const diff = startX.current - currentX.current

    // 오른쪽에서 왼쪽으로만 스와이프 가능 (diff > 0)
    // 최대 DELETE_BUTTON_WIDTH까지만 이동
    if (diff > 0) {
      setOffset(Math.min(diff, DELETE_BUTTON_WIDTH))
    } else {
      setOffset(0)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)

    // 절반 이상 스와이프하면 삭제 버튼 표시, 아니면 원위치
    if (offset > DELETE_BUTTON_WIDTH / 2) {
      setOffset(DELETE_BUTTON_WIDTH)
    } else {
      setOffset(0)
    }
  }

  const handleDelete = () => {
    onDelete()
  }

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
        setOffset(0)
      }
    }

    if (offset > 0) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [offset])

  return (
    <div ref={itemRef} className="relative">
      {/* 스와이프 가능한 아이템 */}
      <div
        className="relative bg-background"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(-${offset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>

      {/* 삭제 버튼 (뒤에 숨겨진 상태) */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-destructive text-destructive-foreground"
        style={{
          width: `${DELETE_BUTTON_WIDTH}px`,
          transform: `translateX(${DELETE_BUTTON_WIDTH - offset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        <button
          onClick={handleDelete}
          className="h-full w-full flex flex-col items-center justify-center gap-1 hover:bg-destructive/90 transition-colors"
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-xs font-medium">삭제</span>
        </button>
      </div>
    </div>
  )
}