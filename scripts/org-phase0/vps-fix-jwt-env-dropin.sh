#!/usr/bin/env bash
# Fix: /etc/aionorg/env exists but aionorg.service does not load it.
# Run on VPS as root: bash vps-fix-jwt-env-dropin.sh
set -euo pipefail

ENV_FILE="/etc/aionorg/env"
DROPIN_DIR="/etc/systemd/system/aionorg.service.d"
DROPIN="${DROPIN_DIR}/jwt-secret.conf"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: missing $ENV_FILE — set JWT_SECRET first" >&2
  exit 1
fi

mkdir -p "$DROPIN_DIR"
cat > "$DROPIN" <<EOF
[Service]
EnvironmentFile=${ENV_FILE}
EOF

systemctl daemon-reload
systemctl restart aionorg
sleep 2

if ! systemctl is-active --quiet aionorg; then
  echo "ERROR: aionorg failed to start" >&2
  systemctl status aionorg --no-pager || true
  exit 1
fi

PID=$(pgrep -f 'aioncore.*13401' | head -1)
if [ -z "$PID" ]; then
  echo "ERROR: aioncore process not found" >&2
  exit 1
fi

echo "==> aionorg active pid=$PID"
if tr '\0' '\n' < "/proc/${PID}/environ" | grep -q '^JWT_SECRET='; then
  echo "OK: JWT_SECRET present in process environment"
  tr '\0' '\n' < "/proc/${PID}/environ" | grep '^JWT_SECRET=' | sed 's/\(JWT_SECRET=.\{8\}\).*/\1.../'
else
  echo "FAIL: JWT_SECRET still missing from process env" >&2
  exit 1
fi

curl -sf http://127.0.0.1:13401/api/auth/status | head -c 120
echo ""
