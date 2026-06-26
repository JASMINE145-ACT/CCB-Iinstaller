#!/usr/bin/env bash
# accurate-mcp.sh — MCP evidence check (warn or block per mode)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/fail.sh"
source "$SCRIPT_DIR/../lib/warn.sh"
source "$SCRIPT_DIR/../lib/parse-transcript.sh"

transcript_path="${1:-}"
session_id="${2:-}"
agent_type="${3:-accurate-agent}"
last_msg="${4:-}"
mode="${5:-warn}"

if ! message_claims_business_output "$agent_type" "$last_msg"; then
  exit 0
fi

tool_pattern='mcp__accurate__'
if has_successful_mcp_call "$transcript_path" "$tool_pattern"; then
  exit 0
fi

reason="claimed accurate analytics output but no successful mcp__accurate__* in transcript"
if [[ "$mode" == "block" ]]; then
  "$SCRIPT_DIR/../lib/fail.sh" "$reason"
fi

"$SCRIPT_DIR/../lib/warn.sh" "$session_id" "$agent_type" "$reason"
