#!/usr/bin/env bash
# Phase 0: pg_stat_statements + baseline metrics (safe, no app changes)
set -euo pipefail

PG_CONF="${PG_CONF:-/etc/postgresql/16/main/postgresql.conf}"
PG_VERSION="${PG_VERSION:-16}"

echo "==> Checking PostgreSQL config for pg_stat_statements"
if ! grep -q "pg_stat_statements" "$PG_CONF" 2>/dev/null; then
  echo "Add to $PG_CONF:"
  echo "  shared_preload_libraries = 'pg_stat_statements'"
  echo "  pg_stat_statements.max = 10000"
  echo "  pg_stat_statements.track = all"
  echo "Then: sudo systemctl restart postgresql"
else
  echo "pg_stat_statements appears configured in postgresql.conf"
fi

echo "==> Creating extension (after restart)"
sudo -u postgres psql -d pump_db -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;" || true

echo "==> API latency"
curl -sf -w "health time_total=%{time_total}s\n" -o /dev/null http://127.0.0.1:3012/api/health || echo "TMA not reachable on :3012"
curl -sf -w "tokens time_total=%{time_total}s\n" -o /dev/null http://127.0.0.1:3012/api/tokens || echo "tokens API failed"

echo "==> PG connections"
sudo -u postgres psql -d pump_db -c "SELECT count(*) AS active FROM pg_stat_activity WHERE datname='pump_db';"

echo "==> Top slow queries (requires shared_preload_libraries)"
sudo -u postgres psql -d pump_db -c "
SELECT calls, round(mean_exec_time::numeric,2) AS mean_ms, left(query,120) AS query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC NULLS LAST
LIMIT 15;" 2>/dev/null || echo "pg_stat_statements not loaded yet — fix postgresql.conf and restart"

echo "==> Done. Record results in docs/perf-baseline.md"
