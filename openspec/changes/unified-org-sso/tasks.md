## 1. Phase 0 — Login linkage (optional fast path)

- [x] 1.1 Add `loginWithOrgLinkage()` in AionUI: after local `/login` success, POST org `/login` with same credentials when `isOrgServerConfigured()`
- [x] 1.2 On org success, write JWT to `org-session.token` and `aionui-org-session-token`; on failure show non-blocking toast (chat still works)
- [x] 1.3 Ops: create matching accounts on VPS for pilot users; **shadow sync** — org login pulls `wanding_business_knowledge` → local md (`orgKnowledgeShadowSync.ts` + `sync-org-knowledge-shadow.ps1`); Agent Read same path shows center content
- [x] 1.4 Smoke: `python -m unittest admin.test_org_knowledge_client` with token file present

## 2. Phase 1 — SSO contract and ops

> Runbook: [`scripts/org-phase0/phase1-jwt-secret-runbook.md`](../../scripts/org-phase0/phase1-jwt-secret-runbook.md)

- [x] 2.1 Document company `JWT_SECRET` distribution in `docs/org-knowledge-deploy.md` (new § SSO; single env name `JWT_SECRET`) + `scripts/org-phase0/phase1-jwt-secret-runbook.md`
- [x] 2.2 VPS: set `JWT_SECRET` in `aionorg.service` env; restart; verify existing org users can still log in
- [x] 2.3 Pilot employee machine: configure same `JWT_SECRET` for local aioncore subprocess env; manual test — org JWT + `curl` local protected route
- [x] 2.4 Define stable `user_id` format on org (persisted in org SQLite, never regenerated on password change)

## 3. Phase 2 — AionCore unified auth

- [x] 3.1 Add `AIONUI_SSO_MODE` env parsing in `aionui-app` config (`off` | `org-idp`, default `off`); expose `sso_mode_enabled()` to auth crate
- [x] 3.2 Add `IUserRepository::upsert_from_token(&TokenPayload) -> Result<User, DbError>` in `aionui-db/src/repository/user.rs`
- [x] 3.2a SQLite impl: `INSERT … ON CONFLICT(id) DO UPDATE SET username = excluded.username, updated_at = excluded.updated_at`; `password_hash = ""`; `work_task_role = "employee"` on insert only; **no new migration** (existing `users` schema)
- [x] 3.2b Unit tests: upsert idempotent; conflict preserves existing `work_task_role`; uses org `user_id` not generated id
- [x] 3.3 Extend `auth_middleware`: after JWT verify, JIT via `upsert_from_token` if missing; then attach `CurrentUser`
- [x] 3.4 When `AIONUI_SSO_MODE=org-idp`, local `/login` returns `403` for employee credentials (D7 — no proxy)
- [x] 3.5 Gate bypass (D8): `auth_middleware` + `build_ws_state` — skip bypass when `sso_mode_enabled()` even if `state.local == true`
- [x] 3.6 Unit/integration tests in `aionui-auth`: valid org token + empty local user row → JIT + 200; wrong secret → 401; SSO mode + BYPASS_AUTH → still requires JWT; QR login 403 when SSO
- [x] 3.7 `cargo test -p aionui-auth -p aionui-db` and affected `aionui-app` auth tests green

## 4. Phase 2 — AionUI unified login

- [x] 4.1 Merge login flows: when SSO mode + org URL configured, POST `{getOrgBaseUrl()}/login` directly (D7 — not localhost)
- [x] 4.2 Write one JWT to `aionui-session-token` and `org-session.token` (same string); stop requiring separate `OrgAuthContext.login`
- [x] 4.3 `#/org-knowledge` uses unified auth guard; remove/hide standalone org login page
- [x] 4.4 Document dev: use real org test user when `AIONUI_SSO_MODE=org-idp`; bypass only valid when `AIONUI_SSO_MODE=off` (see D8 — desktop `--local` is not sufficient)
- [x] 4.5 Tests: `orgHttpBridge.test.ts`, login unit for org URL target + token file write
- [x] 4.6 Manual dev smoke: restart app → sidebar org entry → login once → org API 200 + chat 200 with same Bearer token

## 5. Phase 3 — Rollout and docs

- [x] 5.1 Installer / `start-aionui-dev.ps1` notes for `AIONUI_SSO_MODE` + `JWT_SECRET` (no secrets in repo)
- [ ] 5.2 Roll out to 10 employees with checklist (org-server.json, JWT_SECRET, test quote knowledge source)
- [x] 5.3 Update `.trellis/spec/integration/org-knowledge.md` — unified SSO + migration note from dual JWT
- [ ] 5.4 Archive Phase 0-only code paths if superseded (dual silent login)
- [x] 5.5 Run `openspec validate unified-org-sso` and mark change ready for implementation tracking

## 6. Acceptance criteria (final)

- [x] 6.1 Employee logs in once; no second org login prompt
- [x] 6.2 `GET /api/org-knowledge` and local chat API both return 200 with same Bearer token
- [x] 6.3 Quotation flow uses center knowledge: shadow md synced from org (`wanding_business_knowledge.md.org-meta.json` version matches org); MCP may log `[KNOWLEDGE_SOURCE] Org API` on Python internal loads
- [x] 6.4 Logout clears both session storage and `org-session.token`
- [x] 6.5 New employee onboarding doc completed and reviewed by ops

## 7. Future / deferred (post-MVP)

- [ ] 7.1 Orphan local user cleanup: script or job comparing local `users.id` against org `/api/auth/internal/users` after offboarding
- [ ] 7.2 Optional `role` JWT claim + JIT role sync (if manager auto-provision from org becomes required)
- [ ] 7.3 Shared JWT blacklist (Redis) if 24h TTL revoke window is insufficient
