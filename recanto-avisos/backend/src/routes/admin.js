const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { parse: parseCsv } = require('csv-parse/sync');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { autenticarAdmin } = require('../middleware/auth');
const { enviarPush } = require('../services/fcm');
const { TEMPLATES, templatesPorCategoria } = require('../data/templates');

const router = express.Router();
const COMPORTAMENTOS_VIDA_ESCOLAR = new Set([
  'nao_avaliado',
  'muito_positivo',
  'adequado',
  'dificuldades_com_apoio',
  'muitas_dificuldades',
  'preocupante',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos CSV são permitidos.'));
    }
  },
});

const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 1 hora.' },
  validate: { trustProxy: false },
});

const avisoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitos avisos enviados. Aguarde 1 minuto.' },
});

const SQLITE_UTC_TO_ISO = (campo) => `CASE WHEN ${campo} IS NOT NULL THEN REPLACE(${campo}, ' ', 'T') || 'Z' END`;

// ─── Helpers CSV ─────────────────────────────────────────────────────────────

function normalizarTexto(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizarNome(str) {
  return normalizarTexto(str).toUpperCase();
}

function parseNaoNegativo(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

// Regex para detectar o ponto de corte no Middle Name:
// turma_code + espaço + relação
// Turma codes: 1A-3D (Ensino Fundamental) e G2A-G5D (Educação Infantil)
const TURMA_REGEX_INLINE = /(?:G[2-5][A-D]|[1-3][A-D])/i;
const RELACOES_PATTERN = 'M[aã]e|Pai|Av[oó]|Av[oô]|Tia|Tio|Respons[aá]vel';
const SPLIT_REGEX = new RegExp(
  `^(.*?)\\s+${TURMA_REGEX_INLINE.source}\\s+(${RELACOES_PATTERN})\\s+(.+)$`,
  'i'
);

function parsearLinha(row) {
  const primeiroNome = (row['First Name'] || '').trim();
  const nomeDoMeio  = (row['Middle Name'] || '').trim();
  const sobrenome   = (row['Last Name']   || '').trim();
  const labels      = (row['Labels']      || '').trim();
  const telefoneRaw = (row['Phone 1 - Value'] || '').trim();

  // Turma: extrair o código antes de "_2026" no campo Labels
  const labelMatch = labels.match(/([A-Z0-9]+)_2026/i);
  const turmaCsv = labelMatch ? labelMatch[1].toUpperCase() : 'sem_turma';

  // Separar nome do aluno e nome do responsável no Middle Name
  let nomeAlunoMeio  = nomeDoMeio;
  let nomeResponsavel = 'Responsável';

  const match = nomeDoMeio.match(SPLIT_REGEX);
  if (match) {
    nomeAlunoMeio   = match[1].trim();   // parte antes do código de turma
    // match[2] = relação (Mãe, Pai etc.) — não precisamos guardar separado
    nomeResponsavel = match[3].trim();
  }

  // Montar nome completo do aluno (Upper, sem acento para comparação)
  const partes = [primeiroNome, nomeAlunoMeio, sobrenome]
    .map(p => p.trim())
    .filter(Boolean);
  const nomeAluno = normalizarNome(partes.join(' '));

  // Limpar telefone: manter apenas dígitos
  const telefone = telefoneRaw.replace(/\D/g, '') || null;

  return { nomeAluno, nomeResponsavel, turmaCsv, telefone };
}

// ─── POST /api/admin/login ────────────────────────────────────────────────────

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { usuario, senha } = req.body;

    if (!usuario || !senha) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
    }

    const db = getDb();
    const admin = db.prepare('SELECT * FROM admins WHERE usuario = ?').get(usuario.trim().toLowerCase());

    if (!admin) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }

    const match = await bcrypt.compare(senha, admin.senha_hash);
    if (!match) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }

    const token = jwt.sign(
      { id: admin.id, usuario: admin.usuario, perfil: admin.perfil },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, admin: { id: admin.id, nome: admin.nome, usuario: admin.usuario, perfil: admin.perfil } });
  } catch (err) {
    next(err);
  }
});

// ─── Auth obrigatória para todas as rotas abaixo ──────────────────────────────

router.use(autenticarAdmin);

// ─── Middleware: apenas master ────────────────────────────────────────────────
function apenasmaster(req, res, next) {
  if (req.admin.perfil !== 'master') {
    return res.status(403).json({ error: 'Acesso restrito ao administrador master.' });
  }
  next();
}

// ─── GET /api/admin/admins ────────────────────────────────────────────────────

router.get('/admins', apenasmaster, (req, res) => {
  const db = getDb();
  const admins = db.prepare(
    'SELECT id, nome, usuario, perfil, criado_em FROM admins ORDER BY id'
  ).all();
  res.json(admins);
});

// ─── PUT /api/admin/admins/:id/senha ─────────────────────────────────────────

