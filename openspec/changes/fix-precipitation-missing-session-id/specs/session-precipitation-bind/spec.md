## ADDED Requirements

### Requirement: Persist ACP session id on conversation

The system SHALL write the live ACP agent session UUID to `conversation.extra.acp_session_id` (and update `acp_session_updated_at`) whenever an ACP session is created or replaced for that conversation.

#### Scenario: Session new binds id

- **WHEN** ACP warmup / `session/new` succeeds for conversation `C` with agent session UUID `S`
- **THEN** subsequent reads of conversation `C` include `extra.acp_session_id = S`

#### Scenario: Force warmup replaces stale id

- **WHEN** force-warmup allocates a new ACP session UUID `S2` for conversation `C` that previously stored `S1`
- **THEN** `extra.acp_session_id` MUST become `S2` (not remain `S1`)

#### Scenario: Forked conversation does not inherit id

- **WHEN** user creates a new conversation by cloning an ACP conversation
- **THEN** the new conversation MUST NOT inherit `acp_session_id` / `acp_session_updated_at`

### Requirement: Resolve session id before precipitation schedule

Before spawning the precipitation worker, the system SHALL resolve ACP session UUID using, in order: (1) `conversation.extra.acp_session_id`, (2) main-process runtime map keyed by `conversation_id` when available. Only if both fail MAY it emit `schedule_skipped` with `skippedReason: missing_session_id`.

#### Scenario: Extra present schedules worker

- **WHEN** idle debounce fires and `extra.acp_session_id` is a non-empty UUID
- **THEN** `schedulePrecipitation` MUST return `ok: true` (or fail with a different detail such as `worker_not_found`, never `missing_session_id`)

#### Scenario: Runtime fallback when extra empty

- **WHEN** idle debounce fires, `extra.acp_session_id` is empty, and runtime map has session UUID `S` for that `conversation_id`
- **THEN** schedule MUST use `S` and MUST NOT record `missing_session_id`

#### Scenario: Unbound remains observable skip

- **WHEN** idle debounce fires and no resolve path yields a session UUID
- **THEN** funnel MUST record `schedule_skipped` with `skippedReason: missing_session_id` (desensitized; no transcript body)

### Requirement: Mixing acceptance for real ACP idle

After a real ACP Guid/chat turn and idle debounce on Mixing (Electron), precipitation MUST leave the `missing_session_id` chip state unless the ACP runtime truly has no session.

#### Scenario: Chip not stuck on missing_session_id after successful turn

- **WHEN** user completes an ACP assistant turn on Mixing, waits ≥ debounce (30s), and session remains alive
- **THEN** chip / funnel last event MUST NOT be solely `schedule_skipped`/`missing_session_id` solely due to unbound extra (either `scheduled` or a later worker detail code)
