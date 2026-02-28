'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    __PICNIC_POSTHOG_INIT__?: boolean
  }
}

interface PostHogProviderProps {
  children: React.ReactNode
}

export default function PostHogProvider({ children }: PostHogProviderProps) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const enabled = Boolean(key)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !key) return
    if (window.__PICNIC_POSTHOG_INIT__) return

    let cancelled = false
    const timer = window.setTimeout(async () => {
      if (cancelled || window.__PICNIC_POSTHOG_INIT__) return

      try {
        const posthog = (await import('posthog-js')).default
        if (cancelled || window.__PICNIC_POSTHOG_INIT__) return

        posthog.init(key, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
          person_profiles: 'identified_only',
          capture_pageview: 'history_change',
          loaded: (instance) => {
            if (process.env.NODE_ENV === 'development') {
              instance.debug()
            }
          },
        })

        window.__PICNIC_POSTHOG_INIT__ = true
      } catch {
        // analytics init failure should never block page
      }
    }, 1200)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [enabled, key])

  return <>{children}</>
}
