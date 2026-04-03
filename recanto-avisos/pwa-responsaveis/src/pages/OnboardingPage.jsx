import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios'
import { requestNotificationPermission } from '../firebase'

const IOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
const STANDALONE = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true

export default function OnboardingPage({ onAceite }) {
  const [step, setStep] = useState('privacy')
  const [carregando, setCarregando] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const jaAceitoServidor = localStorage.getItem('lgpd_servidor_aceito') === '1'

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const titulo = useMemo(() => {
    if (step === 'privacy') return 'Antes de entrar'
    if (step === 'notifications') return 'Ative as notificacoes'
    return 'Adicione o atalho'
  }, [step])

  async function registrarAceiteSeNecessario() {
    if (jaAceitoServidor) return
    await api.post('/auth/aceite-lgpd')
    localStorage.setItem('lgpd_servidor_aceito', '1')
  }

  async function handlePrivacyContinue() {
    setCarregando(true)
    try {
      await registrarAceiteSeNecessario()
      setStep('notifications')
    } catch {
      // Mantemos o fluxo mesmo se o registro remoto falhar.
      setStep('notifications')
    } finally {
      setCarregando(false)
    }
  }

  async function handleEnableNotifications() {
    setCarregando(true)
    try {
      await requestNotificationPermission()
    } finally {
      setCarregando(false)
      setStep('install')
    }
  }

  async function handleInstallShortcut() {
    if (installPrompt) {
      setCarregando(true)
      try {
        installPrompt.prompt()
        await installPrompt.userChoice
      } finally {
        setCarregando(false)
      }
    }
    onAceite()
  }

  function renderPrivacyStep() {
    return (
      <>
        <p className="text-sm text-on-surface-variant text-center leading-relaxed">
          Este aplicativo existe apenas para receber avisos e mostrar informacoes escolares do aluno.
        </p>

        <div className="w-full rounded-[1.5rem] overflow-hidden border border-outline-variant/40">
          <div className="bg-primary px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-white text-[1.125rem]" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified_user
              </span>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white">
                Privacidade e uso
              </p>
            </div>
          </div>

          <div className="bg-white px-5 py-4 flex flex-col gap-3">
            <InfoLine text="Nao le fotos, contatos, conversas ou arquivos do seu celular." />
            <InfoLine text="Nao envia dados do seu aparelho para outras pessoas ou empresas." />
            <InfoLine text="Usa apenas os dados necessarios para relacionar o responsavel ao aluno e entregar os avisos da escola." />
            <InfoLine text="As notificacoes servem somente para avisos e comunicados escolares." />
          </div>
        </div>

        <button
          onClick={handlePrivacyContinue}
          disabled={carregando}
          className="w-full min-h-[3.25rem] rounded-[1rem] text-white text-base font-extrabold tracking-wide transition-opacity disabled:opacity-60"
          style={{
            background: 'linear-gradient(160deg, #1e558b 0%, #2d6197 100%)',
            boxShadow: '0 8px 28px rgba(30,85,139,0.40)',
          }}
        >
          {carregando ? 'Aguarde...' : jaAceitoServidor ? 'Continuar' : 'Entendi e aceito'}
        </button>
      </>
    )
  }

  function renderNotificationsStep() {
    return (
      <>
        <p className="text-sm text-on-surface-variant text-center leading-relaxed">
          Permita as notificacoes para receber comunicados da escola sem precisar abrir o site.
        </p>

        <div className="w-full rounded-[1.5rem] border border-outline-variant/40 bg-white px-5 py-5 flex flex-col gap-3">
          <InfoLine text="Voce vai receber avisos urgentes, recados e atualizacoes importantes." />
          <InfoLine text="Se preferir, pode continuar sem ativar agora e ajustar isso depois no navegador." />
        </div>

        <button
          onClick={handleEnableNotifications}
          disabled={carregando}
          className="w-full min-h-[3.25rem] rounded-[1rem] text-white text-base font-extrabold tracking-wide transition-opacity disabled:opacity-60"
          style={{
            background: 'linear-gradient(160deg, #1e558b 0%, #2d6197 100%)',
            boxShadow: '0 8px 28px rgba(30,85,139,0.40)',
          }}
        >
          {carregando ? 'Aguarde...' : 'Ativar notificacoes'}
        </button>

        <button
          onClick={() => setStep('install')}
          type="button"
          className="w-full min-h-[3rem] rounded-[1rem] text-sm font-bold text-primary border border-primary/20 bg-white"
        >
          Continuar sem ativar agora
        </button>
      </>
    )
  }

  function renderInstallStep() {
    return (
      <>
        <p className="text-sm text-on-surface-variant text-center leading-relaxed">
          Adicione um atalho na tela inicial para abrir o aplicativo com um toque.
        </p>

        <div className="w-full rounded-[1.5rem] border border-outline-variant/40 bg-white px-5 py-5 flex flex-col gap-3">
          {STANDALONE ? (
            <InfoLine text="O atalho ja esta instalado neste aparelho." />
          ) : installPrompt ? (
            <InfoLine text="Toque no botao abaixo para adicionar o atalho do app no seu celular." />
          ) : IOS ? (
            <InfoLine text="No iPhone, use Compartilhar e depois Adicionar a Tela de Inicio." />
          ) : (
            <InfoLine text="Se o navegador nao mostrar o botao de instalar, use o menu do navegador e escolha a opcao de adicionar a tela inicial." />
          )}
        </div>

        <button
          onClick={handleInstallShortcut}
          disabled={carregando}
          className="w-full min-h-[3.25rem] rounded-[1rem] text-white text-base font-extrabold tracking-wide transition-opacity disabled:opacity-60"
          style={{
            background: 'linear-gradient(160deg, #1e558b 0%, #2d6197 100%)',
            boxShadow: '0 8px 28px rgba(30,85,139,0.40)',
          }}
        >
          {carregando ? 'Aguarde...' : installPrompt && !STANDALONE ? 'Adicionar atalho' : 'Entrar no app'}
        </button>

        {!STANDALONE && (
          <button
            onClick={onAceite}
            type="button"
            className="w-full min-h-[3rem] rounded-[1rem] text-sm font-bold text-primary border border-primary/20 bg-white"
          >
            Pular esta etapa
          </button>
        )}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div
          className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(160deg, #1e558b 0%, #2d6197 100%)' }}
        >
          <span
            className="material-symbols-outlined text-white text-[2rem]"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}
          >
            shield
          </span>
        </div>

        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">
            Escola Recanto das Margaridas
          </p>
          <h1 className="text-[1.375rem] font-extrabold text-on-surface leading-tight">
            {titulo}
          </h1>
        </div>

        {step === 'privacy' && renderPrivacyStep()}
        {step === 'notifications' && renderNotificationsStep()}
        {step === 'install' && renderInstallStep()}

        <p className="text-xs text-on-surface-variant/60 text-center">
          Duvidas? Fale com a secretaria da escola.
        </p>
      </div>
    </div>
  )
}

function InfoLine({ text }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="material-symbols-outlined text-primary text-[1.125rem] mt-0.5 shrink-0"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        check_circle
      </span>
      <p className="text-sm text-on-surface-variant leading-relaxed">{text}</p>
    </div>
  )
}
