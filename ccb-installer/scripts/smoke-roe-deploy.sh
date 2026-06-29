#!/usr/bin/env bash
# M7 post-deploy smoke: Guid quotation-agent Stop path via live deployed skill.
set -euo pipefail

SKILL="${LOCALAPPDATA}/CCB-Wanding/.claude/skills/ccb-subagent-gate"
REPO_FIX="${1:-}"
if [[ -z "$REPO_FIX" ]]; then
  echo "usage: smoke-roe-deploy.sh <repo-fixtures-dir>"
  exit 2
fi

export SUBAGENT_GATE_SKILL_ROOT="$SKILL"
export SUBAGENT_GATE_LOG_DIR="${TMPDIR:-/tmp}/roe-deploy-smoke-logs"
rm -rf "$SUBAGENT_GATE_LOG_DIR"
mkdir -p "$SUBAGENT_GATE_LOG_DIR"

fail=0
check() {
  local label="$1"
  local expected="$2"
  shift 2
  set +e
  "$@" >/dev/null 2>&1
  local code=$?
  set -e
  if [[ "$code" -eq "$expected" ]]; then
    echo "[PASS] $label (exit $code)"
  else
    echo "[FAIL] $label expected $expected got $code"
    fail=$((fail + 1))
  fi
}

# Deploy artifacts
for f in \
  "$SKILL/scripts/validators/quotation-roe.sh" \
  "$SKILL/scripts/lib/parse_transcript_roe.py" \
  "$SKILL/config/modes.json"; do
  if [[ -f "$f" ]]; then
    echo "[PASS] deployed: $f"
  else
    echo "[FAIL] missing: $f"
    fail=$((fail + 1))
  fi
done

grep -q 'quotation-agent:roe' "$SKILL/config/modes.json" && echo "[PASS] modes.json has quotation-agent:roe" || { echo "[FAIL] modes.json missing roe key"; fail=$((fail + 1)); }

AGENT="${LOCALAPPDATA}/CCB-Wanding/.claude/agents/quotation-agent.md"
grep -q 'subagent-gate.sh' "$AGENT" && echo "[PASS] quotation-agent.md has Stop hook" || { echo "[FAIL] quotation-agent.md missing hook"; fail=$((fail + 1)); }
grep -q 'ROE' "$AGENT" && echo "[PASS] quotation-agent.md has ROE SOP" || { echo "[FAIL] quotation-agent.md missing ROE section"; fail=$((fail + 1)); }

hook_json() {
  local transcript="$1"
  local msg="$2"
  if command -v jq >/dev/null 2>&1; then
    jq -n \
      --arg at "quotation-agent" \
      --arg sid "smoke-deploy" \
      --arg tp "$transcript" \
      --arg msg "$msg" \
      '{hook_event_name: "Stop", agent_type: $at, session_id: $sid, transcript_path: $tp, last_assistant_message: $msg}'
  else
    echo '{}'
  fi
}

GATE="$SKILL/scripts/subagent-gate.sh"
EDIT="$REPO_FIX/roe-edit-promise-no-write.jsonl"
LOOKUP="$REPO_FIX/roe-price-lookup-only.jsonl"

hook_json "$EDIT" "收到，马上更新报价单行价格并删除B款。" >"$SUBAGENT_GATE_LOG_DIR/payload.json"
check "live gate blocks edit promise" 2 bash "$GATE" <"$SUBAGENT_GATE_LOG_DIR/payload.json"

hook_json "$LOOKUP" "三通50 B档推荐价 4869" >"$SUBAGENT_GATE_LOG_DIR/payload2.json"
check "live gate passes price lookup" 0 bash "$GATE" <"$SUBAGENT_GATE_LOG_DIR/payload2.json"

echo ""
if [[ "$fail" -eq 0 ]]; then
  echo "M7 deploy smoke: ALL PASS"
  exit 0
fi
echo "M7 deploy smoke: $fail failure(s)"
exit 1
