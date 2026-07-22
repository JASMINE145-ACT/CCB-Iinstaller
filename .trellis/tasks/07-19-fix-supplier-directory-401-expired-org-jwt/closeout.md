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
| Ops re-login via Org VPS `/login` | PASS (2026-07-19) — used `scripts/org-phase0/env.local` → wrote `AionUi-Dev` `org-session.token`; new `exp` `2026-07-19T16:40:10.000Z` |
| Positive Org API with fresh JWT | PASS — `GET /api/suppliers?q=PVC` → HTTP 200, `success=true`, 3 items; earlier `hybrid-match` also HTTP 200 (auth ok) |

## Live Agent Eval (post-auth fix)

Run: `.agent-eval/runs/quotation-live-20260719-post-auth-fix/`

- Final verdict: **PASS** (3/3)
- `suppliers_hybrid_match`: **ok** in all three trials (no 401)
- Same SKU path: `8020020755` / price `1219` / warehouse `1344` / available `1228`
- `pass_at_1=1`, `flaky_rate=0`, `soft_score_mean≈94.7`

