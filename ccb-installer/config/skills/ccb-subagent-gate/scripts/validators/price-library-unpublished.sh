#!/usr/bin/env bash
# price-library-unpublished.sh — warn when draft was mutated but not published in session
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/warn.sh"

transcript_path="${1:-}"
session_id="${2:-}"
agent_type="${3:-price-library-agent}"
last_msg="${4:-}"
mode="${5:-warn}"

if [[ "$mode" == "off" ]]; then
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

check_output="$("$python_cmd" "$SCRIPT_DIR/../lib/parse_transcript_price_library_unpublished.py" check "$transcript_path" 2>/dev/null || true)"
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

reason="draft was modified but publish_price_library_draft was not called — remind user to publish or revert draft"
"$SCRIPT_DIR/../lib/warn.sh" "$reason" "$session_id" "$agent_type"
exit 0
