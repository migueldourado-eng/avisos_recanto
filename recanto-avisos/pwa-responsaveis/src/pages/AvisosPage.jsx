import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../api/axios'
import { requestNotificationPermission } from '../firebase'

function formatarData(dateStr) {
  const date  = new Date(dateStr)
  const agora = new Date()
  const horaMin = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (date.toDateString() === agora.toDateString()) return `Hoje às ${horaMin}`

  const ontem = new Date(agora)
  ontem.setDate(ontem.getDate() - 1)
  if (date.toDateString() === ontem.toDateString()) return `Ontem às ${horaMin}`

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function AvisoCard({ aviso }) {
  if (aviso.urgente) {
    return (
      <div className="bg-[#fff3f2] rounded-[2rem] p-5 shadow-[0_8px_30px_rgba(168,56,54,0.08)]">
        <div className="flex items-start gap-4 mb-3">
          <div
            className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-md"
            style={{ background: 'linear-gradient(135deg, #a83836, #fa746f)', boxShadow: '0 4px 12px rgba(168,56,54,0.25)' }}
          >
            <span
              className="material-symbols-outlined text-white"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}
            >
              warning
            </span>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-error mb-0.5">Urgente</p>
            <h3 className="text-[0.9375rem] font-bold text-on-surface leading-snug">{aviso.titulo}</h3>
          </div>
        </div>
        <p className="text-on-surface-variant text-sm leading-relaxed">{aviso.mensagem}</p>
        <p className="text-[11px] font-bold text-error/70 mt-3">— Equipe Gestora</p>
        <p className="text-outline-variant text-[11px] font-medium mt-0.5">{formatarData(aviso.criado_em)}</p>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-lowest rounded-[2rem] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
      <div className="flex items-start gap-4 mb-3">
        <div
          className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #2d6197, #92c1fe)', boxShadow: '0 4px 12px rgba(45,97,151,0.20)' }}
        >
          <span
            className="material-symbols-outlined text-white"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
          >
            campaign
          </span>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">Aviso</p>
          <h3 className="text-[0.9375rem] font-bold text-on-surface leading-snug">{aviso.titulo}</h3>
        </div>
      </div>
      <p className="text-on-surface-variant text-sm leading-relaxed">{aviso.mensagem}</p>
      <p className="text-[11px] font-bold text-primary/60 mt-3">— Equipe Gestora</p>
      <p className="text-outline-variant text-[11px] font-medium mt-0.5">{formatarData(aviso.criado_em)}</p>
    </div>
  )
}

export default function AvisosPage({ onLogout }) {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')

  const [avisos,     setAvisos]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab,        setTab]        = useState('avisos') // 'avisos' | 'perfil'

  const containerRef = useRef(null)
  const touchStartY  = useRef(0)

  const carregarAvisos = useCallback(async () => {
    try {
      const { data } = await api.get('/avisos')
      setAvisos(data)
      data.filter(a => !a.aberto).forEach(a => {
        api.patch(`/avisos/${a.id}/aberto`).catch(() => {})
      })
    } catch (err) {
      if (err.response?.status === 401) onLogout()
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [onLogout])

  useEffect(() => {
    carregarAvisos()
    requestNotificationPermission().catch(() => {})
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') carregarAvisos()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [carregarAvisos])

  function handleTouchStart(e) { touchStartY.current = e.touches[0].clientY }
  function handleTouchEnd(e) {
    const delta     = e.changedTouches[0].clientY - touchStartY.current
    const scrollTop = containerRef.current?.scrollTop ?? 0
    if (delta > 72 && scrollTop === 0 && !refreshing) { setRefreshing(true); carregarAvisos() }
  }

  const urgentes  = avisos.filter(a =>  a.urgente)
  const normais   = avisos.filter(a => !a.urgente)
  const hasUrgent = urgentes.length > 0

  const iniciais = (userInfo.aluno_nome || 'A')
    .split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  return (
    <div className="min-h-screen bg-surface flex flex-col">

      {/* TopAppBar */}
      <header
        className="fixed top-0 w-full z-50 flex items-center justify-between px-5 bg-surface/80 backdrop-blur-md"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)', paddingBottom: '1rem' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #2d6197, #92c1fe)' }}
          >
            <span
              className="material-symbols-outlined text-white"
              style={{ fontSize: '1.1rem', fontVariationSettings: "'FILL' 1, 'wght' 600, 'opsz' 20" }}
            >
              school
            </span>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface">
            Recanto das Margaridas
          </span>
        </div>
        {hasUrgent && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
            <span className="text-[10px] font-bold text-error uppercase tracking-wide">Urgente</span>
          </div>
        )}
      </header>

      {/* Conteúdo principal */}
      <main
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop:    'calc(env(safe-area-inset-top) + 72px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh */}
        {refreshing && (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-primary font-semibold">
            <span className="material-symbols-outlined text-base animate-spin" style={{ lineHeight: 1 }}>
              progress_activity
            </span>
            Atualizando...
          </div>
        )}

        {/* Aba Avisos */}
        {tab === 'avisos' && (
          <div className="px-5">

            {/* Cabeçalho do perfil */}
            <section className="mb-8">
              <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on-surface-variant/80 mb-0.5">
                {userInfo.turma_codigo ? `Turma ${userInfo.turma_codigo}` : 'Escola Municipal'}
              </h2>
              <h1 className="text-2xl font-extrabold tracking-tight text-on-surface leading-tight">
                {userInfo.aluno_nome || 'Meu Filho'}
              </h1>
              {userInfo.turma_nome && (
                <p className="text-sm font-semibold text-primary mt-0.5">{userInfo.turma_nome}</p>
              )}
            </section>

            {/* Loading */}
            {loading ? (
              <div className="bg-surface-container-lowest rounded-[2.5rem] p-10 flex flex-col items-center text-center shadow-[0_12px_40px_rgba(44,51,56,0.05)]">
                <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-4xl text-outline-variant animate-pulse">
                    notifications
                  </span>
                </div>
                <p className="text-on-surface-variant font-semibold text-sm">Carregando avisos...</p>
              </div>

            ) : avisos.length === 0 ? (
              /* Estado vazio — Status Hero Card */
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container opacity-5 blur-3xl -z-10 rounded-full" />
                <div className="bg-surface-container-lowest rounded-[2.5rem] p-10 flex flex-col items-center text-center shadow-[0_12px_40px_rgba(44,51,56,0.06)]">
                  <div className="mb-5 w-20 h-20 rounded-full bg-[#f0faf4] flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-[#2e7d52]"
                      style={{ fontSize: '3rem', fontVariationSettings: "'FILL' 1, 'wght' 300" }}
                    >
                      check_circle
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-on-surface mb-1.5 tracking-tight">Tudo certo!</h3>
                  <p className="text-on-surface-variant text-sm font-medium">Nenhum aviso no momento</p>
                </div>
              </div>

            ) : (
              /* Lista de avisos */
              <div className="space-y-3">
                {urgentes.length > 0 && (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-error px-1 mb-2">
                      Urgentes
                    </p>
                    {urgentes.map(a => <AvisoCard key={a.id} aviso={a} />)}
                    {normais.length > 0 && (
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant px-1 mt-5 mb-2">
                        Avisos
                      </p>
                    )}
                  </>
                )}
                {normais.map(a => <AvisoCard key={a.id} aviso={a} />)}
              </div>
            )}
          </div>
        )}

        {/* Aba Perfil */}
        {tab === 'perfil' && (
          <div className="px-5">
            <section className="mb-8">
              <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.05rem] text-on-surface-variant/80 mb-0.5">
                Minha Conta
              </h2>
              <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">Perfil</h1>
            </section>

            {/* Card de perfil */}
            <div className="bg-surface-container-lowest rounded-[2.5rem] p-8 shadow-[0_12px_40px_rgba(44,51,56,0.06)] flex flex-col items-center text-center mb-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-5 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #2d6197, #92c1fe)', boxShadow: '0 8px 24px rgba(45,97,151,0.25)' }}
              >
                <span className="text-2xl font-extrabold text-white">{iniciais}</span>
              </div>
              <h2 className="text-xl font-bold text-on-surface tracking-tight">
                {userInfo.aluno_nome || 'Aluno'}
              </h2>
              {userInfo.turma_nome && (
                <p className="text-sm font-semibold text-primary mt-1">{userInfo.turma_nome}</p>
              )}
              {userInfo.turma_codigo && (
                <span className="mt-3 px-3 py-1.5 bg-surface-container-low rounded-full text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Turma {userInfo.turma_codigo}
                </span>
              )}
            </div>

            {/* Botão sair */}
            <button
              onClick={onLogout}
              className="w-full bg-surface-container-lowest rounded-[2rem] px-5 py-5 flex items-center gap-4 shadow-[0_8px_30px_rgba(0,0,0,0.03)] active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-[1.25rem] bg-[#fff2f2] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-error">logout</span>
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-bold text-on-surface">Sair do aplicativo</p>
                <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">Encerrar esta sessão</p>
              </div>
              <span className="material-symbols-outlined text-outline-variant">chevron_right</span>
            </button>
          </div>
        )}
      </main>

      {/* BottomNavBar */}
      <nav
        className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 bg-surface-container-lowest/90 backdrop-blur-xl rounded-t-[2rem] z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.05)]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)', paddingTop: '0.75rem' }}
      >
        <button
          onClick={() => setTab('avisos')}
          className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 active:scale-90 ${
            tab === 'avisos'
              ? 'text-white shadow-lg shadow-primary/20'
              : 'text-outline-variant'
          }`}
          style={tab === 'avisos' ? { background: 'linear-gradient(135deg, #2d6197, #92c1fe)' } : {}}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: tab === 'avisos' ? "'FILL' 1" : "'FILL' 0" }}
          >
            notifications
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.05rem] mt-1">Avisos</span>
        </button>

        <button
          onClick={() => setTab('perfil')}
          className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 active:scale-90 ${
            tab === 'perfil'
              ? 'text-white shadow-lg shadow-primary/20'
              : 'text-outline-variant'
          }`}
          style={tab === 'perfil' ? { background: 'linear-gradient(135deg, #2d6197, #92c1fe)' } : {}}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: tab === 'perfil' ? "'FILL' 1" : "'FILL' 0" }}
          >
            person
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.05rem] mt-1">Perfil</span>
        </button>
      </nav>
    </div>
  )
}
