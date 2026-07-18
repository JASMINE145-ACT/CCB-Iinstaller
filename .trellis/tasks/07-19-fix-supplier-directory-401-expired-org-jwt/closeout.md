# Closeout — Fix supplier-directory 401 expired Org JWT

Date: 2026-07-19

## Delivered

- MCP (`session-auth.mjs` + `index.mjs`): UX-only JWT `exp` preflight; actionable `ORG_SESSION_MISSING` / `ORG_SESSION_EXPIRED` / `ORG_AUTH_FAILED` with re-login hint; Org 401 invalid/expired mapped to same class.
- Live vendor synced: `D:\CCB-Wanding\vendor\mcp-servers\supplier-directory\` (SHA256 match repo).
- Desktop (`OrgAuthContext.tsx` in aionui-src): successful `refreshOrgAuth` rewrites disk token from `getOrgBearerToken()`; invalid/logout clear unchanged; login write path unchanged.
- Docs: `docs/org-knowledge-deploy.md` §10.5 troubleshooting.

## Gate evidence

### Code review

Superpowers `code-reviewer`: **PASS**  
Agent: `7fc80f6d-bba5-4ae7-a8ec-a2e38dc41b67`

```text
Layer A: PASS
Layer B: PASS
Runtime Crash Checklist: No crash-level risks found in reviewed scope.
```

### Test Agent

Command-execution Test Agent: **PASS**  
Agent: `de42f77f-6f49-4764-adc9-d305fc3cb77c`

- `bun test` session-auth + preview → **12/12 PASS**
- Vendor SHA256 match for `index.mjs` / `session-auth.mjs`
- Negative live smoke: expired `AionUi-Dev` token → `ORG_SESSION_EXPIRED` + `org-session.token` in message
- Docs §10.5 present

## Live smoke status

| Check | Result |
|-------|--------|
| Confirm token expired | PASS (`exp` 2026-07-18T02:29:25Z) |
| Negative actionable error | PASS |
| Positive `suppliers_hybrid_match` after re-login | **BLOCKED** — needs user Org SSO re-login in AionUI-Dev |

Both `AionUi` and `AionUi-Dev` token files were expired at verification time. Code path is deployed; 200 smoke is an ops step for the operator.

## Remaining (operator)

1. Open AionUI (AionUi-Dev) → Org login.
2. Confirm `org-session.token` mtime/`exp` refreshed.
3. Call `suppliers_hybrid_match` once (or re-run a short quotation price+stock trial) and confirm non-auth success.
