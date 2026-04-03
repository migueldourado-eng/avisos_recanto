import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function StudentLoginPage({ onLogin }) {
  const navigate = useNavigate()
  const params = new URLSearchParams(window.location.search)
  const qrToken = params.get('turma') || ''

  const [nomeAluno, setNomeAluno] = useState('')
  const [sugestoes, setSugestoes] = useState([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const debounce = useRef(null)

  useEffect(() => {
    if (!qrToken) {
      navigate('/qrcode', { replace: true })
    }
  }, [navigate, qrToken])

  function handleNomeChange(e) {
    const value = e.target.value
    setNomeAluno(value)
    setErro('')
    clearTimeout(debounce.current)

    if (value.length >= 3 && qrToken) {
      debounce.current = setTimeout(async () => {
        try {
          const { data } = await api.get('/auth/sugestoes', {
            params: { turma: qrToken, nome: value }
          })
          setSugestoes(data)
        } catch {
          setSugestoes([])
        }
      }, 350)
    } else {
      setSugestoes([])
    }
  }

  function selecionarSugestao(nome) {
    setNomeAluno(nome)
    setSugestoes([])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!qrToken || !nomeAluno.trim()) {
      setErro('Informe o nome completo do aluno para continuar.')
      return
    }

    setLoading(true)
    setErro('')
    setSugestoes([])

    try {
      const { data } = await api.post('/auth/login-turma', {
        qr_token: qrToken,
        nome_aluno: nomeAluno.trim()
      })

      onLogin(
        data.token,
        {
          aluno_nome: data.aluno_nome,
          turma_nome: data.turma_nome,
          turma_codigo: data.turma_codigo
        },
        data.aceite_lgpd
      )
    } catch (err) {
      const msg = err.response?.data?.error
      const sugs = err.response?.data?.sugestoes

      if (sugs?.length) {
        setSugestoes(sugs)
        setErro('Mais de um aluno encontrado. Selecione o nome correto abaixo.')
      } else {
        setErro(msg || 'Aluno nao encontrado. Verifique o nome informado.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f9fc', padding: '1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/qrcode')}
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

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '5rem',
            height: '5rem',
            borderRadius: '9999px',
            background: 'white',
            boxShadow: '0 12px 40px rgba(45, 97, 151, 0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '2.75rem',
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
            fontSize: '1.625rem',
            fontWeight: 800,
            color: '#2c3338',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em',
            lineHeight: 1.2
          }}>
            Recanto das Margaridas
          </h1>

          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#596065' }}>
            Confirmacao do aluno
          </p>
        </div>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '2rem',
        padding: '2rem 1.75rem',
        boxShadow: '0 12px 40px rgba(44, 51, 56, 0.08)',
        border: '1px solid #e3e9ee'
      }}>
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#596065',
              marginBottom: '0.75rem'
            }}>
              QR Code da turma
            </label>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              background: '#f0f4f8',
              borderRadius: '1rem',
              border: '1.5px solid rgba(171,179,185,0.3)'
            }}>
              <span
                className="material-symbols-outlined"
                style={{
                  color: '#2d6197',
                  fontSize: '1.25rem',
                  fontVariationSettings: "'FILL' 1, 'wght' 400"
                }}
              >
                qr_code_scanner
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#2c3338' }}>
                  {qrToken}
                </p>
                <p style={{ fontSize: '11px', color: '#2d6197', fontWeight: 600 }}>
                  Identificado pelo QR Code
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <label style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#596065',
              marginBottom: '0.75rem'
            }}>
              Nome completo do aluno
            </label>

            <input
              type="text"
              value={nomeAluno}
              onChange={handleNomeChange}
              placeholder="Digite o nome do aluno"
              autoComplete="off"
              autoCorrect="off"
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

            {sugestoes.length > 0 && (
              <ul style={{
                position: 'absolute',
                zIndex: 20,
                width: '100%',
                background: 'white',
                border: '1px solid #e3e9ee',
                borderRadius: '1rem',
                boxShadow: '0 12px 40px rgba(44, 51, 56, 0.12)',
                marginTop: '0.5rem',
                overflow: 'hidden',
                listStyle: 'none',
                padding: 0,
                margin: 0
              }}>
                {sugestoes.map((nome, index) => (
                  <li key={nome}>
                    <button
                      type="button"
                      onClick={() => selecionarSugestao(nome)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '1rem 1.25rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#2c3338',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: index < sugestoes.length - 1 ? '1px solid #f0f4f8' : 'none',
                        cursor: 'pointer',
                        fontFamily: "'Manrope', system-ui, sans-serif"
                      }}
                    >
                      {nome}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {erro && (
            <div style={{
              marginBottom: '1.5rem',
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
                {erro}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1.25rem',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 700,
              borderRadius: '1.25rem',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              minHeight: '60px',
              background: loading ? '#abb3b9' : 'linear-gradient(160deg, #1e558b, #2d6197)',
              boxShadow: loading ? 'none' : '0 8px 28px rgba(30, 85, 139, 0.4)',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontFamily: "'Manrope', system-ui, sans-serif"
            }}
          >
            {loading ? 'Entrando...' : 'Continuar'}
          </button>
        </form>
      </div>

      <div style={{
        marginTop: '2rem',
        textAlign: 'center',
        padding: '1rem'
      }}>
        <p style={{ fontSize: '0.75rem', color: '#abb3b9', fontWeight: 600 }}>
          Em caso de duvida, procure a secretaria da escola.
        </p>
      </div>
    </div>
  )
}
