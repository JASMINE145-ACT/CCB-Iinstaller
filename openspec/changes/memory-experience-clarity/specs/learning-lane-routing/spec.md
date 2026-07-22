## ADDED Requirements

### Requirement: Two-axis proposal classification
Automatic precipitation proposals MUST carry `proposal_kind` and, when applicable, `knowledge_object`.

#### Scenario: Knowledge proposal has a knowledge object
- **WHEN** a proposal is durable personal or org knowledge
- **THEN** `proposal_kind` is `knowledge` and `knowledge_object` is exactly one of `personal_habit` or `org_business_rule` (automatic path MUST NOT use `local_business_context`)

#### Scenario: Golden and eval have null knowledge object
- **WHEN** a proposal is a golden path or eval case
- **THEN** `proposal_kind` is `golden_path` or `eval_case` and `knowledge_object` is null

### Requirement: Local business write paths
`local_business_context` files under `memory/business/*` MUST NOT be sinks for automatic FullReview proposals. Explicit Agent Read-then-append and Memory UI edits remain allowed write paths for local drafts only and MUST NOT imply Org Knowledge promotion.

#### Scenario: Automatic review never targets memory business files
- **WHEN** FullReview emits proposals
- **THEN** none have intended sink `memory/business/*`

#### Scenario: Agent explicit local append allowed
- **WHEN** an agent such as accurate-agent appends a customer/supplier caliber or pricing note to `memory/business/*.md` per its L1 write trigger
- **THEN** the write is classified as `local_business_context` path B and does not by itself call `append_business_rule`

### Requirement: Four automatic proposal kinds
Automatic FullReview MUST support exactly four gated proposal kinds mapped as: org business knowledge, personal habit knowledge, golden_path, eval_case — and MUST NOT claim a fifth automatic lane without tests and registry update.

#### Scenario: No five-lane claim
- **WHEN** describing shipped automatic precipitation
- **THEN** documentation and registry titles MUST say four proposal kinds (or list them), not "five-lane"
