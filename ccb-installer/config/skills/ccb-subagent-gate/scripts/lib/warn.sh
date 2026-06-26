#!/usr/bin/env bash
# Usage: warn.sh <session_id> <agent_type> "message"
set -euo pipefail

session_id="${1:-}"
agent_type="${2:-}"
msg="${3:-Gate warning}"

ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")"
log_dir="${SUBAGENT_GATE_LOG_DIR:-${LOCALAPPDATA:-$HOME}/CCB-Wanding/.claude/logs}"
mkdir -p "$log_dir"
log_file="$log_dir/subagent-gate-warn.log"

line="[$ts] session=$session_id agent=$agent_type $msg"
echo "$line" >>"$log_file"
echo "WARN: $msg" >&2
exit 0
