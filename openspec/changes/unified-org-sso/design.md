## Context

**Current state**

- Two aioncore processes: local (`127.0.0.1:dynamic`) and org (`ORG_SERVER_URL`, e.g. `:13401`).
- Same binary (`aionui-app`), same crate `aionui-auth`, same JWT format (`iss: aionui`, `aud: aionui-webui`).
- `TokenPayload` today: `user_id`, `username`, `iat`, `exp`, `iss`, `aud` — **no `role` claim** (`jwt.rs`).
- Each instance resolves its own `JWT_SECRET` (env → SQLite system user row). Secrets differ today.
- Auth middleware verifies JWT **then** requires `user_repo.find_by_id(user_id)` in **that instance's** SQLite.
- `IUserRepository` has no `upsert_from_token`; `create_user*` generates new local IDs — unusable for SSO JIT.
- Desktop Electron **always** spawns local aioncore with `--local` (`backend-launcher.ts` → `local: true`), so `AuthState.local == true` in dev and production desktop.
- AionUI: `AuthContext` (local) + `OrgAuthContext` (separate org login); Python MCP reads `org-session.token`.
- Org VPS is live (`67.216.206.3:13401`); employees have `org-server.json` but often no org token → MCP file fallback.

**Constraints**

- ~10 employees; no external IdP (Okta/Azure AD) required for MVP.
- JWT blacklist is in-process memory — cross-machine revoke is TTL-based unless we add Redis later.
- `JWT_SECRET` must never land in git; distributed via installer / group policy / VPS env file.

**Stakeholders**

- Employees: one login, remote knowledge in quotes.
- Ops: VPS as account center, unified onboarding/offboarding.
- Dev: testable SSO path without `AIONUI_BYPASS_AUTH` masking failures.

## Goals / Non-Goals

**Goals:**

- One employee login → one JWT accepted by local aioncore, org aioncore, and Python MCP.
- Org VPS as authoritative user directory and credential verifier.
- Local SQLite auto-provisioned (JIT) from org JWT `user_id` + `username`.
- Phased delivery: optional Phase 0 (login linkage) unblocks MCP before full SSO.

**Non-Goals:**

- External SAML/OIDC IdP integration.
- `role` claim in JWT v1 (use default `employee` + admin promotion APIs).
- Shared JWT blacklist / Redis session store (defer; document 24h TTL).
- Merging local and org SQLite databases into one physical DB.
- Local aioncore reverse-proxy to org `/login` (see D7).
- TLS termination on VPS (recommended in ops docs; not blocking SSO MVP on LAN/VPN).

## Decisions

### D1: Org aioncore as IdP (not token exchange microservice)

**Choice:** Org VPS `/login` remains the credential endpoint; no separate auth service.

**Rationale:** Same codebase already deployed; minimal new infrastructure.

**Alternative rejected:** OAuth2 token exchange between local and org — adds endpoints and client secrets without benefit at 10-user scale.

### D2: Shared symmetric `JWT_SECRET` (not RS256 key pair)

**Choice:** Company-wide secret via **`JWT_SECRET`** env on VPS and employee machines (single name; matches `services.rs`).

**Rationale:** `JwtService` today is HS256-only; `resolve_jwt_secret` already reads `JWT_SECRET` from env.

**Alternative rejected:** Per-machine secrets with token exchange — reintroduces dual-login complexity.

**Ops contract:**

```text
VPS:      /etc/aionorg/env  → JWT_SECRET=<company-secret>
Employee: installer / managed config sets same JWT_SECRET for local aioncore subprocess env
```

### D3: JIT provisioning via `upsert_from_token` (not role from JWT)

**Choice:** On valid JWT + missing local user → call new `IUserRepository::upsert_from_token(&TokenPayload)`.

**Field mapping (v1):**

| Field | Source |
|-------|--------|
| `id` | `payload.user_id` (org SQLite authoritative; never auto-generated locally) |
| `username` | `payload.username` |
| `password_hash` | `""` (empty — same convention as seeded `system_default_user`) |
| `work_task_role` | `"employee"` on first insert only |

**Rationale:** `TokenPayload` has no `role`; adding a JWT claim is a cross-cutting change. Default `employee` matches `create_user` behavior. Managers promoted via existing `update_work_task_role` after account exists on org.

**SQLite:** `INSERT … ON CONFLICT(id) DO UPDATE SET username = excluded.username, updated_at = excluded.updated_at` — no schema migration for MVP.

**Alternative rejected:** Nightly batch sync from org — stale on first boot; more ops moving parts.

**Implementation sketch:**

```rust
// auth_middleware, after jwt verify:
let user = match state.user_repo.find_by_id(&payload.user_id).await? {
    Some(u) => u,
    None => state.user_repo.upsert_from_token(&payload).await?,
};
```

