#!/usr/bin/env bash
# Sync indexer source from pump-tma monorepo, rebuild, restart systemd services.
set -euo pipefail

TMA_DIR="${TMA_DIR:-/var/www/pump/tma}"
INDEXER_SRC="${TMA_DIR}/apps/indexer"
INDEXER_DIR="${INDEXER_DIR:-/var/www/pump/Indexer}"

log() { echo "[indexer-deploy] $*"; }

if [[ ! -d "$INDEXER_SRC/src" ]]; then
  log "Missing $INDEXER_SRC/src — run from VM with monorepo checked out"
  exit 1
fi

log "Sync indexer source (preserving $INDEXER_DIR/.env)"
mkdir -p "$INDEXER_DIR"
rsync -a --exclude '.env' --exclude 'node_modules' "$INDEXER_SRC/" "$INDEXER_DIR/"

log "Installing dependencies"
cd "$INDEXER_DIR"
npm ci

log "Building indexer"
npm run build

if [[ ! -f "$INDEXER_DIR/dist/indexer.js" ]]; then
  log "Build failed: dist/indexer.js missing"
  exit 1
fi

log "Restarting pump-indexer"
systemctl restart pump-indexer

if systemctl is-enabled pump-airdrop-keeper >/dev/null 2>&1; then
  log "Restarting pump-airdrop-keeper"
  systemctl restart pump-airdrop-keeper || true
fi

sleep 2
ready_line="$(journalctl -u pump-indexer -n 30 --no-pager 2>/dev/null | grep 'launchpad indexer ready' | tail -1 || true)"

if [[ -z "$ready_line" ]]; then
  log "ERROR: no 'launchpad indexer ready' in journal"
  journalctl -u pump-indexer -n 20 --no-pager || true
  exit 1
fi

log "$ready_line"

if echo "$ready_line" | grep -q 'mode=watchBlocks'; then
  log "Indexer mode: watchBlocks (eth_subscribe heads)"
elif echo "$ready_line" | grep -q 'mode=poll'; then
  log "Indexer mode: poll — for watchBlocks set INDEXER_USE_WS_BLOCKS=true and BSC_WS_URL in $INDEXER_DIR/.env"
elif echo "$ready_line" | grep -q 'mode='; then
  log "Indexer mode: unknown variant in log"
else
  log "WARN: log missing mode= — dist may be stale; re-run indexer-deploy"
  exit 1
fi

log "Indexer deploy finished successfully"
