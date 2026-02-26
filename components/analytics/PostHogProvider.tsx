'use client'

import { useEffect, useMemo } from 'react'
import posthog from 'posthog-js'
import { PostHogProvider as PostHogReactProvider } from 'posthog-js/react'

declare global {
  interface Window {
    __PICNIC_POSTHOG_INIT__?: boolean
  }
}

interface PostHogProviderProps {
  children: React.ReactNode
}

export default function PostHogProvider({ children }: PostHogProviderProps) {
  const enabled = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY)

  const client = useMemo(() => {
    if (!enabled || typeof window === 'undefined') return null
    return posthog
  }, [enabled])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !client) return
    if (window.__PICNIC_POSTHOG_INIT__) return

    client.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
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
  }, [client, enabled])

  if (!enabled || !client) {
    return <>{children}</>
  }

  return <PostHogReactProvider client={client}>{children}</PostHogReactProvider>
}

