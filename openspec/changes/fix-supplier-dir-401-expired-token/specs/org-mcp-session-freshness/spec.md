## ADDED Requirements

### Requirement: MCP reads Org JWT from the configured session token file

The supplier-directory MCP server MUST authenticate Org API calls using the Bearer JWT from `ORG_SESSION_TOKEN_FILE` when set (falling back to `AIONCORE_JWT` only when the file is unset/empty per existing env contract). It MUST re-read the file for each request so a refreshed login is visible without restarting the MCP process.

#### Scenario: Fresh token file authorizes hybrid match

- **WHEN** `ORG_SESSION_TOKEN_FILE` contains a non-expired Org JWT accepted by the Org server
- **AND** the agent calls `suppliers_hybrid_match` with a non-empty `q`
- **THEN** the MCP server MUST call Org `/api/suppliers/hybrid-match` with `Authorization: Bearer <jwt>`
- **AND** MUST return the Org payload (not an auth error)

#### Scenario: Missing token fails closed with actionable message

- **WHEN** `ORG_SESSION_TOKEN_FILE` is configured but the file is missing or empty and no static JWT is available
- **AND** any supplier-directory tool that requires Org auth is invoked
- **THEN** the tool result MUST be an error
- **AND** the error text MUST indicate that Org SSO login is required to create `org-session.token`

### Requirement: Expired Org JWT is detected and surfaced clearly

The supplier-directory MCP server MUST detect an expired JWT `exp` claim (local decode for UX) and MUST NOT pretend the call succeeded. Error text MUST tell the operator/agent to re-login to AionUI Org SSO to refresh the token file. When Org returns HTTP 401 with an invalid/expired token body, the MCP server MUST map that failure to the same class of actionable auth error rather than only echoing a raw status line.

#### Scenario: Locally expired token before network call

- **WHEN** the token file contains a JWT whose `exp` is earlier than the current time
- **AND** a supplier-directory tool is invoked
- **THEN** the tool result MUST be an error indicating the Org session is expired
- **AND** the error MUST instruct re-login to AionUI to refresh `org-session.token`

#### Scenario: Org rejects token as invalid or expired

- **WHEN** the token file appears non-expired locally
- **AND** Org responds `401` with an invalid/expired token message
- **THEN** the tool result MUST be an error indicating Org authentication failed / session must be renewed
- **AND** MUST NOT be described as a supplier-search algorithm failure

### Requirement: Desktop keeps the MCP token file synchronized with Org login state

AionUI desktop MUST write the Org JWT to the profile `org-session.token` path on successful Org login, and MUST clear that file on logout or when Org auth refresh determines the bearer is invalid. After a successful auth refresh that still has a valid bearer, desktop SHOULD rewrite the disk file from the current bearer so MCP and UI do not diverge.

#### Scenario: Login refreshes MCP token file

- **WHEN** the user successfully completes Org login in AionUI
- **THEN** desktop MUST persist the returned JWT to `org-session.token` under the active AppData profile
- **AND** a subsequent supplier-directory MCP call MUST be able to read that fresh token without restarting the desktop app process (MCP re-read on request is sufficient)

#### Scenario: Invalid session clears MCP token file

- **WHEN** Org auth refresh receives `401`/`403` for the current bearer (invalid token)
- **THEN** desktop MUST clear the in-memory/session Org token
- **AND** MUST clear `org-session.token` on disk so MCP does not keep presenting a known-bad JWT as if it were valid
