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
  console.log('[useScrollDirection] Hook called')

  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    // 초기값 설정
    lastScrollY.current = window.scrollY
    console.log('[useScrollDirection] useEffect running, initial scrollY:', window.scrollY)

    const handleScroll = () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }

      rafId.current = requestAnimationFrame(() => {
        const currentScrollY = window.scrollY
        console.log('[useScrollDirection] Scroll event:', { currentScrollY, lastY: lastScrollY.current })

        // 페이지 상단 근처: 항상 표시
        if (currentScrollY < topOffset) {
          setHidden(false)
          lastScrollY.current = currentScrollY
          return
        }

        const diff = currentScrollY - lastScrollY.current

        // 임계값 이상 스크롤했을 때만 방향 전환
        if (Math.abs(diff) >= threshold) {
          // 아래로 스크롤: 숨김 / 위로 스크롤: 표시
          const shouldHide = diff > 0
          console.log('[useScrollDirection] Direction change:', { diff, shouldHide })
          setHidden(shouldHide)
          lastScrollY.current = currentScrollY
        }
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }
    }
  }, [threshold, topOffset])

  return hidden
}
