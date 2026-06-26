#!/usr/bin/env bash
# Standalone tests for ccb-subagent-gate (Phase 0 gate).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS="$ROOT/scripts"
FIXTURES="$ROOT/tests/fixtures"
MOCK_BIN="$ROOT/tests/fixtures"
export SUBAGENT_GATE_SKILL_ROOT="$ROOT"
export SUBAGENT_GATE_LOG_DIR="${TMPDIR:-/tmp}/ccb-subagent-gate-test-logs"
rm -rf "$SUBAGENT_GATE_LOG_DIR"
mkdir -p "$SUBAGENT_GATE_LOG_DIR"

pass=0
fail=0

assert_exit() {
  local expected="$1"
  local label="$2"
  shift 2
  set +e
  "$@" >/dev/null 2>&1
  local code=$?
  set -e
  if [[ "$code" -eq "$expected" ]]; then
    echo "[PASS] $label (exit $code)"
    pass=$((pass + 1))
  else
    echo "[FAIL] $label - expected exit $expected, got $code"
    fail=$((fail + 1))
  fi
}

assert_warn_log() {
  local label="$1"
  if [[ -f "$SUBAGENT_GATE_LOG_DIR/subagent-gate-warn.log" ]] && grep -q . "$SUBAGENT_GATE_LOG_DIR/subagent-gate-warn.log"; then
    echo "[PASS] $label"
    pass=$((pass + 1))
  else
    echo "[FAIL] $label - warn log missing"
    fail=$((fail + 1))
  fi
}

hook_json() {
  local agent_type="$1"
  local transcript="$2"
  local last_msg="$3"
  local event="${4:-SubagentStop}"
  if command -v jq >/dev/null 2>&1; then
    if [[ "$event" == "SubagentStop" ]]; then
      jq -n \
        --arg event "$event" \
        --arg at "$agent_type" \
        --arg sid "test-session" \
        --arg tp "$transcript" \
        --arg msg "$last_msg" \
        '{hook_event_name: $event, agent_type: $at, session_id: $sid, agent_transcript_path: $tp, last_assistant_message: $msg}'
    else
      jq -n \
        --arg event "$event" \
        --arg at "$agent_type" \
        --arg sid "test-session" \
        --arg tp "$transcript" \
        --arg msg "$last_msg" \
        '{hook_event_name: $event, agent_type: $at, session_id: $sid, transcript_path: $tp, last_assistant_message: $msg}'
    fi
  elif command -v node >/dev/null 2>&1; then
    HOOK_AGENT="$agent_type" HOOK_TP="$transcript" HOOK_MSG="$last_msg" HOOK_EVENT="$event" node -e '
      const e = process.env.HOOK_EVENT;
      const o = {
        hook_event_name: e,
        agent_type: process.env.HOOK_AGENT,
        session_id: "test-session",
        last_assistant_message: process.env.HOOK_MSG,
      };
      if (e === "SubagentStop") o.agent_transcript_path = process.env.HOOK_TP;
      else o.transcript_path = process.env.HOOK_TP;
      console.log(JSON.stringify(o));
    '
  else
    echo '{}'
  fi
}

run_gate() {
  local payload_file="$1"
  bash "$SCRIPTS/subagent-gate.sh" <"$payload_file"
}

echo "=== quotation gate off (no MCP) ==="
rm -f "$SUBAGENT_GATE_LOG_DIR/subagent-gate-warn.log"
hook_json quotation-agent "$FIXTURES/transcripts/quotation-no-mcp.jsonl" "direct 50 price 12.5" >"$SUBAGENT_GATE_LOG_DIR/payload.json"
assert_exit 0 "quotation no MCP exits cleanly while gate off" run_gate "$SUBAGENT_GATE_LOG_DIR/payload.json"
if [[ -f "$SUBAGENT_GATE_LOG_DIR/subagent-gate-warn.log" ]] && grep -q . "$SUBAGENT_GATE_LOG_DIR/subagent-gate-warn.log"; then
  echo "[FAIL] quotation gate off wrote warn log"
  fail=$((fail + 1))
else
  echo "[PASS] quotation gate off writes no warn log"
  pass=$((pass + 1))
fi

echo "=== quotation with MCP ==="
hook_json quotation-agent "$FIXTURES/transcripts/quotation-with-mcp.jsonl" "price 12.5" >"$SUBAGENT_GATE_LOG_DIR/payload.json"
assert_exit 0 "quotation with MCP passes" run_gate "$SUBAGENT_GATE_LOG_DIR/payload.json"

