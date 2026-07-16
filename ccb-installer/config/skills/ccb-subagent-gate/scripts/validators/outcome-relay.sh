#!/usr/bin/env bash
# outcome-relay.sh — Parent Outcome Relay gate (WANd.ORCH.OUTCOME_RELAY.001).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/roe-judge-common.sh"

transcript_path="${1:-}"
session_id="${2:-unknown}"
agent_type="${3:-unknown}"
last_msg="${4:-}"
mode="${5:-off}"

if [[ "$mode" == "off" ]]; then
  exit 0
fi

if [[ -z "$transcript_path" ]] || [[ ! -f "$transcript_path" ]]; then
  exit 0
fi

py="$(roe_judge_python_cmd)"
if [[ -z "$py" ]]; then
  exit 0
fi

log_dir="$(roe_judge_log_dir)"

result_json=""
py_exit=0
set +e
result_json="$("$py" "$SCRIPT_DIR/../lib/parse_transcript_outcome_relay.py" evaluate \
  "$transcript_path" "$session_id" "$agent_type" "$last_msg" "$log_dir")"
py_exit=$?
set -e
if [[ $py_exit -ne 0 ]] && [[ $py_exit -ne 10 ]] && [[ $py_exit -ne 20 ]]; then
  exit 0
fi

verdict="pass"
reject_prompt=""
gaps_text=""

if command -v jq >/dev/null 2>&1; then
  verdict="$(echo "$result_json" | jq -r '.verdict // "pass"')"
  reject_prompt="$(echo "$result_json" | jq -r '.reject_prompt // ""')"
  gaps_text="$(echo "$result_json" | jq -r '.gaps_text // ""')"
else
  verdict="$(OUTCOME_JSON="$result_json" "$py" -c 'import json,os; d=json.loads(os.environ["OUTCOME_JSON"]); print(d.get("verdict","pass"))')"
  reject_prompt="$(OUTCOME_JSON="$result_json" "$py" -c 'import json,os; d=json.loads(os.environ["OUTCOME_JSON"]); print(d.get("reject_prompt",""))')"
  gaps_text="$(OUTCOME_JSON="$result_json" "$py" -c 'import json,os; d=json.loads(os.environ["OUTCOME_JSON"]); print(d.get("gaps_text",""))')"
fi

if [[ "$verdict" == "pass" ]]; then
  exit 0
fi

if [[ "$verdict" != "block" ]]; then
  exit 0
fi

block_msg="${reject_prompt:-OUTCOME-RELAY: ${gaps_text:-missing parent delivery}}"
if [[ "$mode" == "warn" ]]; then
  echo "WARN: $block_msg" >&2
  exit 0
fi

"$SCRIPT_DIR/../lib/fail.sh" "$block_msg"
