#!/usr/bin/env bash
# quotation-knowledge-read.sh — warn/block when multi-candidate match lacks knowledge Read
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/fail.sh"
source "$SCRIPT_DIR/../lib/warn.sh"
source "$SCRIPT_DIR/../lib/parse-transcript.sh"

transcript_path="${1:-}"
session_id="${2:-}"
agent_type="${3:-quotation-agent}"
last_msg="${4:-}"
mode="${5:-warn}"

if [[ "$mode" == "off" ]]; then
  exit 0
fi

if ! message_claims_business_output "$agent_type" "$last_msg"; then
  exit 0
fi

if [[ -z "$transcript_path" ]] || [[ ! -f "$transcript_path" ]]; then
  exit 0
fi

python_cmd=""
if command -v python >/dev/null 2>&1; then
  python_cmd="python"
elif command -v python3 >/dev/null 2>&1; then
  python_cmd="python3"
else
  exit 0
fi

check_output="$("$python_cmd" "$SCRIPT_DIR/../lib/parse_transcript_knowledge_gate.py" check "$transcript_path" 2>/dev/null || true)"
if [[ -z "$check_output" ]]; then
  exit 0
fi

should_warn=""
if command -v jq >/dev/null 2>&1; then
  should_warn="$(echo "$check_output" | jq -r '.should_warn // false')"
else
  should_warn="$(CHECK_JSON="$check_output" "$python_cmd" -c 'import json, os; print(json.loads(os.environ["CHECK_JSON"]).get("should_warn", False))' 2>/dev/null || echo false)"
fi

if [[ "$should_warn" != "true" ]] && [[ "$should_warn" != "True" ]]; then
  exit 0
fi

reason="multi-candidate match_quotation without Read(wanding_business_knowledge.md) before reply"
if [[ "$mode" == "block" ]]; then
  "$SCRIPT_DIR/../lib/fail.sh" "$reason"
fi

"$SCRIPT_DIR/../lib/warn.sh" "$session_id" "$agent_type" "$reason"
