#!/bin/bash
set -e

echo "🚀 Iniciando deploy do Recanto Avisos..."

git pull origin main

echo "🔨 Construindo imagens..."
docker compose build

echo "▶️  Subindo serviços..."
docker compose up -d

echo ""
echo "📋 Status dos serviços:"
docker compose ps

echo ""
echo "📜 Últimos logs do backend:"
docker compose logs --tail=20 backend

echo ""
echo "✅ Deploy concluído!"
