## Why

Live Agent Eval (`quotation-live-20260718-stabilized-3trial`) showed `mcp__supplier-directory__suppliers_hybrid_match` failing three times with `HTTP 401: Invalid or expired token`. Investigation proved this is not a supplier-directory API bug: the MCP Bearer JWT in `%APPDATA%\AionUi-Dev\aionui\org-session.token` expired (~24h TTL) and nothing refreshed it, so every Org API call from the MCP proxy fails until a human re-logs in.

## What Changes

- Make Org MCP session failures **actionable and self-diagnosing**: detect expired/missing JWT before (or clearly after) calling Org, and return a message that tells the agent/operator to re-login to AionUI Org SSO — not a bare `HTTP 401`.
- Keep the on-disk MCP token (`org-session.token`) **in sync** with the live Org session: on login write fresh JWT; on invalid-token / logout clear it; optionally re-check / rewrite on app focus or auth refresh.
- Improve supplier-directory (and sibling Org MCP clients) auth UX so quotation dual-call synthesis does not silently degrade to “货源名录失败” without an actionable auth reason.
- Document the operational recovery path (re-login refreshes the token file) and the expected JWT TTL.
- **Non-goal for this change:** changing Org IdP credentials, JWT signing secret, or supplier match scoring.

## Capabilities

### New Capabilities

- `org-mcp-session-freshness`: Contract for how desktop + MCP share Org JWT on disk, how expiry/401 is detected and surfaced, and how the token file is refreshed or cleared so supplier-directory / knowledge MCP stay authenticated after login.

### Modified Capabilities

- _(none — `openspec/specs/` has no baseline yet; related prior work lives under `openspec/changes/unified-org-sso`.)_

## Impact

| Area | Impact |
|------|--------|
| **AionUI desktop** (`aionui-src`) | `orgAuthLogin` / `OrgAuthContext` / `org-auth-write-token` — ensure disk token stays current; clearer invalidation path |
| **supplier-directory MCP** (`mcp_servers/supplier-directory-server`) | Preflight or clearer 401 mapping when JWT missing/expired; env still `ORG_SESSION_TOKEN_FILE` + `ORG_SERVER_URL` |
| **Python Org clients** (`python/admin/org_session.py` et al.) | Align error classification / messaging if they share the same expired-file failure mode |
| **Ops / eval** | Re-login recovers immediately; live quotation eval supplier dual-call stops failing for auth once token is fresh |
| **Docs** | Short note in org-knowledge / agent-hooks or MCP README: 401 = re-login, not “supplier API down” |
