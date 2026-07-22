#!/usr/bin/env bash
# generic-roe-judge.sh — Universal ROE in-process self-check gate (rules → exit 2 REJECT).
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

# Windows PowerShell/Git Bash may expose a GBK console encoding even when stdout
# is captured. Force UTF-8 so Chinese gaps/reject prompts survive both the main
# evaluator and the fallback JSON field extraction below.
export PYTHONIOENCODING="${PYTHONIOENCODING:-utf-8}"
export PYTHONUTF8="${PYTHONUTF8:-1}"

log_dir="$(roe_judge_log_dir)"
skill_root="$(roe_judge_skill_root)"
if [[ -z "$skill_root" ]]; then
  skill_root="$(cd "$SCRIPT_DIR/../.." && pwd)"
fi

result_json=""
py_exit=0
set +e
result_json="$("$py" "$SCRIPT_DIR/../lib/parse_transcript_roe_judge.py" evaluate \
  "$transcript_path" "$session_id" "$agent_type" "$last_msg" "$log_dir" "$skill_root")"
py_exit=$?
set -e
if [[ $py_exit -ne 0 ]] && [[ $py_exit -ne 10 ]] && [[ $py_exit -ne 20 ]]; then
  exit 0
fi

verdict=""
gaps_text=""
window_key=""
block_count="0"
reject_prompt=""

if command -v jq >/dev/null 2>&1; then
  verdict="$(echo "$result_json" | jq -r '.verdict // "pass"')"
  gaps_text="$(echo "$result_json" | jq -r '.gaps_text // ""')"
  window_key="$(echo "$result_json" | jq -r '.window_key // "unknown"')"
  block_count="$(echo "$result_json" | jq -r '.judge_block_count // 0')"
  reject_prompt="$(echo "$result_json" | jq -r '.reject_prompt // ""')"
else
  verdict="$(ROE_JSON="$result_json" "$py" -c 'import json,os; d=json.loads(os.environ["ROE_JSON"]); print(d.get("verdict","pass"))')"
  gaps_text="$(ROE_JSON="$result_json" "$py" -c 'import json,os; d=json.loads(os.environ["ROE_JSON"]); print(d.get("gaps_text",""))')"
  window_key="$(ROE_JSON="$result_json" "$py" -c 'import json,os; d=json.loads(os.environ["ROE_JSON"]); print(d.get("window_key","unknown"))')"
  block_count="$(ROE_JSON="$result_json" "$py" -c 'import json,os; d=json.loads(os.environ["ROE_JSON"]); print(d.get("judge_block_count",0))')"
  reject_prompt="$(ROE_JSON="$result_json" "$py" -c 'import json,os; d=json.loads(os.environ["ROE_JSON"]); print(d.get("reject_prompt",""))')"
fi

if [[ "$verdict" == "pass" ]]; then
  exit 0
fi

if [[ "$verdict" != "block" ]]; then
  exit 0
fi

if [[ -n "$reject_prompt" ]]; then
  block_msg="$reject_prompt"
else
  block_msg="$(roe_judge_block_message "$gaps_text" "$window_key" "$block_count")"
fi
if [[ "$mode" == "warn" ]]; then
  echo "WARN: $block_msg" >&2
  exit 0
fi

"$SCRIPT_DIR/../lib/fail.sh" "$block_msg"
