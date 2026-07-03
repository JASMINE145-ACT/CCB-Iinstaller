# P4 — Control Plane and Tenant Governance MVP

## Goal

Provide a runnable multi-tenant control-plane core that manages packages,
configuration, public-key identity, secret references, drift, and audit without
placing signing or business secrets on employee clients.

## Workstreams

| ID | Workstream | Required output |
|----|------------|-----------------|
| P4-A | Catalog + tenant lock | platform/package hashes, config revision, optimistic revision |
| P4-B | Config release | desired revisions, canary targets, publish, rollback |
| P4-C | OIDC/JWKS | RS256 verifier, issuer/audience/tenant/permission checks |
| P4-D | Secret store | tenant/environment AES-GCM store, `secret://` refs only |
| P4-E | TenantContext | mandatory tenant scope on state, operations and audit |
| P4-F | Dashboard MVP | desired/observed/drift/health/audit JSON projection |
| P4-G | Audit | append-only redacted events with actor/correlation/result |
| P4-H | Deployment | one-instance-per-tenant example and migration runbook |

## Acceptance criteria

- [x] Admin CLI creates and inspects isolated tenants.
- [x] Catalog produces deterministic package hashes.
- [x] Tenant package lock includes platform version, package version/hash,
      config revision, and lock revision.
- [x] Config release supports canary, publish, observed report, drift, rollback.
- [x] Secret values exist only in encrypted server-side storage; client
      projections contain references.
- [x] RS256 JWT verification uses JWKS and rejects invalid scope/claims.
- [x] Client verification fixture contains no private key or shared JWT secret.
- [x] Every mutable operation emits a redacted tenant-scoped audit event.
- [x] Dashboard shows desired vs observed and drift.
- [x] Per-tenant deployment template and human migration checklist exist.
- [x] P1–P3 and live MCP regressions remain green.

## Non-goals

- Operating a production OIDC provider.
- Networked shared-database multi-tenancy.
- Replacing live HS256 auth without the human migration gate.
- A full rendered management UI.
- Moving local Office/file MCP to the server.
