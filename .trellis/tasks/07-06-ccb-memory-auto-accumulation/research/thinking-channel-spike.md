# Thinking channel spike — P5a

**Date:** 2026-07-06  
**Choice:** **Direct Anthropic-compatible Messages API** (MiniMax)

## Options considered

| Option | Verdict |
|--------|---------|
| Direct API `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` from `settings.json` | **Selected** — headless, no chat bubble |
| CLI one-shot | Deferred — heavier, session coupling |
| Full ACP session | Rejected — UI noise + cost |

## Implementation

- Base: `https://api.minimaxi.com/anthropic` (from ensure-wanding-settings)
- Endpoint: `POST {base}/v1/messages`
- Model: `minimax-m3-thinking` (override via `CCB_PERSONAL_MEMORY_MODEL`)
- Timeout: 45s
- Mock for tests: `CCB_PERSONAL_MEMORY_THINKING_MOCK` → JSON file
- Fallback: P4 heuristic inside worker when API fails / no token / `CCB_PERSONAL_MEMORY_FORCE_FALLBACK=1`

## Non-blocking

- Hook: write job + `status=learning` + `Popen` detached → exit 0
- Sync only when `CCB_PERSONAL_MEMORY_SYNC=1` (tests)
