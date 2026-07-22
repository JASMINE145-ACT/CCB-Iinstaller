## ADDED Requirements

### Requirement: Per-run worker outcome is authoritative
The TurnHarvest Scheduler MUST transition FullReview state only from an atomic per-run outcome document that includes `runId`, `sessionId`, `leaseId`, `reviewThroughTurnId`, and `outcome`. Process exit code and the global precipitation summary file are insufficient alone.

#### Scenario: proposals outcome
- **WHEN** outcome is `proposals` with matching lease
- **THEN** pending items exist and watermark advances to `reviewThroughTurnId` (then re-queue if latest is newer)

#### Scenario: no_proposals outcome
- **WHEN** outcome is `no_proposals` with matching lease
- **THEN** watermark advances the same way without requiring pending rows

#### Scenario: retryable_error outcome
- **WHEN** outcome is `retryable_error`
- **THEN** obligation enters error/retry and nudge counter is not cleared as success

#### Scenario: Stale lease rejected
- **WHEN** an outcome arrives with unknown or expired leaseId
- **THEN** the Scheduler MUST ignore it for state transition and record a desensitized stale-lease event

### Requirement: FullReview lease prevents double workers
Each FullReview acquisition MUST mint a lease (`leaseId`, owner, expiry). After app restart, prior leases are invalid. A detached worker from a previous process MUST NOT be allowed to commit results under a new lease generation.

#### Scenario: Restart invalidates old lease
- **WHEN** the app restarts while a detached worker may still be alive
- **THEN** obligations in `running` move to `queued` with a new lease generation and old worker outcomes are rejected
