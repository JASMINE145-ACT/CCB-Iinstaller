# P4 Execution Plan — Control Plane MVP

| Field | Value |
|-------|-------|
| Scenario | C — security-sensitive cross-layer platform service |
| Plan depth | Full |
| Verification profile | Security + Release |
| Status | Git gate — implementation and automated verification complete |

## Phase -1 capability matrix

| Capability | Available | Fallback |
|------------|-----------|----------|
| Node built-in crypto/test | yes | no external auth dependency |
| Existing package/config state | yes | P1–P3 fixtures |
| OIDC provider | no local provider | deterministic RS256/JWKS fixture |
| Production KMS | unavailable | AES-GCM envelope with env master key; KMS adapter documented |
| Rendered admin UI | not in P4 core | dashboard JSON + admin CLI |
| Live auth cutover | human gated | keep legacy mode unchanged |

## Ordered workstreams

| WS | Risk | Required output | Profile |
|----|------|-----------------|---------|
| 1 | tenant isolation | transactional tenant store + context validation | Security |
| 2 | release correctness | package lock, config publish/rollback, drift | Release |
| 3 | credential exposure | encrypted secret store + reference projection | Security |
| 4 | token forgery | JWKS verifier and negative claim matrix | Security |
| 5 | accountability | redacted append-only audit + dashboard | Security |
| 6 | deployment | per-tenant template, specs, checklist | Release |
| 7 | regression | P1–P3, staging subset, live MCP | Release |

## TDD routes

| Workstream | Level | RED | GREEN command |
|------------|-------|-----|---------------|
| tenant store/release | unit/integration | module absent | `node control-plane/__tests__/control-plane.test.mjs` |
| JWKS | security unit | verifier absent | `node control-plane/__tests__/jwks.test.mjs` |
| secrets | security unit | encrypted store absent | `node control-plane/__tests__/secret-store.test.mjs` |
| CLI/dashboard | integration | commands absent | `node control-plane/__tests__/admin-cli.test.mjs` |
| regression | system | existing phase failure | P1–P3 tests + MCP probe |

## Recovery

- Tests use temporary server roots.
- State writes use revision checks and atomic replacement.
- Config rollback creates a new active revision; history is immutable.
- Failed secret/JWKS operations write no partial state.
- Live auth/config is not modified by automated verification.

## Git gate

1. RED/GREEN security tests.
2. Cross-tenant and secret-redaction negative tests.
3. Deterministic package lock and drift evidence.
4. P1–P3 regression suite.
5. Live MCP 5/5.
6. Credential/private-key staged scan.
7. Atomic implementation commit, then closure record commit.

## Execution status

| Gate | Result |
|------|--------|
| Tenant/catalog/config release | PASS 2/2 |
| JWKS security matrix | PASS 2/2 |
| Encrypted secret store | PASS 1/1 |
| Admin CLI/dashboard | PASS 1/1 |
| Tenant and package-lock schemas | PASS |
| P1–P3 regressions | PASS |
| Live MCP runtime | PASS 5/5 |
| Git/private-key/credential audit | pending final staged audit |
