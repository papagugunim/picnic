// Picnic Service Worker - Web Push Notifications

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: '피크닉', body: event.data.text(), url: '/' }
  }

  const { title = '피크닉', body = '새 알림이 있어요.', url = '/', icon, badge } = payload

  const options = {
    body,
    icon: icon || '/android-chrome-192x192.png',
    badge: badge || '/favicon-32x32.png',
    data: { url },
    vibrate: [100, 50, 100],
    requireInteraction: false,
    tag: url, // 같은 url 알림은 덮어쓰기
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열린 탭이 있으면 포커스
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // 없으면 새 탭
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})
