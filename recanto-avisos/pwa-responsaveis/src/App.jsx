import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import QRCodePage from './pages/QRCodePage'
import StudentLoginPage from './pages/StudentLoginPage'
import OnboardingPage from './pages/OnboardingPage'
import ProfileSetupPage from './pages/ProfileSetupPage'
import AvisosPage from './pages/AvisosPage'

export default function App() {
  const [autenticado, setAutenticado] = useState(() => !!localStorage.getItem('jwt'))
  const [aceitePendente, setAceitePendente] = useState(() => {
    return localStorage.getItem('onboarding_concluido') !== '1'
  })
  const [perfilPendente, setPerfilPendente] = useState(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
    // Se o nome ainda está no padrão automático "Responsável de...", precisa preencher
    return autenticado && !aceitePendente && (userInfo.responsavel_nome?.startsWith('Responsável de') || !userInfo.responsavel_nome)
  })
  const [installPrompt, setInstallPrompt] = useState(null)

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
      console.log('[beforeinstallprompt] Evento capturado e armazenado')
    }
    window.addEventListener('beforeinstallprompt', handler)
    console.log('[App] Listener de beforeinstallprompt ativado')
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function handleLogin(token, info, aceiteLgpd) {
    localStorage.setItem('jwt', token)
    localStorage.setItem('userInfo', JSON.stringify(info))
    localStorage.setItem('lgpd_servidor_aceito', aceiteLgpd ? '1' : '0')

    if (aceiteLgpd) {
      localStorage.setItem('onboarding_concluido', '1')
    } else {
      localStorage.removeItem('onboarding_concluido')
      localStorage.removeItem('lgpd_aceito')
    }

    setAutenticado(true)
    setAceitePendente(!aceiteLgpd)
  }

  function handleAceite() {
    localStorage.setItem('lgpd_aceito', '1')
    localStorage.setItem('onboarding_concluido', '1')
    setAceitePendente(false)
  }

  function handlePerfilCompleto() {
    setPerfilPendente(false)
  }

  function handleLogout() {
    localStorage.removeItem('jwt')
    localStorage.removeItem('userInfo')
    localStorage.removeItem('lgpd_servidor_aceito')
    localStorage.removeItem('onboarding_concluido')
    localStorage.removeItem('lgpd_aceito')
    setAutenticado(false)
    setAceitePendente(false)
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas */}
        {!autenticado && (
          <>
            <Route path="/" element={<LandingPage />} />
            <Route path="/qrcode" element={<QRCodePage />} />
            <Route path="/login" element={<StudentLoginPage onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}

        {/* Rotas autenticadas */}
        {autenticado && !aceitePendente && (
          <>
            <Route path="/avisos" element={<AvisosPage onLogout={handleLogout} />} />
            <Route path="/qrcode" element={<QRCodePage />} />
            <Route path="*" element={<Navigate to="/avisos" replace />} />
          </>
        )}

        {/* Tela de consentimento */}
        {autenticado && aceitePendente && (
          <>
            <Route path="/consente" element={<OnboardingPage onAceite={handleAceite} installPrompt={installPrompt} onInstallConsumed={() => setInstallPrompt(null)} />} />
            <Route path="*" element={<Navigate to="/consente" replace />} />
          </>
        )}

        {/* Tela de preenchimento de perfil */}
        {autenticado && !aceitePendente && perfilPendente && (
          <>
            <Route path="/perfil" element={<ProfileSetupPage onComplete={handlePerfilCompleto} />} />
            <Route path="*" element={<Navigate to="/perfil" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}
