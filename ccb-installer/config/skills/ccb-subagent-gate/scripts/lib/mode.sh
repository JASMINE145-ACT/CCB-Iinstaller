#!/usr/bin/env bash
# Resolve gate mode for an agent_type from modes.json or env override.
# Usage: resolve_gate_mode <agent_type>

resolve_gate_mode() {
  local agent_type="${1:-}"
  local skill_root="${SUBAGENT_GATE_SKILL_ROOT:-}"
  local modes_file="${skill_root}/config/modes.json"
  local env_key mode

  if [[ -z "$agent_type" ]]; then
    echo "off"
    return 0
  fi

  env_key="SUBAGENT_GATE_$(printf '%s' "$agent_type" \
    | tr '[:lower:]' '[:upper:]' \
    | tr -c 'A-Z0-9_' '_')_MODE"
  # shellcheck disable=SC2154
  if [[ -n "${!env_key:-}" ]]; then
    echo "${!env_key}"
    return 0
  fi

  if [[ -f "$modes_file" ]]; then
    if command -v jq >/dev/null 2>&1; then
      mode="$(jq -r --arg id "$agent_type" '.[$id] // "off"' "$modes_file" 2>/dev/null || echo off)"
      echo "$mode"
      return 0
    fi
    if command -v node >/dev/null 2>&1; then
      mode="$(MODES_FILE="$modes_file" AGENT_ID="$agent_type" node -e '
        const fs = require("fs");
        const p = process.env.MODES_FILE;
        const id = process.env.AGENT_ID;
        const j = JSON.parse(fs.readFileSync(p, "utf8"));
        console.log(j[id] ?? "off");
      ')"
      echo "$mode"
      return 0
    fi
  fi

  echo "off"
}
