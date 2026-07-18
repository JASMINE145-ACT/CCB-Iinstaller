# Root-cause investigation — precipitation rare / no visible effect

**Date:** 2026-07-14  
**Method:** `superpowers:systematic-debugging` Phase 1 (no fix yet)  
**Parent shipped:** `07-09-idle-session-precipitation` / `WANd.LEARNING.IDLE.001`

## Symptom

User: 沉淀触发很少，至少效果不显著。  
Expected: after meaningful CCB ACP turns + 60s idle → worker run → Inbox proposals (or visible skip).  
Actual: almost no learning footprint in day-to-day use.

## Local evidence (this machine)

| Artifact | Finding |
|----------|---------|
| `%LOCALAPPDATA%\CCB-Wanding\.claude\learning\.precipitation-summary.json` | Last update **2026-07-09**; `skippedReason: transcript_not_found`; `sessionId: smoke-session` |
| `logs/precipitation-worker.log` | Only 2 lines, both smoke `transcript not found` |
| `learning/precipitation_pending.jsonl` | **MISSING** — Inbox never populated in real use on this box |

Conclusion: **pipeline is not producing pending proposals in the wild** (on this install). Not merely “user overlooked approve”.

## Funnel (instrumentation map)

```text
1 turnCompleted (renderer)          → needs event + conversationId match
2 60s debounce not cancelled        → user send cancels; leaving chat may clear timer
3 acp_session_id present            → else invokeSchedule silent return (no log)
4 schedulePrecipitation ok          → ccb_config / worker_not_found return detail (not surfaced)
5 precipitation_worker.py runs      → log + summary
6 find_transcript(session_id)       → else transcript_not_found
7 LLM extract                       → prefer skipped=true when weak
8 gates → pending jsonl             → no_proposals / filtered
9 Memory Inbox approve              → only then durable KB/habit
```

## Hypotheses (rank)

| ID | Hypothesis | Status |
|----|------------|--------|
| H1 | **Scheduler almost never reaches worker** (no sessionId / enabled / turnCompleted / leave before 60s) | **Most likely** — no real worker log since ship smoke |
| H2 | Worker runs but `find_transcript` fails for live ACP session ids | Possible after H1 fixed; smoke already hit this |
| H3 | Worker runs + LLM/`no_proposals` always skip | Possible; need funnel counters after H1 |
| H4 | Proposals exist but UI/Inbox hard to notice | Weak locally (no pending file) |
| H5 | Design conservativeness alone (60s + strict prompt) | Contributes once pipeline fires; not sole cause of empty log |

## Elimination log

1. Rejected “feature missing from install”: `skills/ccb-session-precipitation/SKILL.md` exists under live config.  
2. Rejected “user never waits 60s” as sole root cause: even intermittent waits should leave *some* log lines over days of use; machine has none after 07-09.  
3. Confirmed Stop personal-memory is intentional no-op — not a dual-track shortage, but **single idle track may be dark**.  
4. Confirmed silent drop: `useSessionPrecipitationSchedule` returns early if `!sessionId` with empty catch — **no durable evidence**.

## Recommended order (do not reverse)

1. **Observability first** — funnel events + surface `schedule` ok/detail + skip reason in chip/summary.  
2. **Fix silent schedule failures** once RED repro exists.  
3. **Only then** tune debounce / LLM skip policy / personal auto-write.

## Hard invariant (must not regress)

`WANd.LEARNING.PROMOTION.001` — business KB / eval must not silent-merge; Inbox (or equivalent) approve remains for org lanes.

## Security-review absorb (2026-07-14)

Confirmed / elevated:

1. **H1 locked:** renderer `!acp_session_id` early return (schedule.ts ~L28) never reaches worker `missing_session_id`.  
2. **`schedulePrecipitation` details unused:** `ccb_config_missing` / `worker_not_found` / `spawn_failed` returned but not persisted → cannot distinguish no-fire vs fire-fail.  
3. **Hard gate — redaction:** funnel events/summary/chip must not log transcript/KB/workflow/proposal body (worker still sends excerpts to LLM privately).  
4. **Hard gate — PROMOTION:** negative automated test required (not manual-only); only `approve`/`approve_edited` may enter `applyApprovedBusinessRule` (~ccbPrecipitation.ts:451).  
5. **Scope:** no personal-habit auto-write this task; light Inbox approve UX only.
