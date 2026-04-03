import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import QRCodePage from './pages/QRCodePage'
import StudentLoginPage from './pages/StudentLoginPage'
import OnboardingPage from './pages/OnboardingPage'
import AvisosPage from './pages/AvisosPage'

export default function App() {
  const [autenticado, setAutenticado] = useState(() => !!localStorage.getItem('jwt'))
  const [aceitePendente, setAceitePendente] = useState(() => {
    return localStorage.getItem('onboarding_concluido') !== '1'
  })

  function handleLogin(token, info, aceiteLgpd) {
    localStorage.setItem('jwt', token)
    localStorage.setItem('userInfo', JSON.stringify(info))
    localStorage.setItem('lgpd_servidor_aceito', aceiteLgpd ? '1' : '0')
    setAutenticado(true)
    setAceitePendente(localStorage.getItem('onboarding_concluido') !== '1')
  }

  function handleAceite() {
    localStorage.setItem('lgpd_aceito', '1')
    localStorage.setItem('onboarding_concluido', '1')
    setAceitePendente(false)
  }

  function handleLogout() {
    localStorage.removeItem('jwt')
    localStorage.removeItem('userInfo')
    localStorage.removeItem('lgpd_servidor_aceito')
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
            <Route path="*" element={<Navigate to="/avisos" replace />} />
          </>
        )}

        {/* Tela de consentimento */}
        {autenticado && aceitePendente && (
          <>
            <Route path="/consente" element={<OnboardingPage onAceite={handleAceite} />} />
            <Route path="*" element={<Navigate to="/consente" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}
