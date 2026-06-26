#!/usr/bin/env bash
# Mock officecli for gate unit tests.
set -euo pipefail
cmd="${1:-}"
file="${2:-}"
case "$cmd" in
  close) exit 0 ;;
  validate)
    if [[ "$file" == *empty* ]]; then
      echo "schema errors found"
      exit 1
    fi
    echo "no errors found"
    exit 0
    ;;
  view)
    sub="${3:-}"
    if [[ "$sub" == "stats" ]]; then
      if [[ "$file" == *empty* ]]; then
        echo "words: 0"
      else
        echo "words: 42"
      fi
      exit 0
    fi
    if [[ "$sub" == "text" ]]; then
      if [[ "$file" == *empty* ]]; then
        echo ""
      else
        echo "Hello deliverable document body."
      fi
      exit 0
    fi
    ;;
  query)
    if [[ "$file" != *empty* ]] && [[ "${3:-}" == *page* ]]; then
      echo '{"data":{"results":[{"fieldType":"page"}]}}'
      exit 0
    fi
    echo '{"data":{"results":[]}}'
    exit 0
    ;;
esac
exit 0
