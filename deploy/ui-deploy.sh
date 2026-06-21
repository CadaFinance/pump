#!/bin/bash
# Fast deploy: Next.js UI + admin-console static only.
# Skips pump-realtime rebuild, realtime health, and indexer deploy.
# Use for CSS/components/admin copy changes — full stack: deploy/tma-deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/pump/tma}"
PM2_APP="${PM2_APP:-pump-tma}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3012/api/health}"
GIT_REF="${GIT_REF:-main}"

log() {
  echo "[ui-deploy] $*"
}

cd "$APP_DIR"

log "Syncing repo to origin/${GIT_REF}"
git fetch origin "$GIT_REF"
git reset --hard "origin/${GIT_REF}"
git clean -fd

log "Installing dependencies"
npm ci

log "Building Next.js"
npm run build

if [[ -f "$APP_DIR/deploy/admin-console-build.sh" ]]; then
  log "Building admin console"
  chmod +x "$APP_DIR/deploy/admin-console-build.sh"
  bash "$APP_DIR/deploy/admin-console-build.sh"
else
  log "WARN: deploy/admin-console-build.sh missing — skip admin build"
fi

log "Copying static assets into standalone output"
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static
if [ -d public ]; then
  cp -r public .next/standalone/public
fi

log "Restarting PM2 app: $PM2_APP (realtime + indexer unchanged)"
pm2 restart "$PM2_APP" --update-env

log "Health check: $HEALTH_URL"
health_ok=0
for attempt in $(seq 1 30); do
  if curl -sf "$HEALTH_URL" >/dev/null; then
    health_ok=1
    break
  fi
  log "Waiting for app to become ready (${attempt}/30)..."
  sleep 2
done

if [ "$health_ok" -ne 1 ]; then
  log "Health check failed after 60s: $PM2_APP"
  pm2 logs "$PM2_APP" --lines 30 --nostream || true
  exit 1
fi

log "UI deploy finished successfully"
log "App: http://<host>/  · Admin: http://<host>/admin/"
