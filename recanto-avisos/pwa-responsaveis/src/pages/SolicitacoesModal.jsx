import { useState } from 'react';
import api from '../api/axios';

const CATEGORIAS = [
  {
    id: 'falta_sem_atestado',
    emoji: '🤒',
    titulo: 'Falta por doença',
    subtitulo: 'Sem atestado médico',
    precisaCampo: false,
  },
  {
    id: 'falta_com_atestado',
    emoji: '🤒',
    titulo: 'Falta por doença',
    subtitulo: 'Com atestado médico',
    precisaCampo: false,
    aviso: 'Lembre-se de entregar o atestado na escola',
  },
  {
    id: 'vai_ter_aula',
    emoji: '📅',
    titulo: 'Vai ter aula hoje?',
    subtitulo: '',
    precisaCampo: false,
  },
  {
    id: 'quem_vai_buscar',
    emoji: '👤',
    titulo: 'Quem vai buscar hoje',
    subtitulo: 'Urgente',
    precisaCampo: true,
    placeholder: 'Nome completo da pessoa',
  },
  {
    id: 'atestado_frequencia',
    emoji: '📄',
    titulo: 'Atestado de Frequência',
    subtitulo: '',
    precisaCampo: false,
  },
  {
    id: 'atestado_matricula',
    emoji: '📋',
    titulo: 'Atestado de Matrícula',
    subtitulo: '',
    precisaCampo: false,
  },
  {
    id: 'historico_escolar',
    emoji: '📊',
    titulo: 'Histórico Escolar',
    subtitulo: '',
    precisaCampo: false,
  },
  {
    id: 'atualizar_contato',
    emoji: '📞',
    titulo: 'Atualizar contato',
    subtitulo: '',
    precisaCampo: true,
    placeholder: 'Novo telefone ou email',
  },
];

export default function SolicitacoesModal({ onClose }) {
  const [etapa, setEtapa] = useState('lista'); // 'lista' | 'campo' | 'aviso'
  const [categoriaEscolhida, setCategoriaEscolhida] = useState(null);
  const [mensagemAdicional, setMensagemAdicional] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleEscolherCategoria = (categoria) => {
    setCategoriaEscolhida(categoria);

    if (categoria.aviso) {
      setEtapa('aviso');
    } else if (categoria.precisaCampo) {
      setEtapa('campo');
    } else {
      enviarSolicitacao(categoria.id, '');
    }
  };

  const handleContinuarAviso = () => {
    if (categoriaEscolhida.precisaCampo) {
      setEtapa('campo');
    } else {
      enviarSolicitacao(categoriaEscolhida.id, '');
    }
  };

  const handleEnviarComCampo = () => {
    if (!mensagemAdicional.trim() && categoriaEscolhida.precisaCampo) {
      alert('Por favor, preencha o campo obrigatório');
      return;
    }
    enviarSolicitacao(categoriaEscolhida.id, mensagemAdicional);
  };

  const enviarSolicitacao = async (tipo, mensagem_adicional) => {
    setEnviando(true);
    try {
      await api.post('/solicitacoes/enviar', { tipo, mensagem_adicional });
      alert('✓ Solicitação enviada com sucesso!');
      onClose();
    } catch (err) {
      console.error('Erro ao enviar solicitação:', err);
      alert('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e558b 0%, #2d6197 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '16px 16px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            {etapa === 'lista' && 'Enviar solicitação'}
            {etapa === 'aviso' && categoriaEscolhida?.titulo}
            {etapa === 'campo' && categoriaEscolhida?.titulo}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '28px',
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Conteúdo */}
        <div style={{ padding: '20px' }}>
          {/* ETAPA: Lista de categorias */}
          {etapa === 'lista' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '12px',
              }}
            >
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleEscolherCategoria(cat)}
                  style={{
                    backgroundColor: '#f8f9fa',
                    border: '2px solid #e9ecef',
                    borderRadius: '12px',
                    padding: '16px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2d6197';
                    e.currentTarget.style.backgroundColor = '#f0f6fc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e9ecef';
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }}
                >
                  <span style={{ fontSize: '32px' }}>{cat.emoji}</span>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      textAlign: 'center',
                      color: '#1e558b',
                    }}
                  >
                    {cat.titulo}
                  </span>
                  {cat.subtitulo && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: cat.subtitulo === 'Urgente' ? '#dc3545' : '#6c757d',
                        textAlign: 'center',
                      }}
                    >
                      {cat.subtitulo}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ETAPA: Aviso */}
          {etapa === 'aviso' && (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '48px',
                  marginBottom: '16px',
                }}
              >
                ⚠️
              </div>
              <p
                style={{
                  fontSize: '16px',
                  color: '#495057',
                  marginBottom: '24px',
                }}
              >
                {categoriaEscolhida?.aviso}
              </p>
              <button
                onClick={handleContinuarAviso}
                style={{
                  background: 'linear-gradient(135deg, #1e558b 0%, #2d6197 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 32px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Entendi, continuar
              </button>
            </div>
          )}

          {/* ETAPA: Campo de texto */}
          {etapa === 'campo' && (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#495057',
                  marginBottom: '8px',
                }}
              >
                {categoriaEscolhida?.placeholder}
                {categoriaEscolhida?.precisaCampo && (
                  <span style={{ color: '#dc3545' }}> *</span>
                )}
              </label>
              <textarea
                value={mensagemAdicional}
                onChange={(e) => setMensagemAdicional(e.target.value)}
                placeholder={categoriaEscolhida?.placeholder}
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  marginBottom: '16px',
                }}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setEtapa('lista');
                    setMensagemAdicional('');
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: '#e9ecef',
                    color: '#495057',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Voltar
                </button>
                <button
                  onClick={handleEnviarComCampo}
                  disabled={enviando}
                  style={{
                    flex: 2,
                    background: 'linear-gradient(135deg, #1e558b 0%, #2d6197 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: enviando ? 'not-allowed' : 'pointer',
                    opacity: enviando ? 0.6 : 1,
                  }}
                >
                  {enviando ? 'Enviando...' : 'Enviar solicitação'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
