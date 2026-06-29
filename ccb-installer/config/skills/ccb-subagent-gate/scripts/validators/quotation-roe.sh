#!/usr/bin/env bash
# quotation-roe.sh — ROE Stop validator (MVP 6-step order via parse_transcript_roe.py)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/fail.sh"
source "$SCRIPT_DIR/../lib/roe-common.sh"

transcript_path="${1:-}"
session_id="${2:-unknown}"
agent_type="${3:-quotation-agent}"
last_msg="${4:-}"
mode="${5:-off}"

ROE_MAX_BLOCKS=5

if [[ "$mode" == "off" ]]; then
  exit 0
fi

if [[ -z "$transcript_path" ]] || [[ ! -f "$transcript_path" ]]; then
  exit 0
fi

py="$(roe_python_cmd)"
if [[ -z "$py" ]]; then
  exit 0
fi

log_dir="$(roe_log_dir)"
result_json="$("$py" "$SCRIPT_DIR/../lib/parse_transcript_roe.py" evaluate \
  "$transcript_path" "$session_id" "$last_msg" "$log_dir")"

verdict=""
step=""
reason=""
window_key=""
block_count="1"
escalated="false"

if command -v jq >/dev/null 2>&1; then
  verdict="$(echo "$result_json" | jq -r '.verdict // "pass"')"
  step="$(echo "$result_json" | jq -r '.step // 0')"
  reason="$(echo "$result_json" | jq -r '.reason // ""')"
  window_key="$(echo "$result_json" | jq -r '.window_key // "unknown"')"
  block_count="$(echo "$result_json" | jq -r '.roe_block_count // 0')"
  escalated="$(echo "$result_json" | jq -r '.escalated // false')"
else
  verdict="$(ROE_JSON="$result_json" "$py" -c 'import json,os; d=json.loads(os.environ["ROE_JSON"]); print(d.get("verdict","pass"))')"
  step="$(ROE_JSON="$result_json" "$py" -c 'import json,os; d=json.loads(os.environ["ROE_JSON"]); print(d.get("step",0))')"
  reason="$(ROE_JSON="$result_json" "$py" -c 'import json,os; d=json.loads(os.environ["ROE_JSON"]); print(d.get("reason",""))')"
  window_key="$(ROE_JSON="$result_json" "$py" -c 'import json,os; d=json.loads(os.environ["ROE_JSON"]); print(d.get("window_key","unknown"))')"
  block_count="$(ROE_JSON="$result_json" "$py" -c 'import json,os; d=json.loads(os.environ["ROE_JSON"]); print(d.get("roe_block_count",0))')"
fi

ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")"
mkdir -p "$log_dir"
log_line="[$ts] session=$session_id agent=$agent_type verdict=$verdict step=$step reason=$reason window_key=$window_key roe_block_count=$block_count"
if [[ "$step" == "5" ]] || [[ "$escalated" == "true" ]]; then
  log_line="$log_line escalated_max_blocks=true"
fi
echo "$log_line" >>"$log_dir/subagent-gate-roe.log"

if [[ "$verdict" == "pass" ]]; then
  exit 0
fi

if [[ "$verdict" != "block" ]]; then
  exit 0
fi

block_msg="$(roe_block_message "$reason" "$window_key" "$block_count")"
if [[ "$mode" == "warn" ]]; then
  echo "WARN: $block_msg" >&2
  exit 0
fi

"$SCRIPT_DIR/../lib/fail.sh" "$block_msg"
