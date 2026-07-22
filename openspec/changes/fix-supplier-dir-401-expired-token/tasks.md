## 1. Ops recovery (unblock live supplier calls)

- [x] 1.1 Confirm current `org-session.token` under `AionUi-Dev` is expired (decode JWT `exp`)
- [x] 1.2 Re-login to Org SSO (via VPS `/login` + `env.local`) and verify token file mtime/`exp` refresh
- [x] 1.3 Smoke one live `suppliers_list` / `hybrid-match` call and confirm HTTP 200 / non-auth payload

## 2. Supplier-directory MCP auth UX

- [x] 2.1 Add JWT `exp` preflight helper in `mcp_servers/supplier-directory-server` (UX-only decode; do not treat as verified auth)
- [x] 2.2 Return actionable `ORG_SESSION_EXPIRED` / missing-token errors before calling Org when applicable
- [x] 2.3 Map Org `401` invalid/expired responses to the same actionable auth error class
- [x] 2.4 Add unit tests for missing token, expired `exp`, and 401 mapping

## 3. Desktop token-file sync hardening

- [x] 3.1 Verify login path still writes `org-session.token` via `org-auth-write-token`
- [x] 3.2 On successful `refreshOrgAuth` with a valid bearer, rewrite disk token from current bearer (prevent UI/disk drift)
- [x] 3.3 Keep invalid-token / logout path clearing the disk file
- [x] 3.4 Add or extend a focused test/fixture for write + clear behavior where practical — N/A (no OrgAuthContext test harness); MCP session-auth unit tests cover auth UX contract

## 4. Docs and verification gate

- [x] 4.1 Document troubleshooting: supplier-directory 401 ⇒ re-login to refresh `org-session.token` (not “supplier API down”)
- [x] 4.2 Deploy/sync supplier-directory MCP to the live CCB vendor path if needed
- [x] 4.3 Live Org supplier API smoke with refreshed JWT (HTTP 200); full quotation trial optional follow-up
- [x] 4.4 Run code-reviewer then tests per project gate order; record evidence in Trellis closeout when implementing
