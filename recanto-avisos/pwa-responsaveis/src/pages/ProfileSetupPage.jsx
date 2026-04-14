import { useState } from 'react'
import api from '../api/axios'

export default function ProfileSetupPage({ onComplete }) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nome.trim()) {
      setErro('Nome é obrigatório.')
      return
    }

    setLoading(true)
    setErro('')

    try {
      await api.patch('/auth/atualizar-perfil', { nome, telefone })
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
      userInfo.responsavel_nome = nome
      localStorage.setItem('userInfo', JSON.stringify(userInfo))
      onComplete()
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar dados.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fb', padding: '1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2c3338', marginBottom: '0.5rem' }}>
          Seus dados
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#596065', fontWeight: 500 }}>
          Ajude-nos a te identificar melhor no app
        </p>
      </div>

      <div style={{ background: 'white', borderRadius: '2rem', padding: '2rem 1.75rem', boxShadow: '0 12px 40px rgba(44,51,56,0.08)', border: '1px solid #e3e9ee' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#596065', marginBottom: '0.75rem' }}>
              Nome completo
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
              style={{ width: '100%', padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 500, borderRadius: '1rem', border: '1.5px solid rgba(171,179,185,0.5)', background: '#f0f4f8', color: '#2c3338', fontFamily: "'Manrope', system-ui, sans-serif" }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#596065', marginBottom: '0.75rem' }}>
              Telefone (opcional)
            </label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(XX) XXXXX-XXXX"
              style={{ width: '100%', padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 500, borderRadius: '1rem', border: '1.5px solid rgba(171,179,185,0.5)', background: '#f0f4f8', color: '#2c3338', fontFamily: "'Manrope', system-ui, sans-serif" }}
            />
          </div>

          {erro && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fff2f2', borderRadius: '1rem', border: '1px solid rgba(220,38,38,0.3)' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#dc2626', margin: 0 }}>
                {erro}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '1.25rem', color: 'white', fontSize: '1rem', fontWeight: 700, borderRadius: '1.25rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: loading ? '#abb3b9' : 'linear-gradient(160deg, #1e558b, #2d6197)', boxShadow: loading ? 'none' : '0 8px 28px rgba(30, 85, 139, 0.4)', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Salvando...' : 'Continuar'}
          </button>
        </form>
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'center', padding: '1rem' }}>
        <p style={{ fontSize: '0.75rem', color: '#abb3b9', fontWeight: 600 }}>
          Esses dados serão usados no app e no painel da escola.
        </p>
      </div>
    </div>
  )
}
