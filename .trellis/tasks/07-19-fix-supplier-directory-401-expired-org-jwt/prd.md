# Fix supplier-directory 401 expired Org JWT

## Goal

Stop quotation dual-call supplier lookups from failing with opaque `HTTP 401: Invalid or expired token` when the Org SSO JWT on disk has expired. Make failures actionable, keep `org-session.token` in sync with desktop login state, and restore live supplier MCP calls after re-login.

## What I already know

* Live eval `quotation-live-20260718-stabilized-3trial`: `suppliers_hybrid_match` failed 3× with `HTTP 401: Invalid or expired token`.
* Root cause confirmed: `%APPDATA%\AionUi-Dev\aionui\org-session.token` JWT `exp` was `2026-07-18T02:29:25Z` (~24h TTL); file not refreshed after expiry.
* MCP path: `mcp_servers/supplier-directory-server/index.mjs` reads `ORG_SESSION_TOKEN_FILE` per request; no expiry preflight; forwards bare HTTP errors.
* Desktop write path: AionUI `performOrgLogin` → IPC `org-auth-write-token` → `writeOrgSessionTokenFile`; `OrgAuthContext` clears file on invalid token but does not refresh without re-login.
* OpenSpec change already drafted: `openspec/changes/fix-supplier-dir-401-expired-token/` (proposal / design / specs / tasks complete).
* User chose MVP **Approach A** (2026-07-19).

## Requirements

* Ops recovery: re-login to AionUI Org SSO rewrites `org-session.token`; smoke `suppliers_hybrid_match` succeeds.
* MCP: detect missing/expired JWT (`exp` preflight) and map Org `401` invalid/expired to actionable auth errors (mention re-login / `org-session.token`; not “supplier search failed”).
* Desktop: login writes token file; invalid token / logout clears it; successful `refreshOrgAuth` with valid bearer rewrites disk from current bearer (prevent UI/disk drift).
* Docs: short troubleshooting note (supplier-directory 401 ⇒ re-login).
* Deploy/sync supplier-directory MCP to live CCB vendor path if needed; live smoke after login.

## Acceptance Criteria

* [ ] Expired/missing token yields actionable MCP error mentioning re-login / `org-session.token`.
* [ ] After Org login, supplier hybrid-match returns non-auth success.
* [ ] Invalid-token path clears disk token file; successful refresh rewrites disk bearer.
* [ ] Unit tests cover MCP missing/expired/401 mapping.
* [ ] Code-reviewer PASS → tests PASS → Trellis docs/closeout with live smoke evidence.

## Definition of Done

* Tests added/updated and green
* Code-reviewer then test-agent gates pass in order
* Docs/notes updated for troubleshooting
* Live smoke evidence recorded in closeout

## Technical Approach

Follow OpenSpec `fix-supplier-dir-401-expired-token`:

1. MCP UX-only JWT `exp` decode + actionable errors + 401 mapping in `supplier-directory-server`.
2. Desktop disk resync on successful auth refresh; keep login write + invalidation clear.
3. Docs + live re-login smoke.
4. No IdP TTL / refresh-token work in this task.

## Decision (ADR-lite)

**Context**: Need MVP depth for supplier 401 (MCP-only vs MCP+desktop vs +Python clients).  
**Decision**: Approach A — MCP actionable errors + desktop disk sync/clear + docs + live smoke after login.  
**Consequences**: Python Org client 401 wording stays as-is (follow-up). JWT TTL unchanged; users must re-login after ~24h until refresh tokens exist.

## Out of Scope

* Changing Org JWT signing secret or IdP TTL / refresh-token design
* Python Org client message alignment (Approach C deferred)
* Supplier match scoring / FTS quality
* Soft-passing Agent Eval on supplier 401
* Long-lived static `AIONCORE_JWT` production bypass

## Technical Notes

* OpenSpec: `openspec/changes/fix-supplier-dir-401-expired-token/`
* MCP: `mcp_servers/supplier-directory-server/index.mjs`
* Desktop (external tree): `D:\Projects\aionui-src\packages\desktop\src\common\auth\orgAuthLogin.ts`, `.../OrgAuthContext.tsx`, `.../orgServerConfig.ts`
* Live MCP env: `ORG_SERVER_URL=http://67.216.206.3:13401`, token file under `AionUi-Dev`
* Prior eval closeout noted supplier 401 as external to quotation output-contract task
