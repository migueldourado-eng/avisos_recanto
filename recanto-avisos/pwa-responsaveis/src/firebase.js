import { firebaseConfig, vapidKey } from './firebase-config'

let messaging = null

// Só inicializa se o Firebase estiver configurado no .env
const firebaseAtivo = !!firebaseConfig.projectId

if (firebaseAtivo) {
  import('firebase/app').then(({ initializeApp }) => {
    import('firebase/messaging').then(({ getMessaging, onMessage }) => {
      const app = initializeApp(firebaseConfig)
      messaging = getMessaging(app)

      onMessage(messaging, (payload) => {
        const title = payload.notification?.title ?? 'Aviso Escolar'
        const body  = payload.notification?.body  ?? ''
        if (Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/icons/icon-192x192.png' })
        }
      })
    })
  })
}

export async function requestNotificationPermission() {
  if (!firebaseAtivo || !vapidKey || !messaging) return
  if (!('Notification' in window)) return

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  try {
    const { getToken } = await import('firebase/messaging')
    const swRegistration = await navigator.serviceWorker.getRegistration('/')
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swRegistration })

    if (token) {
      const { default: api } = await import('./api/axios')
      await api.post('/auth/register-fcm-token', { fcm_token: token })
    }
  } catch (err) {
    console.warn('FCM token não obtido:', err.message)
  }
}
