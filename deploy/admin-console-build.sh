#!/bin/bash
# Build static admin console for nginx /admin/ (same-origin /api proxy).
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/pump/tma}"

log() {
  echo "[admin-console-build] $*"
}

cd "$APP_DIR/admin-console"

log "Installing dependencies"
npm ci

log "Building (base=/admin/, API same-origin)"
VITE_ADMIN_BASE=/admin/ npm run build

if [[ ! -f dist/index.html ]]; then
  log "dist/index.html missing"
  exit 1
fi

log "Admin console built → $APP_DIR/admin-console/dist"
