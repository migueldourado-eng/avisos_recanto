import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5QrcodeScanner } from 'html5-qrcode'

export default function QRCodePage() {
  const navigate = useNavigate()
  const [manualCode, setManualCode] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const scannerRef = useRef(null)
  const qrScannerRef = useRef(null)

  useEffect(() => {
    // Verifica se chegou via QR Code (parâmetro ?turma=XXX na URL)
    const params = new URLSearchParams(window.location.search)
    const qrToken = params.get('turma')

    if (qrToken) {
      // QR Code detectado! Redireciona para login com o token
      navigate(`/login?turma=${qrToken}`)
      return
    }

    // Inicializa o scanner quando o componente monta
    if (!qrScannerRef.current && scannerRef.current) {
      try {
        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true
          },
          false
        )

        scanner.render(
          (decodedText) => {
            // Sucesso ao escanear
            scanner.clear()

            // Extrair o token do QR Code
            // Pode ser uma URL completa ou apenas o token
            let token = decodedText
            try {
              const url = new URL(decodedText)
              const paramToken = url.searchParams.get('turma')
              if (paramToken) token = paramToken
            } catch {
              // Não é URL, usa o texto direto
            }

            navigate(`/login?turma=${token}`)
          },
          (errorMessage) => {
            // Erro de scanning (normal, acontece toda frame)
            // Não precisa fazer nada aqui
          }
        )

        qrScannerRef.current = scanner
        setScanning(true)
        setError('')
      } catch (err) {
        console.error('Erro ao iniciar scanner:', err)
        setError('Não foi possível acessar a câmera. Verifique as permissões.')
        setScanning(false)
      }
    }

    return () => {
      // Cleanup: para o scanner quando o componente desmonta
      if (qrScannerRef.current) {
        qrScannerRef.current.clear().catch(console.error)
        qrScannerRef.current = null
      }
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
          {scanning ? 'Posicione o QR Code na área de leitura' : 'Aponte a câmera para o QR Code fornecido pela escola'}
        </p>
      </div>

      {/* Scanner de QR Code */}
      <div style={{
        background: 'white',
        borderRadius: '2rem',
        padding: '1.5rem',
        boxShadow: '0 12px 40px rgba(44, 51, 56, 0.08)',
        border: '1px solid #e3e9ee',
        marginBottom: '2rem'
      }}>
        <div
          id="qr-reader"
          ref={scannerRef}
          style={{ width: '100%' }}
        />

        {error && (
          <div style={{
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '1rem',
            background: '#fff2f2',
            borderRadius: '1rem',
            border: '1px solid rgba(220, 38, 38, 0.3)'
          }}>
            <span
              className="material-symbols-outlined"
              style={{
                color: '#dc2626',
                fontSize: '1.25rem',
                flexShrink: 0,
                fontVariationSettings: "'FILL' 1"
              }}
            >
              error
            </span>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#dc2626', lineHeight: 1.4, flex: 1 }}>
              {error}
            </p>
          </div>
        )}
      </div>

      {/* Opção manual */}
      <div style={{
        background: 'white',
        borderRadius: '2rem',
        padding: '1.5rem',
        border: '1px solid #e3e9ee',
        marginBottom: '2rem'
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
        padding: '1rem',
        background: '#f0f7ff',
        borderRadius: '1rem',
        border: '1px solid rgba(45, 97, 151, 0.2)',
        display: 'flex',
        gap: '0.75rem'
      }}>
        <span className="material-symbols-outlined" style={{ color: '#2d6197', fontSize: '1.25rem', flexShrink: 0 }}>
          info
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.75rem', color: '#596065', fontWeight: 600, lineHeight: 1.5, marginBottom: '0.5rem' }}>
            <strong>Não tem o QR Code?</strong>
          </p>
          <p style={{ fontSize: '0.75rem', color: '#596065', fontWeight: 500, lineHeight: 1.5 }}>
            Solicite o QR Code da turma do seu filho(a) na secretaria da escola
          </p>
        </div>
      </div>

    </div>
  )
}
