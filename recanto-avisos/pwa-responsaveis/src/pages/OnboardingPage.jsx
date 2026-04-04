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
    if (step === 'notifications') return 'Permitir notificacoes'
    return 'Adicione o atalho'
  }, [step])

  const notificationButtonLabel = useMemo(() => {
    if (notificationState === 'granted') return 'Notificacoes ja permitidas'
    if (notificationState === 'denied') return 'Notificacoes bloqueadas'
    if (notificationState === 'unsupported' || notificationState === 'config_missing') return 'Seguir para instalacao'
    return 'Permitir notificacoes'
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
            ? 'Permissao liberada. Se o aviso nao chegar, abra o app novamente com internet.'
            : 'Permissao liberada. Voce vai receber os avisos da escola.'
        )
      } else if (nextStatus === 'denied') {
        setNotificationFeedback('As notificacoes ficaram bloqueadas. Voce pode liberar depois nas configuracoes do celular ou do navegador.')
      } else if (nextStatus === 'unsupported') {
        setNotificationFeedback('Este aparelho ou navegador nao permite notificacoes. O app continua funcionando normalmente.')
      } else if (nextStatus === 'config_missing') {
        setNotificationFeedback('As notificacoes ainda nao estao disponiveis aqui. O app continua funcionando normalmente.')
      } else {
        setNotificationFeedback('Voce pode continuar agora e ativar isso depois, se quiser.')
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
      messages.push('As notificacoes ja estao liberadas neste aparelho.')
    } else if (notificationState === 'denied') {
      messages.push('As notificacoes estao bloqueadas e o aviso pode nao aparecer de novo.')
    } else if (notificationState === 'unsupported') {
      messages.push('Este aparelho ou navegador nao oferece suporte para esse recurso.')
    } else if (notificationState === 'config_missing') {
      messages.push('As notificacoes ainda nao estao prontas nesta versao, mas o app segue normal.')
    } else {
      messages.push('Se preferir, voce pode continuar sem ativar agora.')
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
          'Se o aviso nao abrir, use o menu do navegador e procure instalar app ou adicionar a tela inicial.',
        ]
      }

      return [
        'Toque no botao abaixo para colocar o app na tela inicial.',
        'Se o aviso nao aparecer, voce pode instalar depois pelo menu do navegador.',
      ]
    }

    if (IOS) {
      return [
        'No iPhone, toque em Compartilhar e depois em Adicionar a Tela de Inicio.',
        'Depois, abra o icone salvo para usar o app.',
      ]
    }

    return [
      'Se o navegador nao mostrar o botao, use o menu e escolha adicionar a tela inicial.',
      'Mesmo sem instalar agora, voce pode entrar no app.',
    ]
  }

  function renderPrivacyStep() {
    return (
      <>
        <p className="text-sm text-on-surface-variant text-center leading-relaxed">
          Este app serve para receber avisos e acompanhar informacoes escolares do aluno.
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
            <InfoLine text="Nao compartilha dados do seu aparelho com outras pessoas ou empresas." />
            <InfoLine text="Usa apenas os dados necessarios para ligar o responsavel ao aluno e enviar avisos da escola." />
            <InfoLine text="As notificacoes sao usadas somente para comunicados escolares." />
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
          Permita as notificacoes para receber avisos sem precisar abrir o app.
        </p>

        <div className="w-full rounded-[1.5rem] border border-outline-variant/40 bg-white px-5 py-5 flex flex-col gap-3">
          {renderNotificationMessages().map((message) => (
            <InfoLine key={message} text={message} />
          ))}
        </div>

        {notificationFeedback ? (
          <p className="w-full rounded-[1rem] border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-on-surface-variant leading-relaxed">
            {notificationFeedback}
          </p>
        ) : null}

        <button
          onClick={handleEnableNotifications}
          disabled={carregando}
          className="w-full min-h-[3.25rem] rounded-[1rem] text-white text-base font-extrabold tracking-wide transition-opacity disabled:opacity-60"
          style={{
            background: 'linear-gradient(160deg, #1e558b 0%, #2d6197 100%)',
            boxShadow: '0 8px 28px rgba(30,85,139,0.40)',
          }}
        >
          {carregando ? 'Aguarde...' : notificationButtonLabel}
        </button>

        <button
          onClick={() => setStep('install')}
          type="button"
          className="w-full min-h-[3rem] rounded-[1rem] text-sm font-bold text-primary border border-primary/20 bg-white"
        >
          Continuar sem ativar
        </button>
      </>
    )
  }

  function renderInstallStep() {
    return (
      <>
        <p className="text-sm text-on-surface-variant text-center leading-relaxed">
          Coloque o app na tela inicial para abrir com um toque.
        </p>

        <div className="w-full rounded-[1.5rem] border border-outline-variant/40 bg-white px-5 py-5 flex flex-col gap-3">
          {renderInstallMessages().map((message) => (
            <InfoLine key={message} text={message} />
          ))}
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

        <button
          onClick={handleInstallShortcut}
          disabled={carregando}
          className="w-full min-h-[3.25rem] rounded-[1rem] text-white text-base font-extrabold tracking-wide transition-opacity disabled:opacity-60"
          style={{
            background: 'linear-gradient(160deg, #1e558b 0%, #2d6197 100%)',
            boxShadow: '0 8px 28px rgba(30,85,139,0.40)',
          }}
        >
          {carregando ? 'Aguarde...' : installPrompt && !standalone ? 'Colocar na tela inicial' : 'Entrar no app'}
        </button>

        {!standalone && (
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