router.put('/admins/:id/senha', apenasmaster, async (req, res, next) => {
  try {
    const { nova_senha } = req.body;
    if (!nova_senha || nova_senha.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
    }
    const db = getDb();
    const alvo = db.prepare('SELECT id FROM admins WHERE id = ?').get(req.params.id);
    if (!alvo) return res.status(404).json({ error: 'Admin não encontrado.' });
    const hash = await bcrypt.hash(nova_senha, 12);
    db.prepare('UPDATE admins SET senha_hash = ? WHERE id = ?').run(hash, req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ─── PUT /api/admin/minha-senha ───────────────────────────────────────────────

router.put('/minha-senha', async (req, res, next) => {
  try {
    const { senha_atual, nova_senha } = req.body;
    if (!senha_atual || !nova_senha || nova_senha.length < 6) {
      return res.status(400).json({ error: 'Informe a senha atual e a nova senha (mín. 6 caracteres).' });
    }
    const db = getDb();
    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);
    const match = await bcrypt.compare(senha_atual, admin.senha_hash);
    if (!match) return res.status(401).json({ error: 'Senha atual incorreta.' });
    const hash = await bcrypt.hash(nova_senha, 12);
    db.prepare('UPDATE admins SET senha_hash = ? WHERE id = ?').run(hash, req.admin.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ─── GET /api/admin/turmas ────────────────────────────────────────────────────

router.get('/turmas', (req, res) => {
  const db = getDb();

  const turmas = db.prepare(`
    SELECT
      t.id, t.nome, t.codigo, t.ano, t.ativa,
      COUNT(DISTINCT a.id)                                              AS total_alunos,
      COUNT(DISTINCT CASE WHEN rd.id IS NOT NULL THEN r.id END)        AS com_app,
      COUNT(DISTINCT CASE WHEN rd.id IS NULL     THEN r.id END)        AS sem_app
    FROM turmas t
    LEFT JOIN alunos       a ON a.turma_id = t.id AND a.ativo = 1
    LEFT JOIN responsaveis r ON r.aluno_id  = a.id
    LEFT JOIN responsavel_dispositivos rd ON rd.responsavel_id = r.id
    GROUP BY t.id
    ORDER BY t.nome
  `).all();

  res.json(turmas);
});

// ─── GET /api/admin/turmas/:id/qrcode ────────────────────────────────────────

router.get('/turmas/:id/qrcode', (req, res) => {
  const db = getDb();
  const turma = db.prepare('SELECT * FROM turmas WHERE id = ?').get(req.params.id);

  if (!turma) {
    return res.status(404).json({ error: 'Turma não encontrada.' });
  }

  const domain = process.env.DOMAIN || 'localhost:3001';
  const url = `https://${domain}/?turma=${turma.qr_token}`;

  res.json({ turma_id: turma.id, turma_nome: turma.nome, turma_codigo: turma.codigo, url });
});

// ─── GET /api/admin/alunos ────────────────────────────────────────────────────

router.get('/alunos', (req, res) => {
  const db = getDb();
  const { turma_id, busca } = req.query;

  let query = `
    SELECT
      a.id, a.nome, a.matricula, a.ativo, a.turma_id,
      t.nome   AS turma_nome,
      t.codigo AS turma_codigo,
      (
        SELECT r2.nome
        FROM responsaveis r2
        JOIN responsavel_alunos ra2 ON ra2.responsavel_id = r2.id
        WHERE ra2.aluno_id = a.id
        ORDER BY r2.id
        LIMIT 1
      ) AS responsavel_nome,
      EXISTS(
        SELECT 1
        FROM responsavel_dispositivos rd
        JOIN responsaveis r3 ON r3.id = rd.responsavel_id
        WHERE r3.aluno_id = a.id
      ) AS tem_app,
      (
        SELECT COUNT(*)
        FROM responsavel_dispositivos rd
        JOIN responsaveis r4 ON r4.id = rd.responsavel_id
        WHERE r4.aluno_id = a.id
      ) AS dispositivos_count
    FROM alunos a
    LEFT JOIN turmas t ON a.turma_id = t.id
    WHERE 1=1
  `;
  const params = [];

  if (turma_id) { query += ' AND a.turma_id = ?'; params.push(turma_id); }
  if (busca)    { query += ' AND a.nome LIKE ?';  params.push(`%${busca}%`); }

  query += ' ORDER BY t.nome, a.nome';

  res.json(db.prepare(query).all(...params));
});

router.get('/alunos/:id/dispositivos', (req, res) => {
  const alunoId = Number(req.params.id);
  if (!Number.isInteger(alunoId) || alunoId <= 0) {
    return res.status(400).json({ error: 'aluno_id inválido.' });
  }

  const db = getDb();
  const aluno = db.prepare('SELECT id FROM alunos WHERE id = ?').get(alunoId);
  if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });

  const dispositivos = db.prepare(`
    SELECT
      rd.id,
      rd.fcm_token,
      rd.plataforma,
      rd.user_agent,
      rd.ultimo_acesso,
      rd.criado_em,
      r.id AS responsavel_id,
      r.nome AS responsavel_nome
    FROM responsavel_dispositivos rd
    JOIN responsaveis r ON r.id = rd.responsavel_id
    WHERE r.aluno_id = ?
    ORDER BY rd.ultimo_acesso DESC, rd.id DESC
  `).all(alunoId);

  res.json(dispositivos);
});

router.delete('/dispositivos/:id', (req, res) => {
  const dispositivoId = Number(req.params.id);
  if (!Number.isInteger(dispositivoId) || dispositivoId <= 0) {
    return res.status(400).json({ error: 'dispositivo_id inválido.' });
  }

  const db = getDb();
  const existe = db.prepare('SELECT id FROM responsavel_dispositivos WHERE id = ?').get(dispositivoId);
  if (!existe) return res.status(404).json({ error: 'Dispositivo não encontrado.' });

  db.prepare('DELETE FROM responsavel_dispositivos WHERE id = ?').run(dispositivoId);
  res.json({ ok: true });
});

// ─── POST /api/admin/alunos ───────────────────────────────────────────────────

router.post('/alunos', (req, res) => {
  const { nome, matricula, turma_id } = req.body;

  if (!nome || !turma_id) {
    return res.status(400).json({ error: 'nome e turma_id são obrigatórios.' });
  }

  const db = getDb();
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO alunos (nome, matricula, turma_id) VALUES (?, ?, ?)'
  ).run(nome.trim(), matricula || null, turma_id);

  res.status(201).json(db.prepare('SELECT * FROM alunos WHERE id = ?').get(lastInsertRowid));
});

// ─── PUT /api/admin/alunos/:id ────────────────────────────────────────────────

router.put('/alunos/:id', (req, res) => {
  const db = getDb();
  const aluno = db.prepare('SELECT * FROM alunos WHERE id = ?').get(req.params.id);

  if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });

  const { nome, matricula, turma_id, ativo } = req.body;

  db.prepare(
    'UPDATE alunos SET nome = ?, matricula = ?, turma_id = ?, ativo = ? WHERE id = ?'
  ).run(
    nome      !== undefined ? nome.trim()          : aluno.nome,
    matricula !== undefined ? (matricula || null)   : aluno.matricula,
    turma_id  !== undefined ? turma_id              : aluno.turma_id,
    ativo     !== undefined ? (ativo ? 1 : 0)       : aluno.ativo,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM alunos WHERE id = ?').get(req.params.id));
});

// ─── DELETE /api/admin/alunos/:id ────────────────────────────────────────────

router.delete('/alunos/:id', (req, res) => {
  const db = getDb();
  const aluno = db.prepare('SELECT * FROM alunos WHERE id = ?').get(req.params.id);
  if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });

  db.transaction(() => {
    // Busca responsáveis vinculados via responsavel_alunos (novo) ou aluno_id (legado)
    const responsaveisViaTabela = db.prepare(
      'SELECT responsavel_id AS id FROM responsavel_alunos WHERE aluno_id = ?'
    ).all(req.params.id);
    const responsaveisLegados = db.prepare(
      'SELECT id FROM responsaveis WHERE aluno_id = ? AND id NOT IN (SELECT responsavel_id FROM responsavel_alunos WHERE aluno_id = ?)'
    ).all(req.params.id, req.params.id);
    const todosResp = [...responsaveisViaTabela, ...responsaveisLegados];

    // Remove o vínculo com este aluno
    db.prepare('DELETE FROM responsavel_alunos WHERE aluno_id = ?').run(req.params.id);

    // Deleta responsáveis que ficaram sem nenhum filho vinculado
    for (const r of todosResp) {
      const outrosFilhos = db.prepare(
        'SELECT COUNT(*) AS cnt FROM responsavel_alunos WHERE responsavel_id = ?'
      ).get(r.id);
      const semFilhos = (outrosFilhos?.cnt ?? 0) === 0;
      const semFilhoLegado = !db.prepare(
        'SELECT 1 FROM responsaveis WHERE id = ? AND aluno_id IS NOT NULL AND aluno_id != ?'
      ).get(r.id, req.params.id);
      if (semFilhos && semFilhoLegado) {
        db.prepare('DELETE FROM entregas WHERE responsavel_id = ?').run(r.id);
        db.prepare('DELETE FROM responsaveis WHERE id = ?').run(r.id);
      }
    }

    db.prepare('DELETE FROM alunos WHERE id = ?').run(req.params.id);
  })();

  res.json({ ok: true });
});

// ─── GET /api/admin/responsaveis ─────────────────────────────────────────────

router.get('/responsaveis', (req, res) => {
  const db = getDb();

  const responsaveis = db.prepare(`
    SELECT
      r.id, r.nome, r.telefone, r.ultimo_acesso, r.criado_em,
      EXISTS(SELECT 1 FROM responsavel_dispositivos rd WHERE rd.responsavel_id = r.id) AS tem_app,
      (SELECT COUNT(*) FROM responsavel_dispositivos rd WHERE rd.responsavel_id = r.id) AS dispositivos_count,
      a.nome   AS aluno_nome,
      t.id     AS turma_id,
      t.nome   AS turma_nome,
      t.codigo AS turma_codigo
    FROM responsaveis r
    LEFT JOIN alunos a ON r.aluno_id = a.id
    LEFT JOIN turmas t ON a.turma_id = t.id
    ORDER BY r.nome
  `).all();

  res.json(responsaveis);
});

// â”€â”€â”€ GET /api/admin/vida-escolar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/vida-escolar', (req, res) => {
  const db = getDb();
  const { turma_id } = req.query;

  let sql = `
    SELECT
      a.id AS aluno_id,
      a.nome AS aluno_nome,
      a.turma_id,
      t.nome AS turma_nome,
      t.codigo AS turma_codigo,
      COALESCE(v.faltas_mes, 0) AS faltas_mes,
      COALESCE(v.faltas_total, 0) AS faltas_total,
      COALESCE(v.comportamento, 'nao_avaliado') AS comportamento,
      COALESCE(v.observacoes, '') AS observacoes,
      v.atualizado_em
    FROM alunos a
    LEFT JOIN turmas t ON t.id = a.turma_id
    LEFT JOIN aluno_vida_escolar v ON v.aluno_id = a.id
    WHERE a.ativo = 1
  `;
  const params = [];
  if (turma_id) {
    sql += ' AND a.turma_id = ?';
    params.push(Number(turma_id));
  }
  sql += ' ORDER BY t.nome, a.nome';

  res.json(db.prepare(sql).all(...params));
});

