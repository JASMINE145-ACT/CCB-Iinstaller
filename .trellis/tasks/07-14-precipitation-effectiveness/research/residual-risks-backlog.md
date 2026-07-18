# Precipitation residual risks (ordered backlog)

**Date:** 2026-07-15  
**Parent:** `07-14-precipitation-effectiveness`  
**Doctrine:** Fix in order — do **not** jump to LLM/Inbox polish while earlier stages fail.

| # | Risk | Symptom when hit | Contract | Phase | Status |
|---|------|------------------|----------|-------|--------|
| R0 | **Reader/table mismatch：UUID in `acp_session.session_id`, precipitiation reads dead `extra.acp_session_id`** | Chip `missing_session_id` | `SESSION_BIND.001` | **5** | **DONE** |
| R1 | **`transcript_not_found` / wrong config dir** | Scheduled then skip; worker summary | `IDLE.001` | **6** | **DONE** (config roots) |
| R2 | **Idle kill → UUID swap not rebound** | Schedule with stale id → session/transcript miss | `SESSION_BIND` + `IDLE` | **6** | **partial** — overwrite when new UUID ok; clear when table empty still open |
| R3 | **`turn.completed.session_id` = conversationId** | Arm OK but cannot read ACP UUID from event | docs + resolve | **5** (document) / harden if needed | noted |
| R4 | **User keep chatting → `cancelled`** | Rare precipitation (product bias) | `FUNNEL` metrics | **7** observe | pending |
| R5 | **LLM prefer `skipped` / `no_proposals`** | Worker runs, Inbox empty | `IDLE` efficacy | **8** metrics-gated | deferred |
| R6 | **Inbox hard to notice** | pending file exists, user misses | UX | **8** | deferred |
| R7 | **`ccb_config_missing` / `worker_not_found` / spawn** | schedule_skipped other reasons | `FUNNEL` | **6** check after bind | pending |
| R8 | **Stop personal-memory intentional no-op** | Expect dual-track | docs-only | — | by design |
| R9 | **WebUI / browser no Electron spawn** | Permanent skip outside Mixing exe | scope | defer | Electron first |
| R10 | **Fork clears id (correct) vs accidental clear** | New chat missing id (OK); live chat wrongly cleared (bug) | SESSION_BIND | **5** guard | with 5.2 |
| R11 | **Redaction vs deep debug** | Cannot diagnose LLM from events alone | `REDACTION` | — | hold invariant |

## Fix order (locked)

```text
5 SESSION_BIND (R0, R3 note, R10)
  → 6 transcript / CLAUDE_CONFIG_DIR / stale UUID (R1, R2, R7)
  → 7 funnel metrics: cancel vs schedule rates (R4)
  → 8 Inbox UX / LLM loosen only if rates show need (R5, R6)
```

Hard rules: no personal auto-write; no PROMOTION bypass; no stuffing transcript into funnel events.
