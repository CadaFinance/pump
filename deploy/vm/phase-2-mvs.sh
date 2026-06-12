#!/usr/bin/env bash
# Phase 2: materialized views + initial refresh
set -euo pipefail

REPO="${REPO:-/var/www/pump/tma}"
cd "$REPO"
git pull

echo "==> Applying 002_materialized_views.sql"
sudo -u postgres psql -d pump_db -f db/migrations/002_materialized_views.sql

echo "==> Initial MV populate"
sudo -u postgres psql -d pump_db -f db/refresh/refresh_mvs.sql

echo "==> MV ownership (indexer refresh + TMA read)"
sudo -u postgres psql -d pump_db -f db/migrations/003_mv_ownership.sql

echo "==> Enable flags in .env (after verify):"
echo "  USE_MV_TOKEN_STATS=true"
echo "  MV_REFRESH_ENABLED=true"
echo "pm2 restart pump-tma"
echo "systemctl restart pump-indexer"
