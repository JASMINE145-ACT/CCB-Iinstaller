#!/usr/bin/env bash
# office-word-form.sh — Gates 1-6 from officecli-word-form SKILL.md
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

if ! command -v jq >/dev/null 2>&1; then
  "$SCRIPT_DIR/../lib/fail.sh" "jq required for word-form gate"
fi

officecli close "$FILE" 2>/dev/null || true

VAL_OUT=$(officecli validate "$FILE" 2>&1 || true)
VAL_ERRS=$(echo "$VAL_OUT" | grep -c '\[Schema\]' || true)
VAL_PROT=$(echo "$VAL_OUT" | grep -c 'documentProtection' || true)
if [[ "$VAL_ERRS" -eq 0 ]]; then
  :
elif [[ "$VAL_ERRS" -eq 1 ]] && [[ "$VAL_PROT" -eq 1 ]]; then
  :
else
  "$SCRIPT_DIR/../lib/fail.sh" "Gate 1 validate: $VAL_ERRS schema errors: $FILE"
fi

LEAK=$(officecli view "$FILE" text 2>/dev/null | grep -niE '_{3,}|TBD|\(fill in\)|\{\{|xxxx|lorem|placeholder' || true)
if [[ -n "$LEAK" ]]; then
  "$SCRIPT_DIR/../lib/fail.sh" "Gate 2 placeholder leak: $FILE"
fi

SDT_N=$(officecli query "$FILE" sdt --json 2>/dev/null | jq '.data.results | length' 2>/dev/null || echo 0)
FF_N=$(officecli query "$FILE" formfield --json 2>/dev/null | jq '.data.results | length' 2>/dev/null || echo 0)
FLD_N=$(officecli query "$FILE" field --json 2>/dev/null | jq '.data.results | length' 2>/dev/null || echo 0)
TOTAL=$((SDT_N + FF_N + FLD_N))
if [[ "$TOTAL" -le 0 ]]; then
  "$SCRIPT_DIR/../lib/fail.sh" "Gate 3 no structured fields: $FILE"
fi

SDT_MISSING=$(officecli query "$FILE" sdt --json 2>/dev/null | jq '[.data.results[] | select(.format.alias == null or .format.alias == "" or .format.tag == null or .format.tag == "")] | length' 2>/dev/null || echo 0)
if [[ "$SDT_MISSING" -gt 0 ]]; then
  "$SCRIPT_DIR/../lib/fail.sh" "Gate 4 SDT missing alias/tag: $FILE"
fi

PROT=$(officecli get "$FILE" / --json 2>/dev/null | jq -r '.data.format.protection // "none"' 2>/dev/null || echo none)
if [[ "$PROT" != "forms" ]]; then
  "$SCRIPT_DIR/../lib/fail.sh" "Gate 5 protection not forms: $FILE ($PROT)"
fi

BAD_CB=$(officecli query "$FILE" sdt --json 2>/dev/null | jq '[.data.results[] | select(.format.type == "checkbox")] | length' 2>/dev/null || echo 0)
if [[ "$BAD_CB" -gt 0 ]]; then
  "$SCRIPT_DIR/../lib/fail.sh" "Gate 6 SDT checkbox leak: $FILE"
fi

exit 0
