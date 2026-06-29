#!/usr/bin/env bash
# roe-common.sh — shared ROE helpers (delegates transcript analysis to Python).
# Functions mirror PRD MVP judgment order building blocks.

roe_python_cmd() {
  if command -v python3 >/dev/null 2>&1; then
    echo python3
  elif command -v python >/dev/null 2>&1; then
    echo python
  else
    echo ""
  fi
}

roe_log_dir() {
  echo "${SUBAGENT_GATE_LOG_DIR:-${LOCALAPPDATA:-$HOME}/CCB-Wanding/.claude/logs}"
}

roe_evaluate_json() {
  local transcript_path="${1:-}"
  local session_id="${2:-unknown}"
  local last_msg="${3:-}"
  local py
  py="$(roe_python_cmd)"
  if [[ -z "$py" ]]; then
    echo '{"verdict":"pass","step":4,"reason":"python unavailable"}'
    return 0
  fi
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  "$py" "$script_dir/parse_transcript_roe.py" evaluate \
    "$transcript_path" "$session_id" "$last_msg" "$(roe_log_dir)"
}

roe_block_message() {
  local reason="${1:-write-intent}"
  local window_key="${2:-unknown}"
  local block_count="${3:-1}"
  local max_blocks="${ROE_MAX_BLOCKS:-5}"
  cat <<EOF
ROE — executable write not done.
User asked for a write/edit on the quotation sheet, but this turn has no successful
fill_quotation_sheet / edit_excel / excel write in the current intent window.
Do not end with text-only promises. Call the required write tool now, or ask a
structured clarification (A/B/C) if blocked on missing info.
Reason: ${reason}
Window: user_msg_id=${window_key} roe_block_count=${block_count}/${max_blocks}
EOF
}
