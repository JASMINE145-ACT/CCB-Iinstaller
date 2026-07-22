## Why

C0 (`memory-experience-clarity`) is closed: TurnHarvest is the sole automatic learning mainline, Hermes layers are split (checkpoint ≠ full review), and outbound D7 is PO-acked. Legacy idle-30s cancel-on-send still runs in production and causes missed org-KB proposals. This change implements the runtime.

## What Changes

- Main-process **TurnHarvestScheduler**: per-turn checkpoint (no LLM), nudge-N full review, lease, `reviewThroughTurnId` watermark
- Worker **per-run outcome** JSON (authoritative); stop relying on exit 0 / global summary alone
- Wire `turnCompleted` → checkpoint; demote idle-30s to fallback/legacy
- Promote path: resolve approve only when `applied=true` or explicit duplicate
- Outbound: session deny + fail-closed redaction hook points (minimal viable)
- Tests for watermark / lease / outcome / promote applied

## Capabilities

### New Capabilities
- `turn-harvest-scheduler`: checkpoint, nudge, lease, watermark re-queue
- `precipitation-run-outcome`: atomic per-run outcome contract for worker↔scheduler
- `promote-applied-gate`: inbox resolve requires verified apply

### Modified Capabilities
- (none in openspec/specs baseline; Trellis `WANd.LEARNING.IDLE.001` already marked legacy)

## Impact

- `aionui-src`: precipitation schedule hook, main-process scheduler, promote verify, bridge
- `ccb-installer/.../ccb-session-precipitation`: worker outcome writer, exit semantics
- Companion: session-bind smoke may run in parallel
