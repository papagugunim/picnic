'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseScrollDirectionOptions {
  /** 스크롤 감지 임계값 (px). 이 값 이상 스크롤해야 방향 전환 */
  threshold?: number
  /** 페이지 상단 근처에서는 항상 보이게 할 영역 (px) */
  topOffset?: number
}

/**
 * X.com 스타일 스크롤 방향 감지 훅
 * - 아래로 스크롤: hidden = true (헤더/네비 숨김)
 * - 위로 스크롤: hidden = false (헤더/네비 표시)
 * - 페이지 상단: 항상 표시
 */
export function useScrollDirection({
  threshold = 10,
  topOffset = 50,
}: UseScrollDirectionOptions = {}) {
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  const updateScrollDirection = useCallback(() => {
    const scrollY = window.scrollY

    // 페이지 상단 근처: 항상 표시
    if (scrollY < topOffset) {
      setHidden(false)
      lastScrollY.current = scrollY
      ticking.current = false
      return
    }

    const diff = scrollY - lastScrollY.current

    // 임계값 이상 스크롤했을 때만 방향 전환
    if (Math.abs(diff) < threshold) {
      ticking.current = false
      return
    }

    // 아래로 스크롤: 숨김 / 위로 스크롤: 표시
    setHidden(diff > 0)
    lastScrollY.current = scrollY
    ticking.current = false
  }, [threshold, topOffset])

  useEffect(() => {
    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true
        requestAnimationFrame(updateScrollDirection)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [updateScrollDirection])

  return hidden
}