echo "=== word-creator MCP claim without tools ==="
hook_json word-creator "$FIXTURES/transcripts/quotation-no-mcp.jsonl" "Word document delivered: docx" SubagentStop >"$SUBAGENT_GATE_LOG_DIR/payload.json"
assert_exit 2 "word-creator no MCP blocks on delivery claim" run_gate "$SUBAGENT_GATE_LOG_DIR/payload.json"

echo "=== office docx empty (mock officecli) ==="
export PATH="$MOCK_BIN:$PATH"
cat >"$MOCK_BIN/officecli" <<'WRAP'
#!/usr/bin/env bash
exec bash "$(dirname "$0")/mock-officecli.sh" "$@"
WRAP
chmod +x "$MOCK_BIN/officecli" "$MOCK_BIN/mock-officecli.sh" 2>/dev/null || true

hook_json ppt-creator "$FIXTURES/transcripts/word-creator-empty-docx.jsonl" "deck done" SubagentStop >"$SUBAGENT_GATE_LOG_DIR/payload.json"
# ppt-creator only validates .pptx paths; docx in transcript is no-op.
assert_exit 0 "ppt-creator ignores docx paths" run_gate "$SUBAGENT_GATE_LOG_DIR/payload.json"

echo "=== office-docx validator direct (mock) ==="
touch /tmp/gate-test-empty.docx 2>/dev/null || type nul >"C:/tmp/gate-test-empty.docx"
assert_exit 2 "office-docx empty file blocks" bash "$SCRIPTS/validators/office-docx.sh" "C:/tmp/gate-test-empty.docx"

echo "=== office docx good (mock) ==="
hook_json excel-creator "$FIXTURES/transcripts/word-creator-good-docx.jsonl" "done" SubagentStop >"$SUBAGENT_GATE_LOG_DIR/payload.json"
# excel-creator looks for xlsx, not docx; expect pass with no matching files.
assert_exit 0 "unrelated extension no-op" run_gate "$SUBAGENT_GATE_LOG_DIR/payload.json"

echo "=== quotation knowledge read warn ==="
rm -f "$SUBAGENT_GATE_LOG_DIR/subagent-gate-warn.log"
hook_json quotation-agent "$FIXTURES/transcripts/quotation-multi-no-read.jsonl" "三通50 B档推荐价 4869" Stop >"$SUBAGENT_GATE_LOG_DIR/payload-knowledge.json"
assert_exit 0 "multi-candidate without Read exits warn" run_gate "$SUBAGENT_GATE_LOG_DIR/payload-knowledge.json"
assert_warn_log "multi-candidate without Read warns"

hook_json quotation-agent "$FIXTURES/transcripts/quotation-multi-with-read.jsonl" "三通50 B档推荐价 4869" Stop >"$SUBAGENT_GATE_LOG_DIR/payload-knowledge-ok.json"
rm -f "$SUBAGENT_GATE_LOG_DIR/subagent-gate-warn.log"
assert_exit 0 "multi-candidate with Read passes" run_gate "$SUBAGENT_GATE_LOG_DIR/payload-knowledge-ok.json"
if [[ -f "$SUBAGENT_GATE_LOG_DIR/subagent-gate-warn.log" ]] && grep -q . "$SUBAGENT_GATE_LOG_DIR/subagent-gate-warn.log"; then
  echo "[FAIL] knowledge read present still warned"
  fail=$((fail + 1))
else
  echo "[PASS] knowledge read present writes no warn log"
  pass=$((pass + 1))
fi

echo "=== Guid direct Stop event ==="
hook_json quotation-agent "$FIXTURES/transcripts/quotation-with-mcp.jsonl" "quotation complete" Stop >"$SUBAGENT_GATE_LOG_DIR/payload.json"
assert_exit 0 "Stop event uses transcript_path" run_gate "$SUBAGENT_GATE_LOG_DIR/payload.json"

echo "=== path parse regression ==="
source "$SCRIPTS/lib/parse-transcript.sh"
parse_transcript_paths "$FIXTURES/transcripts/word-creator-good-docx.jsonl" '\.docx$'
if echo "${PARSED_OFFICE_FILES:-}" | grep -q 'gate-test-good.docx'; then
  echo "[PASS] Windows multi-segment docx path discovered"
  pass=$((pass + 1))
else
  echo "[FAIL] path parse missed C:\\tmp\\gate-test-good.docx"
  fail=$((fail + 1))
fi

echo ""
echo "Results: $pass passed, $fail failed"
[[ "$fail" -eq 0 ]]
