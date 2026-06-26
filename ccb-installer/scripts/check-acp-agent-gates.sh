#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/src/ccb-acp-agent"

if rg -n "@anthropic-ai/claude-agent-sdk|\\bquery\\(|runAgentLoop|callApiSync|class McpClient" "$TARGET" 2>/dev/null; then
  echo "FAIL: forbidden pattern in ccb-acp-agent"
  exit 1
fi

echo "PASS: ccb-acp-agent is thin adapter over ccb-runtime"
