## 1. Worker outcome

- [x] 1.1 Add `precipitation_runs/<runId>.outcome.json` writer in ccb-session-precipitation
- [x] 1.2 Map LLM fail / no proposals / permanent skip to outcome enum; stop treating exit 0 as sole success
- [x] 1.3 Unit tests for outcome writer + worker paths

## 2. TurnHarvest scheduler (main)

- [x] 2.1 Obligation store (persist JSON under learning/) with lease + reviewThroughTurnId
- [x] 2.2 `checkpointTurn` + coalesce 1s; nudge N=5 → acquire FullReview
- [x] 2.3 Spawn worker with runId/leaseId/reviewThroughTurnId; poll/watch outcome
- [x] 2.4 Watermark advance + re-queue if latest > reviewThrough
- [x] 2.5 Restart: running→queued; invalidate leases
- [x] 2.6 Unit tests: watermark, lease stale, nudge reset

## 3. Wire UI / bridge

- [x] 3.1 turnCompleted → main checkpoint (not only renderer idle arm)
- [x] 3.2 Demote idle-30s to fallback (10min force); user-send must not drop TurnHarvest obligation
- [x] 3.3 Funnel events for checkpoint/full_review/stale_lease

## 4. Promote applied gate

- [x] 4.1 TS: resolve approve only on applied/duplicate (requires_confirmation stays pending)
- [x] 4.2 Unit tests for promote not_applied matrix

## 5. Verify

- [x] 5.1 code-reviewer PASS (Layer A PASS · Layer B PASS) — after recover-on-startup fix
- [x] 5.2 Targeted vitest / pytest PASS (23 vitest + 16 pytest after D7/reclaim slice)
- [x] 5.3 OpenSpec tasks updated; bind smoke still parallel (Phase 0)

## 6. Follow-up slice (2026-07-16)

- [x] 6.1 Outbound D7 redaction + session/tenant deny + fail-closed (`outbound_redaction.py`)
- [x] 6.2 Same-turn checkpoint coalesce 1s; expired-lease reclaim without restart
- [x] 6.3 Multi-proposal business recall prompt + gates (max 5, conf≥0.55)
- [x] 6.4 Deploy skill to `%LOCALAPPDATA%\CCB-Wanding\.claude\skills`
- [ ] 6.5 Mixing session-bind smoke (Phase 0 — needs live ACP UUID)
- [ ] 6.6 Labelled ≥50 eval / full E2E with N=5
