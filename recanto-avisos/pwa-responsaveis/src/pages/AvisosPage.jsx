import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../api/axios'
import { requestNotificationPermission } from '../firebase'
import SolicitacoesModal from './SolicitacoesModal'

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

function AvisoCard({ aviso, onDelete }) {
  if (aviso.urgente) {
    return (
      <article className="bg-surface-container-lowest px-5 py-5 rounded-[1.75rem] shadow-[0_12px_32px_rgba(0,63,152,0.05)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-[#f6efea] -mr-8 -mt-8" />
        <div className="relative flex items-start justify-between gap-3 mb-4">
          <span className="inline-flex items-center rounded-full bg-[#a24a16] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white">
            Urgente
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[13px] font-medium text-on-surface-variant">{formatarData(aviso.criado_em)}</span>
            <button
              onClick={() => onDelete(aviso.id)}
              className="w-8 h-8 rounded-full bg-error/10 hover:bg-error/20 active:scale-95 transition-all flex items-center justify-center"
              aria-label="Apagar aviso"
            >
              <span className="material-symbols-outlined text-error text-[18px]">close</span>
            </button>
          </div>
        </div>
        <h3 className="relative text-[1.6rem] font-extrabold tracking-tight text-on-surface leading-tight mb-3">
          {aviso.titulo}
        </h3>
        <p className="relative text-[1rem] leading-8 text-on-surface-variant">
          {aviso.mensagem}
        </p>
      </article>
    )
  }

  return (
    <article className="bg-surface-container-lowest px-5 py-5 rounded-[1.75rem] shadow-[0_12px_32px_rgba(0,63,152,0.05)]">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-[20px]">campaign</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[13px] font-medium text-on-surface-variant">{formatarData(aviso.criado_em)}</span>
          <button
            onClick={() => onDelete(aviso.id)}
            className="w-8 h-8 rounded-full bg-outline-variant/10 hover:bg-outline-variant/20 active:scale-95 transition-all flex items-center justify-center"
            aria-label="Apagar aviso"
          >
            <span className="material-symbols-outlined text-outline-variant text-[18px]">close</span>
          </button>
        </div>
      </div>
      <h3 className="text-[1.6rem] font-extrabold tracking-tight text-on-surface leading-tight mb-3">
        {aviso.titulo}
      </h3>
      <p className="text-[1rem] leading-8 text-on-surface-variant">
        {aviso.mensagem}
      </p>
    </article>
  )
}

