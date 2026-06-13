#!/bin/bash
# VM post-deploy for referral system. Run on 104.207.64.115 after local forge broadcast + git push.
#
# Usage:
#   export NEW_BONDING=0x...
#   export NEW_BLOCK=123456789
#   bash deploy/vm/referral-post-deploy.sh

set -euo pipefail

NEW_BONDING="${NEW_BONDING:?Set NEW_BONDING to the new BondingCurveManager address}"
NEW_BLOCK="${NEW_BLOCK:?Set NEW_BLOCK to the deploy block number}"
TMA_DIR="${TMA_DIR:-/var/www/pump/tma}"
INDEXER_DIR="${INDEXER_DIR:-/var/www/pump/Indexer}"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-/var/www/pump/contracts/out}"

log() { echo "[referral-post-deploy] $*"; }

log "Pull latest TMA repo"
cd "$TMA_DIR"
git fetch origin main
git reset --hard origin/main

log "Apply DB migrations 004 + 005"
sudo -u postgres psql -d pump_db -f "$TMA_DIR/db/migrations/004_admin_link_tasks.sql"
sudo -u postgres psql -d pump_db -f "$TMA_DIR/db/migrations/005_referral_system.sql"

log "Update contract_registry bonding_curve_manager"
sudo -u postgres psql -d pump_db -c "
UPDATE contract_registry
SET address = lower('${NEW_BONDING}'),
    deployment_block_number = ${NEW_BLOCK},
    updated_at = now()
WHERE contract_key = 'bonding_curve_manager';
"

log "Reminder: edit $TMA_DIR/.env → NEXT_PUBLIC_BONDING_CURVE_MANAGER=${NEW_BONDING}"
log "Then run: cd $TMA_DIR && ./deploy/tma-deploy.sh"

log "Sync indexer source"
rsync -a --exclude '.env' --exclude 'node_modules' "$TMA_DIR/indexer/" "$INDEXER_DIR/"

if [ -d "$TMA_DIR/contracts/out" ]; then
  log "Sync forge artifacts"
  mkdir -p "$ARTIFACTS_DIR"
  rsync -a "$TMA_DIR/contracts/out/" "$ARTIFACTS_DIR/"
else
  log "WARN: $TMA_DIR/contracts/out missing — run forge build locally and rsync out/ to VM"
fi

log "Rebuild indexer"
cd "$INDEXER_DIR"
npm ci
npm run build

log "Reminder: set INDEXER_START_BLOCK=$((NEW_BLOCK - 1)) in $INDEXER_DIR/.env"
log "Then: systemctl restart pump-indexer pump-airdrop-keeper"

log "Done (manual steps remain: TMA .env + tma-deploy + indexer .env + restart)"
