#!/usr/bin/env sh
# B-01.B: ccb-runtime must not import @anthropic-ai/claude-agent-sdk
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/src/ccb-runtime"

if [ ! -d "$TARGET" ]; then
  echo "FAIL: missing $TARGET"
  exit 1
fi

if grep -rn "from '@anthropic-ai/claude-agent-sdk'" "$TARGET" 2>/dev/null; then
  echo "FAIL: SDK query import found in ccb-runtime"
  exit 1
fi

if grep -rn "require('@anthropic-ai/claude-agent-sdk')" "$TARGET" 2>/dev/null; then
  echo "FAIL: SDK require found in ccb-runtime"
  exit 1
fi

echo "PASS: no SDK query import in ccb-runtime"
exit 0
