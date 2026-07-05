#!/usr/bin/env bash
# research-agent-mcp.sh — evidence delivery gate (warn/block per mode)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/fail.sh"
source "$SCRIPT_DIR/../lib/warn.sh"
source "$SCRIPT_DIR/../lib/parse-transcript.sh"

transcript_path="${1:-}"
session_id="${2:-}"
agent_type="${3:-research-agent}"
last_msg="${4:-}"
mode="${5:-warn}"

if ! message_claims_business_output "$agent_type" "$last_msg"; then
  exit 0
fi

tool_pattern='mcp__(exa|tavily|scrapling)__'
if ! has_successful_mcp_call "$transcript_path" "$tool_pattern"; then
  reason="claimed research output but no successful mcp__exa__*, mcp__tavily__*, or mcp__scrapling__* in transcript"
  if [[ "$mode" == "block" ]]; then
    "$SCRIPT_DIR/../lib/fail.sh" "$reason"
  fi
  "$SCRIPT_DIR/../lib/warn.sh" "$session_id" "$agent_type" "$reason"
fi

md_pattern='research/[A-Za-z0-9_.-]+\.md'
jsonl_pattern='research/[A-Za-z0-9_.-]+\.sources\.jsonl'

has_research_md=false
has_research_jsonl=false
if has_successful_write_matching "$transcript_path" "$md_pattern"; then
  has_research_md=true
fi
if has_successful_write_matching "$transcript_path" "$jsonl_pattern"; then
  has_research_jsonl=true
fi

if [[ "$has_research_md" == false ]] || [[ "$has_research_jsonl" == false ]]; then
  reason="claimed research delivery but missing successful Write to research/*.md and/or research/*.sources.jsonl"
  if [[ "$mode" == "block" ]]; then
    "$SCRIPT_DIR/../lib/fail.sh" "$reason"
  fi
  "$SCRIPT_DIR/../lib/warn.sh" "$session_id" "$agent_type" "$reason"
fi

exit 0
