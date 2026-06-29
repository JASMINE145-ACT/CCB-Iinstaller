#!/usr/bin/env bash
# Org knowledge center on Linux VPS — build, bootstrap, systemd.
# Run as root after deploy-org-aioncore-vps.ps1 upload.
set -euo pipefail

ROOT="/opt/aionorg"
BIN="${ROOT}/AionCore/target/release/aioncore"
LOG="${ROOT}/logs/aioncore.log"

echo "==> [1/6] Install build deps (if missing)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl build-essential pkg-config libssl-dev clang >/dev/null

if ! command -v rustc >/dev/null 2>&1; then
  echo "==> Installing Rust"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
fi
# shellcheck disable=SC1091
source "$HOME/.cargo/env"

echo "==> [2/6] cargo build --release -p aionui-app (10-30 min first time)"
cd "${ROOT}/AionCore"
cargo build --release -p aionui-app
"${BIN}" --help >/dev/null

echo "==> [3/6] Bootstrap DB (empty data-org only; --local once)"
pkill -f 'aioncore.*13401' 2>/dev/null || true
mkdir -p "${ROOT}/data-org" "${ROOT}/logs"
export AIONUI_ORG_KNOWLEDGE_SEED_DIR="${ROOT}/data"

if [ -n "$(find "${ROOT}/data-org" -mindepth 1 -print -quit 2>/dev/null)" ]; then
  echo "WARN: ${ROOT}/data-org is not empty — seed skipped by aioncore; continuing with existing DB"
else
  "${BIN}" \
    --host 127.0.0.1 \
    --port 13401 \
    --data-dir "${ROOT}/data-org" \
    --cors-any \
    --local &
  BOOT_PID=$!
  sleep 4

  echo "==> [4/6] Reset admin password — SAVE THIS OUTPUT"
  RESET_JSON=$(curl -s -X POST http://127.0.0.1:13401/api/webui/reset-password)
  echo "${RESET_JSON}"

  ADMIN_PASS=$(echo "${RESET_JSON}" | grep -o '"new_password":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -z "${ADMIN_PASS}" ]; then
    ADMIN_PASS=$(echo "${RESET_JSON}" | grep -o '"new_password": *"[^"]*"' | head -1 | sed 's/.*: *"\([^"]*\)".*/\1/')
  fi
  if [ -z "${ADMIN_PASS}" ]; then
    echo "ERROR: could not parse admin password from reset-password response"
    kill "${BOOT_PID}" 2>/dev/null || true
    exit 1
  fi

  TOKEN=$(curl -s -X POST http://127.0.0.1:13401/login \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"admin\",\"password\":\"${ADMIN_PASS}\"}" \
    | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

  echo "==> Promote admin to manager (Phase 0 reproducibility)"
  python3 - <<'PY'
import sqlite3
db = "/opt/aionorg/data-org/aionui-backend.db"
con = sqlite3.connect(db)
con.execute("UPDATE users SET work_task_role='manager' WHERE username='admin'")
con.commit()
print(list(con.execute("SELECT username, work_task_role FROM users")))
con.close()
PY

  echo "==> Seeded docs:"
  curl -s http://127.0.0.1:13401/api/org-knowledge -H "Authorization: Bearer ${TOKEN}"
  echo ""

  kill "${BOOT_PID}" 2>/dev/null || true
  wait "${BOOT_PID}" 2>/dev/null || true
  sleep 2
fi

echo "==> [5/6] Install systemd unit"
mkdir -p /etc/aionorg
cat > /etc/aionorg/env << 'ENVEOF'
# Price-library write access (comma-separated org usernames).
PRICE_ADMIN_USERNAMES=admin
ENVEOF

cat > /etc/systemd/system/aionorg.service << EOF
[Unit]
Description=AionOrg knowledge center (aioncore)
After=network.target

[Service]
Type=simple
EnvironmentFile=-/etc/aionorg/env
Environment=AIONUI_ORG_KNOWLEDGE_SEED_DIR=${ROOT}/data
WorkingDirectory=${ROOT}
ExecStart=${BIN} --host 0.0.0.0 --port 13401 --data-dir ${ROOT}/data-org --cors-any
Restart=on-failure
RestartSec=5
StandardOutput=append:${LOG}
StandardError=append:${LOG}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now aionorg
sleep 2

echo "==> [6/6] Health check"
curl -s http://127.0.0.1:13401/api/auth/status
echo ""
systemctl --no-pager status aionorg | head -15

echo ""
echo "Price library (after admin login):"
echo "  GET  /api/price-library/active"
echo "  GET  /api/price-library/audit"
echo "  POST /api/price-library/import/preview  (multipart file, price_admin)"
echo "  POST /api/price-library/import/apply    (multipart file, price_admin)"
echo "  POST /api/price-library/draft/publish   (price_admin)"
echo "  PRICE_ADMIN_USERNAMES in /etc/aionorg/env (default: admin)"
echo ""
echo "DONE. Employee org-server.json:"
echo '  { "url": "http://67.216.206.3:13401" }'
echo ""
echo "Phase 0 — create employee (after saving admin password):"
echo "  See scripts/org-phase0/README.md — vps-create-employee.sh"
echo ""
echo "Firewall (recommended):"
echo "  ufw allow OpenSSH"
echo "  ufw allow from <office-ip>/32 to any port 13401"
echo "  ufw enable"
