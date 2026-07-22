## ADDED Requirements

### Requirement: Org promote requires applied
Approving an org_business_rule MUST resolve the inbox item only when promote reports `applied=true` or an explicit duplicate success.

#### Scenario: applied false stays pending
- **WHEN** promote returns applied=false without duplicate
- **THEN** the item remains pending with a visible error
