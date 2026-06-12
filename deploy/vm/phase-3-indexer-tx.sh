#!/usr/bin/env bash
# Phase 3: deploy indexer with transactional trade pipeline + incremental KOTH
set -euo pipefail

INDEXER="${INDEXER:-/var/www/pump/Indexer}"
cd "$INDEXER"
git pull
npm ci
npm run build
systemctl restart pump-indexer

journalctl -u pump-indexer -n 30 --no-pager

echo "==> Consistency spot-check (optional):"
echo "sudo -u postgres psql -d pump_db -c \"SELECT t.address, b.trade_count, (SELECT count(*) FROM trades WHERE token_address=t.address) FROM tokens t JOIN bonding_states b ON b.token_address=t.address LIMIT 5;\""
