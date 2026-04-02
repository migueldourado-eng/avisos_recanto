import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'

// Precache todos os assets gerados pelo Vite
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// /api/* → sempre tenta rede primeiro
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
  })
)

// Assets estáticos → cache primeiro
registerRoute(
  ({ request }) =>
    request.destination === 'script'  ||
    request.destination === 'style'   ||
    request.destination === 'image'   ||
    request.destination === 'font',
  new CacheFirst({ cacheName: 'static-assets' })
)

// ── Push notifications (FCM background) ──────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { notification: { title: 'Aviso Escolar', body: event.data.text() } }
  }

  const title   = payload.notification?.title ?? 'Aviso Escolar'
  const body    = payload.notification?.body  ?? ''
  const urgente = payload.data?.urgente === 'true'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:                '/icons/icon-192x192.png',
      badge:               '/icons/icon-96x96.png',
      data:                { url: '/avisos', ...payload.data },
      requireInteraction:  urgente,
      vibrate:             urgente ? [300, 100, 300, 100, 300] : [200],
      tag:                 `aviso-${payload.data?.aviso_id ?? Date.now()}`,
      silent:              false,
      sound:               '/notification.mp3',
    })
  )
})

// Clique na notificação → focar janela ou abrir /avisos
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/avisos'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ('focus' in client) return client.focus()
        }
        return self.clients.openWindow(url)
      })
  )
})
