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

// GET /api/avisos/perguntas
// Retorna perguntas ativas para o responsavel (filtra por turma e aluno dos seus filhos)
router.get('/perguntas', autenticarResponsavel, (req, res) => {
  try {
    const db = getDb();
    const responsavelId = req.responsavel.responsavel_id;

    // Busca filhos do responsavel via responsavel_alunos
    let filhos = db.prepare(`
      SELECT DISTINCT a.id AS aluno_id, a.turma_id
      FROM responsavel_alunos ra
      JOIN alunos a ON a.id = ra.aluno_id
      WHERE ra.responsavel_id = ?
    `).all(responsavelId);

    // Fallback para contas legadas sem responsavel_alunos
    if (filhos.length === 0 && req.responsavel.aluno_id) {
      const aluno = db.prepare('SELECT id AS aluno_id, turma_id FROM alunos WHERE id = ?').get(req.responsavel.aluno_id);
      if (aluno) filhos = [aluno];
    }

    if (filhos.length === 0) return res.json([]);

    const turmaIds = [...new Set(filhos.map(f => f.turma_id).filter(Boolean))];
    const alunoIds = filhos.map(f => f.aluno_id);

    const turmaPh = turmaIds.length > 0 ? turmaIds.map(() => '?').join(',') : 'NULL';
    const alunoPh = alunoIds.map(() => '?').join(',');

    const perguntas = db.prepare(`
      SELECT p.id, p.texto, t.nome AS turma_nome, al.nome AS aluno_nome,
             rp.id AS respondida_id
      FROM perguntas p
      LEFT JOIN turmas t ON t.id = p.turma_id
      LEFT JOIN alunos al ON al.id = p.aluno_id
      LEFT JOIN respostas_pais rp ON rp.pergunta_id = p.id AND rp.responsavel_id = ?
      WHERE p.ativa = 1
        AND (
          p.turma_id IS NULL AND p.aluno_id IS NULL
          ${turmaIds.length > 0 ? `OR p.turma_id IN (${turmaPh})` : ''}
          OR p.aluno_id IN (${alunoPh})
        )
      ORDER BY p.criada_em DESC
    `).all(responsavelId, ...turmaIds, ...alunoIds);

    res.json(perguntas);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar perguntas' });
  }
});

// POST /api/avisos/perguntas/:id/responder
// Pai responde uma pergunta
router.post('/perguntas/:id/responder', autenticarResponsavel, (req, res) => {
  try {
    const { resposta } = req.body;
    const perguntaId = req.params.id;
    const responsavelId = req.responsavel.responsavel_id;

    if (!resposta || !resposta.trim()) {
      return res.status(400).json({ error: 'Resposta é obrigatória.' });
    }

    const db = getDb();

    // Verifica se pergunta existe e esta ativa
    const pergunta = db.prepare('SELECT id FROM perguntas WHERE id = ? AND ativa = 1').get(perguntaId);
    if (!pergunta) {
      return res.status(404).json({ error: 'Pergunta não encontrada ou foi fechada.' });
    }

    // Verifica se responsavel ja respondeu
    const jaRespondeu = db.prepare(
      'SELECT id FROM respostas_pais WHERE pergunta_id = ? AND responsavel_id = ?'
    ).get(perguntaId, responsavelId);

    if (jaRespondeu) {
      return res.status(409).json({ error: 'Você já respondeu esta pergunta.' });
    }

    // Insere resposta (usa primeiro aluno do responsavel como referencia)
    const primeiroAluno = db.prepare(
      'SELECT aluno_id FROM responsavel_alunos WHERE responsavel_id = ? LIMIT 1'
    ).get(responsavelId);

    if (!primeiroAluno) {
      return res.status(400).json({ error: 'Nenhum aluno vinculado.' });
    }

    db.prepare(
      'INSERT INTO respostas_pais (pergunta_id, responsavel_id, aluno_id, resposta) VALUES (?, ?, ?, ?)'
    ).run(perguntaId, responsavelId, primeiroAluno.aluno_id, resposta.trim());

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar resposta' });
  }
});

module.exports = router;
