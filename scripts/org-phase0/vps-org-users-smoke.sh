#!/usr/bin/env bash
# WANd.ORG.USER_ADMIN.001 — VPS smoke after Phase 3 deploy.
# Run on VPS (127.0.0.1) or any host that can reach org API.
#
# Usage:
#   source /root/org-phase0.env   # ORG_ADMIN_PASSWORD, EMPLOYEE_USERNAME, EMPLOYEE_PASSWORD
#   bash scripts/org-phase0/vps-org-users-smoke.sh
#   bash scripts/org-phase0/vps-org-users-smoke.sh http://67.216.206.3:13401
#
set -euo pipefail

BASE="${1:-http://127.0.0.1:13401}"
BASE="${BASE%/}"

ADMIN_USER="${ORG_ADMIN_USER:-admin}"
ADMIN_PASS="${ORG_ADMIN_PASSWORD:-}"
EMP_USER="${EMPLOYEE_USERNAME:-}"
EMP_PASS="${EMPLOYEE_PASSWORD:-}"

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
SMOKE_USER="smoke_org_$(date +%s)"
SMOKE_PASS='SmokeP@ss123456'
SMOKE_MGR="smoke_mgr_$(date +%s)"
SMOKE_MGR_PASS='SmokeM@gr123456'
DEPT='采购部'

die() { echo "FAIL: $*" >&2; exit 1; }
ok() { echo "PASS: $*"; }

echo "==> org-users smoke @ ${BASE} (${TS})"
echo ""

[ -n "${ADMIN_PASS}" ] || die "ORG_ADMIN_PASSWORD required"

login() {
  local user="$1" pass="$2"
  curl -sf -X POST "${BASE}/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"${user}\",\"password\":\"${pass}\"}"
}

expect_http() {
  local method="$1" path="$2" token="$3" want="$4" body="${5:-}"
  local tmp
  tmp="$(mktemp)"
  local code
  if [ -n "${body}" ]; then
    code=$(curl -s -o "${tmp}" -w '%{http_code}' -X "${method}" "${BASE}${path}" \
      -H "Authorization: Bearer ${token}" \
      -H 'Content-Type: application/json' \
      -d "${body}")
  else
    code=$(curl -s -o "${tmp}" -w '%{http_code}' -X "${method}" "${BASE}${path}" \
      -H "Authorization: Bearer ${token}")
  fi
  echo "  ${method} ${path} -> HTTP ${code} (want ${want})"
  if [ "${code}" != "${want}" ]; then
    echo "--- body ---"
    cat "${tmp}"
    echo "------------"
    rm -f "${tmp}"
    return 1
  fi
  rm -f "${tmp}"
  return 0
}

echo "==> [1] admin login + is_admin on /api/auth/user"
ADMIN_JSON=$(login "${ADMIN_USER}" "${ADMIN_PASS}") || die "admin login failed"
ADMIN_TOKEN=$(python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('token') or d.get('data',{}).get('token',''))" <<< "${ADMIN_JSON}")
[ -n "${ADMIN_TOKEN}" ] || die "admin token empty"
IS_ADMIN=$(python3 -c "import json,sys; d=json.load(sys.stdin); u=d.get('user') or d.get('data',{}).get('user',{}); print(1 if u.get('is_admin') else 0)" <<< "${ADMIN_JSON}")
[ "${IS_ADMIN}" = "1" ] || die "admin is_admin != 1 (migration 025 / ensure_system_user?)"
ok "admin login; is_admin=1"

echo ""
echo "==> [2] admin GET /api/org-users -> 200"
expect_http GET /api/org-users "${ADMIN_TOKEN}" 200 || die "admin list org-users"

echo ""
echo "==> [3] admin POST /api/org-users -> 201 + department"
CREATE_BODY=$(cat <<EOF
{"username":"${SMOKE_USER}","password":"${SMOKE_PASS}","department":"${DEPT}","job_title":"采购专员","work_task_role":"employee"}
EOF
)
CREATE_RESP=$(curl -sf -X POST "${BASE}/api/org-users" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "${CREATE_BODY}") || die "admin create failed"
echo "${CREATE_RESP}" | python3 -c "import json,sys; d=json.load(sys.stdin); u=d.get('data',d); assert u.get('department')=='${DEPT}', u"
ok "created ${SMOKE_USER} department=${DEPT}"

echo ""
echo "==> [4] new user GET /api/users/me/context -> department"
USER_JSON=$(login "${SMOKE_USER}" "${SMOKE_PASS}") || die "smoke user login failed"
USER_TOKEN=$(python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('token') or '')" <<< "${USER_JSON}")
CTX=$(curl -sf "${BASE}/api/users/me/context" -H "Authorization: Bearer ${USER_TOKEN}") || die "me/context failed"
echo "${CTX}" | python3 -c "import json,sys; d=json.load(sys.stdin); c=d.get('data',d); assert c.get('department')=='${DEPT}', c"
ok "me/context department=${DEPT}"

echo ""
echo "==> [5] employee GET /api/org-users -> 403"
if [ -n "${EMP_USER}" ] && [ -n "${EMP_PASS}" ]; then
  EMP_JSON=$(login "${EMP_USER}" "${EMP_PASS}") || die "employee login failed"
  EMP_TOKEN=$(python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('token') or '')" <<< "${EMP_JSON}")
  expect_http GET /api/org-users "${EMP_TOKEN}" 403 || die "employee should be forbidden"
  ok "employee ${EMP_USER} forbidden on org-users"
else
  echo "SKIP: set EMPLOYEE_USERNAME/PASSWORD for employee 403 test"
fi

echo ""
echo "==> [6] manager (non-admin) POST /api/org-users -> 403"
# Create manager via admin, then verify that account cannot admin org-users
MGR_BODY=$(cat <<EOF
{"username":"${SMOKE_MGR}","password":"${SMOKE_MGR_PASS}","work_task_role":"manager"}
EOF
)
curl -sf -X POST "${BASE}/api/org-users" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "${MGR_BODY}" >/dev/null || die "create smoke manager failed"
MGR_JSON=$(login "${SMOKE_MGR}" "${SMOKE_MGR_PASS}") || die "manager login failed"
MGR_TOKEN=$(python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('token') or '')" <<< "${MGR_JSON}")
expect_http POST /api/org-users "${MGR_TOKEN}" 403 '{"username":"x","password":"SmokeP@ss123456"}' || die "manager should be forbidden"
ok "manager (is_admin=0) forbidden on POST org-users"

echo ""
echo "==> ALL PASS org-users smoke (${BASE})"
echo "SMOKE_USER=${SMOKE_USER} SMOKE_MGR=${SMOKE_MGR} (optional cleanup on VPS DB)"
