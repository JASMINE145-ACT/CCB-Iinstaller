## ADDED Requirements

### Requirement: Per-turn checkpoint without LLM
On a completed non-interrupted turn with final response, the system MUST persist or coalesce a TurnHarvest obligation updating `latestTurnId` without invoking the precipitation LLM.

#### Scenario: Checkpoint on turn complete
- **WHEN** turnCompleted fires with completed=true, interrupted=false, hasFinalResponse=true
- **THEN** obligation for that session is queued/updated and no FullReview LLM is required solely by that event

### Requirement: Watermark freeze on acquire
When starting FullReview, the scheduler MUST set `reviewThroughTurnId` to the current `latestTurnId` and MUST NOT advance `lastProcessedTurnId` past that frozen bound on success.

#### Scenario: Newer turn during review re-queues
- **WHEN** a run acquired at T5 succeeds while `latestTurnId` is T6
- **THEN** `lastProcessedTurnId` becomes T5 and state returns to queued

### Requirement: Lease-gated outcomes
FullReview results MUST include a leaseId; the scheduler MUST ignore outcomes with unknown or expired leases.

#### Scenario: Stale lease ignored
- **WHEN** an outcome arrives after restart invalidated the lease
- **THEN** state does not advance from that outcome
