# Phase 5–6 done — SESSION_BIND hydrate + transcript config roots

**Date:** 2026-07-15  
**Task:** `07-14-precipitation-effectiveness`  
**Backlog:** `research/residual-risks-backlog.md` (R0–R1)

## Delivered

| Item | Change |
|------|--------|
| R0 SESSION_BIND | AionCore `backfill_extra_inplace` hydrates `acp_session.session_id` → `extra.acp_session_id` |
| Resolve | `resolvePrecipitationSessionId` (acp_session_id → sessionKey) |
| R1 transcript | `find_transcript` searches `--config-dir` / CLAUDE_CONFIG_DIR / CCB_WANDING_CONFIG_DIR before `~/.claude` |

## Evidence

- code-reviewer: **PASS** (Layer A PASS, Layer B PASS)  
- security-review: **PASS** (worker path)  
- `cargo test -p aionui-conversation --lib hydrate_acp_session_id` → 3 ok  
- `bun test` precipitation effectiveness+funnel → 14 pass  
- `python …/test_precipitation_worker.py` → OK (6)

## Remaining (ordered)

| Phase | Risk | Status |
|-------|------|--------|
| 6.2 R2 | clear/skip stale extra when table session_id empty | open (Mixing follow-up) |
| 7 | cancel vs schedule metrics | pending |
| 8 | Inbox / LLM metrics-gated | deferred |

## Mixing smoke (human)

After **local aioncore rebuild/restart** + Mixing restart: ACP turn → 30s → chip should leave sole `missing_session_id` (expect `scheduled` or later worker reason e.g. `no_proposals` / `transcript_not_found` only if data missing).
