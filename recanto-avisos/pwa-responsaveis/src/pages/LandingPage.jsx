import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const qrToken = params.get('turma')

    if (qrToken) {
      navigate(`/login?turma=${qrToken}`, { replace: true })
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col items-center overflow-x-hidden">
      <main className="w-full max-w-md flex-1 flex flex-col px-6 pt-12 pb-8 items-center">
        <header className="w-full mb-12 text-center">
          <div className="mb-6 flex justify-center">
            <div
              className="w-20 h-20 rounded-[24px] flex items-center justify-center shadow-[0_12px_32px_rgba(0,63,152,0.12)]"
              style={{ background: 'linear-gradient(135deg, #003f98 0%, #1a56be 100%)' }}
            >
              <span className="material-symbols-outlined text-white text-4xl">school</span>
            </div>
          </div>

          <h1 className="text-on-surface text-3xl font-extrabold tracking-tight leading-tight mb-2">
            Escola Municipal Recanto das Margaridas
          </h1>

          <p className="text-on-surface-variant text-lg font-medium">
            Portal de avisos e informações escolares
          </p>
        </header>

        <section className="w-full mb-12">
          <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-[0_4px_24px_rgba(0,63,152,0.04)] relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-primary text-xl font-bold mb-4">Seja bem-vindo(a)</h2>
              <p className="text-on-surface-variant text-lg leading-relaxed">
                Acompanhe a vida escolar do seu filho com <span className="text-primary font-semibold">segurança</span> e{' '}
                <span className="text-primary font-semibold">facilidade</span>. Receba comunicados em tempo real.
              </p>
            </div>
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
          </div>
        </section>

        <div className="w-full mb-12 rounded-3xl overflow-hidden aspect-[4/3] bg-surface-container-low">
          <div className="w-full h-full bg-gradient-to-br from-[#0f1f2d] to-[#1f6f8b] relative flex items-center justify-center">
            <div className="absolute inset-x-0 bottom-0 h-16 bg-[#7dc36b]" />
            <div className="absolute inset-x-0 bottom-12 h-10 bg-[#a9d99a]" />

            <div className="relative w-[58%] h-[52%] rounded-t-[1rem] bg-[#9ad7df] border-[6px] border-[#2d4f5e] shadow-lg">
              <div className="absolute inset-x-0 top-0 h-7 bg-[#6db6c0] flex items-center justify-center">
                <span className="text-[9px] leading-none font-extrabold text-white tracking-[0.14em] text-center px-2">
                  ESCOLA MUNICIPAL
                  <br />
                  RECANTO DAS MARGARIDAS
                </span>
              </div>

              <div className="absolute left-1/2 top-7 bottom-0 w-[6px] bg-[#2d4f5e] -translate-x-1/2" />
              <div className="absolute left-0 right-0 top-[40%] h-[6px] bg-[#2d4f5e]" />

              <div className="absolute left-[12%] bottom-0 w-[22%] h-[48%] bg-[#cbe7f5] border-x-[4px] border-t-[4px] border-[#2d4f5e]" />
              <div className="absolute right-[12%] bottom-0 w-[22%] h-[48%] bg-[#cbe7f5] border-x-[4px] border-t-[4px] border-[#2d4f5e]" />
              <div className="absolute left-1/2 bottom-0 w-[22%] h-[58%] bg-[#d9f2f6] border-x-[4px] border-t-[4px] border-[#2d4f5e] -translate-x-1/2" />
            </div>

            <div className="absolute left-[24%] bottom-[12%] w-4 h-10 bg-[#d5534f] rounded-t-full" />
            <div className="absolute left-[25%] bottom-[10%] w-6 h-2 bg-[#263238] rounded-full" />
            <div className="absolute left-[50%] bottom-[12%] w-4 h-10 bg-[#ffffff] rounded-t-full" />
            <div className="absolute left-[50.5%] bottom-[10%] w-6 h-2 bg-[#263238] rounded-full" />
            <div className="absolute right-[20%] bottom-[12%] w-3.5 h-8 bg-[#7ea8f5] rounded-t-full" />
            <div className="absolute right-[20%] bottom-[10%] w-5 h-2 bg-[#263238] rounded-full" />
          </div>
        </div>

        <div className="w-full mt-auto space-y-4">
          <button
            onClick={() => navigate('/qrcode')}
            className="w-full h-16 rounded-full flex items-center justify-center gap-3 text-white text-lg font-bold shadow-[0_12px_32px_rgba(0,63,152,0.15)] active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #003f98 0%, #1a56be 100%)' }}
          >
            <span className="material-symbols-outlined">qr_code_scanner</span>
            Escanear QR Code
          </button>

          <button
            onClick={() => navigate('/login')}
            className="w-full h-16 rounded-full flex items-center justify-center text-primary text-lg font-bold bg-surface-container-low hover:bg-surface-container-high transition-colors active:scale-95"
          >
            Já tenho cadastro? Entrar
          </button>
        </div>

        <footer className="mt-8">
          <p className="text-on-surface-variant/60 text-sm font-medium">
            Precisa de ajuda? Entre em contato com a secretaria da escola.
          </p>
        </footer>
      </main>
    </div>
  )
}
