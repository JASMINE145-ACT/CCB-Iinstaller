#!/usr/bin/env bash
# office-xlsx.sh — QA minimum cycle (issues, error cells, validate)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/fail.sh"

FILE="${1:-}"
if [[ -z "$FILE" ]] || [[ ! -f "$FILE" ]]; then
  exit 0
fi

if ! command -v officecli >/dev/null 2>&1; then
  "$SCRIPT_DIR/../lib/fail.sh" "officecli not found — cannot validate $FILE"
fi

officecli close "$FILE" 2>/dev/null || true

ISSUES=$(officecli view "$FILE" issues 2>&1 || true)
if echo "$ISSUES" | grep -qiE 'empty sheet|broken|missing ref|error'; then
  "$SCRIPT_DIR/../lib/fail.sh" "xlsx issues: $FILE — $ISSUES"
fi

for err in '#REF!' '#DIV/0!' '#VALUE!' '#NAME?' '#N/A'; do
  if officecli query "$FILE" "cell:contains(\"$err\")" 2>/dev/null | grep -q .; then
    "$SCRIPT_DIR/../lib/fail.sh" "xlsx contains $err: $FILE"
  fi
done

if ! officecli validate "$FILE" 2>/dev/null | grep -q "no errors found"; then
  if ! officecli validate "$FILE" 2>/dev/null; then
    "$SCRIPT_DIR/../lib/fail.sh" "xlsx validate failed: $FILE"
  fi
fi

exit 0
