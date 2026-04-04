import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios'
import { getNotificationPermissionState, requestNotificationPermission } from '../firebase'

const IOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
const ANDROID = /android/i.test(window.navigator.userAgent)

function isStandaloneMode() {
  return window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true
}

export default function OnboardingPage({ onAceite }) {
  const [step, setStep] = useState('privacy')
  const [carregando, setCarregando] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [standalone, setStandalone] = useState(isStandaloneMode)
  const [notificationState, setNotificationState] = useState(getNotificationPermissionState)
  const [notificationFeedback, setNotificationFeedback] = useState('')
  const [installFeedback, setInstallFeedback] = useState('')
  const jaAceitoServidor = localStorage.getItem('lgpd_servidor_aceito') === '1'

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
      setInstallFeedback('')
    }

    const installHandler = () => {
      setStandalone(true)
      setInstallPrompt(null)
      setInstallFeedback('Atalho instalado. Agora e so entrar no app.')
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installHandler)
    }
  }, [])

  const titulo = useMemo(() => {
    if (step === 'privacy') return 'Antes de entrar'
    if (step === 'notifications') return 'Permitir notificações'
    return 'Adicione o atalho'
  }, [step])

  const notificationButtonLabel = useMemo(() => {
    if (notificationState === 'granted') return 'Notificações já permitidas'
    if (notificationState === 'denied') return 'Notificações bloqueadas'
    if (notificationState === 'unsupported' || notificationState === 'config_missing') return 'Seguir para instalação'
    return 'Permitir notificações'
  }, [notificationState])

  async function registrarAceiteSeNecessario() {
    if (jaAceitoServidor) return
    await api.post('/auth/aceite-lgpd')
    localStorage.setItem('lgpd_servidor_aceito', '1')
  }

  async function handlePrivacyContinue() {
    setCarregando(true)
    try {
      await registrarAceiteSeNecessario()
      setNotificationState(getNotificationPermissionState())
      setNotificationFeedback('')
      setStep('notifications')
    } catch {
      // Mantemos o fluxo mesmo se o registro remoto falhar.
      setNotificationState(getNotificationPermissionState())
      setNotificationFeedback('')
      setStep('notifications')
    } finally {
      setCarregando(false)
    }
  }

  async function handleEnableNotifications() {
    setCarregando(true)
    try {
      const result = await requestNotificationPermission()
      const nextStatus = result?.status ?? getNotificationPermissionState()

      setNotificationState(nextStatus)

      if (nextStatus === 'granted') {
        setNotificationFeedback(
          result?.tokenRegistered === false
            ? 'Permissão liberada. Se o aviso não chegar, abra o app novamente com internet.'
            : 'Permissão liberada. Você vai receber os avisos da escola.'
        )
      } else if (nextStatus === 'denied') {
        setNotificationFeedback('As notificações ficaram bloqueadas. Você pode liberar depois nas configurações do celular ou do navegador.')
      } else if (nextStatus === 'unsupported') {
        setNotificationFeedback('Este aparelho ou navegador não permite notificações. O app continua funcionando normalmente.')
      } else if (nextStatus === 'config_missing') {
        setNotificationFeedback('As notificações ainda não estão disponíveis aqui. O app continua funcionando normalmente.')
      } else {
        setNotificationFeedback('Você pode continuar agora e ativar isso depois, se quiser.')
      }
    } finally {
      setCarregando(false)
      setStep('install')
    }
  }

  async function handleInstallShortcut() {
    if (installPrompt && !standalone) {
      setCarregando(true)
      try {
        installPrompt.prompt()
        const choice = await installPrompt.userChoice
        setInstallPrompt(null)

        if (choice?.outcome === 'accepted') {
          setStandalone(true)
          setInstallFeedback('Atalho instalado. Agora e so entrar no app.')
        } else {
          setInstallFeedback('Tudo bem. Voce pode instalar depois.')
        }
      } finally {
        setCarregando(false)
      }
    }
    onAceite()
  }

  function renderNotificationMessages() {
    const messages = [
      'Receba avisos da escola direto no celular.',
    ]

    if (notificationState === 'granted') {
      messages.push('As notificações já estão liberadas neste aparelho.')
    } else if (notificationState === 'denied') {
      messages.push('As notificações estão bloqueadas e o aviso pode não aparecer de novo.')
    } else if (notificationState === 'unsupported') {
      messages.push('Este aparelho ou navegador não oferece suporte para esse recurso.')
    } else if (notificationState === 'config_missing') {
      messages.push('As notificações ainda não estão prontas nesta versão, mas o app segue normal.')
    } else {
      messages.push('Se preferir, você pode continuar sem ativar agora.')
    }

    return messages
  }

  function renderInstallMessages() {
    if (standalone) {
      return ['O atalho ja esta instalado neste aparelho.']
    }

    if (installPrompt) {
      if (ANDROID) {
        return [
          'Toque no botao abaixo para colocar o app na tela inicial do Android.',
          'Se o aviso não abrir, use o menu do navegador e procure instalar o app ou adicionar à tela inicial.',
        ]
      }

      return [
        'Toque no botao abaixo para colocar o app na tela inicial.',
        'Se o aviso não aparecer, você pode instalar depois pelo menu do navegador.',
      ]
    }

    if (IOS) {
      return [
        'No iPhone, toque em Compartilhar e depois em Adicionar a Tela de Inicio.',
        'Depois, abra o icone salvo para usar o app.',
      ]
    }

    return [
      'Se o navegador não mostrar o botão, use o menu e escolha adicionar à tela inicial.',
      'Mesmo sem instalar agora, você pode entrar no app.',
    ]
  }

  function renderPrivacyStep() {
    return (
      <>
        <div className="w-full flex flex-col items-center text-center gap-6">
          <div className="relative w-full max-w-[17.5rem] aspect-square">
            <div className="absolute inset-0 rounded-full bg-primary/5 blur-3xl" />
            <div className="relative w-full h-full rounded-[2rem] bg-gradient-to-br from-[#4da3a2] to-[#2b7f87] shadow-[0_20px_50px_rgba(31,89,193,0.10)] flex items-center justify-center">
              <div className="w-[62%] aspect-square rounded-[0.2rem] border-4 border-white/85 flex items-center justify-center relative">
                <span className="material-symbols-outlined text-[#ffd54f] absolute left-3 top-3 text-[1.6rem]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  wb_sunny
                </span>
                <div className="flex flex-col items-center translate-y-1">
                  <div className="w-10 h-10 rounded-full bg-[#f7d7c2] mb-1.5 relative">
                    <span className="material-symbols-outlined text-[#7b4a2f] absolute -right-1 top-1 text-[1rem]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      menu_book
                    </span>
                  </div>
                  <div className="w-10 h-12 rounded-t-full bg-[#f0c43c]" />
                  <div className="w-16 h-1.5 bg-[#39434d]/20 rounded-full mt-4" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-[2rem] font-extrabold tracking-tight text-on-surface leading-tight">
              Bem-vindo ao app da Escola Municipal Recanto das Margaridas
            </h2>
            <p className="text-on-surface-variant text-lg leading-relaxed">
              Um lugar simples para você acompanhar a vida escolar do seu filho com segurança.
            </p>
          </div>

          <div className="w-full grid gap-4">
            <div className="bg-surface-container-low px-5 py-5 rounded-[1.25rem] flex items-start gap-4 text-left">
              <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
                <span className="material-symbols-outlined text-primary">shield_lock</span>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-on-surface">Privacidade prioritária</p>
                <p className="text-sm text-on-surface-variant leading-snug">
                  Suas informações ficam protegidas e são usadas apenas para o acompanhamento escolar.
                </p>
              </div>
            </div>

            <div className="bg-surface-container-low px-5 py-5 rounded-[1.25rem] flex items-start gap-4 text-left">
              <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
                <span className="material-symbols-outlined text-primary">family_history</span>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-on-surface">Conexão família</p>
                <p className="text-sm text-on-surface-variant leading-snug">
                  Avisos, faltas e observações em um só lugar, de forma simples e intuitiva.
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handlePrivacyContinue}
          disabled={carregando}
          className="w-full min-h-[3.5rem] rounded-full text-white text-base font-extrabold tracking-wide transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(160deg, #1e558b 0%, #2d6197 100%)',
            boxShadow: '0 12px 32px rgba(0,63,152,0.15)',
          }}
        >
          <span>{carregando ? 'Aguarde...' : jaAceitoServidor ? 'Entendi e continuar' : 'Entendi e continuar'}</span>
          {!carregando ? (
            <span className="material-symbols-outlined text-[1.15rem]">arrow_forward</span>
          ) : null}
        </button>

        <p className="text-center text-xs text-on-surface-variant px-6 leading-relaxed">
          Ao continuar, você concorda com a política de privacidade e uso de dados escolares.
        </p>
      </>
    )
  }

  function renderNotificationsStep() {
    return (
      <>
        <div className="flex gap-2 mb-2">
          <div className="w-12 h-1.5 rounded-full bg-primary/20" />
          <div className="w-12 h-1.5 rounded-full bg-primary shadow-sm" />
          <div className="w-12 h-1.5 rounded-full bg-primary/20" />
        </div>

        <div className="relative w-full aspect-square max-w-[17.5rem] flex items-center justify-center mb-2">
          <div className="absolute inset-0 bg-primary/10 rounded-[3rem] rotate-6 scale-95" />
          <div className="absolute inset-0 bg-surface-container-lowest rounded-[3rem] shadow-xl shadow-primary/5" />

          <div className="relative flex flex-col items-center">
            <div className="bg-white p-6 rounded-[2rem] shadow-2xl shadow-primary/10 border border-outline-variant/20 relative z-10">
              <span
                className="material-symbols-outlined text-[5rem] text-primary animate-pulse"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                notifications
              </span>
            </div>

            <div className="absolute -top-4 -right-8 bg-[#a24a16] text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-xs">priority_high</span>
              Aviso urgente
            </div>

            <div className="absolute -bottom-6 -left-6 bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">chat_bubble</span>
              Mensagem
            </div>
          </div>
        </div>

        <div className="space-y-4 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface leading-tight">
            Não perca nada importante.
          </h2>
          <p className="text-on-surface-variant text-lg leading-relaxed px-4">
            Ative as notificações para receber avisos da escola na hora, sem precisar abrir o aplicativo.
          </p>
        </div>

        {notificationFeedback ? (
          <p className="w-full rounded-[1rem] border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-on-surface-variant leading-relaxed">
            {notificationFeedback}
          </p>
        ) : null}

        <button
          onClick={handleEnableNotifications}
          disabled={carregando}
          className="w-full min-h-[3.5rem] rounded-full text-white text-base font-extrabold tracking-wide transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(90deg, #003f98 0%, #1a56be 100%)',
            boxShadow: '0 12px 32px rgba(0,63,152,0.20)',
          }}
        >
          {!carregando ? <span className="material-symbols-outlined text-[1.15rem]">notifications_active</span> : null}
          <span>{carregando ? 'Aguarde...' : notificationButtonLabel}</span>
        </button>

        <button
          onClick={() => setStep('install')}
          type="button"
          className="w-full min-h-[3.5rem] rounded-full text-base font-semibold text-on-surface-variant bg-transparent hover:bg-surface-container-low active:scale-[0.98] transition-all"
        >
          Continuar sem ativar
        </button>

        <div className="mt-2 flex items-center gap-2 text-on-surface-variant/40">
          <span className="material-symbols-outlined text-sm">lock</span>
          <span className="text-xs font-medium">Seguro e privado</span>
        </div>
      </>
    )
  }

  function renderInstallStep() {
    return (
      <>
        <div className="flex gap-2 mb-2">
          <div className="h-1.5 w-8 rounded-full bg-surface-container-highest" />
          <div className="h-1.5 w-8 rounded-full bg-surface-container-highest" />
          <div className="h-1.5 w-12 rounded-full bg-primary shadow-sm" />
        </div>

        <div className="space-y-4 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface leading-tight">
            Tenha a escola sempre à mão.
          </h2>
          <p className="text-on-surface-variant text-center leading-relaxed max-w-[18rem]">
            Coloque o icone do aplicativo na tela inicial do seu celular para entrar mais rapido.
          </p>
        </div>

        <div className="relative w-full max-w-[20rem] aspect-[4/5] flex items-center justify-center">
          <div className="absolute inset-0 bg-surface-container-low rounded-[3rem] -rotate-2" />

          <div className="relative z-10 w-[15rem] h-[27.5rem] bg-white rounded-[2.5rem] p-4 border-[6px] border-surface-container-highest shadow-[0_24px_48px_rgba(0,63,152,0.12)] flex flex-col">
            <div className="flex justify-between items-center px-4 pt-2 mb-8">
              <span className="text-[10px] font-bold text-on-surface-variant">9:41</span>
              <div className="flex gap-1 items-center">
                <span className="material-symbols-outlined text-[12px]">signal_cellular_4_bar</span>
                <span className="material-symbols-outlined text-[12px]">wifi</span>
                <span className="material-symbols-outlined text-[12px]">battery_full</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 px-2">
              {[0, 1, 2, 4, 5].map((item) => (
                <div key={item} className="space-y-1 flex flex-col items-center opacity-30">
                  <div className="w-10 h-10 bg-secondary-container rounded-xl" />
                  <div className="w-8 h-1.5 bg-surface-variant rounded-full" />
                </div>
              ))}

              <div className="space-y-1 flex flex-col items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-container rounded-xl flex items-center justify-center shadow-lg transform scale-110">
                  <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    school
                  </span>
                </div>
                <div className="w-8 h-1.5 bg-primary rounded-full" />
              </div>
            </div>

            <div className="absolute -right-7 bottom-24 flex flex-col items-center">
              <div className="bg-surface-container-highest/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/50 mb-2">
                <p className="text-[10px] font-bold text-primary">Toque para abrir</p>
              </div>
              <span
                className="material-symbols-outlined text-primary text-4xl rotate-[-45deg]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                touch_app
              </span>
            </div>

            <div className="mt-auto mb-4 bg-surface-container-low/60 rounded-3xl p-2 flex justify-around items-center">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm" />
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm" />
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm" />
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm" />
            </div>
          </div>
        </div>

        <div className="bg-white/50 backdrop-blur-sm border border-outline-variant/20 px-6 py-5 rounded-[2rem] text-center max-w-[20rem]">
          <p className="text-on-surface text-lg font-medium leading-relaxed italic">
            "E como um atalho que facilita seu dia a dia."
          </p>
        </div>

        {notificationFeedback ? (
          <p className="w-full rounded-[1rem] border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-on-surface-variant leading-relaxed">
            {notificationFeedback}
          </p>
        ) : null}

        {installFeedback ? (
          <p className="w-full rounded-[1rem] border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-on-surface-variant leading-relaxed">
            {installFeedback}
          </p>
        ) : null}

        <div className="w-full rounded-[1.5rem] border border-outline-variant/40 bg-white px-5 py-5 flex flex-col gap-3">
          {renderInstallMessages().map((message) => (
            <InfoLine key={message} text={message} />
          ))}
        </div>

        <button
          onClick={handleInstallShortcut}
          disabled={carregando}
          className="w-full min-h-[3.5rem] rounded-full text-white text-base font-extrabold tracking-wide transition-opacity disabled:opacity-60 flex items-center justify-center gap-3"
          style={{
            background: 'linear-gradient(90deg, #003f98 0%, #1a56be 100%)',
            boxShadow: '0 12px 32px rgba(0,63,152,0.15)',
          }}
        >
          <span>{carregando ? 'Aguarde...' : installPrompt && !standalone ? 'Começar a usar' : 'Começar a usar'}</span>
          {!carregando ? <span className="material-symbols-outlined">arrow_forward</span> : null}
        </button>

        {!standalone && (
          <button
            onClick={onAceite}
            type="button"
            className="w-full min-h-[3rem] rounded-full text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            Fazer isso mais tarde
          </button>
        )}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        {step !== 'privacy' ? (
          <>
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
          </>
        ) : null}

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
