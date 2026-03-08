'use client'

import { useEffect } from 'react'

interface OAuthAutoRetryProps {
  message?: string
}

const RETRY_MARK_KEY = 'picnic_oauth_auto_retry_at'
const RETRY_COOLDOWN_MS = 60_000

function shouldAutoRetry(message?: string) {
  if (!message) return false
  const normalized = message.toLowerCase()

  return (
    normalized.includes('인증 세션') ||
    normalized.includes('code verifier') ||
    normalized.includes('flow state') ||
    normalized.includes('flow_state')
  )
}

export default function OAuthAutoRetry({ message }: OAuthAutoRetryProps) {
  useEffect(() => {
    if (!shouldAutoRetry(message)) return

    const now = Date.now()
    const lastRetryAt = Number(window.sessionStorage.getItem(RETRY_MARK_KEY) || '0')

    if (now - lastRetryAt < RETRY_COOLDOWN_MS) {
      return
    }

    window.sessionStorage.setItem(RETRY_MARK_KEY, String(now))

    const q = new URLSearchParams({
      next: '/feed',
      origin: window.location.origin,
      retry: '1',
    })

    window.location.replace(`/api/auth/google?${q.toString()}`)
  }, [message])

  return null
}
