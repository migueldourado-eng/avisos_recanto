const express = require('express');
const { getDb } = require('../database');
const { autenticarResponsavel } = require('../middleware/auth');

const router = express.Router();

// GET /api/avisos
// Retorna todos os avisos do responsável logado
// Ordem: urgentes primeiro, mais recentes primeiro
router.get('/', autenticarResponsavel, (req, res) => {
  const db = getDb();

  const avisos = db.prepare(`
    SELECT
      a.id, a.titulo, a.mensagem, a.urgente, a.criado_em,
      e.aberto, e.aberto_em
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

module.exports = router;
