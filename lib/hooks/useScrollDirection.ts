'use client'

import { useState, useEffect, useRef } from 'react'

interface UseScrollDirectionOptions {
  /** 스크롤 감지 임계값 (px). 이 값 이상 스크롤해야 방향 전환 */
  threshold?: number
  /** 페이지 상단 근처에서는 항상 보이게 할 영역 (px) */
  topOffset?: number
}

/**
 * 스크롤 방향 감지 훅
 * - 아래로 스크롤: hidden = true (헤더/네비 숨김)
 * - 위로 스크롤: hidden = false (헤더/네비 표시)
 * - 페이지 상단: 항상 표시
 */
export function useScrollDirection({
  threshold = 5,
  topOffset = 100,
}: UseScrollDirectionOptions = {}) {
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    lastScrollY.current = window.scrollY

    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // 페이지 상단 근처: 항상 표시
      if (currentScrollY < topOffset) {
        setHidden(false)
        lastScrollY.current = currentScrollY
        return
      }

      const diff = currentScrollY - lastScrollY.current

      // 임계값 이상 스크롤했을 때만 방향 전환
      if (Math.abs(diff) >= threshold) {
        setHidden(diff > 0)
        lastScrollY.current = currentScrollY
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold, topOffset])

  return hidden
}
