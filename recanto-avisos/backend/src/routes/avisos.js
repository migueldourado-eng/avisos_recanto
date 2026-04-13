const express = require('express');
const { getDb } = require('../database');
const { autenticarResponsavel } = require('../middleware/auth');

const router = express.Router();
const SQLITE_UTC_TO_ISO = (campo) => `CASE WHEN ${campo} IS NOT NULL THEN REPLACE(${campo}, ' ', 'T') || 'Z' END`;
const COMPORTAMENTO_LABELS = {
  nao_avaliado: '⚪ Não avaliado',
  muito_positivo: '🌟 Comportamento muito positivo, serve de exemplo',
  adequado: '✅ Comportamento adequado e esperado para a idade',
  dificuldades_com_apoio: '🟡 Às vezes apresenta dificuldades, mas consegue melhorar com apoio',
  muitas_dificuldades: '🟠 Apresenta muitas dificuldades, precisa de acompanhamento constante',
  preocupante: '🔴 Comportamento preocupante, requer atenção imediata',
};

// GET /api/avisos
// Retorna todos os avisos do responsável logado
// Ordem: urgentes primeiro, mais recentes primeiro
router.get('/', autenticarResponsavel, (req, res) => {
  const db = getDb();

  const avisos = db.prepare(`
    SELECT
      a.id, a.titulo, a.mensagem, a.urgente,
      ${SQLITE_UTC_TO_ISO('a.criado_em')} AS criado_em,
      e.aberto,
      ${SQLITE_UTC_TO_ISO('e.aberto_em')} AS aberto_em
    FROM avisos a
    JOIN entregas e ON e.aviso_id = a.id
    WHERE e.responsavel_id = ?
    ORDER BY a.urgente DESC, a.criado_em DESC
  `).all(req.responsavel.responsavel_id);

  res.json(avisos);
});

// PATCH /api/avisos/:id/aberto
// Marca aviso como aberto (idempotente — não faz nada se já estiver aberto)
router.patch('/:id/aberto', autenticarResponsavel, (req, res) => {
  const db = getDb();

  db.prepare(`
    UPDATE entregas
    SET aberto = 1, aberto_em = CURRENT_TIMESTAMP
    WHERE aviso_id = ? AND responsavel_id = ? AND aberto = 0
  `).run(req.params.id, req.responsavel.responsavel_id);

  res.json({ ok: true });
});

// DELETE /api/avisos/:id
// Remove a entrega do aviso para o responsável (oculta o aviso da visualização)
router.delete('/:id', autenticarResponsavel, (req, res) => {
  const db = getDb();

  const result = db.prepare(`
    DELETE FROM entregas
    WHERE aviso_id = ? AND responsavel_id = ?
  `).run(req.params.id, req.responsavel.responsavel_id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Aviso não encontrado.' });
  }

  res.json({ ok: true });
});

// GET /api/avisos/resumo-aluno
// Retorna faltas, comportamento e observacoes de todos os filhos vinculados ao responsavel
router.get('/resumo-aluno', autenticarResponsavel, (req, res) => {
  const db = getDb();
  const responsavelId = req.responsavel.responsavel_id;

  // Busca todos os filhos vinculados via responsavel_alunos
  const filhos = db.prepare(`
    SELECT
      a.id AS aluno_id,
      a.nome AS aluno_nome,
      t.nome AS turma_nome,
      t.codigo AS turma_codigo,
      COALESCE(v.faltas_total, 0) AS faltas_total,
      COALESCE(v.comportamento, 'nao_avaliado') AS comportamento,
      COALESCE(v.observacoes, '') AS observacoes,
      v.atualizado_em
    FROM responsavel_alunos ra
    JOIN alunos a ON a.id = ra.aluno_id
    LEFT JOIN turmas t ON t.id = a.turma_id
    LEFT JOIN aluno_vida_escolar v ON v.aluno_id = a.id
    WHERE ra.responsavel_id = ?
    ORDER BY a.nome
  `).all(responsavelId);

  if (filhos.length === 0) {
    // Fallback para aluno_id no JWT (compatibilidade com contas antigas sem responsavel_alunos)
    const alunoId = req.responsavel.aluno_id;
    if (!alunoId) return res.status(404).json({ error: 'Nenhum aluno vinculado.' });

    const linha = db.prepare(`
      SELECT
        a.id AS aluno_id,
        a.nome AS aluno_nome,
        t.nome AS turma_nome,
        t.codigo AS turma_codigo,
        COALESCE(v.faltas_total, 0) AS faltas_total,
        COALESCE(v.comportamento, 'nao_avaliado') AS comportamento,
        COALESCE(v.observacoes, '') AS observacoes,
        v.atualizado_em
      FROM alunos a
      LEFT JOIN turmas t ON t.id = a.turma_id
      LEFT JOIN aluno_vida_escolar v ON v.aluno_id = a.id
      WHERE a.id = ?
      LIMIT 1
    `).get(alunoId);

    if (!linha) return res.status(404).json({ error: 'Aluno não encontrado.' });

    return res.json([{
      ...linha,
      comportamento_label: COMPORTAMENTO_LABELS[linha.comportamento] || COMPORTAMENTO_LABELS.nao_avaliado,
    }]);
  }

  res.json(filhos.map(f => ({
    ...f,
    comportamento_label: COMPORTAMENTO_LABELS[f.comportamento] || COMPORTAMENTO_LABELS.nao_avaliado,
  })));
});

module.exports = router;
