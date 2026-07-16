#!/usr/bin/env bash
# subagent-gate.sh — CCB Stop / SubagentStop hook entry (stdin JSON).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUBAGENT_GATE_SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
export SUBAGENT_GATE_SKILL_ROOT

source "$SCRIPT_DIR/lib/mode.sh"
source "$SCRIPT_DIR/lib/parse-transcript.sh"

hook_fields=()
if command -v node >/dev/null 2>&1; then
  mapfile -d '' -t hook_fields < <(node "$SCRIPT_DIR/lib/read-hook-input.mjs")
fi

hook_event="${hook_fields[0]:-Stop}"
agent_type="${hook_fields[1]:-}"
session_id="${hook_fields[2]:-}"
last_msg="${hook_fields[3]:-}"
agent_transcript_path="${hook_fields[4]:-}"
parent_transcript_path="${hook_fields[5]:-}"

if [[ "$hook_event" == "SubagentStop" ]]; then
  transcript_path="$agent_transcript_path"
  if [[ -z "$transcript_path" ]] || [[ ! -f "$transcript_path" ]]; then
    transcript_path="$parent_transcript_path"
  fi
else
  transcript_path="$parent_transcript_path"
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
      "$transcript_path" "$session_id" "$agent_type" "$last_msg" "$(resolve_gate_mode "quotation-agent:knowledge")" "$agent_transcript_path"
    ;;
  accurate-agent)
    bash "$SCRIPT_DIR/validators/accurate-mcp.sh" \
      "$transcript_path" "$session_id" "$agent_type" "$last_msg" "$mode"
    ;;
  research-agent)
    bash "$SCRIPT_DIR/validators/research-agent-mcp.sh" \
      "$transcript_path" "$session_id" "$agent_type" "$last_msg" "$mode"
    ;;
  price-library-agent)
    bash "$SCRIPT_DIR/validators/price-library-unpublished.sh" \
      "$transcript_path" "$session_id" "$agent_type" "$last_msg" "$(resolve_gate_mode "price-library-agent:unpublished")"
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

# Parent Outcome Relay (orchestrator): Agent artifact → parent bubble min fields
outcome_relay_mode="$(resolve_gate_mode "${agent_type}:outcome-relay")"
if [[ "$outcome_relay_mode" != "off" ]]; then
  bash "$SCRIPT_DIR/validators/outcome-relay.sh" \
    "$transcript_path" "$session_id" "$agent_type" "$last_msg" "$outcome_relay_mode"
fi

exit 0
