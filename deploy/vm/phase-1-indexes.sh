#!/usr/bin/env bash
# Phase 1a: apply performance indexes
set -euo pipefail

REPO="${REPO:-/var/www/pump/tma}"
cd "$REPO"
git pull

echo "==> Applying 001_perf_indexes.sql"
sudo -u postgres psql -d pump_db -f db/migrations/001_perf_indexes.sql

echo "==> Enable bonding state read path (optional, after verify)"
echo "Add to /var/www/pump/tma/.env: USE_BONDING_STATE_COUNTS=true"
echo "Then: pm2 restart pump-tma"

echo "==> Restart indexer after code deploy for incremental holder_count"
echo "systemctl restart pump-indexer"

bash deploy/vm/phase-0-observability.sh