// â”€â”€â”€ PUT /api/admin/vida-escolar/aluno/:aluno_id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.put('/vida-escolar/aluno/:aluno_id', (req, res) => {
  const alunoId = Number(req.params.aluno_id);
  if (!Number.isInteger(alunoId) || alunoId <= 0) {
    return res.status(400).json({ error: 'aluno_id invÃ¡lido.' });
  }

  const db = getDb();
  const aluno = db.prepare('SELECT id FROM alunos WHERE id = ?').get(alunoId);
  if (!aluno) return res.status(404).json({ error: 'Aluno nÃ£o encontrado.' });

  const faltasAdicionar = req.body?.faltas_adicionar === undefined
    ? 0
    : parseNaoNegativo(req.body?.faltas_adicionar);
  const observacoes = typeof req.body?.observacoes === 'string' ? req.body.observacoes.trim() : '';
  const comportamento = typeof req.body?.comportamento === 'string'
    ? req.body.comportamento
    : 'nao_avaliado';

  if (faltasAdicionar === null) {
    return res.status(400).json({ error: 'faltas_adicionar deve ser um inteiro >= 0.' });
  }
  if (!COMPORTAMENTOS_VIDA_ESCOLAR.has(comportamento)) {
    return res.status(400).json({ error: 'comportamento invÃ¡lido.' });
  }

  const atual = db.prepare(`
    SELECT faltas_total
    FROM aluno_vida_escolar
    WHERE aluno_id = ?
  `).get(alunoId);
  const faltasTotal = Number(atual?.faltas_total || 0) + faltasAdicionar;

  db.prepare(`
    INSERT INTO aluno_vida_escolar (
      aluno_id, faltas_mes, faltas_total, comportamento, observacoes, atualizado_por_admin_id, atualizado_em
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(aluno_id) DO UPDATE SET
      faltas_mes = excluded.faltas_mes,
      faltas_total = excluded.faltas_total,
      comportamento = excluded.comportamento,
      observacoes = excluded.observacoes,
      atualizado_por_admin_id = excluded.atualizado_por_admin_id,
      atualizado_em = CURRENT_TIMESTAMP
  `).run(alunoId, faltasAdicionar, faltasTotal, comportamento, observacoes || null, req.admin.id);

  res.json({ ok: true, faltas_total: faltasTotal });
});

