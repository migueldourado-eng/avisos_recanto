// Preencha com os dados do seu projeto Firebase
// Console Firebase → Configurações do projeto → Seus apps → App Web → Config do SDK
export const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || '',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || '',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || '',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || '',
}

// Chave VAPID: Console Firebase → Cloud Messaging → Web Push Certificates
export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''
