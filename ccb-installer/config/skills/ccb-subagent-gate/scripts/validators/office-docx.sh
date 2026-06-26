#!/usr/bin/env bash
# office-docx.sh — Gate 1-3 from officecli-docx SKILL.md + zero-word check
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/fail.sh
source "$SCRIPT_DIR/../lib/fail.sh"

FILE="${1:-}"
if [[ -z "$FILE" ]] || [[ ! -f "$FILE" ]]; then
  exit 0
fi

if ! command -v officecli >/dev/null 2>&1; then
  "$SCRIPT_DIR/../lib/fail.sh" "officecli not found in PATH — cannot validate $FILE"
fi

# Zero-word / empty body check
STATS_OUT=$(officecli view "$FILE" stats 2>/dev/null || true)
if echo "$STATS_OUT" | grep -qiE 'words?[[:space:]]*:[[:space:]]*0([^0-9]|$)'; then
  "$SCRIPT_DIR/../lib/fail.sh" "docx word count is 0: $FILE"
fi
TEXT_OUT=$(officecli view "$FILE" text 2>/dev/null || true)
if [[ -z "$(echo "$TEXT_OUT" | tr -d '[:space:]')" ]]; then
  "$SCRIPT_DIR/../lib/fail.sh" "docx has no textual content: $FILE"
fi

officecli close "$FILE" 2>/dev/null || true
if ! officecli validate "$FILE" 2>/dev/null | grep -q "no errors found"; then
  "$SCRIPT_DIR/../lib/fail.sh" "Gate 1 validate failed: $FILE"
fi

LEAK=$(officecli view "$FILE" text 2>/dev/null | grep -cE '(\$[A-Za-z_]+\$|\{\{[^}]+\}\}|<TODO>|xxxx|lorem|Update field to see|\\[\$tn])' || true)
if [[ "${LEAK:-0}" -ne 0 ]]; then
  "$SCRIPT_DIR/../lib/fail.sh" "Gate 2 token leak ($LEAK lines): $FILE"
fi

if command -v jq >/dev/null 2>&1; then
  FLD=$(officecli query "$FILE" 'field[fieldType=page]' --json 2>/dev/null | jq '.data.results | length' 2>/dev/null || echo 0)
  if [[ "${FLD:-0}" -lt 1 ]]; then
    "$SCRIPT_DIR/../lib/fail.sh" "Gate 3 no live PAGE field: $FILE"
  fi
fi

exit 0
