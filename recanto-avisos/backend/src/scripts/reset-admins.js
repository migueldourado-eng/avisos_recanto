/**
 * Script de uso único — atualiza usuários e senhas dos admins no banco existente.
 * Execute: node src/scripts/reset-admins.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcrypt');
const path   = require('path');

const DB_PATH = path.join(__dirname, '../../../data/recanto.db');
const db = new DatabaseSync(DB_PATH);

const admins = [
  { nome: 'Gestão',             usuario: 'gestao_escolar', senha: 'Recanto@82463179', perfil: 'master'         },
  { nome: 'Coordenação',        usuario: 'coordenacao',    senha: 'Coord@967128',     perfil: 'coordenacao'    },
  { nome: 'Secretaria Escolar', usuario: 'secretaria',     senha: 'Secre@791364',     perfil: 'secretaria'     },
  { nome: 'Administrativo',     usuario: 'administrativo', senha: 'Admin@827139',     perfil: 'administrativo' },
];

(async () => {
  console.log('🔄 Atualizando admins no banco...\n');

  for (const a of admins) {
    const hash = await bcrypt.hash(a.senha, 12);

    // Tenta atualizar pelo usuario
    const porUsuario = db.prepare('SELECT id FROM admins WHERE usuario = ?').get(a.usuario);
    // Tenta encontrar pelo perfil como fallback
    const porPerfil  = db.prepare('SELECT id FROM admins WHERE perfil = ?').get(a.perfil);

    const alvo = porUsuario || porPerfil;

    if (alvo) {
      db.prepare(`
        UPDATE admins SET nome = ?, usuario = ?, senha_hash = ?, perfil = ?
        WHERE id = ?
      `).run(a.nome, a.usuario, hash, a.perfil, alvo.id);
      console.log(`  ✅ Atualizado — perfil: ${a.perfil} | usuário: ${a.usuario}`);
    } else {
      // Cria se não existir
      db.prepare(`
        INSERT INTO admins (nome, email, usuario, senha_hash, perfil)
        VALUES (?, ?, ?, ?, ?)
      `).run(a.nome, `${a.usuario}@local`, a.usuario, hash, a.perfil);
      console.log(`  ➕ Criado    — perfil: ${a.perfil} | usuário: ${a.usuario}`);
    }
  }

  console.log('\n✅ Concluído. Credenciais atualizadas:');
  console.log('────────────────────────────────────────');
  admins.forEach(a => console.log(`  ${a.perfil.padEnd(15)} | ${a.usuario.padEnd(18)} | ${a.senha}`));
  console.log('────────────────────────────────────────');
})();
