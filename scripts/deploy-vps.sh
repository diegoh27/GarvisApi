#!/usr/bin/env bash
# Despliegue en VPS (CloudPanel o nginx manual)
# Uso: bash scripts/deploy-vps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB_DIST="${WEB_DIST:-/var/www/garvis/dist}"
API_DIR="${API_DIR:-$ROOT/api}"
WEB_DIR="${WEB_DIR:-$ROOT/web}"

echo "==> API: dependencias"
cd "$API_DIR"
npm ci --omit=dev 2>/dev/null || npm ci

if [[ ! -f .env ]]; then
  echo "ERROR: Falta $API_DIR/.env"
  echo "       cp .env.production.example .env  y edita los valores."
  exit 1
fi

echo "==> API: PM2"
mkdir -p logs
if pm2 describe garvis-api >/dev/null 2>&1; then
  pm2 restart ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js
fi
pm2 save

echo "==> API: health check local"
sleep 2
curl -sf "http://127.0.0.1:3001/health" || {
  echo "ERROR: La API no responde en :3001. Revisa: pm2 logs garvis-api"
  exit 1
}
echo "OK /health"

echo "==> WEB: build producción (usa web/.env.production → VITE_API_URL=https://api.garbis.online)"
cd "$WEB_DIR"
npm ci
npm run build:prod

echo "==> WEB: copiar dist"
sudo mkdir -p "$WEB_DIST"
sudo rm -rf "${WEB_DIST:?}"/*
sudo cp -r dist/* "$WEB_DIST/"
echo "Frontend en $WEB_DIST"

echo ""
echo "Listo. Verifica:"
echo "  curl -s https://api.garbis.online/health"
echo "  Abre https://garbis.online/auth/login (Ctrl+Shift+R)"
echo ""
echo "CloudPanel API: proxy_pass debe apuntar a http://127.0.0.1:3001"
