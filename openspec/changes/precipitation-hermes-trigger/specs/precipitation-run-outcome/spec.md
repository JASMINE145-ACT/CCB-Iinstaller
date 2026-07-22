## ADDED Requirements

### Requirement: Atomic per-run outcome
The worker MUST write an atomic outcome JSON for every finished FullReview attempt, including `outcome` in `proposals|no_proposals|retryable_error|permanent_skip`.

#### Scenario: LLM failure is retryable_error
- **WHEN** the precipitation LLM fails
- **THEN** outcome is `retryable_error` (not silent success via exit 0 alone)

#### Scenario: Empty extract is no_proposals
- **WHEN** the worker completes with zero gated proposals
- **THEN** outcome is `no_proposals` and the scheduler may advance watermark
