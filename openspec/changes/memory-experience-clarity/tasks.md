## 1. Re-review absorption (C0 v3)

- [x] 1.1 Watermark: `reviewThroughTurnId` freeze; re-queue if latest newer
- [x] 1.2 Per-run outcome contract (`turn-harvest-runtime` spec)
- [x] 1.3 Lease / stale-lease / restart generation
- [x] 1.4 Relock Hermes SHA `1600008ab00e…` (discard `820cb051…`)
- [x] 1.5 Outbound defaults locked in D7 (allow + session deny + fail-closed + business fields)
- [x] 1.6 Agent write `memory/business/*` = path B local_business_context
- [x] 1.7 `proposal_kind` × `knowledge_object` axes
- [x] 1.8 E2E vs N=5 clarified (5 turns | test N=3 | force)
- [x] 1.9 Registry IDLE: four proposal kinds / legacy (not five-lane)
- [x] 1.10 PO ack of outbound D7 (or override) — **2026-07-16「执行」= 接受 D7**
- [x] 1.11 `openspec validate memory-experience-clarity`

## 2. Before I1

- [ ] 2.1 Mixing session-bind smoke + skip-reason stats（可与 I1 并行；不挡开 change）
- [x] 2.2 C0 closed 2026-07-16 — D7 ack + validate PASS

## 3. Implement change gate

- [x] 3.1 Open `precipitation-hermes-trigger` after C0 closed
- [x] 3.2 Implement outcome file writer (worker MUST NOT rely on exit 0 alone)
- [x] 3.3 Main-process scheduler + lease + watermark tests
- [x] 3.4 Promote applied verification
- [x] 3.5 Outbound redaction fail-closed tests
- [ ] 3.6 Labelled ≥50 precision+recall
- [ ] 3.7 E2E aligned with D8 (not silent 3-turn/N=5 mismatch)

## 4. Deferred

- [ ] 4.1 Auto proposals → `memory/business/*` — out
- [ ] 4.2 MemoryProvider / Stop LLM — out
