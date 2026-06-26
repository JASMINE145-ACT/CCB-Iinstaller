#!/usr/bin/env bash
# Phase 0 — create/update org employee matching local AionUI login (run on VPS as root).
#
# Usage A — env file (recommended):
#   cp scripts/org-phase0/env.example scripts/org-phase0/env.local   # on your PC, fill secrets
#   scp scripts/org-phase0/env.local root@67.216.206.3:/root/org-phase0.env
#   ssh root@67.216.206.3 'bash -s' < scripts/org-phase0/vps-create-employee.sh
#   # on VPS: source /root/org-phase0.env && bash vps-create-employee.sh
#
# Usage B — inline env:
#   ORG_ADMIN_PASSWORD='...' EMPLOYEE_USERNAME=yjc EMPLOYEE_PASSWORD='...' ./vps-create-employee.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/env.local" ]; then
  # shellcheck disable=SC1091
  source "${SCRIPT_DIR}/env.local"
elif [ -f /root/org-phase0.env ]; then
  # shellcheck disable=SC1091
  source /root/org-phase0.env
fi

BASE="${ORG_CENTER_URL:-http://127.0.0.1:13401}"
BASE="${BASE%/}"
ADMIN_USER="${ORG_ADMIN_USER:-admin}"
ADMIN_PASS="${ORG_ADMIN_PASSWORD:-}"
EMP_USER="${EMPLOYEE_USERNAME:-}"
EMP_PASS="${EMPLOYEE_PASSWORD:-}"
EMP_ROLE="${EMPLOYEE_ROLE:-employee}"

die() { echo "ERROR: $*" >&2; exit 1; }

[ -n "${ADMIN_PASS}" ] || die "ORG_ADMIN_PASSWORD is required"
[ -n "${EMP_USER}" ] || die "EMPLOYEE_USERNAME is required"
[ -n "${EMP_PASS}" ] || die "EMPLOYEE_PASSWORD is required"

DB="/opt/aionorg/data-org/aionui-backend.db"

echo "==> [1/4] Ensure admin is manager (SQLite)"
python3 - <<PY
import sqlite3, sys
db = "${DB}"
try:
    con = sqlite3.connect(db)
except Exception as e:
    sys.exit(f"Cannot open {db}: {e}")
con.execute("UPDATE users SET work_task_role='manager' WHERE username=?", ("${ADMIN_USER}",))
con.commit()
rows = list(con.execute("SELECT username, work_task_role FROM users"))
con.close()
for r in rows:
    print(" ", r)
PY

echo ""
echo "==> [2/4] Admin login"
LOGIN_JSON=$(curl -sf -X POST "${BASE}/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASS}\"}")

TOKEN=$(python3 -c "import json,sys; print(json.load(sys.stdin)['token'])" <<< "${LOGIN_JSON}")
ROLE=$(python3 -c "import json,sys; print(json.load(sys.stdin)['user']['work_task_role'])" <<< "${LOGIN_JSON}")
echo "TOKEN len=${#TOKEN} admin role=${ROLE}"
[ "${ROLE}" = "manager" ] || die "admin is not manager after SQLite fix — check DB"

echo ""
echo "==> [3/4] Create employee ${EMP_USER}"
CREATE_JSON=$(curl -s -X POST "${BASE}/api/users" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${EMP_USER}\",\"password\":\"${EMP_PASS}\",\"work_task_role\":\"${EMP_ROLE}\"}")

echo "${CREATE_JSON}"

echo "${CREATE_JSON}" | python3 - <<'PY'
import json, sys
j = json.load(sys.stdin)
if j.get("success"):
    sys.exit(0)
err = str(j.get("error", ""))
code = str(j.get("code", ""))
if "already exists" in err.lower() or code == "CONFLICT":
    print("NOTE: user may already exist — verify with GET /api/users")
    sys.exit(0)
sys.exit(f"create failed: {j}")
PY

echo ""
echo "==> [4/4] Verify employee can org-login"
EMP_LOGIN=$(curl -s -X POST "${BASE}/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${EMP_USER}\",\"password\":\"${EMP_PASS}\"}")
python3 -c "import json,sys; j=json.load(sys.stdin); assert j.get('success'), j; print('employee org login OK:', j['user']['username'])" <<< "${EMP_LOGIN}"

if [ -n "${EMPLOYEE_PUBLIC_IP:-}" ]; then
  echo ""
  echo "==> [optional] ufw allow ${EMPLOYEE_PUBLIC_IP} -> 13401"
  ufw allow from "${EMPLOYEE_PUBLIC_IP}/32" to any port 13401 || true
fi

echo ""
echo "DONE. Employee desktop:"
echo "  org-server.json -> { \"url\": \"${BASE}\" }"
echo "  restart AionUI; login as ${EMP_USER} (same password); MCP -> Org API"
