#!/usr/bin/env bash
# Usage: fail.sh "reason message"
# When sourced, defines fail_gate; when executed, rejects and exits 2.
set -euo pipefail

fail_gate() {
  local msg="${1:-Gate failed}"
  echo "REJECT: $msg" >&2
  exit 2
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  fail_gate "$@"
fi
