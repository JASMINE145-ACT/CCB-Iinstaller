# P4 Control Plane and Tenant Governance — Done Record

**Task:** `07-03-p4-control-plane-tenant-governance`
**Date:** 2026-07-03
**Verification profile:** Security + Release

## Delivered

| Workstream | Result |
|------------|--------|
| Tenant context | mandatory tenant/actor/correlation and optimistic revision |
| Catalog + lock | deterministic platform/package/config hashes |
| Config release | canary, promote, observed reports, drift, immutable rollback |
| Identity | RS256/JWKS verifier with tenant and permission checks |
| Secrets | tenant/environment AES-256-GCM store returning refs only |
| MCP gateway contract | remote client projection + per-call package/capability authorization |
| Audit/dashboard | redacted JSONL and desired/observed/health/drift/audit projection |
| Deployment | one-instance-per-tenant template and migration runbook |

## TDD evidence

Initial RED:

```text
ERR_MODULE_NOT_FOUND: control-plane/lib/control-plane.mjs
ERR_MODULE_NOT_FOUND: control-plane/lib/jwks-verifier.mjs
ERR_MODULE_NOT_FOUND: control-plane/lib/secret-store.mjs
```

GREEN:

```text
PASS 2/2 control-plane tests
PASS 2/2 JWKS verifier tests
PASS 1/1 secret-store tests
PASS 1/1 admin CLI tests
```

Negative coverage includes wrong tenant, revision conflict, concurrent tenant
lock, literal config secret, wrong issuer/audience/kid/algorithm/signature,
expired/missing-tenant token, missing permission, secret cross-tenant access,
and enabled-package/MCP/capability authorization.

## Isolated CLI evidence

Using the real vertical catalog and an isolated state root:

```text
tenant-create: PASS
packages-set com.wanding.trade: PASS
canary config publish: PASS
dashboard package lock + audit: PASS
tenant-state JSON Schema: PASS
package-lock JSON Schema: PASS
```

The employee client projection contains only HTTPS MCP gateway endpoints, OIDC
audience/tenant claim, and capability permissions. It contains no local command,
MCP environment, AOL/ERP credential, private key, or shared JWT secret.

## Security boundary

- OIDC private signing keys remain outside this repository and employee client.
- The verifier example contains public issuer/audience/JWKS data only.
- Secret ciphertext is authenticated with tenant/environment/name as AAD.
- Secret mutation requires audit context; audit receives metadata, never value.
- MCP authorization re-checks tenant, package lock, ownership, capability and
  permission for every call and audits allow/deny without tool payload.

## Regression evidence

```text
P3 lifecycle: PASS 3/3
P1 registry: PASS 3/3
P2 compiler: PASS 6/6
package health split: PASS 2/2
live MCP probe: PASS 5/5
```

## Human gate and compatibility

The current live `org-idp` HS256/local-business-MCP path was not silently
replaced. It remains compatibility-only. Production OIDC registration, remote
gateway deployment, org/knowledge endpoint migration, client canary, and final
removal of employee-side credentials are listed in the parent human checklist.
P4 code provides the secure target path; production cutover is not claimed.
