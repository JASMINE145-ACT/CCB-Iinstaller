## ADDED Requirements

### Requirement: Memory lanes are distinct
The product SHALL treat employee profile, personal habits, org business rules, local business context, precipitation inbox, and org knowledge as separate concerns.

#### Scenario: Operator maps personal habit
- **WHEN** an operator wants to store "how I usually work"
- **THEN** the system treats that as `personal_habit`, not org knowledge and not employee-profile

#### Scenario: Company SOP is org business rule
- **WHEN** an operator wants a tenant-wide business rule persisted
- **THEN** the system treats that as `org_business_rule` via approve→`append_business_rule` with verified apply

#### Scenario: Automatic precipitation does not fill local business files
- **WHEN** automatic FullReview runs
- **THEN** it MUST NOT create proposals whose intended sink is `memory/business/*`

#### Scenario: Agent or UI may edit local business context
- **WHEN** Accurate (or similar) agent or Memory UI appends to `memory/business/*`
- **THEN** that remains a valid `local_business_context` path and MUST NOT be described as Org Knowledge promotion

### Requirement: Automatic learning uses TurnHarvest then Inbox
The system MUST use TurnHarvest (per-turn checkpoint + policy-triggered full review into a pending inbox) as the sole automatic learning mainline. Idle debounce and session-end harvest MAY exist only as fallback for unfinished watermarks. Stop-hook personal-memory auto-write MUST remain disabled.

#### Scenario: Completed turn creates checkpoint without requiring LLM
- **WHEN** a conversation turn completes with final response and is not interrupted and not failed
- **THEN** a TurnCheckpoint obligation is persisted/coalesced for that session without requiring an immediate precipitation LLM call

#### Scenario: Full review yields pending, not silent write
- **WHEN** a full review runs and produces learnable proposals
- **THEN** pending entries require human review; habit/org files are not updated until approval with verified promotion result

#### Scenario: Watermark advances only through reviewed bound
- **WHEN** a FullReview run acquired with `reviewThroughTurnId=T5` completes successfully while `latestTurnId` has become T6
- **THEN** `lastProcessedTurnId` becomes T5 and obligation returns to `queued` for T6 (MUST NOT set `lastProcessedTurnId` to T6)

#### Scenario: Stop hook does not learn
- **WHEN** Stop or SubagentStop fires
- **THEN** ccb-personal-memory does not enqueue a writer for personal memory

### Requirement: Read paths stay on-demand
Agents MUST NOT preload all memory files at session start; they MUST read lane files only when agent L1 trigger conditions apply.

#### Scenario: Orchestrator reads personal habit on demand
- **WHEN** `wande-orchestrator` needs user work-habit context
- **THEN** it may Read `memory/personal/workflow.md` or `profile.md` per L1 rules
