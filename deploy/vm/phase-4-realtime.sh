#!/usr/bin/env bash
# Phase 4: Redis + pump-realtime + nginx /ws
set -euo pipefail

REPO="${REPO:-/var/www/pump/tma}"
cd "$REPO"
git pull

if ! command -v redis-cli >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y redis-server
fi

sudo systemctl enable redis-server
sudo systemctl restart redis-server
redis-cli ping

cd realtime
npm ci
npm run build
cd ..

pm2 start ecosystem.config.cjs --only pump-realtime || pm2 restart pump-realtime
pm2 save

sudo nginx -t
sudo systemctl reload nginx

echo "==> Indexer .env:"
echo "  REDIS_URL=redis://127.0.0.1:6379"
echo "  REDIS_PUBLISH_ENABLED=true"
echo "  MV_REFRESH_ENABLED=true"
echo "systemctl restart pump-indexer"

echo "==> TMA .env:"
echo "  NEXT_PUBLIC_WS_ENABLED=true"
echo "  NEXT_PUBLIC_WS_URL=wss://pump.zugchain.org/ws"
echo "pm2 restart pump-tma"
