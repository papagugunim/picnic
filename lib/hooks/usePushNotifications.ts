'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  subscribeToPush,
  unsubscribeFromPush,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
} from '@/lib/push-notifications'

type PushStatus = 'unsupported' | 'denied' | 'default' | 'subscribed' | 'loading'

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>('loading')

  useEffect(() => {
    if (!('Notification' in window) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }

    async function checkStatus() {
      const permission = await getNotificationPermission()
      if (permission === 'denied') {
        setStatus('denied')
        return
      }

      const registration = await registerServiceWorker()
      if (!registration) {
        setStatus('default')
        return
      }

      const existing = await registration.pushManager.getSubscription()
      setStatus(existing ? 'subscribed' : (permission === 'granted' ? 'default' : 'default'))
    }

    void checkStatus()
  }, [])

  const subscribe = useCallback(async () => {
    setStatus('loading')

    const permission = await requestNotificationPermission()
    if (permission !== 'granted') {
      setStatus('denied')
      return false
    }

    const subscription = await subscribeToPush()
    if (!subscription) {
      setStatus('default')
      return false
    }

    // 서버에 구독 정보 저장
    try {
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })

      if (res.ok) {
        setStatus('subscribed')
        return true
      }
    } catch {
      // ignore
    }

    setStatus('default')
    return false
  }, [])

  const unsubscribe = useCallback(async () => {
    setStatus('loading')

    await fetch('/api/push/subscribe', { method: 'DELETE' })
    await unsubscribeFromPush()
    setStatus('default')
  }, [])

  return { status, subscribe, unsubscribe }
}
