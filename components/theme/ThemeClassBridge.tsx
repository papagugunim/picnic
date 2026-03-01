'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'

export function ThemeClassBridge() {
  const { theme } = useTheme()

  useEffect(() => {
    const root = document.documentElement
    if (!theme) return

    const isDarkLike = theme === 'dark' || theme === 'black'
    root.style.colorScheme = isDarkLike ? 'dark' : 'light'

    if (theme === 'black') {
      root.classList.add('dark')
      return
    }

    if (theme === 'white' || theme === 'light') {
      root.classList.remove('dark')
    }
  }, [theme])

  return null
}
