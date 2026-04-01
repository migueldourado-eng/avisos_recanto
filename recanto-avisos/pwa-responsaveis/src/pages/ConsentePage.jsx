import { useState } from 'react'
import api from '../api/axios'

export default function ConsentePage({ onAceite }) {
  const [carregando, setCarregando] = useState(false)

  async function handleAceite() {
    setCarregando(true)
    try {
      await api.post('/auth/aceite-lgpd')
    } catch {
      // Mesmo se falhar no servidor, prosseguimos — o aceite local já foi registrado
    } finally {
      setCarregando(false)
      onAceite()
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">

        {/* Ícone da escola */}
        <div
          className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(160deg, #1e558b 0%, #2d6197 100%)' }}
        >
          <span
            className="material-symbols-outlined text-white text-[2rem]"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}
          >
            school
          </span>
        </div>

        {/* Cabeçalho */}
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">
            Escola Recanto das Margaridas
          </p>
          <h1 className="text-[1.375rem] font-extrabold text-on-surface leading-tight">
            Bem-vindo ao<br />Recanto Avisos!
          </h1>
        </div>

        {/* Descrição */}
        <p className="text-sm text-on-surface-variant text-center leading-relaxed">
          Por este app você recebe avisos importantes sobre seu (sua) filho(a) diretamente no seu celular.
        </p>

        {/* Card LGPD */}
        <div className="w-full rounded-[1.5rem] overflow-hidden border border-outline-variant/40">

          <div className="bg-primary px-5 py-3">
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-white text-[1.125rem]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                shield
              </span>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white">
                Seus dados
              </p>
            </div>
          </div>

          <div className="bg-white px-5 py-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span
                className="material-symbols-outlined text-primary text-[1.125rem] mt-0.5 shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Usamos seu nome, telefone e o nome e turma do seu filho(a) <strong className="text-on-surface">apenas para enviar os avisos da escola.</strong>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span
                className="material-symbols-outlined text-primary text-[1.125rem] mt-0.5 shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                <strong className="text-on-surface">Não compartilhamos seus dados</strong> com ninguém.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span
                className="material-symbols-outlined text-primary text-[1.125rem] mt-0.5 shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Este app segue a <strong className="text-on-surface">Lei de Proteção de Dados (LGPD)</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Botão de aceite */}
        <button
          onClick={handleAceite}
          disabled={carregando}
          className="w-full min-h-[3.25rem] rounded-[1rem] text-white text-base font-extrabold tracking-wide transition-opacity disabled:opacity-60"
          style={{
            background: 'linear-gradient(160deg, #1e558b 0%, #2d6197 100%)',
            boxShadow: '0 8px 28px rgba(30,85,139,0.40)',
          }}
        >
          {carregando ? 'Aguarde...' : 'Entendi e aceito'}
        </button>

        {/* Rodapé */}
        <p className="text-xs text-on-surface-variant/60 text-center">
          Dúvidas? Fale com a secretaria da escola.
        </p>

      </div>
    </div>
  )
}