// â”€â”€â”€ POST /api/admin/vida-escolar/turma/:turma_id/comportamento â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/vida-escolar/turma/:turma_id/comportamento', (req, res) => {
  const turmaId = Number(req.params.turma_id);
  if (!Number.isInteger(turmaId) || turmaId <= 0) {
    return res.status(400).json({ error: 'turma_id invÃ¡lido.' });
  }

  const comportamento = typeof req.body?.comportamento === 'string'
    ? req.body.comportamento
    : '';
  if (!COMPORTAMENTOS_VIDA_ESCOLAR.has(comportamento)) {
    return res.status(400).json({ error: 'comportamento invÃ¡lido.' });
  }

  const db = getDb();
  const alunos = db.prepare('SELECT id FROM alunos WHERE turma_id = ? AND ativo = 1').all(turmaId);
  if (alunos.length === 0) {
    return res.json({ ok: true, atualizados: 0 });
  }

  const upsert = db.prepare(`
    INSERT INTO aluno_vida_escolar (
      aluno_id, comportamento, atualizado_por_admin_id, atualizado_em
    ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(aluno_id) DO UPDATE SET
      comportamento = excluded.comportamento,
      atualizado_por_admin_id = excluded.atualizado_por_admin_id,
      atualizado_em = CURRENT_TIMESTAMP
  `);

  db.transaction(() => {
    for (const a of alunos) upsert.run(a.id, comportamento, req.admin.id);
  })();

  res.json({ ok: true, atualizados: alunos.length });
});

// ─── DELETE /api/admin/vida-escolar/aluno/:aluno_id/faltas ───────────────────
router.delete('/vida-escolar/aluno/:aluno_id/faltas', (req, res) => {
  const alunoId = Number(req.params.aluno_id);
  if (!Number.isInteger(alunoId) || alunoId <= 0) {
    return res.status(400).json({ error: 'aluno_id invalido.' });
  }
  const db = getDb();
  db.prepare(`
    UPDATE aluno_vida_escolar
    SET faltas_total = 0, faltas_mes = 0, atualizado_em = CURRENT_TIMESTAMP
    WHERE aluno_id = ?
  `).run(alunoId);
  res.json({ ok: true, faltas_total: 0 });
});

