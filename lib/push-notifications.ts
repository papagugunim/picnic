/**
 * Web Push 알림 클라이언트 유틸리티
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer as ArrayBuffer
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    return registration
  } catch (err) {
    console.error('[Push] Service Worker 등록 실패:', err)
    return null
  }
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('PushManager' in window)) return null
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[Push] VAPID 공개키가 설정되지 않았습니다.')
    return null
  }

  try {
    const registration = await registerServiceWorker()
    if (!registration) return null

    // 기존 구독 확인
    const existing = await registration.pushManager.getSubscription()
    if (existing) return existing

    // 새 구독 생성
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    return subscription
  } catch (err) {
    console.error('[Push] 구독 실패:', err)
    return null
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false

  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js')
    if (!registration) return false

    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return true

    return await subscription.unsubscribe()
  } catch (err) {
    console.error('[Push] 구독 해제 실패:', err)
    return false
  }
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  return await Notification.requestPermission()
}
