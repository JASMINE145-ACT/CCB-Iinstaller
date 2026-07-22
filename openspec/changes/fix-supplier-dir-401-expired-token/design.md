## Context

Live quotation eval (2026-07-18) called `suppliers_hybrid_match` three times and got:

```text
HTTP 401: Invalid or expired token
```

Runtime chain:

1. CCB settings wire supplier-directory MCP with:
   - `ORG_SERVER_URL=http://67.216.206.3:13401`
   - `ORG_SESSION_TOKEN_FILE=%APPDATA%\AionUi-Dev\aionui\org-session.token`
2. MCP (`mcp_servers/supplier-directory-server/index.mjs`) reads that file on each request and sends `Authorization: Bearer <jwt>`.
3. Inspected token (2026-07-18 ~13:31 UTC):
   - file mtime `2026-07-17T02:29:20Z`
   - JWT `exp` `2026-07-18T02:29:25Z` (**expired**)
   - subject `admin` / issuer `aionui`
4. Desktop writes the file only on successful Org login (`performOrgLogin` → IPC `org-auth-write-token`). `OrgAuthContext` clears the file on invalid token, but does **not** refresh it without a new login. MCP has no refresh path.

So the 401 is an **expired Org session on disk**, not a supplier hybrid-match algorithm failure. Quotation dual-call synthesis correctly attempted the tool; auth blocked the Org API.

Stakeholders: quotation agent dual synthesis, supplier-directory MCP, AionUI Org SSO, live Agent Eval.

## Goals / Non-Goals

**Goals:**

- Operators and agents can tell “Org session expired — re-login” apart from “supplier API / network down”.
- After a successful Org login, `org-session.token` is fresh enough for MCP reads.
- On logout / confirmed invalid token, the disk file is cleared so MCP fails closed with a clear missing-token message.
- Optional light preflight in MCP: decode JWT `exp` (no signature verify required for local UX) and refuse with an actionable error before hitting Org.
- Document the one-step recovery: open AionUI (AionUi-Dev profile) → Org login → token file rewritten.

**Non-Goals:**

- Changing Org JWT signing, TTL policy on the IdP, or introducing refresh tokens in this change (may be a follow-up).
- Fixing supplier match quality / FTS scoring.
- Making Agent Eval soft-pass supplier 401 (auth must work for dual synthesis).
- Shipping a long-lived static `AIONCORE_JWT` bypass for production MCP.

## Decisions

### D1 — Treat root cause as session freshness, not supplier API

**Choice:** Scope the fix to Org JWT lifecycle between desktop and MCP.

**Why:** Evidence shows `exp` past now; Org server message matches. Hybrid-match path is fine when authenticated.

**Alternative considered:** Retry / rotate across profiles (legacy scan). Rejected — live config already uses strict `ORG_SESSION_TOKEN_FILE`; multi-profile guessing hides misconfiguration.

### D2 — Actionable MCP errors over silent HTTP passthrough

**Choice:** When JWT is missing or `exp` is in the past, supplier-directory returns a structured error such as `ORG_SESSION_EXPIRED: re-login to AionUI (profile AionUi-Dev) to refresh org-session.token`. On live 401 from Org, map similarly if the body indicates invalid/expired token.

**Why:** Quotation agent currently surfaces raw HTTP 401; operators misread it as “supplier down”.

**Alternative considered:** Only document re-login in ops runbooks. Rejected as insufficient — agents and eval still see opaque failures.

### D3 — Desktop remains the sole writer of `org-session.token`

**Choice:** Keep write path on login (`org-auth-write-token`); ensure invalidation clears disk; add a cheap “resync disk from in-memory bearer” when `refreshOrgAuth` succeeds so long-lived sessions that renew UI state also refresh the file if needed.

**Why:** MCP must not hold passwords or call `/login`. Desktop already owns credentials UX.

**Alternative considered:** MCP silent re-login with stored credentials. Rejected — credential storage and attack surface.

### D4 — No IdP TTL change in this PR

**Choice:** Leave ~24h JWT TTL as-is; focus on detection + re-login UX. TTL / refresh-token design is a follow-up under unified SSO if ops wants multi-day unattended MCP.

**Why:** Extending TTL without refresh tokens increases stolen-token window; needs security review.

### D5 — Verify with live token probe + one supplier tool call

**Choice:** After re-login (or after code fix), verify: decode `exp` > now, then `suppliers_hybrid_match` (or `suppliers_list`) returns 200.

**Why:** Matches the failure mode observed in eval.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| MCP preflight decodes JWT without verifying signature → attacker could plant fake unexpired blob | Still sent to Org which verifies; preflight is UX-only. Never treat local decode as auth success. |
| User never opens AionUI → MCP stays expired | Error text MUST say re-login; eval/docs note desktop must be logged in for supplier dual-call. |
| sessionStorage token and disk file diverge | On successful `refreshOrgAuth`, rewrite disk from current bearer; on invalidToken clear both. |
| Python Org clients still emit raw 401 | Align messaging in a thin shared helper or mirror the same reason string in a follow-up task if timeboxed. |

## Migration Plan

1. **Immediate ops recovery (no code):** Log into AionUI-Dev Org SSO → confirm `org-session.token` mtime/exp updated → re-run one supplier MCP call.
2. **Code ship:** MCP actionable errors + desktop disk resync/clear hardening + unit tests for expiry preflight.
3. **Docs:** Short troubleshooting note next to supplier-directory / org session docs.
4. **Rollback:** Revert MCP preflight only; login write path already exists and is safe.

## Open Questions

1. Should unattended CI/eval use a dedicated short-lived machine token distinct from interactive SSO? (Out of scope unless eval must run headless overnight.)
2. Preferred JWT TTL for interactive staff vs service accounts once refresh tokens exist?
3. Does packaged `AionUi` profile need the same resync path in parallel with `AionUi-Dev`? (Yes — profile-agnostic code; verify both token paths.)
