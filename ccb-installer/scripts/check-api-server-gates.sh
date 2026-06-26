#!/usr/bin/env bash
# B-04: ccb-api-server must not import serve-wanding or SDK
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/src/ccb-api-server"

if rg -n "serve-wanding|chunks/main-|entry-WG7IeDEv|@anthropic-ai/claude-agent-sdk" "$TARGET" 2>/dev/null; then
  echo "FAIL: forbidden import/reference in ccb-api-server"
  exit 1
fi

echo "PASS: ccb-api-server has no forbidden imports"