// ─── DELETE /api/admin/vida-escolar/aluno/:aluno_id/comportamento ────────────
router.delete('/vida-escolar/aluno/:aluno_id/comportamento', (req, res) => {
  const alunoId = Number(req.params.aluno_id);
  if (!Number.isInteger(alunoId) || alunoId <= 0) {
    return res.status(400).json({ error: 'aluno_id invalido.' });
  }
  const db = getDb();
  db.prepare(`
    UPDATE aluno_vida_escolar
    SET comportamento = 'nao_avaliado', atualizado_em = CURRENT_TIMESTAMP
    WHERE aluno_id = ?
  `).run(alunoId);
  res.json({ ok: true });
});

// ─── POST /api/admin/responsaveis/desvincular-notificacoes ───────────────────
router.post('/responsaveis/desvincular-notificacoes', (req, res) => {
  const { tipo, responsavel_id, responsavel_ids, turma_id } = req.body || {};
  const db = getDb();

  let ids = [];

  if (tipo === 'responsavel') {
    if (!Number.isInteger(Number(responsavel_id))) {
      return res.status(400).json({ error: 'responsavel_id inválido.' });
    }
    ids = [Number(responsavel_id)];
  } else if (tipo === 'responsaveis') {
    if (!Array.isArray(responsavel_ids) || responsavel_ids.length === 0) {
      return res.status(400).json({ error: 'responsavel_ids é obrigatório.' });
    }
    ids = responsavel_ids
      .map(id => Number(id))
      .filter(id => Number.isInteger(id));
    if (ids.length === 0) {
      return res.status(400).json({ error: 'responsavel_ids inválido.' });
    }
  } else if (tipo === 'turma') {
    if (!Number.isInteger(Number(turma_id))) {
      return res.status(400).json({ error: 'turma_id inválido.' });
    }
    ids = db.prepare(`
      SELECT DISTINCT r.id
      FROM responsaveis r
      JOIN responsavel_alunos ra ON ra.responsavel_id = r.id
      JOIN alunos a ON a.id = ra.aluno_id
      WHERE a.turma_id = ?
    `).all(Number(turma_id)).map(r => r.id);
  } else {
    return res.status(400).json({ error: 'tipo inválido. Use: responsavel, responsaveis ou turma.' });
  }

  if (ids.length === 0) {
    return res.json({ ok: true, total_alvo: 0, desvinculados: 0 });
  }

  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`
    DELETE FROM responsavel_dispositivos
    WHERE responsavel_id IN (${placeholders})
  `).run(...ids);

  db.prepare(`
    UPDATE responsaveis
    SET fcm_token = NULL
    WHERE id IN (${placeholders})
  `).run(...ids);

  res.json({
    ok: true,
    total_alvo: ids.length,
    desvinculados: result.changes || 0,
  });
});

// ─── POST /api/admin/avisos ───────────────────────────────────────────────────

