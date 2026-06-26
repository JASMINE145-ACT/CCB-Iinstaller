## Why

Employees today authenticate twice: local aioncore for chat and org aioncore on the VPS for knowledge UI and MCP. Without org login, quotation MCP falls back to local vendor Markdown instead of the remote org knowledge API. With ~10 staff and a production org VPS (`67.216.206.3:13401`), we need one login and one JWT trusted by both local and org services for long-term maintainability.

## What Changes

- **Org VPS becomes the Identity Provider (IdP)** — sole `/login` source of truth for employee credentials.
- **Shared company `JWT_SECRET`** — same env var name on org VPS and every employee machine (`JWT_SECRET`; via installer/ops, never committed to git).
- **Local aioncore trusts org-issued JWTs** — validates with shared secret and **JIT-provisions** the user into local SQLite on first successful request (see `unified-auth` spec for `upsert_from_token` contract).
- **AionUI single login** — renderer POSTs directly to org `/login` (D7); one token written to session storage and `org-session.token` for Python MCP.
- **Phase 0 optional bridge** — silent dual login (方案 A) may ship first so MCP reads org API before full SSO is complete.
- **BREAKING**: Independent local-only accounts without a matching org user will no longer satisfy protected local APIs once SSO is enforced.
- **BREAKING**: `AIONUI_BYPASS_AUTH=1` must be gated by `AIONUI_SSO_MODE=off` in aioncore middleware (desktop always runs `--local`, so bypass still applies today without this gate).

## Capabilities

### New Capabilities

- `unified-auth`: Org IdP contract, shared JWT validation, `upsert_from_token` JIT provisioning, logout/TTL semantics.
- `unified-login`: AionUI login UX (renderer → org IdP), token persistence (renderer + MCP file), org-server prerequisites, bypass gating.

### Modified Capabilities

- _(none — no existing OpenSpec baseline specs; Trellis docs `.trellis/spec/integration/org-knowledge.md` will be updated after implementation.)_

## Impact

| Area | Impact |
|------|--------|
| **AionCore** | `aionui-auth` middleware, `IUserRepository::upsert_from_token`, `services.rs` JWT secret, bypass gate in `middleware.rs` + `build_ws_state` |
| **AionUI** | `AuthContext`, `OrgAuthContext`, login POST target → org URL, preload token keys |
| **Python MCP** | Continues reading `org-session.token`; content becomes org JWT instead of separate org login |
| **Ops** | VPS user directory, `JWT_SECRET` distribution, employee `org-server.json`, TLS roadmap |
| **Docs** | `docs/org-knowledge-deploy.md`, `.trellis/spec/integration/org-knowledge.md` |

> **MVP v1.0 (2026-06-21):** Ships **Phase 0 login linkage only** — see [`.trellis/spec/integration/wanding-mvp-v1.md`](../../.trellis/spec/integration/wanding-mvp-v1.md). This change (**unified SSO**) targets **v1.1** after first exe + update loop are live.
