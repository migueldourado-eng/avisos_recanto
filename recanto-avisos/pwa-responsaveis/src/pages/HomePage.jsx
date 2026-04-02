import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const navigate = useNavigate()
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Verifica se chegou via QR Code (parâmetro ?turma=XXX na URL)
    const params = new URLSearchParams(window.location.search)
    const qrToken = params.get('turma')

    if (qrToken) {
      // QR Code detectado! Redireciona para login com o token
      navigate(`/login?turma=${qrToken}`)
      return
    }

    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [navigate])

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    await installPrompt.userChoice
    setShowBanner(false)
    setInstallPrompt(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f9fc', display: 'flex', flexDirection: 'column' }}>

      {/* Banner de instalação */}
      {showBanner && (
        <div style={{
          margin: '1rem 1.25rem 0',
          background: 'linear-gradient(135deg, #2d6197, #92c1fe)',
          borderRadius: '2rem',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 8px 30px rgba(45, 97, 151, 0.25)'
        }}>
          <div style={{
            width: '2.75rem',
            height: '2.75rem',
            borderRadius: '1rem',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <span className="material-symbols-outlined" style={{ color: 'white', fontSize: '1.5rem', fontVariationSettings: "'FILL' 1" }}>
              install_mobile
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: 'white', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
              Adicione à tela inicial
            </p>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem', fontWeight: 500 }}>
              Receba avisos importantes em tempo real
            </p>
          </div>
          <button
            onClick={handleInstall}
            style={{
              background: 'white',
              color: '#2d6197',
              fontWeight: 700,
              fontSize: '0.875rem',
              padding: '0.75rem 1.25rem',
              borderRadius: '1rem',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
              minHeight: '44px'
            }}
          >
            Instalar
          </button>
        </div>
      )}

      {/* Conteúdo principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem 1.5rem' }}>

        {/* Logo e branding */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            width: '6rem',
            height: '6rem',
            borderRadius: '9999px',
            background: 'white',
            boxShadow: '0 12px 40px rgba(45, 97, 151, 0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '3.5rem',
                color: '#2d6197',
                fontVariationSettings: "'FILL' 1, 'wght' 300, 'opsz' 48"
              }}
            >
              school
            </span>
          </div>

          <p style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08rem',
            color: '#596065',
            marginBottom: '0.5rem'
          }}>
            Escola Municipal
          </p>

          <h1 style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: '#2c3338',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em',
            lineHeight: 1.2
          }}>
            Recanto das Margaridas
          </h1>

          <p style={{ fontSize: '1rem', fontWeight: 500, color: '#596065', marginTop: '0.75rem' }}>
            Portal de Avisos Escolares
          </p>
        </div>

        {/* Card de boas-vindas */}
        <div style={{
          background: 'white',
          borderRadius: '2rem',
          padding: '2rem 1.75rem',
          boxShadow: '0 12px 40px rgba(44, 51, 56, 0.08)',
          border: '1px solid #e3e9ee',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '1rem',
              background: 'linear-gradient(135deg, #2d6197, #92c1fe)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <span className="material-symbols-outlined" style={{ color: 'white', fontSize: '1.5rem', fontVariationSettings: "'FILL' 1" }}>
                notifications_active
              </span>
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#2c3338', marginBottom: '0.5rem' }}>
                Receba Avisos Importantes
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#596065', fontWeight: 500, lineHeight: 1.5 }}>
                Aulas suspensas, reuniões, eventos e informações sobre seu filho(a) direto no celular
              </p>
            </div>
          </div>

          <div style={{
            background: '#f0f4f8',
            borderRadius: '1rem',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <span className="material-symbols-outlined" style={{ color: '#2d6197', fontSize: '1.25rem' }}>
              info
            </span>
            <p style={{ fontSize: '0.75rem', color: '#596065', fontWeight: 600, flex: 1 }}>
              Para começar, você precisará do <strong>QR Code da turma</strong> fornecido pela secretaria
            </p>
          </div>
        </div>

        {/* Botões de ação */}
        <button
          onClick={() => navigate('/qrcode')}
          style={{
            width: '100%',
            padding: '1.25rem',
            background: 'linear-gradient(160deg, #1e558b, #2d6197)',
            boxShadow: '0 8px 28px rgba(30, 85, 139, 0.4)',
            color: 'white',
            fontWeight: 700,
            fontSize: '1rem',
            borderRadius: '1.25rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
            transition: 'transform 0.15s',
            minHeight: '60px'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', fontVariationSettings: "'FILL' 1" }}>
            qr_code_scanner
          </span>
          <span>Escanear QR Code</span>
        </button>

        <button
          onClick={() => navigate('/login')}
          style={{
            width: '100%',
            padding: '1.25rem',
            background: 'transparent',
            border: '2px solid #2d6197',
            color: '#2d6197',
            fontWeight: 700,
            fontSize: '0.875rem',
            borderRadius: '1.25rem',
            cursor: 'pointer',
            transition: 'all 0.15s',
            minHeight: '56px'
          }}
        >
          Já tenho cadastro? Entrar
        </button>
      </div>

      {/* Footer */}
      <div style={{
        padding: '1.5rem',
        textAlign: 'center',
        borderTop: '1px solid #e3e9ee',
        background: 'white'
      }}>
        <p style={{ fontSize: '0.75rem', color: '#abb3b9', fontWeight: 600 }}>
          Dúvidas? Entre em contato com a secretaria
        </p>
      </div>

    </div>
  )
}
