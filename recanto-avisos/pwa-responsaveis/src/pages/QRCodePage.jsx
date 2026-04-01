import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function QRCodePage() {
  const navigate = useNavigate()
  const [manualCode, setManualCode] = useState('')
  const [showManual, setShowManual] = useState(false)

  useEffect(() => {
    // Verifica se chegou via QR Code (parâmetro ?turma=XXX na URL)
    const params = new URLSearchParams(window.location.search)
    const qrToken = params.get('turma')

    if (qrToken) {
      // QR Code detectado! Redireciona para login com o token
      navigate(`/login?turma=${qrToken}`)
    }
  }, [navigate])

  function handleManualSubmit(e) {
    e.preventDefault()
    if (manualCode.trim()) {
      navigate(`/login?turma=${manualCode.trim()}`)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f9fc', padding: '1.5rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'white',
            border: '1px solid #e3e9ee',
            borderRadius: '1rem',
            width: '3rem',
            height: '3rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            marginBottom: '1.5rem'
          }}
        >
          <span className="material-symbols-outlined" style={{ color: '#2d6197', fontSize: '1.5rem' }}>
            arrow_back
          </span>
        </button>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2c3338', marginBottom: '0.5rem' }}>
          Escanear QR Code
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#596065', fontWeight: 500 }}>
          Aponte a câmera para o QR Code fornecido pela escola
        </p>
      </div>

      {/* Card de instruções */}
      <div style={{
        background: 'white',
        borderRadius: '2rem',
        padding: '2rem',
        boxShadow: '0 12px 40px rgba(44, 51, 56, 0.08)',
        border: '1px solid #e3e9ee',
        marginBottom: '2rem',
        textAlign: 'center'
      }}>

        {/* Ícone grande */}
        <div style={{
          width: '8rem',
          height: '8rem',
          borderRadius: '2rem',
          background: 'linear-gradient(135deg, #2d6197, #92c1fe)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          boxShadow: '0 12px 40px rgba(45, 97, 151, 0.25)'
        }}>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '4rem',
              color: 'white',
              fontVariationSettings: "'FILL' 1, 'wght' 300"
            }}
          >
            qr_code_scanner
          </span>
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2c3338', marginBottom: '1rem' }}>
          Como obter o QR Code?
        </h2>

        {/* Lista de passos */}
        <div style={{ textAlign: 'left', marginTop: '1.5rem' }}>
          {[
            { icon: 'school', text: 'Vá até a secretaria da escola' },
            { icon: 'assignment', text: 'Solicite o QR Code da turma do seu filho(a)' },
            { icon: 'qr_code', text: 'Escaneie o QR Code com este aplicativo' },
            { icon: 'check_circle', text: 'Pronto! Você receberá os avisos' }
          ].map((step, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                background: index % 2 === 0 ? '#f7f9fc' : 'transparent',
                borderRadius: '1rem',
                marginBottom: '0.5rem'
              }}
            >
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.75rem',
                background: 'linear-gradient(135deg, #2d6197, #92c1fe)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <span className="material-symbols-outlined" style={{ color: 'white', fontSize: '1.25rem', fontVariationSettings: "'FILL' 1" }}>
                  {step.icon}
                </span>
              </div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#2c3338', flex: 1 }}>
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Opção manual */}
      <div style={{
        background: 'white',
        borderRadius: '2rem',
        padding: '1.5rem',
        border: '1px solid #e3e9ee'
      }}>
        <button
          onClick={() => setShowManual(!showManual)}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            padding: '0.5rem 0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ color: '#2d6197', fontSize: '1.25rem' }}>
              keyboard
            </span>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#2c3338' }}>
              Digitar código manualmente
            </span>
          </div>
          <span className="material-symbols-outlined" style={{ color: '#596065', fontSize: '1.25rem', transform: showManual ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            expand_more
          </span>
        </button>

        {showManual && (
          <form onSubmit={handleManualSubmit} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f0f4f8' }}>
            <label style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#596065',
              marginBottom: '0.75rem'
            }}>
              Código da Turma
            </label>
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ex: 1A_2026, G4B_2026"
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                borderRadius: '1rem',
                border: '1.5px solid rgba(171,179,185,0.5)',
                background: '#f0f4f8',
                color: '#2c3338',
                fontFamily: "'Manrope', system-ui, sans-serif"
              }}
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              style={{
                width: '100%',
                padding: '1rem',
                background: manualCode.trim() ? 'linear-gradient(160deg, #1e558b, #2d6197)' : '#e3e9ee',
                boxShadow: manualCode.trim() ? '0 6px 20px rgba(30, 85, 139, 0.35)' : 'none',
                color: manualCode.trim() ? 'white' : '#abb3b9',
                fontWeight: 700,
                fontSize: '0.875rem',
                borderRadius: '1rem',
                border: 'none',
                cursor: manualCode.trim() ? 'pointer' : 'not-allowed',
                marginTop: '1rem',
                transition: 'all 0.15s'
              }}
            >
              Continuar
            </button>
          </form>
        )}
      </div>

      {/* Info adicional */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        background: '#fff3f0',
        borderRadius: '1rem',
        border: '1px solid rgba(255, 152, 0, 0.2)',
        display: 'flex',
        gap: '0.75rem'
      }}>
        <span className="material-symbols-outlined" style={{ color: '#ff9800', fontSize: '1.25rem', flexShrink: 0 }}>
          info
        </span>
        <p style={{ fontSize: '0.75rem', color: '#596065', fontWeight: 600, lineHeight: 1.5 }}>
          <strong>Atenção:</strong> Cada turma possui um QR Code único. Certifique-se de escanear o código correto da turma do seu filho(a).
        </p>
      </div>

    </div>
  )
}
