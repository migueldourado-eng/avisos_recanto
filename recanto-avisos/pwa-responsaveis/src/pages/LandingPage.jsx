import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const qrToken = params.get('turma')

    if (qrToken) {
      navigate(`/login?turma=${qrToken}`, { replace: true })
    }
  }, [navigate])

  return (
    <div style={{ minHeight: '100vh', background: '#f7f9fc', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem 1.5rem' }}>
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
                qr_code_scanner
              </span>
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#2c3338', marginBottom: '0.5rem' }}>
                Acesso com QR Code da turma
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#596065', fontWeight: 500, lineHeight: 1.5 }}>
                Leia o QR Code entregue pela escola e confirme o nome do aluno para entrar no aplicativo.
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
              O acesso ao aplicativo comeca sempre pela leitura do <strong>QR Code da turma</strong>.
            </p>
          </div>
        </div>

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
            minHeight: '60px'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', fontVariationSettings: "'FILL' 1" }}>
            qr_code_scanner
          </span>
          <span>Ler QR Code</span>
        </button>
      </div>

      <div style={{
        padding: '1.5rem',
        textAlign: 'center',
        borderTop: '1px solid #e3e9ee',
        background: 'white'
      }}>
        <p style={{ fontSize: '0.75rem', color: '#abb3b9', fontWeight: 600 }}>
          Em caso de duvida, procure a secretaria da escola.
        </p>
      </div>
    </div>
  )
}
