'use client'

import { useEffect, useState } from 'react'

export function usePageVisibility(defaultVisible: boolean = true) {
  const [isPageVisible, setIsPageVisible] = useState<boolean>(() => {
    if (typeof document === 'undefined') return defaultVisible
    return !document.hidden
  })

  useEffect(() => {
    if (typeof document === 'undefined') return

    const syncVisibility = () => {
      setIsPageVisible(!document.hidden)
    }

    syncVisibility()
    document.addEventListener('visibilitychange', syncVisibility)

    return () => {
      document.removeEventListener('visibilitychange', syncVisibility)
    }
  }, [])

  return isPageVisible
}
