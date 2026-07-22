# System Review adoption log

## Round 1 (2026-07-16) — direction ok, contract incomplete
Absorbed into v2: split layers, TurnHarvest mainline, three objects, applied spec, outbound stub.

## Round 2 (2026-07-16) — C0 still open; new implement-level P0s
Absorbed into **v3**:

| Gate | Action |
|------|--------|
| Watermark jump to latest | `reviewThroughTurnId` semantics |
| Exit 0 / global summary | per-run outcome + `turn-harvest-runtime` |
| Detached double worker | lease + stale reject |
| Outbound unlocked | D7 defaults + fail-closed + business fields |
| Bad Hermes SHA | `1600008ab00e…` via GitHub API + raw hashes |
| Agent vs local business | path B allowed |
| Axes mix | proposal_kind × knowledge_object |
| E2E vs N=5 | D8 test matrix |
| Registry five-lane | IDLE.001 → four kinds / legacy |

**Still not I1:** need PO ack D7 (or override) + validate + ideally re-review pass.
