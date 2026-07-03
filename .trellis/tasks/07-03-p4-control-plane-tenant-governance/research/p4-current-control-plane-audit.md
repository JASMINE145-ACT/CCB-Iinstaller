# P4 Current Control Plane Audit

Date: 2026-07-03

## Existing capabilities

- P1 provides a read-only package registry.
- P2 provides desired config, provenance, observed projection hashes, and drift.
- P3 provides package lifecycle state and platform/package health composition.
- Existing AionCore auth signs and verifies HS256 tokens with a shared
  `JWT_SECRET`; `org-idp` mode JIT provisions users from those tokens.
- Existing org knowledge and user models are effectively single-tenant and do
  not provide a general package/config control plane.

## Security gap

The employee client currently receives symmetric signing material. That is
acceptable only for the legacy single-org compatibility mode and cannot be the
multi-company boundary.

P4 must introduce an asymmetric verification contract:

- issuer retains the private key;
- client/control-plane consumers receive public JWKS only;
- required claims include `tenant_id`, subject, audience, issuer, roles and
  permissions;
- tenant-scoped operations reject cross-tenant access;
- no token, secret value, or business payload enters audit events.

## Implementation decision

Build an opt-in, zero-external-dependency control-plane MVP under
`ccb-installer/control-plane/`:

- file-backed transactional tenant state for isolated Phase-A deployments;
- package catalog and tenant lock;
- config release/canary/rollback and desired-vs-observed status;
- encrypted server-side secret store returning `secret://` references only;
- RS256/JWKS verifier suitable for client/local verifier adapters;
- append-only redacted audit log;
- admin CLI and JSON dashboard projection;
- per-tenant deployment template.

The legacy HS256 path remains compatibility-only until the human migration
gate. P4 automation must not replace live authentication or copy secret values
to a client.

## Risks

- File state needs optimistic revision checks and atomic writes.
- Tenant ID must be mandatory on every mutable record and audit event.
- Secret ciphertext must be separated from tenant desired state and package
  locks.
- Rollback must restore a known config revision without deleting history.
- JWKS verification must reject wrong `kid`, algorithm, issuer, audience,
  expiry, missing tenant claim, and cross-tenant tokens.
- A management UI is represented by a dashboard JSON projection in this MVP;
  a rendered AionUI container is a later UI integration.
