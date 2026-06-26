#!/usr/bin/env bash
# Parse agent/session transcript JSONL for office paths and MCP tool evidence.
# Sets shell variables (caller must not use set -u before sourcing).

parse_transcript_paths() {
  local transcript_path="${1:-}"
  local ext_pattern="${2:-\\.(docx|pptx|xlsx)$}"
  if [[ ! -f "$transcript_path" ]]; then
    PARSED_OFFICE_FILES=""
    return 0
  fi
  # Normalize JSON-escaped Windows paths (C:\\tmp\\a.docx -> C:\tmp\a.docx)
  local normalized
  normalized="$(sed 's/\\\\/\\/g' "$transcript_path" 2>/dev/null || cat "$transcript_path")"
  PARSED_OFFICE_FILES="$(
    echo "$normalized" \
      | grep -oE '[A-Za-z]:\\[^"[:space:]]+\.(docx|pptx|xlsx)|/[A-Za-z0-9_./-]+\.(docx|pptx|xlsx)' 2>/dev/null \
      | sort -u \
      | grep -iE "$ext_pattern" \
      || true
  )"
}

parse_transcript_mcp_tools() {
  local transcript_path="${1:-}"
  local pattern="${2:-}"
  if [[ ! -f "$transcript_path" ]] || [[ -z "$pattern" ]]; then
    PARSED_MCP_HITS=""
    return 0
  fi
  PARSED_MCP_HITS="$(grep -E "$pattern" "$transcript_path" 2>/dev/null | sort -u || true)"
}

has_successful_mcp_call() {
  local transcript_path="${1:-}"
  local tool_pattern="${2:-}"
  if [[ ! -f "$transcript_path" ]] || [[ -z "$tool_pattern" ]]; then
    return 1
  fi
  # Tool name appears and line does not look like a hard error-only stub.
  if grep -qE "$tool_pattern" "$transcript_path" 2>/dev/null; then
    if grep -E "$tool_pattern" "$transcript_path" | grep -qiE '"is_error"[[:space:]]*:[[:space:]]*true'; then
      return 1
    fi
    return 0
  fi
  return 1
}

message_claims_business_output() {
  local agent_type="${1:-}"
  local msg="${2:-}"
  [[ -n "$msg" ]] || return 1

  case "$agent_type" in
    quotation-agent)
      echo "$msg" | grep -qiE '价格|报价|单价|库存|填单|match_quotation|¥|RP[[:space:]]*[0-9]|customer_level' && return 0
      ;;
    accurate-agent)
      echo "$msg" | grep -qiE '销售|采购|汇总|合计|账务|accurate|vendor|purchase|revenue|总额' && return 0
      ;;
  esac
  return 1
}
