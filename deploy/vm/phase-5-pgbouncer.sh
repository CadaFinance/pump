#!/usr/bin/env bash
# Phase 5: PgBouncer transaction pool + app env switch
set -euo pipefail

REPO="${REPO:-/var/www/pump/tma}"
cd "$REPO"

echo "==> Tier 3 indexes"
sudo -u postgres psql -d pump_db -f db/migrations/012_tier3_scale_indexes.sql

echo "==> PgBouncer (manual if not installed)"
echo "  sudo apt install -y pgbouncer"
echo "  sudo cp deploy/pgbouncer.ini.snippet /etc/pgbouncer/pgbouncer.ini"

sync_pgbouncer_userlist() {
  local dest="/etc/pgbouncer/userlist.txt"
  local tmp
  tmp="$(mktemp)"
  if ! sudo -u postgres psql -d postgres -tAc \
    "SELECT concat('\"', usename, '\" \"', passwd, '\"') FROM pg_shadow WHERE usename IN ('pump_app', 'pump_indexer') ORDER BY usename" \
    >"$tmp"; then
    echo "ERROR: failed to read pg_shadow for PgBouncer userlist"
    rm -f "$tmp"
    return 1
  fi
  if [[ ! -s "$tmp" ]]; then
    echo "ERROR: userlist empty — create pump_app and pump_indexer roles first"
    rm -f "$tmp"
    return 1
  fi
  sudo install -o postgres -g postgres -m 0600 "$tmp" "$dest"
  rm -f "$tmp"
  echo "==> Wrote $dest ($(wc -l <"$dest" | tr -d ' ') users)"
}

if command -v pgbouncer >/dev/null 2>&1; then
  sync_pgbouncer_userlist
  sudo systemctl enable --now pgbouncer
  sudo systemctl reload pgbouncer 2>/dev/null || sudo systemctl restart pgbouncer
else
  echo "  sudo apt install -y pgbouncer"
  echo "  Then re-run this script to sync userlist from pg_shadow"
fi

ENV_FILE="${ENV_FILE:-/var/www/pump/tma/.env}"
if [[ -f "$ENV_FILE" ]]; then
  grep -q '^PGBOUNCER_ENABLED=' "$ENV_FILE" || echo 'PGBOUNCER_ENABLED=true' >> "$ENV_FILE"
  grep -q '^PG_POOL_MAX=' "$ENV_FILE" || echo 'PG_POOL_MAX=4' >> "$ENV_FILE"
  if grep -q '^LAUNCHPAD_DATABASE_URL=.*:5432/' "$ENV_FILE"; then
    echo "==> Point LAUNCHPAD_DATABASE_URL to port 6432 (PgBouncer) in $ENV_FILE"
  fi
fi

INDEXER_ENV="${INDEXER_ENV:-/var/www/pump/Indexer/.env}"
if [[ -f "$INDEXER_ENV" ]]; then
  grep -q '^PGBOUNCER_ENABLED=' "$INDEXER_ENV" || echo 'PGBOUNCER_ENABLED=true' >> "$INDEXER_ENV"
fi

pm2 restart pump-tma || true
systemctl restart pump-indexer || true

bash deploy/vm/phase-0-observability.sh