export default function AvisosPage({ onLogout }) {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')

  const [avisos,     setAvisos]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab,        setTab]        = useState('avisos') // 'avisos' | 'vida-escolar' | 'conta'
  const [vidaEscolarTab, setVidaEscolarTab] = useState('faltas') // 'faltas' | 'comportamento' | 'observacoes'
  const [mostrarModal, setMostrarModal] = useState(false)
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)
  const [resumoAluno, setResumoAluno] = useState(null)

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

  const apagarAviso = async (avisoId) => {
    try {
      await api.delete(`/avisos/${avisoId}`)
      setAvisos(prev => prev.filter(a => a.id !== avisoId))
    } catch (err) {
      console.error('Erro ao apagar aviso:', err)
      alert('Não foi possível apagar o aviso. Tente novamente.')
    }
  }

  const carregarResumoAluno = useCallback(async () => {
    try {
      const { data } = await api.get('/avisos/resumo-aluno')
      setResumoAluno(data)
    } catch (err) {
      if (err.response?.status === 401) onLogout()
    }
  }, [onLogout])

  useEffect(() => {
    carregarAvisos()
    carregarResumoAluno()
    requestNotificationPermission().catch(() => {})
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        carregarAvisos()
        carregarResumoAluno()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const handleSwMessage = (event) => {
      if (event.data?.type === 'NOVO_AVISO') {
        carregarAvisos()
        carregarResumoAluno()
      }
    }
    navigator.serviceWorker?.addEventListener('message', handleSwMessage)

    const polling = setInterval(() => {
      carregarAvisos()
      carregarResumoAluno()
    }, 30000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      navigator.serviceWorker?.removeEventListener('message', handleSwMessage)
      clearInterval(polling)
    }
  }, [carregarAvisos, carregarResumoAluno])

  function handleTouchStart(e) { touchStartY.current = e.touches[0].clientY }
  function handleTouchEnd(e) {
    const delta     = e.changedTouches[0].clientY - touchStartY.current
    const scrollTop = containerRef.current?.scrollTop ?? 0
    if (delta > 72 && scrollTop === 0 && !refreshing) { setRefreshing(true); carregarAvisos() }
  }

  // Ordenar avisos por data (mais recente primeiro)
  const avisosOrdenados = [...avisos].sort((a, b) =>
    new Date(b.criado_em) - new Date(a.criado_em)
  )
  const hasUrgent = avisos.some(a => a.urgente)

  const iniciais = (userInfo.aluno_nome || 'A')
    .split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col">

      {/* TopAppBar */}
      <header
        className="fixed top-0 left-0 right-0 z-50 bg-[#f8f9fb]/95 backdrop-blur-md"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
        <div className="w-full max-w-xl mx-auto px-6 pb-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-white font-extrabold text-sm"
                style={{ background: 'linear-gradient(135deg, #1f59c1, #7ea8f5)' }}
              >
                {iniciais}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] leading-5 text-on-surface-variant truncate">
                  Escola Municipal Recanto das Margaridas
                </p>
                <p className="text-[1.05rem] font-extrabold text-on-surface truncate">
                  {userInfo.aluno_nome || 'Meu Filho'}
                </p>
              </div>
            </div>
          </div>

          {tab === 'avisos' ? (
            <div>
              <h1 className="text-[2.1rem] font-extrabold tracking-tight text-on-surface leading-none">Avisos</h1>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-[0.95rem] text-on-surface-variant">
                  {userInfo.turma_nome || 'Turma'}{userInfo.turma_codigo ? ` - Cód. ${userInfo.turma_codigo}` : ''}
                </p>
                {hasUrgent ? <span className="w-2 h-2 rounded-full bg-error animate-pulse" /> : null}
              </div>
            </div>
          ) : (
            tab === 'vida-escolar' ? (
            <div>
              <h1 className="text-[2.1rem] font-extrabold tracking-tight text-on-surface leading-none">Vida Escolar</h1>
              <p className="text-[0.95rem] text-on-surface-variant mt-2">
                Acompanhamento do aluno
              </p>
            </div>
            ) : (
            <div>
              <h1 className="text-[2.1rem] font-extrabold tracking-tight text-on-surface leading-none">Conta</h1>
              <p className="text-[0.95rem] text-on-surface-variant mt-2">
                Dados do responsável e acesso ao app
              </p>
            </div>
            )
          )}
        </div>
      </header>

      {/* Conteúdo principal */}
      <main
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 140px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)',
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
          <div className="px-6 max-w-xl mx-auto w-full">
            {/* Loading */}
            {loading ? (
              <div className="bg-surface-container-lowest rounded-[1.75rem] p-10 flex flex-col items-center text-center shadow-[0_12px_32px_rgba(0,63,152,0.05)]">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-4xl text-primary animate-pulse">
                    notifications
                  </span>
                </div>
                <p className="text-on-surface-variant font-semibold text-sm">Carregando avisos...</p>
              </div>

            ) : avisos.length === 0 ? (
              /* Estado vazio - Status Hero Card */
              <div className="bg-surface-container-lowest rounded-[1.75rem] p-10 flex flex-col items-center text-center shadow-[0_12px_32px_rgba(0,63,152,0.05)]">
                  <div className="mb-5 w-20 h-20 rounded-full bg-[#eef6f0] flex items-center justify-center">
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

            ) : (
              /* Lista única ordenada por data (mais recente primeiro) */
              <div className="space-y-4">
                {avisosOrdenados.map(a => <AvisoCard key={a.id} aviso={a} onDelete={apagarAviso} />)}
              </div>
            )}
          </div>
        )}

        {/* Aba Vida Escolar */}
        {tab === 'vida-escolar' && (
          <div className="px-6 max-w-xl mx-auto w-full space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(resumoAluno?.faltas_total ?? 0) > 0 ? (
                <button
                  onClick={() => setVidaEscolarTab('faltas')}
                  className={`min-h-[12rem] sm:aspect-square rounded-[1.5rem] p-5 text-left shadow-[0_12px_32px_rgba(0,63,152,0.03)] border transition-all active:scale-[0.98] ${
                    vidaEscolarTab === 'faltas'
                      ? 'bg-surface-container-lowest border-primary/20'
                      : 'bg-surface-container-lowest border-outline-variant/10'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-5">
                    <span className="material-symbols-outlined text-primary text-[20px]">calendar_today</span>
                    <span className="text-sm font-semibold text-on-surface-variant">Faltas</span>
                  </div>
                  <div>
                    <span className="block text-5xl sm:text-6xl font-extrabold leading-none text-primary">
                      {resumoAluno.faltas_total}
                    </span>
                    <p className="text-sm text-on-surface-variant mt-2">neste acompanhamento</p>
                  </div>
                </button>
              ) : (
                <div className="min-h-[12rem] sm:aspect-square rounded-[1.5rem] p-5 text-left bg-surface-container-lowest border border-outline-variant/10 shadow-[0_12px_32px_rgba(0,63,152,0.03)] flex flex-col justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="text-sm font-semibold text-on-surface-variant">Frequência</span>
                  </div>
                  <p className="text-sm font-semibold text-on-surface leading-snug">
                    Acompanhe as atividades escolares de sua criança!
                  </p>
                </div>
              )}

              <button
                onClick={() => setVidaEscolarTab('comportamento')}
                className="min-h-[12rem] sm:aspect-square rounded-[1.5rem] p-5 text-left text-white shadow-[0_12px_32px_rgba(0,63,152,0.15)] transition-all active:scale-[0.98] flex flex-col justify-between"
                style={{ background: 'linear-gradient(135deg, #0f4dac, #1a56be)' }}
              >
                <div className="flex items-center gap-2 opacity-85">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    auto_awesome
                  </span>
                  <span className="text-sm font-semibold">Comportamento</span>
                </div>
                <div className="mt-6 sm:mt-4">
                  <p className="text-[1.55rem] sm:text-[1.75rem] font-extrabold leading-tight break-words">
                    {resumoAluno?.comportamento_label || 'Nao avaliado'}
                  </p>
                  <p className="text-xs opacity-75 mt-2">Resumo do corpo docente</p>
                </div>
              </button>
            </div>

            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <button onClick={() => setVidaEscolarTab('observacoes')} className="text-left">
                  <h3 className="text-lg font-bold text-on-surface">Observacoes</h3>
                </button>
                <span className="text-xs text-on-surface-variant">Registro atual</span>
              </div>

              <div className="bg-surface-container-low rounded-[2rem] p-6 relative overflow-hidden">
                <div className="absolute -top-4 -right-3 opacity-10">
                  <span className="material-symbols-outlined text-[5.5rem] text-on-surface-variant">format_quote</span>
                </div>

                <div className="relative z-10 flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[#a24a16] text-[20px]">school</span>
                  </div>

                  <div className="space-y-3">
                    <p className="text-on-surface text-[1.05rem] leading-9 font-medium whitespace-pre-wrap">
                      {resumoAluno?.observacoes?.trim() ? resumoAluno.observacoes : 'Sem observações no momento.'}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-8 bg-[#a24a16] rounded-full" />
                      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-[0.14em]">
                        Escola
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

          </div>
        )}

        {tab === 'conta' && (
          <div className="px-6 max-w-xl mx-auto w-full space-y-5">
            <section className="bg-surface-container-lowest rounded-[2rem] p-6 shadow-[0_12px_32px_rgba(0,63,152,0.05)]">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white font-extrabold text-xl shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #1f59c1, #7ea8f5)' }}
                >
                  {iniciais}
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-extrabold text-on-surface truncate">
                    {userInfo.responsavel_nome || userInfo.nome_responsavel || 'Responsável'}
                  </p>
                  <p className="text-sm font-semibold text-primary mt-1">
                    {userInfo.responsavel_tipo || 'Responsável'}
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-surface-container-low rounded-[1.75rem] p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant/70 mb-4">
                Aluno vinculado
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">person</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-on-surface-variant">Aluno</p>
                    <p className="text-on-surface font-bold text-lg">
                      {userInfo.aluno_nome || 'Aluno'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-outline-variant/20">
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant text-[20px]">school</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-on-surface-variant">Turma</p>
                    <p className="text-on-surface text-sm font-semibold">
                      {userInfo.turma_nome || 'Turma'}{userInfo.turma_codigo ? ` - ${userInfo.turma_codigo}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-surface-container-lowest rounded-[1.75rem] overflow-hidden shadow-sm">
              <button
                onClick={() => setMostrarModal(true)}
                className="w-full flex items-center justify-between p-5 hover:bg-surface-container-low transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined">help_center</span>
                  </div>
                  <span className="font-semibold text-lg text-on-surface">Falar com a escola</span>
                </div>
                <span className="material-symbols-outlined text-outline group-hover:translate-x-1 transition-transform">chevron_right</span>
              </button>
            </section>

            <section className="bg-surface-container-low rounded-[1.75rem] p-5">
              <p className="text-base font-bold text-on-surface mb-2">Sair do aplicativo</p>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Ao sair, você precisará entrar novamente com os dados da turma. Se este celular é de uso frequente, recomendamos continuar conectado.
              </p>
              <button
                onClick={() => setConfirmandoSaida(true)}
                className="mt-5 w-full min-h-[3rem] rounded-full text-sm font-semibold text-on-surface-variant bg-white border border-outline-variant/30 hover:bg-surface-container-high transition-colors"
              >
                Sair
              </button>
            </section>
          </div>
        )}
      </main>


      {/* Modal de solicitações */}
      {mostrarModal && <SolicitacoesModal onClose={() => setMostrarModal(false)} />}

      {confirmandoSaida && (
        <>
          <button
            type="button"
            aria-label="Fechar confirmacao de saida"
            onClick={() => setConfirmandoSaida(false)}
            className="fixed inset-0 z-[60] bg-[#191c1e]/40 backdrop-blur-[4px]"
          />

          <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
            <div className="w-full max-w-sm bg-white rounded-[2rem] shadow-[0_16px_40px_rgba(0,63,152,0.14)] p-6">
              <h3 className="text-xl font-extrabold text-on-surface tracking-tight">
                Tem certeza que deseja sair?
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mt-3">
                Ao sair, você precisará entrar novamente com os dados da turma. Se este celular é de uso frequente, recomendamos continuar conectado.
              </p>

              <div className="mt-6 space-y-3">
                <button
                  onClick={() => setConfirmandoSaida(false)}
                  className="w-full min-h-[3.25rem] rounded-full text-white text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #1f59c1, #1a56be)' }}
                >
                  Continuar no app
                </button>
                <button
                  onClick={onLogout}
                  className="w-full min-h-[3rem] rounded-full text-sm font-semibold text-on-surface-variant bg-surface-container-low hover:bg-surface-container-high transition-colors"
                >
                  Sair mesmo assim
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* BottomNavBar */}
      <nav
        className="fixed bottom-0 left-0 w-full flex justify-center bg-white/90 backdrop-blur-xl z-50 border-t border-outline-variant/20 shadow-[0_-4px_20px_rgba(0,63,152,0.05)]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)', paddingTop: '0.75rem' }}
      >
        <div className="w-full max-w-xl flex justify-around items-center px-4">
          <button
            onClick={() => setTab('avisos')}
            className={`flex flex-col items-center justify-center rounded-2xl px-6 py-2 transition-all duration-300 active:scale-90 ${
              tab === 'avisos'
                ? 'text-primary bg-primary/10'
                : 'text-on-surface-variant'
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: tab === 'avisos' ? "'FILL' 1" : "'FILL' 0" }}
            >
              notifications
            </span>
            <span className="text-[11px] font-bold mt-1">Avisos</span>
          </button>

          <button
            onClick={() => setTab('vida-escolar')}
            className={`flex flex-col items-center justify-center rounded-2xl px-6 py-2 transition-all duration-300 active:scale-90 ${
              tab === 'vida-escolar'
                ? 'text-primary bg-primary/10'
                : 'text-on-surface-variant'
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: tab === 'vida-escolar' ? "'FILL' 1" : "'FILL' 0" }}
            >
              school
            </span>
            <span className="text-[11px] font-bold mt-1">Vida escolar</span>
          </button>

          <button
            onClick={() => setTab('conta')}
            className={`flex flex-col items-center justify-center rounded-2xl px-6 py-2 transition-all duration-300 active:scale-90 ${
              tab === 'conta'
                ? 'text-primary bg-primary/10'
                : 'text-on-surface-variant'
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: tab === 'conta' ? "'FILL' 1" : "'FILL' 0" }}
            >
              person
            </span>
            <span className="text-[11px] font-bold mt-1">Conta</span>
          </button>
        </div>
      </nav>
    </div>
  )
}




