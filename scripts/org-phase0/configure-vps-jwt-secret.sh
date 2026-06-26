#!/usr/bin/env bash
# Configure shared JWT_SECRET on org VPS for unified-org-sso Phase 1.
# Usage (on VPS as root):
#   JWT_SECRET='<company-secret>' bash configure-vps-jwt-secret.sh
# Or: source /root/org-phase0.env && bash configure-vps-jwt-secret.sh
set -euo pipefail

if [ -z "${JWT_SECRET:-}" ]; then
  echo "ERROR: JWT_SECRET is required (export or pass inline)" >&2
  exit 1
fi

ENV_FILE="/etc/aionorg/env"
mkdir -p /etc/aionorg
if [ -f "$ENV_FILE" ] && grep -q '^JWT_SECRET=' "$ENV_FILE" 2>/dev/null; then
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "$ENV_FILE"
else
  echo "JWT_SECRET=${JWT_SECRET}" >> "$ENV_FILE"
fi
chmod 600 "$ENV_FILE"

DROPIN="/etc/systemd/system/aionorg.service.d"
mkdir -p "$DROPIN"
cat > "${DROPIN}/jwt-secret.conf" <<EOF
[Service]
EnvironmentFile=${ENV_FILE}
EOF

systemctl daemon-reload
systemctl restart aionorg
sleep 2
systemctl is-active aionorg

echo "OK: JWT_SECRET configured in ${ENV_FILE}; aionorg restarted"
curl -sf http://127.0.0.1:13401/api/auth/status | head -c 120
echo ""
