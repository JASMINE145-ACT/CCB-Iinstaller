# Root cause — `missing_session_id` after funnel observability

**Date:** 2026-07-15  
**Method:** systematic-debugging Phase 1 (symptom → evidence → eliminate)  
**Parent:** `07-14-precipitation-effectiveness` Phase 4b blocked  
**OpenSpec:** `openspec/changes/fix-precipitation-missing-session-id/`

## Symptom

Mixing chip: 「沉淀已跳过：`missing_session_id`」 after ACP turns + idle debounce.

## Expected vs actual

| Expected | Actual |
|----------|--------|
| Phase 2 made skip **visible** | ✅ events + chip show `missing_session_id` |
| After bind/late-wait, schedule reaches worker | ❌ still always skip in wild use |
| `extra.acp_session_id` holds Claude ACP UUID | ❌ field never written in current `aionui-src` |

## Evidence

1. `useSessionPrecipitationSchedule.invokeSchedule` reads only `conversation.extra.acp_session_id` (+ 500ms late bind).
2. Repo-wide rg (`aionui-src` + patches + AionCore sources): **no writer** sets `acp_session_id` (only type, reads, clear-on-fork, legacy SQL key rename).
3. Worker requires ACP UUID for `~/.claude/projects/**/{session_id}.jsonl` — conversation_id alone is wrong.

## Hypotheses ranked

| ID | Hypothesis | Verdict |
|----|------------|---------|
| H1 | Observability bug (wrong chip label) | **Rejected** — label matches empty id + schedule_skipped |
| H2 | Race: id lands after 500ms | **Weak** — cannot land if never written |
| H3 | **extra.acp_session_id not synced from `acp_session.session_id`** | **Locked root cause** |
| H4 | Worker / transcript path | Deferred until H3 fixed |

**Locked root cause (refined 2026-07-15):** Session UUID **is** written to `acp_session.session_id` on `SessionAssigned`. Precipitation reads **`conversation.extra.acp_session_id`**, which is never synced from that table → perpetual `missing_session_id` on Mixing.

## Elimination log

- Rejected “only wait longer before schedule”.  
- Rejected “use conversationId as --session-id” (transcript filename contract).  
- Confirmed Phase 2 delivery made defect **actionable**; parent Phase 2 row did not include persist writer (scope was observability).
