#!/usr/bin/env sh
# B-02.G: ccb-runtime must not import serve-wanding dist chunk
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/src/ccb-runtime"

if [ ! -d "$TARGET" ]; then
  echo "FAIL: missing $TARGET"
  exit 1
fi

if grep -rn "serve-wanding" "$TARGET" 2>/dev/null; then
  echo "FAIL: serve-wanding reference found in ccb-runtime"
  exit 1
fi

if grep -rn "chunks/serve-wanding" "$TARGET" 2>/dev/null; then
  echo "FAIL: serve-wanding chunk import found"
  exit 1
fi

echo "PASS: no serve-wanding import in ccb-runtime"
exit 0
