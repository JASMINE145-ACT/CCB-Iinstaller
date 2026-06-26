#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/src/serve-wanding"

if rg -n "runAgentLoop|callApiSync|class McpClient" "$TARGET" 2>/dev/null; then
  echo "FAIL: duplicated agent logic in serve-wanding (should use ccb-runtime)"
  exit 1
fi

if rg -n "@anthropic-ai/claude-agent-sdk|chunks/main-Dj9buWt1" "$TARGET" 2>/dev/null; then
  echo "FAIL: forbidden import in serve-wanding"
  exit 1
fi

echo "PASS: serve-wanding is thin adapter over ccb-runtime"
