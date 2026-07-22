## ADDED Requirements

### Requirement: Operator-facing promise boundary
Product copy and operator UI SHALL distinguish checkpointing, full review proposals, and promotion. Automatic memory MUST be described as TurnHarvest → Inbox approval (org/personal knowledge), not as silent Stop learning or guaranteed idle-30s capture.

#### Scenario: Promise for automatic path
- **WHEN** help describes automatic memory
- **THEN** it MUST state policy-triggered full review proposes to Inbox, and MUST NOT claim Stop or 30s idle alone guarantees org knowledge capture

#### Scenario: Manual and agent local escapes visible
- **WHEN** an operator uses Memory UI or an agent appends local business notes
- **THEN** the product MAY describe those as local drafts (`local_business_context`), not as approved org KB

### Requirement: Observability before blaming extraction quality
Operators MUST be able to see checkpoint/full-review outcomes including skip reasons, stale lease, and outbound denials.

#### Scenario: Missing session bind is visible
- **WHEN** ACP session id cannot be resolved
- **THEN** a missing-session skip reason is visible

### Requirement: Outbound learning privacy gate
Before sending transcript or memory excerpts to an external LLM for FullReview, the system MUST apply outbound policy and outbound redaction. Funnel event redaction alone is not sufficient.

#### Scenario: Default allow with session deny override
- **WHEN** tenant outbound default is allow and the session has learning suppress/deny
- **THEN** FullReview outbound is skipped with a desensitized reason

#### Scenario: Redaction failure is fail-closed
- **WHEN** required outbound redaction cannot be applied
- **THEN** the system MUST NOT send the raw payload; outcome is skip/error with `outbound_redaction_failed` (or equivalent)

#### Scenario: Business entities are in scope for redaction
- **WHEN** outbound redaction runs
- **THEN** customer/supplier names, project/contract ids, and prices/amounts are treated as sensitive business fields subject to redaction or placeholder substitution — not only API keys and phone numbers
