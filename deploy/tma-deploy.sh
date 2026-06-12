#!/bin/bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/pump/tma}"
PM2_APP="${PM2_APP:-pump-tma}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3012/api/health}"

log() {
  echo "[tma-deploy] $*"
}

cd "$APP_DIR"

log "Resetting generated files before pull"
git checkout -- next-env.d.ts 2>/dev/null || true

log "Pulling latest main"
git pull --ff-only origin main

log "Removing stale nested copy if present"
rm -rf tma

log "Installing dependencies"
npm ci

log "Building Next.js"
npm run build

log "Copying static assets into standalone output"
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static
if [ -d public ]; then
  cp -r public .next/standalone/public
fi

log "Restarting PM2 app: $PM2_APP"
pm2 restart "$PM2_APP"

log "Health check: $HEALTH_URL"
curl -sf "$HEALTH_URL" >/dev/null

log "Deploy finished successfully"
