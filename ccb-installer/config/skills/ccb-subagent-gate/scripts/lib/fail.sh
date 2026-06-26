#!/usr/bin/env bash
# Usage: fail.sh "reason message"
set -euo pipefail
msg="${1:-Gate failed}"
echo "REJECT: $msg" >&2
exit 2