router.post('/avisos', avisoLimiter, async (req, res, next) => {
  try {
  const { titulo, mensagem, urgente, destinatarios, enviado_por } = req.body;

  if (!titulo || !mensagem || !destinatarios?.tipo) {
    return res.status(400).json({ error: 'titulo, mensagem e destinatarios.tipo são obrigatórios.' });
  }
  if (!enviado_por || !enviado_por.trim()) {
    return res.status(400).json({ error: 'Informe seu nome antes de enviar o aviso.' });
  }

  const { tipo, ids } = destinatarios;
  if ((tipo === 'turmas' || tipo === 'alunos') && (!ids || !ids.length)) {
    return res.status(400).json({ error: `destinatarios.ids é obrigatório quando tipo="${tipo}".` });
  }

  const db = getDb();

  const { lastInsertRowid: avisoId } = db.prepare(
    'INSERT INTO avisos (titulo, mensagem, urgente, admin_id, enviado_por) VALUES (?, ?, ?, ?, ?)'
  ).run(titulo, mensagem, urgente ? 1 : 0, req.admin.id, enviado_por.trim());

  // Resolver destinatários
  let responsaveis = [];

  if (tipo === 'todos') {
    responsaveis = db.prepare(`
      SELECT DISTINCT r.id
      FROM responsaveis r
      JOIN responsavel_alunos ra ON ra.responsavel_id = r.id
      JOIN alunos a ON a.id = ra.aluno_id
      WHERE a.ativo = 1
    `).all();
  } else if (tipo === 'turmas') {
    const ph = ids.map(() => '?').join(',');
    responsaveis = db.prepare(`
      SELECT DISTINCT r.id
      FROM responsaveis r
      JOIN responsavel_alunos ra ON ra.responsavel_id = r.id
      JOIN alunos a ON a.id = ra.aluno_id
      WHERE a.turma_id IN (${ph}) AND a.ativo = 1
    `).all(...ids);
  } else if (tipo === 'alunos') {
    const ph = ids.map(() => '?').join(',');
    responsaveis = db.prepare(`
      SELECT DISTINCT r.id
      FROM responsaveis r
      JOIN responsavel_alunos ra ON ra.responsavel_id = r.id
      WHERE ra.aluno_id IN (${ph})
    `).all(...ids);
  }

  // Criar registros de entrega
  const insertEntrega = db.prepare(
    'INSERT OR IGNORE INTO entregas (aviso_id, responsavel_id) VALUES (?, ?)'
  );
  db.transaction(() => {
    for (const r of responsaveis) insertEntrega.run(avisoId, r.id);
  })();

  // Enviar push em lote para todos os dispositivos dos responsáveis alvo
  const responsavelIds = responsaveis.map(r => r.id);
  let pushTargets = [];
  if (responsavelIds.length > 0) {
    const ph = responsavelIds.map(() => '?').join(',');
    pushTargets = db.prepare(`
      SELECT rd.fcm_token, rd.responsavel_id
      FROM responsavel_dispositivos rd
      WHERE rd.responsavel_id IN (${ph})
    `).all(...responsavelIds);
  }

  const tokensParaEnviar = [...new Set(pushTargets.map(t => t.fcm_token).filter(Boolean))];
  const responsaveisComApp = new Set(pushTargets.map(t => t.responsavel_id));
  let push_enviados = 0;

  if (tokensParaEnviar.length > 0) {
    const resultado = await enviarPush(tokensParaEnviar, titulo, mensagem, !!urgente, avisoId);
    push_enviados = resultado.enviados;

    const sucessoPorResponsavel = new Set(
      pushTargets
        .filter(t => resultado.tokens_enviados.has(t.fcm_token))
        .map(t => t.responsavel_id)
    );

    // Marcar como enviado quando ao menos um dispositivo do responsável recebeu
    const updateEntrega = db.prepare(
      'UPDATE entregas SET push_enviado = 1, push_enviado_em = CURRENT_TIMESTAMP WHERE aviso_id = ? AND responsavel_id = ?'
    );
    db.transaction(() => {
      for (const responsavelId of sucessoPorResponsavel) {
        updateEntrega.run(avisoId, responsavelId);
      }
    })();
  }

  res.status(201).json({
    aviso_id: Number(avisoId),
    total_destinatarios: responsaveis.length,
    push_enviados,
    sem_app: responsaveis.length - responsaveisComApp.size,
  });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/avisos ────────────────────────────────────────────────────

router.get('/avisos', (req, res) => {
  const db = getDb();

  const avisos = db.prepare(`
    SELECT
      a.id, a.titulo, a.urgente,
      ${SQLITE_UTC_TO_ISO('a.criado_em')} AS criado_em,
      a.enviado_por,
      adm.nome            AS admin_nome,
      adm.perfil          AS admin_perfil,
      COUNT(e.id)         AS total_entregas,
      SUM(e.push_enviado) AS push_enviados,
      SUM(e.aberto)       AS abertos
    FROM avisos a
    LEFT JOIN admins  adm ON adm.id = a.admin_id
    LEFT JOIN entregas  e ON e.aviso_id = a.id
    GROUP BY a.id
    ORDER BY a.criado_em DESC
  `).all();

  res.json(avisos);
});

// ─── GET /api/admin/avisos/:id/entregas ──────────────────────────────────────

router.get('/avisos/:id/entregas', (req, res) => {
  const db = getDb();
  const aviso = db.prepare(`
    SELECT
      a.*,
      ${SQLITE_UTC_TO_ISO('a.criado_em')} AS criado_em
    FROM avisos a
    WHERE a.id = ?
  `).get(req.params.id);

  if (!aviso) return res.status(404).json({ error: 'Aviso não encontrado.' });

  const entregas = db.prepare(`
    SELECT
      r.nome   AS responsavel_nome,
      a.nome   AS aluno_nome,
      t.nome   AS turma_nome,
      t.codigo AS turma_codigo,
      e.push_enviado,
      ${SQLITE_UTC_TO_ISO('e.push_enviado_em')} AS push_enviado_em,
      e.aberto,
      ${SQLITE_UTC_TO_ISO('e.aberto_em')} AS aberto_em
    FROM entregas e
    JOIN responsaveis r ON e.responsavel_id = r.id
    JOIN alunos       a ON r.aluno_id        = a.id
    LEFT JOIN turmas  t ON a.turma_id         = t.id
    WHERE e.aviso_id = ?
    ORDER BY t.nome, a.nome
  `).all(req.params.id);

  res.json({ aviso, entregas });
});

// ─── DELETE /api/admin/avisos/:id ────────────────────────────────────────────

router.delete('/avisos/:id', (req, res) => {
  const db = getDb();
  const aviso = db.prepare('SELECT id FROM avisos WHERE id = ?').get(req.params.id);
  if (!aviso) return res.status(404).json({ error: 'Aviso não encontrado.' });
  db.prepare('DELETE FROM entregas WHERE aviso_id = ?').run(req.params.id);
  db.prepare('DELETE FROM avisos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── DELETE /api/admin/avisos ─────────────────────────────────────────────────

router.delete('/avisos', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM entregas').run();
  db.prepare('DELETE FROM avisos').run();
  res.json({ ok: true });
});

// ─── GET /api/admin/avisos/exportar ──────────────────────────────────────────

router.get('/avisos/exportar', (req, res) => {
  const db = getDb();

  // Uma linha por entrega (destinatário), com todos os detalhes
  const linhas = db.prepare(`
    SELECT
      a.titulo,
      a.mensagem,
      CASE WHEN a.urgente THEN 'Sim' ELSE 'Não' END  AS urgente,
      a.enviado_por,
      adm.nome                                         AS admin_nome,
      t.nome                                           AS turma_nome,
      t.codigo                                         AS turma_codigo,
      al.nome                                          AS aluno_nome,
      r.nome                                           AS responsavel_nome,
      CASE WHEN e.push_enviado THEN 'Sim' ELSE 'Não' END AS push_enviado,
      CASE WHEN e.aberto       THEN 'Sim' ELSE 'Não' END AS aberto,
      strftime('%d/%m/%Y %H:%M', a.criado_em)         AS data_envio
    FROM entregas e
    JOIN avisos      a   ON a.id   = e.aviso_id
    LEFT JOIN admins adm ON adm.id = a.admin_id
    LEFT JOIN responsaveis r  ON r.id  = e.responsavel_id
    LEFT JOIN alunos       al ON al.id = r.aluno_id
    LEFT JOIN turmas       t  ON t.id  = al.turma_id
    ORDER BY a.criado_em DESC, t.nome, al.nome
  `).all();

  const cabecalho = ['Título', 'Mensagem', 'Urgente', 'Enviado por', 'Perfil', 'Turma', 'Aluno', 'Responsável', 'Push enviado', 'Aberto', 'Data envio'];
  const csv = [
    cabecalho.join(';'),
    ...linhas.map(l => [
      `"${(l.titulo         ||'').replace(/"/g,'""')}"`,
      `"${(l.mensagem       ||'').replace(/"/g,'""')}"`,
      l.urgente,
      `"${(l.enviado_por    ||'').replace(/"/g,'""')}"`,
      `"${(l.admin_nome     ||'').replace(/"/g,'""')}"`,
      `"${(l.turma_codigo   ? l.turma_codigo+' — '+l.turma_nome : '').replace(/"/g,'""')}"`,
      `"${(l.aluno_nome     ||'').replace(/"/g,'""')}"`,
      `"${(l.responsavel_nome||'').replace(/"/g,'""')}"`,
      l.push_enviado,
      l.aberto,
      l.data_envio,
    ].join(';'))
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="historico-avisos-${new Date().toISOString().slice(0,10)}.csv"`);
  res.send('\uFEFF' + csv); // BOM para Excel abrir corretamente
});

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

router.get('/stats', (req, res) => {
  const db = getDb();

  const totais = db.prepare(`
    SELECT
      COUNT(DISTINCT a.id)                                              AS total_alunos,
      COUNT(DISTINCT r.id)                                              AS total_responsaveis,
      COUNT(DISTINCT CASE WHEN rd.id IS NOT NULL THEN r.id END)        AS total_com_app,
      COUNT(DISTINCT CASE WHEN rd.id IS NULL     THEN r.id END)        AS total_sem_app
    FROM alunos a
    LEFT JOIN responsaveis r ON r.aluno_id = a.id
    LEFT JOIN responsavel_dispositivos rd ON rd.responsavel_id = r.id
    WHERE a.ativo = 1
  `).get();

  const avisos_hoje = db.prepare(`
    SELECT COUNT(*) AS total FROM avisos WHERE DATE(criado_em) = DATE('now', 'localtime')
  `).get().total;

  const por_turma = db.prepare(`
    SELECT
      t.codigo AS turma_codigo,
      t.nome   AS turma_nome,
      COUNT(DISTINCT a.id)                                              AS total_alunos,
      COUNT(DISTINCT CASE WHEN rd.id IS NOT NULL THEN r.id END)        AS com_app,
      COUNT(DISTINCT CASE WHEN rd.id IS NULL     THEN r.id END)        AS sem_app
    FROM turmas t
    LEFT JOIN alunos       a ON a.turma_id = t.id AND a.ativo = 1
    LEFT JOIN responsaveis r ON r.aluno_id  = a.id
    LEFT JOIN responsavel_dispositivos rd ON rd.responsavel_id = r.id
    WHERE t.ativa = 1
    GROUP BY t.id
    ORDER BY t.nome
  `).all();

  res.json({ ...totais, avisos_hoje, por_turma });
});

// ─── GET /api/admin/templates ─────────────────────────────────────────────────

router.get('/templates', (req, res) => {
  // ?agrupado=1 retorna por categoria, padrão retorna lista plana
  if (req.query.agrupado === '1') {
    return res.json(templatesPorCategoria());
  }
  res.json(TEMPLATES);
});

// ─── POST /api/admin/importar-csv ─────────────────────────────────────────────

router.post('/importar-csv', upload.single('arquivo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Arquivo CSV não enviado. Use o campo "arquivo".' });
  }

  let linhas;
  try {
    linhas = parseCsv(req.file.buffer.toString('utf8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true, // Google Contacts exporta com BOM
    });
  } catch (err) {
    return res.status(400).json({ error: `Erro ao parsear CSV: ${err.message}` });
  }

  const db = getDb();

  // Cache de turmas para evitar query repetida por linha
  const turmasCache = new Map();
  db.prepare('SELECT * FROM turmas WHERE ativa = 1').all().forEach(t => {
    turmasCache.set(t.codigo.toUpperCase(), t);
  });

  // Cache de alunos por turma_id para evitar queries em loop
  const alunosCache = new Map();
  function getAlunosDaTurma(turmaId) {
    if (!alunosCache.has(turmaId)) {
      alunosCache.set(
        turmaId,
        db.prepare('SELECT * FROM alunos WHERE turma_id = ? AND ativo = 1').all(turmaId)
      );
    }
    return alunosCache.get(turmaId);
  }

  const insertAluno = db.prepare(`
    INSERT INTO alunos (nome, turma_id) VALUES (?, ?)
  `);
  const insertResponsavel = db.prepare(`
    INSERT INTO responsaveis (nome, telefone, aluno_id, link_token)
    VALUES (?, ?, ?, ?)
  `);
  const updateResponsavel = db.prepare(`
    UPDATE responsaveis SET nome = ?, telefone = ? WHERE id = ?
  `);

  let vinculados = 0;
  let criados   = 0;
  const sem_turma_lista = [];
  const nao_vinculados = [];
  const erros = [];

  const processar = db.transaction(() => {
    for (const row of linhas) {
      let parsed;
      try {
        parsed = parsearLinha(row);
      } catch (err) {
        erros.push(`Linha ignorada (parse): ${err.message}`);
        continue;
      }

      const { nomeAluno, nomeResponsavel, turmaCsv, telefone } = parsed;

      if (turmaCsv === 'sem_turma' || !nomeAluno) {
        sem_turma_lista.push({ nome_csv: nomeAluno || '(sem nome)', nome_responsavel: nomeResponsavel, telefone, turma_csv: turmaCsv });
        continue;
      }

      const turma = turmasCache.get(turmaCsv);
      if (!turma) {
        nao_vinculados.push({ nome_aluno_csv: nomeAluno, turma_csv: turmaCsv, nome_responsavel: nomeResponsavel, telefone });
        continue;
      }

      // Buscar aluno por nome normalizado na turma; criar se não existir
      const alunos = getAlunosDaTurma(turma.id);
      let alunoEncontrado = alunos.find(a => normalizarNome(a.nome) === nomeAluno);

      if (!alunoEncontrado) {
        const { lastInsertRowid } = insertAluno.run(nomeAluno, turma.id);
        alunoEncontrado = { id: lastInsertRowid, nome: nomeAluno, turma_id: turma.id };
        // Invalidar cache da turma para próximas iterações
        alunosCache.delete(turma.id);
        criados++;
      }

      // Criar ou atualizar responsável vinculado ao aluno
      const existente = db.prepare(
        'SELECT * FROM responsaveis WHERE aluno_id = ?'
      ).get(alunoEncontrado.id);

      let responsavelId;
      if (existente) {
        updateResponsavel.run(nomeResponsavel, telefone, existente.id);
        responsavelId = existente.id;
      } else {
        const { lastInsertRowid } = insertResponsavel.run(nomeResponsavel, telefone, alunoEncontrado.id, uuidv4());
        responsavelId = lastInsertRowid;
      }

      // Garante vínculo na tabela responsavel_alunos
      db.prepare(
        'INSERT OR IGNORE INTO responsavel_alunos (responsavel_id, aluno_id) VALUES (?, ?)'
      ).run(responsavelId, alunoEncontrado.id);

      vinculados++;
    }
  });

  try {
    processar();
  } catch (err) {
    return res.status(500).json({ error: `Erro durante importação: ${err.message}` });
  }

  res.json({
    total_linhas: linhas.length,
    vinculados,
    alunos_criados: criados,
    nao_vinculados,
    sem_turma: sem_turma_lista.length,
    sem_turma_lista,
    erros,
  });
});

// ─── POST /api/admin/vincular-manual ─────────────────────────────────────────

router.post('/vincular-manual', (req, res) => {
  const { aluno_id, nome_responsavel, telefone } = req.body;

  if (!aluno_id || !nome_responsavel) {
    return res.status(400).json({ error: 'aluno_id e nome_responsavel são obrigatórios.' });
  }

  const db = getDb();
  const aluno = db.prepare('SELECT * FROM alunos WHERE id = ?').get(aluno_id);

  if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });

  const { lastInsertRowid } = db.prepare(
    'INSERT INTO responsaveis (nome, telefone, aluno_id, link_token) VALUES (?, ?, ?, ?)'
  ).run(nome_responsavel.trim(), telefone || null, aluno_id, uuidv4());

  db.prepare(
    'INSERT OR IGNORE INTO responsavel_alunos (responsavel_id, aluno_id) VALUES (?, ?)'
  ).run(lastInsertRowid, aluno_id);

  res.status(201).json(
    db.prepare('SELECT * FROM responsaveis WHERE id = ?').get(lastInsertRowid)
  );
});

module.exports = router;
