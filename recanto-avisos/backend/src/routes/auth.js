const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { autenticarResponsavel } = require('../middleware/auth');

const router = express.Router();

function normalizar(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// POST /api/auth/login-turma
router.post('/login-turma', (req, res, next) => {
  try {
    const { qr_token, nome_aluno } = req.body;

    if (!qr_token || !nome_aluno || !nome_aluno.trim()) {
      return res.status(400).json({ error: 'qr_token e nome_aluno são obrigatórios.' });
    }

    const db = getDb();

    const turma = db.prepare(
      'SELECT * FROM turmas WHERE qr_token = ? AND ativa = 1'
    ).get(qr_token);

    if (!turma) {
      return res.status(404).json({ error: 'QR Code inválido ou turma inativa.' });
    }

    const alunos = db.prepare(
      'SELECT * FROM alunos WHERE turma_id = ? AND ativo = 1'
    ).all(turma.id);

    const nomeNorm = normalizar(nome_aluno);

    let aluno = alunos.find(a => normalizar(a.nome) === nomeNorm);

    if (!aluno) {
      const parciais = alunos.filter(a => normalizar(a.nome).includes(nomeNorm));
      if (parciais.length === 1) {
        aluno = parciais[0];
      } else if (parciais.length > 1) {
        return res.status(400).json({
          error: 'Nome ambíguo. Informe o nome completo do aluno.',
        });
      }
    }

    if (!aluno) {
      return res.status(404).json({ error: 'Aluno não encontrado nesta turma.' });
    }

    let responsavel = db.prepare(
      'SELECT * FROM responsaveis WHERE aluno_id = ?'
    ).get(aluno.id);

    if (!responsavel) {
      const { lastInsertRowid } = db.prepare(
        'INSERT INTO responsaveis (nome, aluno_id, link_token) VALUES (?, ?, ?)'
      ).run(`Responsável de ${aluno.nome}`, aluno.id, uuidv4());
      responsavel = db.prepare('SELECT * FROM responsaveis WHERE id = ?').get(lastInsertRowid);
    }

    db.prepare(
      'UPDATE responsaveis SET ultimo_acesso = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(responsavel.id);

    const token = jwt.sign(
      { responsavel_id: responsavel.id, aluno_id: aluno.id, turma_id: turma.id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      aluno_nome: aluno.nome,
      turma_nome: turma.nome,
      turma_codigo: turma.codigo,
      aceite_lgpd: !!responsavel.aceite_lgpd,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/sugestoes?turma=QR_TOKEN&nome=TEXTO
router.get('/sugestoes', (req, res, next) => {
  try {
    const { turma, nome } = req.query;
    if (!turma || !nome || nome.length < 3) return res.json([]);

    const db = getDb();
    const turmaObj = db.prepare(
      'SELECT * FROM turmas WHERE qr_token = ? AND ativa = 1'
    ).get(turma);
    if (!turmaObj) return res.json([]);

    const alunos = db.prepare(
      'SELECT nome FROM alunos WHERE turma_id = ? AND ativo = 1'
    ).all(turmaObj.id);

    if (nome.length > 60) return res.json([]);

    const nomeNorm = normalizar(nome);
    const matches = alunos
      .filter(a => normalizar(a.nome).includes(nomeNorm))
      .slice(0, 5)
      .map(a => a.nome);

    res.json(matches);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/aceite-lgpd
router.post('/aceite-lgpd', autenticarResponsavel, (req, res, next) => {
  try {
    const db = getDb();
    db.prepare(
      'UPDATE responsaveis SET aceite_lgpd = 1, aceite_lgpd_em = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(req.responsavel.responsavel_id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/auth/register-fcm-token
router.post('/register-fcm-token', autenticarResponsavel, (req, res, next) => {
  try {
    const { fcm_token } = req.body;
    if (!fcm_token) {
      return res.status(400).json({ error: 'fcm_token é obrigatório.' });
    }

    const db = getDb();
    db.prepare('UPDATE responsaveis SET fcm_token = ? WHERE id = ?')
      .run(fcm_token, req.responsavel.responsavel_id);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
