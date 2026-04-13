const express = require('express');
const { autenticarResponsavel, autenticarAdmin } = require('../middleware/auth');
const { getDb } = require('../database');
const { enviarPush } = require('../services/fcm');

const router = express.Router();
const SQLITE_UTC_TO_ISO = (campo) => `CASE WHEN ${campo} IS NOT NULL THEN REPLACE(${campo}, ' ', 'T') || 'Z' END`;

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
  [TIPOS_SOLICITACAO.QUEM_VAI_BUSCAR]: 'Informar responsável que vai buscar hoje.',
  [TIPOS_SOLICITACAO.ATESTADO_FREQUENCIA]: 'Solicito Atestado de Frequência.',
  [TIPOS_SOLICITACAO.ATESTADO_MATRICULA]: 'Solicito Atestado de Matrícula.',
  [TIPOS_SOLICITACAO.HISTORICO_ESCOLAR]: 'Solicito Histórico Escolar.',
  [TIPOS_SOLICITACAO.ATUALIZAR_CONTATO]: 'Solicito atualização dos meus dados de contato.',
};

// ══════════════════════════════════════════════════════════════════════════════
// ENVIAR SOLICITAÇÃO (Responsável)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/enviar', autenticarResponsavel, (req, res) => {
  const { tipo, mensagem_adicional } = req.body;
  const responsavel_id = req.responsavel?.responsavel_id || req.responsavel?.id;
  const aluno_id = req.responsavel?.aluno_id;

  if (!responsavel_id) {
    return res.status(401).json({ erro: 'Token de responsável inválido' });
  }

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
router.get('/minhas', autenticarResponsavel, (req, res) => {
  const { responsavel_id } = req.responsavel;
  const db = getDb();

  const solicitacoes = db.prepare(`
    SELECT
      s.*,
      ${SQLITE_UTC_TO_ISO('s.criada_em')} AS criada_em,
      ${SQLITE_UTC_TO_ISO('s.lida_em')} AS lida_em,
      ${SQLITE_UTC_TO_ISO('s.respondida_em')} AS respondida_em,
      a.nome as aluno_nome
    FROM solicitacoes_pais s
    LEFT JOIN alunos a ON s.aluno_id = a.id
    WHERE s.responsavel_id = ?
    ORDER BY s.criada_em DESC
    LIMIT 50
  `).all(responsavel_id);

  res.json(solicitacoes);
});

// Apagar solicitação (Responsável)
router.delete('/minhas/:id', autenticarResponsavel, (req, res) => {
  const { id } = req.params;
  const { responsavel_id } = req.responsavel;
  const db = getDb();

  const deleteStmt = db.prepare(`
    DELETE FROM solicitacoes_pais
    WHERE id = ? AND responsavel_id = ?
  `);

  const result = deleteStmt.run(id, responsavel_id);

  if (result.changes === 0) {
    return res.status(404).json({ erro: 'Solicitação não encontrada ou você não tem permissão para apagá-la' });
  }

  res.json({ sucesso: true, mensagem: 'Solicitação apagada' });
});

// ══════════════════════════════════════════════════════════════════════════════
// ROTAS ADMIN - Gerenciar Solicitações
// ══════════════════════════════════════════════════════════════════════════════

// Listar todas as solicitações (Admin)
router.get('/admin', autenticarAdmin, (req, res) => {
  const db = getDb();

  const solicitacoes = db.prepare(`
    SELECT
      s.*,
      ${SQLITE_UTC_TO_ISO('s.criada_em')} AS criada_em,
      ${SQLITE_UTC_TO_ISO('s.lida_em')} AS lida_em,
      ${SQLITE_UTC_TO_ISO('s.respondida_em')} AS respondida_em,
      a.nome as aluno_nome,
      r.nome as responsavel_nome,
      t.nome as turma_nome,
      t.codigo as turma_codigo
    FROM solicitacoes_pais s
    LEFT JOIN alunos a ON s.aluno_id = a.id
    LEFT JOIN responsaveis r ON s.responsavel_id = r.id
    LEFT JOIN turmas t ON a.turma_id = t.id
    ORDER BY t.nome, s.urgente DESC, s.criada_em DESC
    LIMIT 500
  `).all();

  res.json(solicitacoes);
});

// Ver detalhes de uma solicitação (Admin)
router.get('/admin/:id', autenticarAdmin, (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const solicitacao = db.prepare(`
    SELECT
      s.*,
      ${SQLITE_UTC_TO_ISO('s.criada_em')} AS criada_em,
      ${SQLITE_UTC_TO_ISO('s.lida_em')} AS lida_em,
      ${SQLITE_UTC_TO_ISO('s.respondida_em')} AS respondida_em,
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
router.post('/admin/:id/lida', autenticarAdmin, (req, res) => {
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
router.post('/admin/:id/responder', autenticarAdmin, async (req, res) => {
  const { id } = req.params;
  const { resposta } = req.body;

  if (!resposta || !resposta.trim()) {
    return res.status(400).json({ erro: 'Resposta é obrigatória' });
  }

  const db = getDb();

  // Buscar informações da solicitação antes de atualizar
  const solicitacao = db.prepare(`
    SELECT s.*, r.id as responsavel_id, r.nome as responsavel_nome, a.nome as aluno_nome
    FROM solicitacoes_pais s
    LEFT JOIN responsaveis r ON s.responsavel_id = r.id
    LEFT JOIN alunos a ON s.aluno_id = a.id
    WHERE s.id = ?
  `).get(id);

  if (!solicitacao) {
    return res.status(404).json({ erro: 'Solicitação não encontrada' });
  }

  const update = db.prepare(`
    UPDATE solicitacoes_pais
    SET respondida = 1, resposta = ?, respondida_em = datetime('now'), lida = 1, lida_em = COALESCE(lida_em, datetime('now'))
    WHERE id = ?
  `);

  update.run(resposta.trim(), id);

  // Enviar notificacao push para todos os dispositivos do responsavel
  const tokens = db.prepare(`
    SELECT fcm_token
    FROM responsavel_dispositivos
    WHERE responsavel_id = ?
  `).all(solicitacao.responsavel_id).map(t => t.fcm_token).filter(Boolean);

  if (tokens.length > 0) {
    try {
      const titulo = 'Resposta da Escola';
      const mensagem = `Sua solicitação foi respondida: ${resposta.trim().substring(0, 100)}${resposta.trim().length > 100 ? '...' : ''}`;

      await enviarPush(
        tokens,
        titulo,
        mensagem,
        false, // não é urgente
        id // ID da solicitação
      );

      console.log(`Notificacao de resposta enviada para ${solicitacao.responsavel_nome}`);
    } catch (err) {
      console.error('Erro ao enviar notificação de resposta:', err);
      // Não falha a requisição se a notificação falhar
    }
  }

  res.json({ sucesso: true, mensagem: 'Resposta enviada' });
});

// Apagar solicitação (Admin)
router.delete('/admin/:id', autenticarAdmin, (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const deleteStmt = db.prepare(`
    DELETE FROM solicitacoes_pais
    WHERE id = ?
  `);

  const result = deleteStmt.run(id);

  if (result.changes === 0) {
    return res.status(404).json({ erro: 'Solicitação não encontrada' });
  }

  res.json({ sucesso: true, mensagem: 'Solicitação apagada' });
});

module.exports = router;
