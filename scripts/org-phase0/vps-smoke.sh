#!/usr/bin/env bash
# Phase 0 — org center health smoke (run on VPS as root).
# Usage: ./vps-smoke.sh [ORG_CENTER_URL]
set -euo pipefail

BASE="${1:-http://127.0.0.1:13401}"
BASE="${BASE%/}"

echo "==> systemd"
systemctl is-active aionorg && systemctl --no-pager status aionorg | head -8 || echo "WARN: aionorg not active"

echo ""
echo "==> auth/status"
curl -sf "${BASE}/api/auth/status"
echo ""

if [ -n "${ORG_ADMIN_PASSWORD:-}" ]; then
  echo ""
  echo "==> admin login + org-knowledge count"
  LOGIN_JSON=$(curl -sf -X POST "${BASE}/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"${ORG_ADMIN_USER:-admin}\",\"password\":\"${ORG_ADMIN_PASSWORD}\"}")
  TOKEN=$(python3 -c "import json,sys; print(json.load(sys.stdin)['token'])" <<< "${LOGIN_JSON}")
  ROLE=$(python3 -c "import json,sys; print(json.load(sys.stdin)['user']['work_task_role'])" <<< "${LOGIN_JSON}")
  echo "admin work_task_role=${ROLE}"
  DOCS=$(curl -sf "${BASE}/api/org-knowledge" -H "Authorization: Bearer ${TOKEN}")
  COUNT=$(python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('data', d)))" <<< "${DOCS}" 2>/dev/null || echo "?")
  echo "org-knowledge entries: ${COUNT} (expect 8)"
else
  echo ""
  echo "Skip login smoke — set ORG_ADMIN_PASSWORD to test knowledge API"
fi

echo ""
echo "OK smoke finished (${BASE})"
