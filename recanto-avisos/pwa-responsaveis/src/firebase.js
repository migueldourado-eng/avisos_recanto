import { firebaseConfig, vapidKey } from './firebase-config'

let messaging = null
let messagingInitPromise = null

const firebaseAtivo = !!firebaseConfig.projectId

export function getNotificationPermissionState() {
  if (!firebaseAtivo || !vapidKey) return 'config_missing'
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

async function initMessaging() {
  if (!firebaseAtivo || !vapidKey) return null
  if (messaging) return messaging
  if (messagingInitPromise) return messagingInitPromise

  messagingInitPromise = (async () => {
    const { initializeApp } = await import('firebase/app')
    const mod = await import('firebase/messaging')
    const { getMessaging, onMessage, isSupported } = mod

    if (typeof isSupported === 'function') {
      const supported = await isSupported()
      if (!supported) return null
    }

    const app = initializeApp(firebaseConfig)
    messaging = getMessaging(app)

    onMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? 'Aviso Escolar'
      const body = payload.notification?.body ?? ''
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icons/icon-192x192.png' })
      }
    })

    return messaging
  })().catch((err) => {
    console.warn('Falha ao inicializar FCM:', err?.message || err)
    return null
  })

  return messagingInitPromise
}

if (firebaseAtivo) {
  initMessaging().catch(() => {})
}

export async function requestNotificationPermission() {
  const permissionState = getNotificationPermissionState()
  if (permissionState === 'config_missing') {
    return { status: 'config_missing', tokenRegistered: false }
  }
  if (permissionState === 'unsupported') {
    return { status: 'unsupported', tokenRegistered: false }
  }

  const currentMessaging = await initMessaging()
  if (!currentMessaging) {
    return { status: 'unsupported', tokenRegistered: false }
  }

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission()

  if (permission !== 'granted') {
    return { status: permission, tokenRegistered: false }
  }

  try {
    const { getToken } = await import('firebase/messaging')

    if (!('serviceWorker' in navigator)) {
      return { status: 'granted', tokenRegistered: false }
    }

    let swRegistration = await navigator.serviceWorker.getRegistration('/')
    if (!swRegistration) {
      swRegistration = await navigator.serviceWorker.ready.catch(() => null)
    }
    if (!swRegistration) {
      swRegistration = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none',
      })
    }

    const token = await getToken(currentMessaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    })

    if (token) {
      const { default: api } = await import('./api/axios')
      await api.post('/auth/register-fcm-token', { fcm_token: token })
      return { status: 'granted', tokenRegistered: true }
    }

    return { status: 'granted', tokenRegistered: false }
  } catch (err) {
    console.warn('FCM token não obtido:', err?.message || err)
    return { status: 'granted', tokenRegistered: false, error: err?.message || 'token_unavailable' }
  }
}
