# ccb-personal-memory

> **Stop / SubagentStop learning moved to `ccb-session-precipitation`** (idle 60s + Memory Inbox).
> This skill remains for **`/记住` explicit command** and worker library reuse.

## Stop hook (disabled)

`scripts/post-personal-memory-stop.py` — **no-op** (logs `unified-precipitation-mainline`, exit 0).
Agents still list the hook for compatibility; it does not spawn workers or append memory.

## Active entry (`/记住` only)

`scripts/personal-memory-worker.py` — thinking API → validate → append `memory/personal/*.md`
(enqueued by `/记住` command handler, not Stop).

## Unified learning mainline

See **`ccb-session-precipitation`**: idle 60s → LLM five lanes → Memory「待沉淀」→ promote (org KB / personal / golden / eval).

## Logs

`.claude/logs/personal-memory-stop.log` (no-op skip lines)

## Test env

| Var | Effect |
|-----|--------|
| `CCB_PERSONAL_MEMORY_SYNC` | Worker waits synchronously (unit tests) |
| `CCB_PERSONAL_MEMORY_THINKING_MOCK` | Mock JSON entries |
| `CCB_PERSONAL_MEMORY_FORCE_FALLBACK` | Heuristic fallback (worker only) |
