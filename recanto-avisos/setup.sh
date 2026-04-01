#!/bin/bash
set -e

# ── Verificar dependências ────────────────────────────────────────────────────
echo "🔍 Verificando dependências..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instale em: https://docs.docker.com/engine/install/"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose não encontrado. Instale o Docker Desktop ou o plugin."
    exit 1
fi

echo "✅ Docker OK"

# ── Criar .env se não existir ─────────────────────────────────────────────────
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Arquivo .env criado a partir do .env.example"
    echo "   ⚠️  EDITE O .env com suas configurações antes de continuar!"
    echo "   nano .env"
    read -p "   Pressione Enter quando terminar de editar o .env..."
fi

DOMAIN=$(grep '^DOMAIN=' .env | cut -d= -f2)
EMAIL=$(grep '^ADMIN_EMAIL=' .env | cut -d= -f2)

if [ -z "$DOMAIN" ]; then
    echo "❌ DOMAIN não definido no .env"
    exit 1
fi

echo "🌐 Domínio: $DOMAIN"

# ── Criar diretório de dados ──────────────────────────────────────────────────
mkdir -p ./data ./nginx/certbot/conf ./nginx/certbot/www
chmod 755 ./data

# Substituir SEU_DOMINIO no nginx.conf pelo domínio real
sed -i "s/SEU_DOMINIO/$DOMAIN/g" nginx/nginx.conf
echo "⚙️  nginx.conf configurado para $DOMAIN"

# ── Certificado SSL via Certbot ───────────────────────────────────────────────
echo "🔒 Obtendo certificado SSL para $DOMAIN..."

# Subir nginx temporariamente só na porta 80 para validação
docker run --rm \
    -v "$(pwd)/nginx/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/nginx/certbot/www:/var/www/certbot" \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive

echo "✅ Certificado SSL obtido!"

# ── Subir todos os serviços ───────────────────────────────────────────────────
echo "🔨 Construindo e subindo serviços..."
docker compose build
docker compose up -d

# Aguardar backend ficar saudável
echo "⏳ Aguardando backend inicializar..."
sleep 10

echo ""
echo "═══════════════════════════════════════════════"
echo "✅ Recanto Avisos rodando em https://$DOMAIN"
echo "👤 Acesse o painel admin em https://$DOMAIN/admin"
echo "📱 Os pais acessam https://$DOMAIN"
echo "═══════════════════════════════════════════════"
echo ""
echo "📋 Status:"
docker compose ps
