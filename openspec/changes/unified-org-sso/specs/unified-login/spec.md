## ADDED Requirements

### Requirement: Single login form posts directly to org IdP

When SSO mode is enabled and org server URL is configured, AionUI SHALL authenticate employees by POSTing to org aioncore only (design D7).

#### Scenario: Successful unified login

- **WHEN** the employee enters valid org credentials and org aioncore is reachable
- **THEN** AionUI POSTs to `{getOrgBaseUrl()}/login` (via `orgHttpBridge` or equivalent fetch with org origin)
- **AND** stores one JWT in `sessionStorage` under `aionui-session-token`
- **AND** writes the same JWT to `%APPDATA%/AionUi/aionui/org-session.token` (dev: `AionUi-Dev/aionui/…`)
- **AND** chat, tasks, org knowledge UI, and MCP use that token without a second login step

#### Scenario: Org server unreachable

- **WHEN** `org-server.json` is configured but org IdP is unreachable at login time
- **THEN** AionUI shows a clear error that knowledge sync and org features are unavailable
- **AND** chat SHALL NOT silently proceed with a local-only token unless `AIONUI_SSO_MODE=off` (explicit dev fallback)

### Requirement: Org sidebar entry reflects SSO state

The org knowledge sidebar entry SHALL appear when org server URL is configured at Electron startup.

#### Scenario: Config present after restart

- **WHEN** `org-server.json` contains a valid `url` and the app has been fully restarted (preload read)
- **THEN** `window.__orgServerUrl` is set
- **AND** the org knowledge menu entry is visible between Tasks and the divider

#### Scenario: Not logged in

- **WHEN** org URL is configured but no valid token is stored
- **THEN** navigating to `#/org-knowledge` redirects to the unified login flow (not a separate org-only login page)

### Requirement: MCP reads org API with unified token

Python quotation MCP SHALL read org knowledge via Org API when a valid unified token file exists.

#### Scenario: MCP knowledge load after SSO login

- **WHEN** the agent reads business knowledge and `org-session.token` contains a valid org JWT
- **THEN** `org_knowledge_client.py` logs `[KNOWLEDGE_SOURCE] Org API`
- **AND** does not fall back to `vendor/wanding/data/wanding_business_knowledge.md` unless org API returns error or offline mode is forced

### Requirement: Dev and bypass behavior

Development environments SHALL be able to test SSO without bypass shortcuts masking failures.

#### Scenario: SSO dev smoke

- **WHEN** developers run AionUI dev with `AIONUI_SSO_MODE=org-idp` against org VPS
- **THEN** `AIONUI_BYPASS_AUTH=1` does not auto-inject `system_default_user` (desktop `--local` does not exempt SSO mode)
- **AND** a documented dev login (real org test user) is used instead
