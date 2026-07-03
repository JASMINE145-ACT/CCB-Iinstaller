# Control Plane and Tenant Governance

## Scope

P4 provides an opt-in control-plane core and admin CLI:

`ccb-installer/control-plane/`

It is intended for Phase-A physical isolation: one state root and secret-store
master key per company. Shared-database multi-tenancy is not implemented.

## Tenant context

Every mutable operation requires:

- `tenant_id`;
- actor;
- correlation ID;
- expected tenant revision for administrator writes.

Tenant state and locks use atomic replacement plus a per-tenant exclusive lock.
Cross-tenant secret resolution and token use are rejected.

## Package lock

The deterministic lock records:

- platform version;
- package ID, version, and SHA-256 catalog hash;
- desired config revision;
- lock revision hash.

Package content remains in the P3 catalog. The control plane references and
locks it; it does not duplicate package manifests.

## Config release

The admin lifecycle is:

```text
publish(canary targets optional)
  → observed device reports
  → dashboard drift
  → promote
  → rollback (new immutable revision)
```

Config fields whose names imply secrets must contain `secret://` references.
Literal values are rejected before a revision is written.

## Identity

Multi-company verification is asymmetric:

- external OIDC provider retains the RS256 private key;
- client verifier receives issuer, audience, JWKS URI/public keys only;
- required claims: `sub`, `tenant_id`, `iss`, `aud`, `exp`;
- roles and permissions are arrays;
- tenant and required permissions are checked for each protected operation.

`org-idp` shared-HS256 remains a legacy single-org compatibility mode. P4 does
not silently cut over live clients. Migration is human gated and must end with
clients holding no `JWT_SECRET`, client secret, or private key.

## Secret store

The MVP file adapter encrypts each value using AES-256-GCM with:

- random 96-bit IV;
- tenant/environment/name as authenticated additional data;
- a 32-byte base64 server-only master key.

Only `secret://tenant/<tenant>/<environment>/<name>` leaves the store. KMS or
Vault should replace the file adapter for shared production infrastructure
without changing references.

Employee client projections replace package-owned business stdio MCP entries
with tenant/package-scoped HTTPS gateway endpoints. They contain OIDC audience,
tenant claim, and capability permissions, but no process command, environment,
ERP credential, or signing material. The current local stdio profile remains a
legacy compatibility profile until the gateway migration checklist passes.

The gateway authorization contract re-checks verified token tenant scope,
tenant package lock, MCP ownership, declared capability, and
`capability.<id>.execute` on every call. Both allow and deny decisions emit a
tenant-scoped audit event with correlation ID and no tool payload.

## Audit and dashboard

Audit events are append-only JSONL and contain:

- tenant, actor, correlation ID;
- action and result;
- package/config identifiers where applicable;
- redacted metadata.

The dashboard projection returns desired state, package lock, observed
device health, drift, and recent tenant-filtered audit events. It is the data
contract for a later rendered management UI.

## Verification

```powershell
node ccb-installer/control-plane/__tests__/control-plane.test.mjs
node ccb-installer/control-plane/__tests__/jwks.test.mjs
node ccb-installer/control-plane/__tests__/secret-store.test.mjs
node ccb-installer/control-plane/__tests__/admin-cli.test.mjs
```
