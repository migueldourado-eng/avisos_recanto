#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-oracle.sh — Instalação inicial na VPS Oracle Cloud (Ubuntu 22.04)
# Execute UMA VEZ como root (ou com sudo):  sudo bash setup-oracle.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

DOMAIN="${1:-}"
EMAIL="${2:-}"
APP_DIR="/opt/recanto-avisos"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "Uso: sudo bash setup-oracle.sh SEU_DOMINIO SEU_EMAIL"
  echo "Ex:  sudo bash setup-oracle.sh avisos.suaescola.com.br admin@suaescola.com.br"
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo " 🏫 Recanto Avisos — Setup Oracle Cloud"
echo "    Domínio : $DOMAIN"
echo "    E-mail  : $EMAIL"
echo "═══════════════════════════════════════════════════════"
echo ""

# ── 1. Atualizar sistema ──────────────────────────────────────────────────────
echo "📦 Atualizando sistema..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Instalar Node.js 22 ────────────────────────────────────────────────────
echo "📦 Instalando Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

echo "   Node.js: $(node -v)"
echo "   npm    : $(npm -v)"

# ── 3. Instalar PM2 ───────────────────────────────────────────────────────────
echo "📦 Instalando PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

# ── 4. Instalar Nginx e Certbot ───────────────────────────────────────────────
echo "📦 Instalando Nginx e Certbot..."
apt-get install -y nginx certbot python3-certbot-nginx

# ── 5. Abrir firewall Oracle (iptables) ───────────────────────────────────────
echo "🔓 Abrindo portas 80 e 443 no firewall..."
iptables  -I INPUT  6 -m state --state NEW -p tcp --dport 80  -j ACCEPT
iptables  -I INPUT  7 -m state --state NEW -p tcp --dport 443 -j ACCEPT
netfilter-persistent save 2>/dev/null || true
apt-get install -y iptables-persistent 2>/dev/null || true

# ── 6. Criar diretórios ───────────────────────────────────────────────────────
echo "📁 Criando diretórios..."
mkdir -p "$APP_DIR"
mkdir -p /opt/recanto-data        # banco SQLite persistente
mkdir -p /var/log/recanto

# ── 7. Copiar código ──────────────────────────────────────────────────────────
echo "📋 Copiando aplicação..."
cp -r backend       "$APP_DIR/"
cp -r pwa-responsaveis "$APP_DIR/"
cp -r admin-panel   "$APP_DIR/"
cp    ecosystem.config.js "$APP_DIR/"

# ── 8. Instalar dependências do backend ───────────────────────────────────────
echo "📦 Instalando dependências do backend..."
cd "$APP_DIR/backend"
npm install --omit=dev

# ── 9. Build da PWA ───────────────────────────────────────────────────────────
echo "🔨 Compilando PWA dos responsáveis..."
cd "$APP_DIR/pwa-responsaveis"
npm install
VITE_API_URL="https://$DOMAIN" npm run build

# ── 10. Criar .env de produção ────────────────────────────────────────────────
echo "⚙️  Criando .env de produção..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
cat > "$APP_DIR/backend/.env" << EOF
NODE_ENV=production
PORT=3001
JWT_SECRET=$JWT_SECRET
ADMIN_USUARIO=gestao_escolar
ADMIN_SENHA=Recanto@82463179
ALLOWED_ORIGINS=https://$DOMAIN
DB_PATH=/opt/recanto-data/recanto.db
EOF

echo ""
echo "   ⚠️  IMPORTANTE: edite $APP_DIR/backend/.env para:"
echo "       - Definir as senhas dos admins"
echo "       - Adicionar o Firebase (GOOGLE_APPLICATION_CREDENTIALS)"
echo ""

# ── 11. Configurar Nginx ──────────────────────────────────────────────────────
echo "⚙️  Configurando Nginx..."
cp nginx/nginx-oracle.conf /etc/nginx/nginx.conf
sed -i "s/SEU_DOMINIO/$DOMAIN/g" /etc/nginx/nginx.conf
nginx -t && systemctl reload nginx

# ── 12. Certificado SSL ───────────────────────────────────────────────────────
echo "🔒 Obtendo certificado SSL..."
certbot --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive --redirect

# ── 13. Ajustar DB_PATH no database.js ───────────────────────────────────────
# O banco usa path relativo por padrão — sobrescrever via DB_PATH no .env
grep -q 'DB_PATH' "$APP_DIR/backend/src/database.js" || \
  sed -i "s|path.join(__dirname, '../../data/recanto.db')|process.env.DB_PATH \|\| path.join(__dirname, '../../data/recanto.db')|" \
    "$APP_DIR/backend/src/database.js"

# ── 14. Iniciar backend com PM2 ───────────────────────────────────────────────
echo "🚀 Iniciando backend com PM2..."
cd "$APP_DIR"
pm2 start ecosystem.config.js
pm2 save

# ── 15. Renovação automática do SSL ──────────────────────────────────────────
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && nginx -s reload") | crontab -

echo ""
echo "═══════════════════════════════════════════════════════"
echo " ✅ Deploy concluído!"
echo ""
echo "   🌐 PWA:   https://$DOMAIN"
echo "   🔧 Admin: https://$DOMAIN/admin"
echo "   📊 PM2:   pm2 status"
echo "   📜 Logs:  pm2 logs recanto-avisos"
echo ""
echo "   ⚠️  Próximos passos:"
echo "   1. Edite $APP_DIR/backend/.env com as credenciais finais"
echo "   2. Coloque o serviceAccountKey.json do Firebase em $APP_DIR/backend/"
echo "   3. pm2 restart recanto-avisos"
echo "═══════════════════════════════════════════════════════"
