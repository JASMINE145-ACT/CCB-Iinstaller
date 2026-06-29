#!/usr/bin/env bash
# subagent-gate.sh — CCB Stop / SubagentStop hook entry (stdin JSON).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUBAGENT_GATE_SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
export SUBAGENT_GATE_SKILL_ROOT

source "$SCRIPT_DIR/lib/mode.sh"
source "$SCRIPT_DIR/lib/parse-transcript.sh"

HOOK_INPUT="$(timeout 8 cat 2>/dev/null || echo '{}')"

json_field() {
  local key="$1"
  if command -v jq >/dev/null 2>&1; then
    echo "$HOOK_INPUT" | jq -r --arg k "$key" '.[$k] // ""'
  elif command -v node >/dev/null 2>&1; then
    HOOK_KEY="$key" node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8")); console.log(d[process.env.HOOK_KEY]??"");' <<<"$HOOK_INPUT"
  else
    echo ""
  fi
}

hook_event="$(json_field hook_event_name)"
hook_event="${hook_event:-Stop}"
agent_type="$(json_field agent_type)"
session_id="$(json_field session_id)"
last_msg="$(json_field last_assistant_message)"

if [[ "$hook_event" == "SubagentStop" ]]; then
  transcript_path="$(json_field agent_transcript_path)"
else
  transcript_path="$(json_field transcript_path)"
fi

if [[ -z "$agent_type" ]] || [[ "$agent_type" == "null" ]]; then
  exit 0
fi

mode="$(resolve_gate_mode "$agent_type")"

run_office_validator() {
  local validator_name="$1"
  local ext="$2"
  local validator="$SCRIPT_DIR/validators/$validator_name"
  parse_transcript_paths "$transcript_path" "$ext"
  if [[ -z "${PARSED_OFFICE_FILES:-}" ]]; then
    return 0
  fi
  while IFS= read -r f; do
    [[ -f "$f" ]] || continue
    bash "$validator" "$f"
  done <<<"$PARSED_OFFICE_FILES"
}

run_agent_validators() {
case "$agent_type" in
  word-creator)
    bash "$SCRIPT_DIR/validators/word-creator-mcp.sh" \
      "$transcript_path" "$session_id" "$last_msg" "$mode"
    ;;
  ppt-creator)
    run_office_validator office-pptx.sh '\.pptx$'
    ;;
  excel-creator)
    bash "$SCRIPT_DIR/validators/excel-creator-mcp.sh" \
      "$transcript_path" "$session_id" "$last_msg" "$mode"
    ;;
  quotation-agent)
    bash "$SCRIPT_DIR/validators/quotation-mcp.sh" \
      "$transcript_path" "$session_id" "$agent_type" "$last_msg" "$(resolve_gate_mode "$agent_type")"
    bash "$SCRIPT_DIR/validators/quotation-knowledge-read.sh" \
      "$transcript_path" "$session_id" "$agent_type" "$last_msg" "$(resolve_gate_mode "quotation-agent:knowledge")"
    ;;
  accurate-agent)
    bash "$SCRIPT_DIR/validators/accurate-mcp.sh" \
      "$transcript_path" "$session_id" "$agent_type" "$last_msg" "$mode"
    ;;
  *)
    if [[ "$mode" != "off" ]]; then
      :
    fi
    ;;
esac
}

# quotation-agent uses composite sub-modes (base mode may be "off")
if [[ "$mode" != "off" ]] || [[ "$agent_type" == "quotation-agent" ]]; then
  run_agent_validators
fi

# Universal ROE in-process self-check (all agents — mode via {agent_type}:roe-judge)
roe_judge_mode="$(resolve_gate_mode "${agent_type}:roe-judge")"
if [[ "$roe_judge_mode" != "off" ]]; then
  bash "$SCRIPT_DIR/validators/generic-roe-judge.sh" \
    "$transcript_path" "$session_id" "$agent_type" "$last_msg" "$roe_judge_mode"
fi

exit 0
