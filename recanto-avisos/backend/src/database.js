// Usa o SQLite nativo do Node.js v22+ (node:sqlite) — sem compilação nativa
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/recanto.db');

let db;

function connect() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  // Adiciona db.transaction() compatível com a API do better-sqlite3
  db.transaction = function (fn) {
    return function (...args) {
      db.exec('BEGIN');
      try {
        const result = fn(...args);
        db.exec('COMMIT');
        return result;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    };
  };

  return db;
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      perfil TEXT NOT NULL DEFAULT 'secretaria',
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS turmas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      codigo TEXT UNIQUE NOT NULL,
      ano INTEGER NOT NULL DEFAULT 2026,
      qr_token TEXT UNIQUE NOT NULL,
      ativa BOOLEAN DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS alunos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      matricula TEXT UNIQUE,
      turma_id INTEGER REFERENCES turmas(id),
      ativo BOOLEAN DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS responsaveis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT,
      aluno_id INTEGER REFERENCES alunos(id),
      link_token TEXT UNIQUE NOT NULL,
      fcm_token TEXT,
      ultimo_acesso DATETIME,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS avisos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      urgente BOOLEAN DEFAULT 0,
      admin_id INTEGER REFERENCES admins(id),
      enviado_por TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS entregas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aviso_id INTEGER REFERENCES avisos(id),
      responsavel_id INTEGER REFERENCES responsaveis(id),
      push_enviado BOOLEAN DEFAULT 0,
      push_enviado_em DATETIME,
      aberto BOOLEAN DEFAULT 0,
      aberto_em DATETIME,
      UNIQUE(aviso_id, responsavel_id)
    );
  `);

  // Migrações incrementais — seguro rodar múltiplas vezes (ignoram se coluna já existe)
  try { db.exec(`ALTER TABLE admins ADD COLUMN perfil TEXT NOT NULL DEFAULT 'secretaria'`); } catch {}
  try { db.exec(`ALTER TABLE admins ADD COLUMN usuario TEXT`); } catch {}
  try { db.exec(`ALTER TABLE avisos ADD COLUMN enviado_por TEXT`); } catch {}
  try { db.exec(`ALTER TABLE responsaveis ADD COLUMN aceite_lgpd BOOLEAN DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE responsaveis ADD COLUMN aceite_lgpd_em DATETIME`); } catch {}

  // Garante que o admin legado (criado antes do campo perfil) seja master
  db.exec(`UPDATE admins SET perfil = 'master' WHERE perfil IS NULL OR perfil = '' OR perfil = 'secretaria' AND id = 1`);
}

function gerarNomeTurma(codigo) {
  if (codigo.startsWith('G')) {
    const numero = codigo.slice(1, -1);
    const letra  = codigo.slice(-1);
    return `Grupo ${numero} ${letra}`;
  } else {
    const numero = codigo.slice(0, -1);
    const letra  = codigo.slice(-1);
    return `${numero}º Ano ${letra}`;
  }
}

async function seed() {
  // ── Admins ────────────────────────────────────────────────────────────────
  const masterEmail = process.env.ADMIN_EMAIL || 'gestao@recantodasmargaridas.edu.br';
  const masterSenha = process.env.ADMIN_SENHA || 'trocar_na_primeira_vez';

  const adminsPadrao = [
    { nome: 'Gestão',             usuario: process.env.ADMIN_USUARIO || 'gestao_escolar', senha: process.env.ADMIN_SENHA || 'Recanto@82463179', perfil: 'master' },
    { nome: 'Coordenação',        usuario: 'coordenacao',                                 senha: 'Coord@967128',    perfil: 'coordenacao'    },
    { nome: 'Secretaria Escolar', usuario: 'secretaria',                                  senha: 'Secre@791364',    perfil: 'secretaria'     },
    { nome: 'Administrativo',     usuario: 'administrativo',                               senha: 'Admin@827139',   perfil: 'administrativo' },
  ];

  const insertAdmin = db.prepare(
    'INSERT OR IGNORE INTO admins (nome, email, usuario, senha_hash, perfil) VALUES (?, ?, ?, ?, ?)'
  );
  for (const a of adminsPadrao) {
    const exists = db.prepare('SELECT id FROM admins WHERE usuario = ?').get(a.usuario);
    if (!exists) {
      const hash = await bcrypt.hash(a.senha, 12);
      // email preenchido com usuario@local para manter constraint UNIQUE
      insertAdmin.run(a.nome, `${a.usuario}@local`, a.usuario, hash, a.perfil);
    }
  }

  // Atualiza admins legados (sem usuario) com o usuario derivado do email
  db.exec(`UPDATE admins SET usuario = SUBSTR(email, 1, INSTR(email,'@')-1) WHERE usuario IS NULL`);

  // ── Turmas ────────────────────────────────────────────────────────────────
  const { count: turmasCount } = db.prepare('SELECT COUNT(*) as count FROM turmas').get();
  if (turmasCount > 0) return;

  const codigos = [
    '1A','1B','1C','1D',
    '2A','2B','2C','2D',
    '3A','3B','3C','3D',
    'G2A','G2B',
    'G3A','G3B','G3C',
    'G4A','G4B','G4C',
    'G5A','G5B','G5C','G5D',
  ];

  const insertTurma = db.prepare(
    'INSERT INTO turmas (nome, codigo, qr_token) VALUES (?, ?, ?)'
  );

  db.transaction((lista) => {
    for (const codigo of lista) {
      insertTurma.run(gerarNomeTurma(codigo), codigo, uuidv4());
    }
  })(codigos);
}

function getDb() {
  return db;
}

module.exports = { connect, migrate, seed, getDb };
