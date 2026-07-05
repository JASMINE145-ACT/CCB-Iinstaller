# ccb-personal-memory

Personal memory on **Stop / SubagentStop**: non-blocking enqueue + background **minimax-m3-thinking** extract (heuristic fallback).

## Entry

1. `scripts/post-personal-memory-stop.py` — writes job + `.learning-status.json` (`learning`), spawns worker, **exit 0 immediately**
2. `scripts/personal-memory-worker.py` — thinking API → JSON → validate → append `memory/personal/workflow.md`

## Status (UI)

`.claude/memory/.learning-status.json` — AionUI banner when `status=learning` (stale after 90s)

## Agents

| Agent | Event |
|-------|-------|
| `wande-orchestrator` | Stop |
| `quotation-agent` | SubagentStop (via Stop chain) |
| `accurate-agent` | SubagentStop (via Stop chain) |

## Logs

`.claude/logs/personal-memory-stop.log`

## Test env

| Var | Effect |
|-----|--------|
| `CCB_PERSONAL_MEMORY_SYNC=1` | Hook waits for worker (unit tests) |
| `CCB_PERSONAL_MEMORY_THINKING_MOCK` | Path to mock JSON entries |
| `CCB_PERSONAL_MEMORY_FORCE_FALLBACK=1` | Skip API, use heuristic |
