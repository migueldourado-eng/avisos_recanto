import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode'

export default function QRCodePage() {
  const navigate = useNavigate()
  const params = new URLSearchParams(window.location.search)
  const modoAdicionar = params.get('modo') === 'adicionar'
  const jwt = localStorage.getItem('jwt')

  const [manualCode, setManualCode] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [adicionando, setAdicionando] = useState(false)
  const [nomeFilho, setNomeFilho] = useState('')
  const [turmaToken, setTurmaToken] = useState('')
  const scannerRef = useRef(null)
  const qrScannerRef = useRef(null)
  const redirectingRef = useRef(false)

  useEffect(() => {
    // Verifica se chegou via QR Code (parâmetro ?turma=XXX na URL)
    const urlParams = new URLSearchParams(window.location.search)
    const qrToken = urlParams.get('turma')

    if (qrToken) {
      if (modoAdicionar && jwt) {
        // Modo adicionar filho: mostra formulário com turma pré-preenchida
        setTurmaToken(qrToken)
        setAdicionando(true)
        return
      }
      // QR Code detectado! Redireciona para login com o token
      navigate(`/login?turma=${qrToken}`)
      return
    }

    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    setIsMobile(mobile)

    // No celular, tenta abrir a câmera direto. No PC, mantém a interface da biblioteca.
    if (!qrScannerRef.current && scannerRef.current) {
      try {
        const handleDecodedText = async (decodedText) => {
          if (redirectingRef.current) return
          redirectingRef.current = true
          setScanning(false)

          let token = decodedText
          try {
            const url = new URL(decodedText)
            const paramToken = url.searchParams.get('turma')
            if (paramToken) token = paramToken
          } catch {}

          try {
            if (mobile && qrScannerRef.current?.stop) {
              await qrScannerRef.current.stop()
            }
            await qrScannerRef.current?.clear?.()
          } catch {}

          if (modoAdicionar && jwt) {
            setTurmaToken(token)
            setAdicionando(true)
            redirectingRef.current = false
          } else {
            window.location.assign(`/login?turma=${encodeURIComponent(token)}`)
          }
        }

        if (mobile) {
          const scanner = new Html5Qrcode('qr-reader')
          qrScannerRef.current = scanner

          scanner.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            handleDecodedText,
            () => {}
          ).then(() => {
            setScanning(true)
            setError('')
          }).catch((err) => {
            console.error('Erro ao iniciar scanner:', err)
            setError('Não foi possível abrir a câmera. Abra a câmera do celular, leia o QR Code da turma e depois toque no link exibido. Se preferir, digite o código manualmente abaixo.')
            setScanning(false)
            setShowManual(true)
          })
        } else {
          const scanner = new Html5QrcodeScanner(
            'qr-reader',
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
              rememberLastUsedCamera: true,
              showTorchButtonIfSupported: true,
            },
            false
          )

          scanner.render(
            handleDecodedText,
            () => {}
          )

          qrScannerRef.current = scanner
          setScanning(true)
          setError('')
        }
      } catch (err) {
        console.error('Erro ao iniciar scanner:', err)
        setError(
          mobile
            ? 'Não foi possível abrir a câmera. Abra a câmera do celular, leia o QR Code da turma e depois toque no link exibido. Se preferir, digite o código manualmente abaixo.'
            : 'Não foi possível iniciar o leitor. Você pode usar a biblioteca abaixo ou digitar o código manualmente.'
        )
        setScanning(false)
        setShowManual(true)
      }
    }

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop?.().catch?.(() => {})
        qrScannerRef.current.clear?.().catch?.(() => {})
        qrScannerRef.current = null
      }
    }
  }, [navigate])

  async function handleAdicionarFilho(e) {
    e.preventDefault()
    if (!nomeFilho.trim() || !turmaToken) return
    setError('')
    try {
      const { default: api } = await import('../api/axios')
      const { data } = await api.post('/auth/adicionar-filho', {
        qr_token: turmaToken,
        nome_aluno: nomeFilho.trim(),
      })
      // Atualiza filhos no userInfo
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
      userInfo.filhos = data.filhos
      localStorage.setItem('userInfo', JSON.stringify(userInfo))
      alert(`✓ ${data.aluno_nome} adicionado com sucesso!`)
      window.location.href = '/avisos'
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao adicionar filho. Tente novamente.')
    }
  }

  function handleManualSubmit(e) {
    e.preventDefault()
    if (manualCode.trim()) {
      if (modoAdicionar && jwt) {
        setTurmaToken(manualCode.trim())
        setAdicionando(true)
      } else {
        navigate(`/login?turma=${manualCode.trim()}`)
      }
    }
  }

  // Tela de formulário para adicionar filho após QR lido
  if (adicionando) {
    return (
      <div style={{ minHeight: '100vh', background: '#f7f9fc', padding: '1.5rem' }}>
        <button
          onClick={() => { setAdicionando(false); setNomeFilho(''); setError('') }}
          style={{ background: 'white', border: '1px solid #e3e9ee', borderRadius: '1rem', width: '3rem', height: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: '1.5rem' }}
        >
          <span className="material-symbols-outlined" style={{ color: '#2d6197', fontSize: '1.5rem' }}>arrow_back</span>
        </button>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2c3338', marginBottom: '0.5rem' }}>
          Adicionar filho
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#596065', fontWeight: 500, marginBottom: '2rem' }}>
          QR Code lido com sucesso! Informe o nome do aluno para vincular à sua conta.
        </p>

        <div style={{ background: 'white', borderRadius: '2rem', padding: '1.5rem', boxShadow: '0 12px 40px rgba(44,51,56,0.08)', border: '1px solid #e3e9ee' }}>
          <form onSubmit={handleAdicionarFilho}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#596065', marginBottom: '0.75rem' }}>
              Nome completo do aluno
            </label>
            <input
              type="text"
              value={nomeFilho}
              onChange={e => setNomeFilho(e.target.value)}
              placeholder="Digite o nome completo"
              autoComplete="off"
              style={{ width: '100%', padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 500, borderRadius: '1rem', border: '1.5px solid rgba(171,179,185,0.5)', background: '#f0f4f8', color: '#2c3338', fontFamily: "'Manrope', system-ui, sans-serif", marginBottom: '1rem' }}
            />
            {error && (
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#dc2626', marginBottom: '1rem' }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={!nomeFilho.trim()}
              style={{ width: '100%', padding: '1rem', background: nomeFilho.trim() ? 'linear-gradient(160deg,#1e558b,#2d6197)' : '#e3e9ee', color: nomeFilho.trim() ? 'white' : '#abb3b9', fontWeight: 700, fontSize: '0.875rem', borderRadius: '1rem', border: 'none', cursor: nomeFilho.trim() ? 'pointer' : 'not-allowed' }}
            >
              Vincular aluno
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f9fc', padding: '1.5rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => modoAdicionar ? window.history.back() : navigate('/')}
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
          {modoAdicionar ? 'Adicionar filho' : 'Escanear QR Code'}
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#596065', fontWeight: 500 }}>
          {isMobile
            ? (scanning
                ? 'Posicione o QR Code na área de leitura'
                : 'A câmera será aberta automaticamente. Se não funcionar, use as instruções ou a opção manual abaixo.')
            : 'Use a câmera do computador ou envie uma imagem do QR Code pela biblioteca abaixo.'}
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
          style={{ width: '100%', minHeight: '280px' }}
        />

        {isMobile && error && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#f7fbff',
            borderRadius: '1rem',
            border: '1px solid rgba(45, 97, 151, 0.2)'
          }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2d6197', margin: '0 0 0.5rem' }}>
              Como continuar sem a câmera do app
            </p>
            <p style={{ fontSize: '0.8rem', color: '#596065', lineHeight: 1.5, margin: 0 }}>
              Abra a câmera do celular, leia o QR Code da turma e toque no link que aparecer na tela. Se preferir, digite o código da turma manualmente abaixo.
            </p>
          </div>
        )}

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
