/**
 * Diagnóstico — verifica admins no banco e testa as senhas.
 * Execute: node src/scripts/check-admins.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcrypt');
const path   = require('path');

const DB_PATH = path.join(__dirname, '../../../data/recanto.db');

let db;
try {
  db = new DatabaseSync(DB_PATH);
} catch (err) {
  console.error('❌ Não foi possível abrir o banco:', DB_PATH);
  console.error(err.message);
  process.exit(1);
}

const senhasTeste = {
  gestao_escolar: 'Recanto@82463179',
  coordenacao:    'Coord@967128',
  secretaria:     'Secre@791364',
  administrativo: 'Admin@827139',
};

(async () => {
  const admins = db.prepare('SELECT id, nome, email, usuario, perfil, LENGTH(senha_hash) as hash_len FROM admins').all();
  console.log(`\n📋 Admins no banco (${admins.length} registros):\n`);
  console.log('  ID | Nome               | Usuário          | Perfil          | Hash OK?');
  console.log('  ───┼────────────────────┼──────────────────┼─────────────────┼─────────');

  for (const a of admins) {
    const senhaEsperada = senhasTeste[a.usuario];
    let hashOk = '(não testado)';
    if (senhaEsperada) {
      const row = db.prepare('SELECT senha_hash FROM admins WHERE id = ?').get(a.id);
      try {
        const match = await bcrypt.compare(senhaEsperada, row.senha_hash);
        hashOk = match ? '✅ OK' : '❌ ERRADO';
      } catch (e) {
        hashOk = '❌ ERRO: ' + e.message;
      }
    }
    console.log(
      `  ${String(a.id).padEnd(2)} | ${(a.nome||'').padEnd(18)} | ${(a.usuario||'(null)').padEnd(16)} | ${(a.perfil||'').padEnd(15)} | ${hashOk}`
    );
  }

  console.log('\n✅ Diagnóstico concluído.\n');
})();
