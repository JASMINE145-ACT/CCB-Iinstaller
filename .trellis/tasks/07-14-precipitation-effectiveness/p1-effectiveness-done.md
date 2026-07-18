# Phase 1–4a done — precipitation effectiveness

**Date:** 2026-07-14  
**Task:** `07-14-precipitation-effectiveness`

## Delivered

| Item | Evidence |
|------|----------|
| Desensitized `precipitation_events.jsonl` | `ccbPrecipitationFunnel.ts` + `recordPrecipitationFunnelEvent` |
| Silent `!acp_session_id` fixed | `schedule_skipped` / `missing_session_id` |
| Debounce 30s | `PRECIPITATION_IDLE_DEBOUNCE_MS` |
| Chip status (conversation-scoped) | `PrecipitationSessionChip` + ChatConversation filter |
| PROMOTION negative auto test | deny → promote 0 calls |
| security-reviewer | **PASS** HG1/HG2/HG3 |
| code-reviewer | **PASS** (Layer A/B); Important #1 chip scope fixed |

## GREEN

```
bun test tests/unit/ccbPrecipitationFunnel.test.ts tests/unit/ccbPrecipitationEffectiveness.test.ts
→ 11 pass
python ccb-installer/.../test_precipitation_worker.py → 5 OK
```

## Manual smoke (human — remaining)

- [ ] Real ACP session (not smoke-session) → chip/events after 30s idle  
- [ ] events.jsonl has no proposal body  
- [ ] cancel on new message → `cancelled`
