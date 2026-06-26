#!/usr/bin/env bash
# office-pptx.sh — Validate .pptx from ppt-master (no officecli).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/fail.sh"

FILE="${1:-}"
if [[ -z "$FILE" ]] || [[ ! -f "$FILE" ]]; then
  exit 0
fi

PY=""
for candidate in python python3 py; do
  if command -v "$candidate" >/dev/null 2>&1; then
    PY="$candidate"
    break
  fi
done

if [[ -z "$PY" ]]; then
  "$SCRIPT_DIR/../lib/fail.sh" "python not found — cannot validate $FILE"
fi

if ! "$PY" - "$FILE" <<'PY'
import re
import sys
import zipfile

path = sys.argv[1]
with zipfile.ZipFile(path) as z:
    slide_parts = [
        n
        for n in z.namelist()
        if n.startswith("ppt/slides/slide") and n.endswith(".xml")
    ]
    if not slide_parts:
        print("no slides in pptx", file=sys.stderr)
        sys.exit(1)

try:
    from pptx import Presentation

    prs = Presentation(path)
    if len(prs.slides) < 1:
        print("empty deck", file=sys.stderr)
        sys.exit(2)
    chunks = []
    for slide in prs.slides:
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text:
                chunks.append(shape.text)
    blob = "\n".join(chunks)
    if re.search(r"xxxx|lorem\s+ipsum|<todo>|placeholder", blob, re.I):
        print("placeholder leak", file=sys.stderr)
        sys.exit(3)
except ImportError:
  pass

sys.exit(0)
PY
then
  "$SCRIPT_DIR/../lib/fail.sh" "ppt-master pptx validation failed: $FILE"
fi

exit 0
