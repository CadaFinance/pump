#!/usr/bin/env bash
# Phase 6: PG/nginx/Redis tuning + WS load smoke test
set -euo pipefail

REPO="${REPO:-/var/www/pump/tma}"
cd "$REPO"

echo "==> Apply snippets manually if not already:"
echo "  deploy/pg-tuning.conf.snippet -> postgresql.conf"
echo "  deploy/redis.conf.snippet -> redis.conf"
echo "  deploy/nginx-scale.conf.snippet -> nginx http block"

sudo systemctl restart postgresql || true
sudo systemctl restart redis-server || true
sudo nginx -t && sudo systemctl reload nginx

node scripts/load/ws-smoke.mjs --connections 1000 --url ws://127.0.0.1:3013

bash deploy/vm/phase-0-observability.sh
