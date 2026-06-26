#!/usr/bin/env bash
# word-creator-mcp.sh — office-word MCP evidence + optional officecli on discovered .docx
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
if echo "$last_msg" | grep -qiE '\.docx|文档|报告|方案|已完成|deliver'; then
  claimed_delivery=true
fi

parse_transcript_paths "$transcript_path" '\.docx$'
has_docx_paths=false
[[ -n "${PARSED_OFFICE_FILES:-}" ]] && has_docx_paths=true

mcp_ok=false
if has_successful_mcp_call "$transcript_path" 'mcp__office-word__|mcp__office_word__|"office-word"'; then
  mcp_ok=true
fi

if [[ "$claimed_delivery" == true ]] && [[ "$mcp_ok" == false ]] && [[ "$has_docx_paths" == false ]]; then
  reason="word-creator claimed document delivery but no office-word MCP tool use in transcript"
  if [[ "$mode" == "block" ]]; then
    "$SCRIPT_DIR/../lib/fail.sh" "$reason"
  fi
  "$SCRIPT_DIR/../lib/warn.sh" "$session_id" "word-creator" "$reason"
fi

# When officecli paths exist in transcript, run docx gate without PAGE requirement for MCP workflow
if [[ "$has_docx_paths" == true ]] && command -v officecli >/dev/null 2>&1; then
  while IFS= read -r f; do
    [[ -f "$f" ]] || continue
    officecli close "$f" 2>/dev/null || true
    STATS_OUT=$(officecli view "$f" stats 2>/dev/null || true)
    if echo "$STATS_OUT" | grep -qiE 'words?[[:space:]]*:[[:space:]]*0([^0-9]|$)'; then
      "$SCRIPT_DIR/../lib/fail.sh" "docx word count is 0: $f"
    fi
    if ! officecli validate "$f" 2>/dev/null | grep -q "no errors found"; then
      "$SCRIPT_DIR/../lib/fail.sh" "validate failed: $f"
    fi
    LEAK=$(officecli view "$f" text 2>/dev/null | grep -cE '(\{\{[^}]+\}\}|<TODO>|xxxx|lorem)' || true)
    if [[ "${LEAK:-0}" -ne 0 ]]; then
      "$SCRIPT_DIR/../lib/fail.sh" "token leak in $f"
    fi
  done <<<"$PARSED_OFFICE_FILES"
fi

exit 0
