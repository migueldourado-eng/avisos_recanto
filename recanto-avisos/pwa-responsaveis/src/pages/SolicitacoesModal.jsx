import { useState, useEffect } from 'react';
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
    titulo: 'Informar responsável que vai buscar hoje',
    subtitulo: 'Urgente',
    precisaCampo: true,
    placeholder: 'Nome completo da pessoa',
  },
  {
    id: 'atestado_frequencia',
    emoji: '📄',
    titulo: 'Solicitar Atestado de Frequência',
    subtitulo: '',
    precisaCampo: false,
    aviso: 'O prazo para retirada do documento é de 2 dias úteis após a solicitação ser respondida.',
  },
  {
    id: 'atestado_matricula',
    emoji: '📋',
    titulo: 'Solicitar Atestado de Matrícula',
    subtitulo: '',
    precisaCampo: false,
    aviso: 'O prazo para retirada do documento é de 1 dia útil após a solicitação ser respondida.',
  },
  {
    id: 'historico_escolar',
    emoji: '📊',
    titulo: 'Solicitar Histórico Escolar',
    subtitulo: '',
    precisaCampo: false,
    oculto: true,
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
  const [aba, setAba] = useState('nova'); // 'nova' | 'historico'
  const [etapa, setEtapa] = useState('lista'); // 'lista' | 'campo' | 'aviso'
  const [categoriaEscolhida, setCategoriaEscolhida] = useState(null);
  const [mensagemAdicional, setMensagemAdicional] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [minhasSolicitacoes, setMinhasSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(false);

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

  const carregarSolicitacoes = async (silencioso = false) => {
    if (!silencioso) {
      setCarregando(true);
    }
    try {
      const response = await api.get('/solicitacoes/minhas');
      setMinhasSolicitacoes(response.data);
    } catch (err) {
      console.error('Erro ao carregar solicitações:', err);
    } finally {
      if (!silencioso) {
        setCarregando(false);
      }
    }
  };

  const apagarSolicitacao = async (id) => {
    if (!confirm('Tem certeza que deseja apagar esta solicitação?')) return;

    try {
      await api.delete(`/solicitacoes/minhas/${id}`);
      setMinhasSolicitacoes(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Erro ao apagar solicitação:', err);
      alert('Não foi possível apagar a solicitação. Tente novamente.');
    }
  };

  const irParaRespostas = () => {
    setAba('historico');
  };

  useEffect(() => {
    if (aba === 'historico') {
      carregarSolicitacoes(false);
    }
  }, [aba]);

  useEffect(() => {
    if (aba !== 'historico') return undefined;
    const interval = setInterval(() => {
      carregarSolicitacoes(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [aba]);

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
            borderRadius: '16px 16px 0 0',
          }}
        >
          <div
            style={{
              padding: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
              Falar com a Escola
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

          {/* Abas */}
          <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <button
              onClick={() => setAba('nova')}
              style={{
                flex: 1,
                padding: '12px',
                background: aba === 'nova' ? 'rgba(255,255,255,0.2)' : 'transparent',
                border: 'none',
                borderBottom: aba === 'nova' ? '3px solid white' : '3px solid transparent',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Nova Solicitação
            </button>
            <button
              onClick={() => setAba('historico')}
              style={{
                flex: 1,
                padding: '12px',
                background: aba === 'historico' ? 'rgba(255,255,255,0.2)' : 'transparent',
                border: 'none',
                borderBottom: aba === 'historico' ? '3px solid white' : '3px solid transparent',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Respostas
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div style={{ padding: '20px' }}>
          {/* ABA: Nova Solicitação */}
          {aba === 'nova' && etapa === 'lista' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '12px',
              }}
            >
              {CATEGORIAS.filter(cat => !cat.oculto).map((cat) => (
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

              <button
                onClick={irParaRespostas}
                style={{
                  gridColumn: '1 / -1',
                  marginTop: '4px',
                  backgroundColor: '#eef4fb',
                  color: '#1e558b',
                  border: '2px solid #cfe2ff',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Ver Respostas da Escola
              </button>
            </div>
          )}

          {/* ABA: Nova Solicitação - Etapa Aviso */}
          {aba === 'nova' && etapa === 'aviso' && (
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
                Ciente
              </button>
            </div>
          )}

          {/* ABA: Nova Solicitação - Etapa Campo */}
          {aba === 'nova' && etapa === 'campo' && (
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

          {/* ABA: Histórico */}
          {aba === 'historico' && (
            <div>
              {carregando ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  Carregando...
                </div>
              ) : minhasSolicitacoes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  <p style={{ fontSize: '48px', marginBottom: '16px' }}>📭</p>
                  <p style={{ fontSize: '16px' }}>Nenhuma solicitação enviada ainda</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {minhasSolicitacoes.map((sol) => (
                    <div
                      key={sol.id}
                      style={{
                        backgroundColor: sol.respondida ? '#f0f9ff' : '#f8f9fa',
                        border: `2px solid ${sol.respondida ? '#2d6197' : '#e9ecef'}`,
                        borderRadius: '12px',
                        padding: '16px',
                      }}
                    >
                      {/* Cabeçalho da solicitação */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            {sol.urgente === 1 && (
                              <span style={{ fontSize: '16px' }}>🚨</span>
                            )}
                            <span style={{ fontSize: '12px', fontWeight: 700, color: sol.respondida ? '#2d6197' : '#6c757d', textTransform: 'uppercase' }}>
                              {sol.respondida ? '✓ Respondida' : 'Aguardando'}
                            </span>
                          </div>
                          <p style={{ fontSize: '11px', color: '#6c757d', margin: 0 }}>
                            {new Date(sol.criada_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button
                          onClick={() => apagarSolicitacao(sol.id)}
                          style={{
                            backgroundColor: '#fff3f2',
                            border: '1px solid #f5c2c7',
                            color: '#dc3545',
                            cursor: 'pointer',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                          title="Apagar solicitação"
                        >
                          Apagar
                        </button>
                      </div>

                      {/* Mensagem enviada */}
                      <div style={{ marginBottom: sol.respondida ? '12px' : '0' }}>
                        <p style={{ fontSize: '14px', color: '#495057', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>
                          {sol.mensagem}
                        </p>
                      </div>

                      {/* Resposta (se houver) */}
                      {sol.respondida && sol.resposta && (
                        <div style={{
                          marginTop: '12px',
                          paddingTop: '12px',
                          borderTop: '1px solid #cfe2ff',
                        }}>
                          <p style={{ fontSize: '12px', fontWeight: 700, color: '#2d6197', marginBottom: '8px' }}>
                            📢 Resposta da Escola:
                          </p>
                          <p style={{ fontSize: '14px', color: '#495057', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>
                            {sol.resposta}
                          </p>
                          {sol.respondida_em && (
                            <p style={{ fontSize: '11px', color: '#6c757d', marginTop: '8px', margin: 0 }}>
                              {new Date(sol.respondida_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


