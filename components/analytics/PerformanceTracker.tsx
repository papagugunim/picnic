'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useReportWebVitals } from 'next/web-vitals'

type PendingNav = {
  from: string
  to: string
  startedAt: number
}

declare global {
  interface Window {
    __PICNIC_PENDING_NAV__?: PendingNav
  }
}

function normalizePath(raw: string) {
  try {
    const url = new URL(raw, window.location.origin)
    return url.pathname
  } catch {
    return raw
  }
}

async function captureMetric(event: string, properties: Record<string, unknown>) {
  try {
    const posthog = (await import('posthog-js')).default
    posthog.capture(event, properties)
  } catch {
    // swallow analytics errors
  }
}

export default function PerformanceTracker() {
  const pathname = usePathname()
  const previousPathRef = useRef<string | null>(null)

  useReportWebVitals((metric) => {
    void captureMetric('web_vital', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      pathname: window.location.pathname,
      navigationType: metric.navigationType,
    })
  })

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      const anchor = target.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      if (anchor.target === '_blank') return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return

      const nextPath = normalizePath(anchor.href)
      if (!nextPath.startsWith('/')) return
      if (nextPath === window.location.pathname) return

      window.__PICNIC_PENDING_NAV__ = {
        from: window.location.pathname,
        to: nextPath,
        startedAt: performance.now(),
      }
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  useEffect(() => {
    const previousPath = previousPathRef.current
    previousPathRef.current = pathname

    const pending = window.__PICNIC_PENDING_NAV__
    if (!pending) return
    if (pending.to !== pathname) return

    const routeChangeMs = Math.max(0, performance.now() - pending.startedAt)

    void captureMetric('route_transition', {
      from: pending.from,
      to: pending.to,
      routeChangeMs: Number(routeChangeMs.toFixed(2)),
      previousPath,
    })

    window.__PICNIC_PENDING_NAV__ = undefined
  }, [pathname])

  return null
}