Org remains authoritative for passwords; local row is a shadow for RBAC and foreign keys.

### D4: SSO mode flag on local aioncore

**Choice:** `AIONUI_SSO_MODE=org-idp` disables local employee `/login`; renderer authenticates against org only.

**Rationale:** Allows gradual rollout — machines with `AIONUI_SSO_MODE=off` keep legacy dual-login until migrated.

### D5: Single token storage in AionUI

**Choice:** After org `/login`, write identical JWT to:

| Store | Key / path |
|-------|------------|
| sessionStorage | `aionui-session-token` |
| Disk (MCP) | `%APPDATA%/…/org-session.token` |

Deprecate separate `aionui-org-session-token` key after migration window.

**Rationale:** MCP already reads file; local HTTP bridge already reads sessionStorage.

### D6: Phase 0 — login linkage (optional accelerator)

**Choice:** Ship silent org `/login` after local login (方案 A) **before** or **in parallel with** Phase 1 if MCP remote knowledge is urgent.

**Rationale:** Does not block SSO; trains ops on VPS accounts + `org-server.json`. Phase 2 removes dual-token logic.

### D7: Renderer POSTs directly to org IdP (closes former OQ #1)

**Choice:** AionUI login form POSTs to `{ORG_SERVER_URL}/login`. Local aioncore returns `403` on `/login` when `AIONUI_SSO_MODE=org-idp`. **No** local axum reverse proxy.

**Rationale:** Org VPS already runs `--cors-any`; `orgHttpBridge` pattern exists. Proxy adds latency, failure modes, and credential handling on local process.

| Layer | SSO mode behavior |
|-------|-------------------|
| AionUI (4.1) | `fetch(getOrgBaseUrl() + '/login', …)` |
| Local aioncore (3.4) | `/login` → `403` for employee credentials |
| Org VPS | Issues JWT |

**Alternative rejected:** Local reverse proxy — extra hop; local process sees plaintext credentials unnecessarily.

### D8: Bypass auth gated by SSO mode (not by `state.local`)

**Choice:** When `AIONUI_SSO_MODE=org-idp`, ignore `AIONUI_BYPASS_AUTH` even if `state.local == true`.

**Rationale:** Desktop always passes `--local` to embedded aioncore. Current check `state.local && auth_bypass_enabled()` **still bypasses** in dev today. SSO testing requires explicit gate in:

- `aionui-auth/src/middleware.rs` (`auth_middleware`)
- `aionui-app/src/router/state.rs` (`build_ws_state`)

```rust
if state.local && auth_bypass_enabled() && !sso_mode_enabled() { … }
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Local-only dev accounts break under SSO | Keep `AIONUI_SSO_MODE=off` for solo dev; document test org user |
| `JWT_SECRET` leak | Short rotation procedure; never in repo; per-company secret |
| JIT creates orphan local rows after org user deleted | Deferred — see tasks §7; TTL + manual cleanup for MVP |
| Bypass auth hides SSO bugs | D8: gate bypass with `!sso_mode_enabled()` (desktop `--local` does not help) |
| Manager role not in JWT | Default `employee`; promote via admin API; document in onboarding |
| HTTP JWT on public IP | Document TLS + Nginx as Phase 3 ops requirement |
| Clock skew | Keep existing JWT leeway; NTP on VPS |

## Migration Plan

```text
Phase 0 (1–2 days, optional)
  └─ AionUI: local login success → silent org /login → write org-session.token
  └─ Ops: create VPS accounts matching employees
  └─ Acceptance: MCP log shows [KNOWLEDGE_SOURCE] Org API

Phase 1 (≈1 week)
  └─ Document SSO contract; ops distribute JWT_SECRET to VPS + pilot machine
  └─ Org VPS: enforce company secret; user_id stability rules
  └─ Acceptance: org JWT verifies on pilot local with shared secret (manual curl)

Phase 2 (≈1–2 weeks)
  └─ AionCore: upsert_from_token + JIT middleware + D8 bypass gate + D4/D7 local /login 403
  └─ AionUI: unified login → org URL (D7); merge AuthContext / OrgAuthContext
  └─ Acceptance: one login → chat + org API + MCP file all 200

Phase 3 (≈1 week)
  └─ Installer / deploy docs; 10-user rollout
  └─ Remove or hide separate org login UI
  └─ Trellis + org-knowledge-deploy.md update
  └─ Acceptance: new employee machine onboarding checklist passes
```

**Rollback:** Set `AIONUI_SSO_MODE=off` on affected machines; restore independent local login and dual JWT docs.

## Open Questions

1. Are QR login flows in scope for SSO v1 or disabled when `AIONUI_SSO_MODE=org-idp`?
2. Phase 0 ship as separate OpenSpec change (`login-linkage`) or first task group in this change?
