#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy-oracle.sh — Atualizar o app na VPS (após mudanças no código)
# Execute: bash deploy-oracle.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

APP_DIR="/opt/recanto-avisos"

echo "🔄 Atualizando Recanto Avisos..."

# ── Copiar arquivos novos ─────────────────────────────────────────────────────
echo "📋 Copiando arquivos..."
cp -r backend/src         "$APP_DIR/backend/"
cp -r admin-panel         "$APP_DIR/"
cp    ecosystem.config.js "$APP_DIR/"

# ── Instalar novas dependências (se houver) ───────────────────────────────────
cd "$APP_DIR/backend"
npm install --omit=dev

# ── Rebuild da PWA se necessário ─────────────────────────────────────────────
if [ "${1:-}" == "--pwa" ]; then
  echo "🔨 Rebuilding PWA..."
  cd "$APP_DIR/pwa-responsaveis"
  cp -r "$(pwd)/../../pwa-responsaveis/src" .
  npm run build
fi

# ── Reiniciar backend ─────────────────────────────────────────────────────────
echo "♻️  Reiniciando backend..."
pm2 restart recanto-avisos

echo ""
echo "✅ Update concluído!"
pm2 status
