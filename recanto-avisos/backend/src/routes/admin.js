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
});

const avisoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitos avisos enviados. Aguarde 1 minuto.' },
});

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
      COUNT(DISTINCT CASE WHEN r.fcm_token IS NOT NULL THEN r.id END)  AS com_app,
      COUNT(DISTINCT CASE WHEN r.fcm_token IS NULL     THEN r.id END)  AS sem_app
    FROM turmas t
    LEFT JOIN alunos       a ON a.turma_id = t.id AND a.ativo = 1
    LEFT JOIN responsaveis r ON r.aluno_id  = a.id
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
      r.nome   AS responsavel_nome,
      r.fcm_token IS NOT NULL AS tem_app
    FROM alunos a
    LEFT JOIN turmas       t ON a.turma_id = t.id
    LEFT JOIN responsaveis r ON r.aluno_id  = a.id
    WHERE 1=1
  `;
  const params = [];

  if (turma_id) { query += ' AND a.turma_id = ?'; params.push(turma_id); }
  if (busca)    { query += ' AND a.nome LIKE ?';  params.push(`%${busca}%`); }

  query += ' ORDER BY t.nome, a.nome';

  res.json(db.prepare(query).all(...params));
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
    // Remove responsáveis vinculados (e suas entregas)
    const responsaveis = db.prepare('SELECT id FROM responsaveis WHERE aluno_id = ?').all(req.params.id);
    for (const r of responsaveis) {
      db.prepare('DELETE FROM entregas WHERE responsavel_id = ?').run(r.id);
    }
    db.prepare('DELETE FROM responsaveis WHERE aluno_id = ?').run(req.params.id);
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
      r.fcm_token IS NOT NULL AS tem_app,
      a.nome   AS aluno_nome,
      t.nome   AS turma_nome,
      t.codigo AS turma_codigo
    FROM responsaveis r
    LEFT JOIN alunos a ON r.aluno_id = a.id
    LEFT JOIN turmas t ON a.turma_id = t.id
    ORDER BY r.nome
  `).all();

  res.json(responsaveis);
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
      SELECT r.id, r.fcm_token
      FROM responsaveis r
      JOIN alunos a ON r.aluno_id = a.id
      WHERE a.ativo = 1
    `).all();
  } else if (tipo === 'turmas') {
    const ph = ids.map(() => '?').join(',');
    responsaveis = db.prepare(`
      SELECT DISTINCT r.id, r.fcm_token
      FROM responsaveis r
      JOIN alunos a ON r.aluno_id = a.id
      WHERE a.turma_id IN (${ph}) AND a.ativo = 1
    `).all(...ids);
  } else if (tipo === 'alunos') {
    const ph = ids.map(() => '?').join(',');
    responsaveis = db.prepare(`
      SELECT r.id, r.fcm_token
      FROM responsaveis r
      WHERE r.aluno_id IN (${ph})
    `).all(...ids);
  }

  // Criar registros de entrega
  const insertEntrega = db.prepare(
    'INSERT OR IGNORE INTO entregas (aviso_id, responsavel_id) VALUES (?, ?)'
  );
  db.transaction(() => {
    for (const r of responsaveis) insertEntrega.run(avisoId, r.id);
  })();

  // Enviar push em lote
  const comApp = responsaveis.filter(r => r.fcm_token);
  let push_enviados = 0;

  if (comApp.length > 0) {
    const tokens = comApp.map(r => r.fcm_token);
    const resultado = await enviarPush(tokens, titulo, mensagem, !!urgente, avisoId);
    push_enviados = resultado.enviados;

    // Marcar como enviado apenas os que tiveram sucesso
    const updateEntrega = db.prepare(
      'UPDATE entregas SET push_enviado = 1, push_enviado_em = CURRENT_TIMESTAMP WHERE aviso_id = ? AND responsavel_id = ?'
    );
    db.transaction(() => {
      for (const r of comApp) {
        if (resultado.tokens_enviados.has(r.fcm_token)) {
          updateEntrega.run(avisoId, r.id);
        }
      }
    })();
  }

  res.status(201).json({
    aviso_id: Number(avisoId),
    total_destinatarios: responsaveis.length,
    push_enviados,
    sem_app: responsaveis.length - comApp.length,
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
      a.id, a.titulo, a.urgente, a.criado_em,
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
  const aviso = db.prepare('SELECT * FROM avisos WHERE id = ?').get(req.params.id);

  if (!aviso) return res.status(404).json({ error: 'Aviso não encontrado.' });

  const entregas = db.prepare(`
    SELECT
      r.nome   AS responsavel_nome,
      a.nome   AS aluno_nome,
      t.nome   AS turma_nome,
      t.codigo AS turma_codigo,
      e.push_enviado, e.push_enviado_em,
      e.aberto, e.aberto_em
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
  const linhas = db.prepare(`
    SELECT
      a.id,
      a.titulo,
      a.mensagem,
      CASE WHEN a.urgente THEN 'Sim' ELSE 'Não' END AS urgente,
      a.enviado_por,
      adm.nome                                        AS admin_nome,
      COUNT(DISTINCT e.id)                            AS total_destinatarios,
      SUM(e.push_enviado)                             AS push_enviados,
      SUM(e.aberto)                                   AS abertos,
      strftime('%d/%m/%Y %H:%M', a.criado_em)        AS data_envio
    FROM avisos a
    LEFT JOIN admins   adm ON adm.id = a.admin_id
    LEFT JOIN entregas   e ON e.aviso_id = a.id
    GROUP BY a.id
    ORDER BY a.criado_em DESC
  `).all();

  // Busca turmas de cada aviso (via responsáveis → alunos → turmas)
  const turmasStmt = db.prepare(`
    SELECT DISTINCT t.nome
    FROM entregas e
    JOIN responsaveis r ON r.id = e.responsavel_id
    JOIN alunos al ON al.id = r.aluno_id
    JOIN turmas t ON t.id = al.turma_id
    WHERE e.aviso_id = ?
  `);
  const linhasComTurmas = linhas.map(l => {
    const turmas = turmasStmt.all(l.id).map(t => t.nome)
    return { ...l, turma: turmas.length > 0 ? turmas.join(', ') : 'Todas as turmas' }
  });

  const cabecalho = ['Título', 'Mensagem', 'Urgente', 'Enviado por', 'Perfil', 'Turma', 'Destinatários', 'Push enviados', 'Abertos', 'Data envio'];
  const csv = [
    cabecalho.join(';'),
    ...linhasComTurmas.map(l => [
      `"${(l.titulo||'').replace(/"/g,'""')}"`,
      `"${(l.mensagem||'').replace(/"/g,'""')}"`,
      l.urgente,
      `"${(l.enviado_por||'').replace(/"/g,'""')}"`,
      `"${(l.admin_nome||'').replace(/"/g,'""')}"`,
      `"${(l.turma||'').replace(/"/g,'""')}"`,
      l.total_destinatarios || 0,
      l.push_enviados || 0,
      l.abertos || 0,
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
      COUNT(DISTINCT CASE WHEN r.fcm_token IS NOT NULL THEN r.id END)  AS total_com_app,
      COUNT(DISTINCT CASE WHEN r.fcm_token IS NULL     THEN r.id END)  AS total_sem_app
    FROM alunos a
    LEFT JOIN responsaveis r ON r.aluno_id = a.id
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
      COUNT(DISTINCT CASE WHEN r.fcm_token IS NOT NULL THEN r.id END)  AS com_app,
      COUNT(DISTINCT CASE WHEN r.fcm_token IS NULL     THEN r.id END)  AS sem_app
    FROM turmas t
    LEFT JOIN alunos       a ON a.turma_id = t.id AND a.ativo = 1
    LEFT JOIN responsaveis r ON r.aluno_id  = a.id
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

      if (existente) {
        updateResponsavel.run(nomeResponsavel, telefone, existente.id);
      } else {
        insertResponsavel.run(nomeResponsavel, telefone, alunoEncontrado.id, uuidv4());
      }

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

  res.status(201).json(
    db.prepare('SELECT * FROM responsaveis WHERE id = ?').get(lastInsertRowid)
  );
});

module.exports = router;
