#!/bin/bash
set -euo pipefail

SETUP_DIR="${1:-/root/pump-setup}"

echo "==> Applying schema from $SETUP_DIR/schema.sql"
sudo -u postgres psql -d pump_db -f "$SETUP_DIR/schema.sql"
sudo -u postgres psql -d pump_db -f "$SETUP_DIR/pump_db_grants.sql"

echo "==> Nginx assets"
mkdir -p /var/pump/assets/icons/tokens
chown -R www-data:www-data /var/pump/assets

if [ -f "$SETUP_DIR/nginx-pump.conf" ]; then
  cp "$SETUP_DIR/nginx-pump.conf" /etc/nginx/sites-available/pump
  ln -sf /etc/nginx/sites-available/pump /etc/nginx/sites-enabled/pump
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
fi

echo "==> Verify tables"
sudo -u postgres psql -d pump_db -c "\dt"
echo "Done."
