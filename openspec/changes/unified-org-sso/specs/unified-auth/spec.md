## ADDED Requirements

### Requirement: Org VPS is the sole Identity Provider

The org aioncore instance at `ORG_SERVER_URL` SHALL be the only service that accepts employee username/password and issues session JWTs for production rollout.

#### Scenario: Employee logs in through AionUI

- **WHEN** the employee submits valid org credentials via the unified login form
- **THEN** the org aioncore `/login` endpoint returns a JWT signed with the company `JWT_SECRET`
- **AND** the token payload uses existing claims only: `iss: aionui`, `aud: aionui-webui`, `user_id`, `username`, `iat`, `exp` (no `role` claim in v1 — see JIT requirement)

#### Scenario: Local aioncore does not authenticate employees in SSO mode

- **WHEN** SSO mode is enabled on an employee machine (`AIONUI_SSO_MODE=org-idp`)
- **THEN** the local `/login` handler SHALL return `403 Forbidden` (or equivalent) for employee credential login
- **AND** AionUI SHALL POST credentials directly to `ORG_SERVER_URL/login` (design D7 — no local reverse proxy)

### Requirement: Shared JWT secret across local and org aioncore

Both local and org aioncore instances SHALL verify JWTs with the same company secret supplied via the `JWT_SECRET` environment variable (read by `aionui-app` `services.rs` → `resolve_jwt_secret`).

#### Scenario: Token issued by org is accepted locally

- **WHEN** a request to local aioncore includes `Authorization: Bearer <org-jwt>` signed with the shared secret
- **THEN** local JWT verification succeeds without re-login

#### Scenario: Token signed with wrong secret is rejected

- **WHEN** a JWT is signed with a secret other than the configured company secret
- **THEN** local and org APIs return `401 Unauthorized`

### Requirement: JIT user provisioning via `upsert_from_token`

After JWT verification, local auth middleware SHALL ensure the `user_id` from the token exists in local SQLite before attaching `CurrentUser`.

**Trait contract** — add to `IUserRepository`:

```rust
async fn upsert_from_token(&self, payload: &TokenPayload) -> Result<User, DbError>;
```

**SQLite semantics:**

- Use `INSERT … ON CONFLICT(id) DO UPDATE SET username = excluded.username, updated_at = excluded.updated_at` (idempotent; preserve existing `work_task_role` on conflict).
- **Do not** use `create_user` / `create_user_with_role` — those generate a new local `user_id` and break org/local identity alignment.
- **No new migration required** for MVP — insert into existing `users` columns from `014_work_task_roles.sql`.

**Field defaults (v1 — no `role` in JWT):**

| Column | Value |
|--------|--------|
| `id` | `payload.user_id` (org-authoritative) |
| `username` | `payload.username` |
| `password_hash` | `""` (empty string — same sentinel as `system_default_user`; signals no local password) |
| `work_task_role` | `"employee"` on insert only |

**Manager elevation:** not derived from JWT in v1. Promote via existing org/local admin APIs (`update_work_task_role`) after provisioning.

#### Scenario: First request from org user on a new machine

- **WHEN** a valid org JWT references a `user_id` not present in local SQLite
- **THEN** local aioncore calls `upsert_from_token` and proceeds with `CurrentUser` injected

#### Scenario: Subsequent requests reuse local row

- **WHEN** the same employee sends further requests with a valid org JWT
- **THEN** local middleware finds the existing user by `user_id` without duplicate rows
- **AND** `ON CONFLICT` does not downgrade an existing `work_task_role`

### Requirement: Bypass auth gated when SSO mode is on

When `AIONUI_SSO_MODE=org-idp`, aioncore SHALL NOT honor `AIONUI_BYPASS_AUTH` even if `state.local == true`.

Desktop Electron always spawns local aioncore with `--local`. Therefore bypass must be explicitly gated in middleware and WebSocket state.

#### Scenario: SSO mode disables bypass

- **WHEN** `AIONUI_SSO_MODE=org-idp` and `AIONUI_BYPASS_AUTH=1`
- **THEN** `auth_middleware` and `build_ws_state` SHALL NOT inject `system_default_user`
- **AND** protected routes require a valid org-issued JWT (same as production)

#### Scenario: Legacy dev with SSO off

- **WHEN** `AIONUI_SSO_MODE=off` and `AIONUI_BYPASS_AUTH=1` and `state.local == true`
- **THEN** existing bypass behavior is preserved for local-only dev

### Requirement: Logout and session expiry

SSO rollout SHALL rely on JWT TTL (existing 24h default) for cross-machine revocation unless a shared blacklist is added later.

#### Scenario: Employee logs out

- **WHEN** the employee chooses logout in AionUI
- **THEN** the client clears the unified token from session storage and `org-session.token`
- **AND** org `/logout` (if called) invalidates server-side session state where applicable

#### Scenario: Expired token

- **WHEN** a request uses an expired JWT
- **THEN** APIs return `401` and AionUI prompts for login again
