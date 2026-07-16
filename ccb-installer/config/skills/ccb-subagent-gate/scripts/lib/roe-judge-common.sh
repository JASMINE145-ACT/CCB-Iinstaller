#!/usr/bin/env bash
# roe-judge-common.sh — shared helpers for universal ROE in-process self-check gate.

roe_judge_python_cmd() {
  if command -v python >/dev/null 2>&1 && python -c 'import sys' >/dev/null 2>&1; then
    echo python
  elif command -v python3 >/dev/null 2>&1 && python3 -c 'import sys' >/dev/null 2>&1; then
    echo python3
  else
    echo ""
  fi
}

roe_judge_log_dir() {
  echo "${SUBAGENT_GATE_LOG_DIR:-${LOCALAPPDATA:-$HOME}/CCB-Wanding/.claude/logs}"
}

roe_judge_skill_root() {
  echo "${SUBAGENT_GATE_SKILL_ROOT:-}"
}

roe_judge_block_message() {
  local gaps="${1:-unspecified gaps}"
  local window_key="${2:-unknown}"
  local block_count="${3:-1}"
  local max_blocks="${ROE_JUDGE_MAX_BLOCKS:-5}"
  cat <<EOF
ROE in-process self-check — do NOT end_turn yet (same session; continue now).
Rule-detected gaps: ${gaps}
Complete missing items per ACTION in the reject body, or ask structured clarification (A/B/C) if blocked.
Reason: roe_in_process_block
Window: ${window_key} judge_block_count=${block_count}/${max_blocks}
EOF
}
