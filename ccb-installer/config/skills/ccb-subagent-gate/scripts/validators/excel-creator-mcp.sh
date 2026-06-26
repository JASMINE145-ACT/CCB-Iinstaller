#!/usr/bin/env bash
# excel-creator-mcp.sh — haris excel MCP evidence + optional officecli on discovered .xlsx
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/fail.sh"
source "$SCRIPT_DIR/../lib/warn.sh"
source "$SCRIPT_DIR/../lib/parse-transcript.sh"

transcript_path="${1:-}"
session_id="${2:-}"
last_msg="${3:-}"
mode="${4:-block}"

claimed_delivery=false
if echo "$last_msg" | grep -qiE '\.xlsx|表格|看板|追踪|已完成|deliver|spreadsheet'; then
  claimed_delivery=true
fi

parse_transcript_paths "$transcript_path" '\.xlsx$'
has_xlsx_paths=false
[[ -n "${PARSED_OFFICE_FILES:-}" ]] && has_xlsx_paths=true

mcp_ok=false
if has_successful_mcp_call "$transcript_path" 'mcp__excel__|"excel"'; then
  mcp_ok=true
fi

if [[ "$claimed_delivery" == true ]] && [[ "$mcp_ok" == false ]] && [[ "$has_xlsx_paths" == false ]]; then
  reason="excel-creator claimed spreadsheet delivery but no excel MCP tool use in transcript"
  if [[ "$mode" == "block" ]]; then
    "$SCRIPT_DIR/../lib/fail.sh" "$reason"
  fi
  "$SCRIPT_DIR/../lib/warn.sh" "$session_id" "excel-creator" "$reason"
fi

if [[ "$has_xlsx_paths" == true ]] && command -v officecli >/dev/null 2>&1; then
  while IFS= read -r f; do
    [[ -f "$f" ]] || continue
    bash "$SCRIPT_DIR/office-xlsx.sh" "$f"
  done <<<"$PARSED_OFFICE_FILES"
fi

exit 0
