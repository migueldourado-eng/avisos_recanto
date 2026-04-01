import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import QRCodePage from './pages/QRCodePage'
import LoginPage from './pages/LoginPage'
import ConsentePage from './pages/ConsentePage'
import AvisosPage from './pages/AvisosPage'

export default function App() {
  const [autenticado, setAutenticado] = useState(() => !!localStorage.getItem('jwt'))
  const [aceitePendente, setAceitePendente] = useState(() => {
    return localStorage.getItem('lgpd_aceito') !== '1'
  })

  function handleLogin(token, info, aceiteLgpd) {
    localStorage.setItem('jwt', token)
    localStorage.setItem('userInfo', JSON.stringify(info))
    setAutenticado(true)
    if (aceiteLgpd) {
      localStorage.setItem('lgpd_aceito', '1')
      setAceitePendente(false)
    } else {
      setAceitePendente(true)
    }
  }

  function handleAceite() {
    localStorage.setItem('lgpd_aceito', '1')
    setAceitePendente(false)
  }

  function handleLogout() {
    localStorage.removeItem('jwt')
    localStorage.removeItem('userInfo')
    setAutenticado(false)
    setAceitePendente(false)
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas */}
        {!autenticado && (
          <>
            <Route path="/" element={<HomePage />} />
            <Route path="/qrcode" element={<QRCodePage />} />
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
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
            <Route path="/consente" element={<ConsentePage onAceite={handleAceite} />} />
            <Route path="*" element={<Navigate to="/consente" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}
