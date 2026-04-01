const express = require('express');
const { verificarTokenResponsavel, verificarTokenAdmin } = require('../middleware/auth');
const { getDb } = require('../database');

const router = express.Router();

// ══════════════════════════════════════════════════════════════════════════════
// TIPOS DE SOLICITAÇÕES
// ══════════════════════════════════════════════════════════════════════════════
const TIPOS_SOLICITACAO = {
  FALTA_SEM_ATESTADO: 'falta_sem_atestado',
  FALTA_COM_ATESTADO: 'falta_com_atestado',
  VAI_TER_AULA: 'vai_ter_aula',
  QUEM_VAI_BUSCAR: 'quem_vai_buscar',
  ATESTADO_FREQUENCIA: 'atestado_frequencia',
  ATESTADO_MATRICULA: 'atestado_matricula',
  HISTORICO_ESCOLAR: 'historico_escolar',
  ATUALIZAR_CONTATO: 'atualizar_contato',
};

const MENSAGENS_PADRAO = {
  [TIPOS_SOLICITACAO.FALTA_SEM_ATESTADO]: 'Meu(s) filho(s) faltará(ão) hoje por motivo de doença (sem atestado médico).',
  [TIPOS_SOLICITACAO.FALTA_COM_ATESTADO]: 'Meu(s) filho(s) faltará(ão) hoje por motivo de doença. O atestado médico será entregue na escola.',
  [TIPOS_SOLICITACAO.VAI_TER_AULA]: 'Vai ter aula hoje?',
  [TIPOS_SOLICITACAO.ATESTADO_FREQUENCIA]: 'Solicito Atestado de Frequência.',
  [TIPOS_SOLICITACAO.ATESTADO_MATRICULA]: 'Solicito Atestado de Matrícula.',
  [TIPOS_SOLICITACAO.HISTORICO_ESCOLAR]: 'Solicito Histórico Escolar.',
  [TIPOS_SOLICITACAO.ATUALIZAR_CONTATO]: 'Solicito atualização dos meus dados de contato.',
};

// ══════════════════════════════════════════════════════════════════════════════
// ENVIAR SOLICITAÇÃO (Responsável)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/enviar', verificarTokenResponsavel, (req, res) => {
  const { tipo, mensagem_adicional } = req.body;
  const { id: responsavel_id, aluno_id } = req.responsavel;

  if (!tipo || !TIPOS_SOLICITACAO[tipo.toUpperCase()]) {
    return res.status(400).json({ erro: 'Tipo de solicitação inválido' });
  }

  const tipoNormalizado = TIPOS_SOLICITACAO[tipo.toUpperCase()];
  const mensagemPadrao = MENSAGENS_PADRAO[tipoNormalizado];
  const mensagemFinal = mensagem_adicional
    ? `${mensagemPadrao}\n\nObservação: ${mensagem_adicional}`
    : mensagemPadrao;

  // Verifica se é urgente (quem vai buscar hoje)
  const urgente = tipoNormalizado === TIPOS_SOLICITACAO.QUEM_VAI_BUSCAR ? 1 : 0;

  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO solicitacoes_pais (responsavel_id, aluno_id, tipo, mensagem, urgente)
    VALUES (?, ?, ?, ?, ?)
  `);

  try {
    const result = insert.run(responsavel_id, aluno_id, tipoNormalizado, mensagemFinal, urgente);

    res.json({
      sucesso: true,
      solicitacao_id: result.lastInsertRowid,
      mensagem: 'Solicitação enviada com sucesso!'
    });
  } catch (err) {
    console.error('Erro ao enviar solicitação:', err);
    res.status(500).json({ erro: 'Erro ao enviar solicitação' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// LISTAR SOLICITAÇÕES (Responsável)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/minhas', verificarTokenResponsavel, (req, res) => {
  const { id: responsavel_id } = req.responsavel;
  const db = getDb();

  const solicitacoes = db.prepare(`
    SELECT
      s.*,
      a.nome as aluno_nome
    FROM solicitacoes_pais s
    LEFT JOIN alunos a ON s.aluno_id = a.id
    WHERE s.responsavel_id = ?
    ORDER BY s.criada_em DESC
    LIMIT 50
  `).all(responsavel_id);

  res.json(solicitacoes);
});

// ══════════════════════════════════════════════════════════════════════════════
// ROTAS ADMIN - Gerenciar Solicitações
// ══════════════════════════════════════════════════════════════════════════════

// Listar todas as solicitações (Admin)
router.get('/admin', verificarTokenAdmin, (req, res) => {
  const db = getDb();

  const solicitacoes = db.prepare(`
    SELECT
      s.*,
      a.nome as aluno_nome,
      r.nome as responsavel_nome
    FROM solicitacoes_pais s
    LEFT JOIN alunos a ON s.aluno_id = a.id
    LEFT JOIN responsaveis r ON s.responsavel_id = r.id
    ORDER BY s.urgente DESC, s.criada_em DESC
    LIMIT 500
  `).all();

  res.json(solicitacoes);
});

// Ver detalhes de uma solicitação (Admin)
router.get('/admin/:id', verificarTokenAdmin, (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const solicitacao = db.prepare(`
    SELECT
      s.*,
      a.nome as aluno_nome,
      r.nome as responsavel_nome
    FROM solicitacoes_pais s
    LEFT JOIN alunos a ON s.aluno_id = a.id
    LEFT JOIN responsaveis r ON s.responsavel_id = r.id
    WHERE s.id = ?
  `).get(id);

  if (!solicitacao) {
    return res.status(404).json({ erro: 'Solicitação não encontrada' });
  }

  res.json(solicitacao);
});

// Marcar como lida (Admin)
router.post('/admin/:id/lida', verificarTokenAdmin, (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const update = db.prepare(`
    UPDATE solicitacoes_pais
    SET lida = 1, lida_em = datetime('now')
    WHERE id = ?
  `);

  update.run(id);

  res.json({ sucesso: true });
});

// Responder solicitação (Admin)
router.post('/admin/:id/responder', verificarTokenAdmin, (req, res) => {
  const { id } = req.params;
  const { resposta } = req.body;

  if (!resposta || !resposta.trim()) {
    return res.status(400).json({ erro: 'Resposta é obrigatória' });
  }

  const db = getDb();

  const update = db.prepare(`
    UPDATE solicitacoes_pais
    SET respondida = 1, resposta = ?, respondida_em = datetime('now'), lida = 1, lida_em = COALESCE(lida_em, datetime('now'))
    WHERE id = ?
  `);

  update.run(resposta.trim(), id);

  res.json({ sucesso: true, mensagem: 'Resposta enviada' });
});

module.exports = router;
