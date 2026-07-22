## ADDED Requirements

### Requirement: Promotion success requires applied verification
After an operator approves an `org_business_rule` proposal, the system MUST resolve the item as approved only when the promotion result reports `applied=true` or an explicit duplicate/already-exists success. Process exit code alone is insufficient.

#### Scenario: applied true resolves
- **WHEN** promote returns `applied=true`
- **THEN** the pending item is marked resolved approved

#### Scenario: requires_confirmation stays pending
- **WHEN** promote returns `requires_confirmation=true` or `applied=false` without duplicate success
- **THEN** the item remains pending and the operator sees a visible failure/pending reason

#### Scenario: exit zero without applied does not approve
- **WHEN** the promote subprocess exits 0 but the payload lacks `applied=true` and is not an explicit duplicate success
- **THEN** the system MUST NOT mark the inbox item approved

### Requirement: Personal promote verifies write
After approving a `personal_habit`, the system MUST verify the target personal memory file was updated (or append acknowledged) before resolving approved.

#### Scenario: personal write failure stays pending
- **WHEN** personal append fails
- **THEN** the inbox item remains pending with an error reason
