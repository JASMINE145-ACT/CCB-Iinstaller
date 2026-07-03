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

# Successful Write tool call whose path matches ext_pattern (e.g. research/.*\.md).
has_successful_write_matching() {
  local transcript_path="${1:-}"
  local path_pattern="${2:-}"
  if [[ ! -f "$transcript_path" ]] || [[ -z "$path_pattern" ]]; then
    return 1
  fi
  local normalized
  normalized="$(sed 's/\\\\/\\/g' "$transcript_path" 2>/dev/null || cat "$transcript_path")"
  if echo "$normalized" | grep -qiE '"name"[[:space:]]*:[[:space:]]*"Write"' \
    && echo "$normalized" | grep -qE "$path_pattern"; then
    if echo "$normalized" | grep -E "$path_pattern" | grep -qiE '"is_error"[[:space:]]*:[[:space:]]*true'; then
      return 1
    fi
    return 0
  fi
  return 1
}

# Window-scoped L2 write success — delegates to parse_transcript_roe.py evaluate (full 6-step).
has_l2_write_success_in_window() {
  local transcript_path="${1:-}"
  if [[ ! -f "$transcript_path" ]]; then
    return 1
  fi
  local py=""
  if command -v python3 >/dev/null 2>&1; then
    py="python3"
  elif command -v python >/dev/null 2>&1; then
    py="python"
  fi
  if [[ -z "$py" ]]; then
    return 1
  fi
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local result
  result="$("$py" "$script_dir/parse_transcript_roe.py" evaluate \
    "$transcript_path" "window-check" "" "${SUBAGENT_GATE_LOG_DIR:-/tmp}" 2>/dev/null || true)"
  if echo "$result" | grep -q '"has_l2"[[:space:]]*:[[:space:]]*true'; then
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
    research-agent)
      echo "$msg" | grep -qiE '调研|来源|关键发现|政策|竞品|行业|摘要|research/|\.sources\.jsonl|\[S[0-9]+\]|已完成|整理如下|要点如下' && return 0
      ;;
  esac
  return 1
}
