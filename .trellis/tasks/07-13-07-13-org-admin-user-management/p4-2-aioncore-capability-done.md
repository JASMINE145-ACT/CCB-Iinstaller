# Phase 4.2 done — AionCore capability gates (H1+H2+H3)

> **Task:** `07-13-07-13-org-admin-user-management`  
> **Date:** 2026-07-13  
> **Contracts:** `WANd.ORG.CAPABILITY.001`, `WANd.ORG.USER_ADMIN.001` (cycle)

## Summary

Backend hard gates shipped in AionCore:

| Gate | Behavior |
|------|----------|
| **H1** | Price library / supplier directory **WRITE** allow if `is_admin` **OR** capability `price_library.write` / `supplier_directory.write`. Env `PRICE_ADMIN_USERNAMES` / `SUPPLIER_DIR_ADMIN_USERNAMES` remain transitional **OR** only. |
| **H2** | `users.capabilities` JSON text; whitelist **only** those two strings on create/update; other strings rejected. |
| **H3** | `manager_user_id` update rejects self and descendant-as-manager (cycle). |

## Files changed

| Path | Change |
|------|--------|
| `AionCore/crates/aionui-db/migrations/026_user_capabilities.sql` | **New** — `users.capabilities TEXT NOT NULL DEFAULT '[]'` |
| `AionCore/crates/aionui-db/src/models/user.rs` | `User.capabilities`; `OrgIdentityPatch.capabilities` |
| `AionCore/crates/aionui-db/src/repository/sqlite_user.rs` | Persist capabilities on `update_org_identity` |
| `AionCore/crates/aionui-common/src/constants.rs` | Whitelist + `validate_capabilities` / parse helpers |
| `AionCore/crates/aionui-common/src/lib.rs` | Re-export capability helpers |
| `AionCore/crates/aionui-api-types/src/work_tasks.rs` | OrgUser create/update/response `capabilities` |
| `AionCore/crates/aionui-auth/src/middleware.rs` | `CurrentUser.capabilities` loaded from DB |
| `AionCore/crates/aionui-auth/tests/middleware_tests.rs` | CurrentUser construction updated |
| `AionCore/crates/aionui-work-tasks/src/service.rs` | Whitelist on create/update; manager cycle/self check |
| `AionCore/crates/aionui-work-tasks/tests/service_integration.rs` | TDD cases for H2/H3 |
| `AionCore/crates/aionui-price-library/src/rbac.rs` | `can_write_price_library` (H1) |
| `AionCore/crates/aionui-price-library/src/service.rs` | `can_write(...)` |
| `AionCore/crates/aionui-price-library/src/routes.rs` | Write routes use `is_admin` / caps / env OR |
| `AionCore/crates/aionui-supplier-directory/src/rbac.rs` | `can_write_supplier_directory` (H1) |
| `AionCore/crates/aionui-supplier-directory/src/service.rs` | `require_write_access`; upsert signatures |
| `AionCore/crates/aionui-supplier-directory/src/routes.rs` | Pass `is_admin` + capabilities into upsert |

## GREEN commands + results

Working directory: `D:\Projects\claude-code-best\AionCore`

```text
cargo test -p aionui-common --lib capability_tests
→ ok (whitelist validate/parse)

cargo test -p aionui-price-library rbac
→ ok (employee without cap forbidden; with cap / is_admin / env OR allowed)

cargo test -p aionui-supplier-directory rbac
→ ok (same H1 matrix)

cargo test -p aionui-work-tasks --test service_integration -- invalid_capability valid_capabilities manager_user_id_self manager_user_id_cycle
→ ok 4 passed
  - invalid_capability_string_rejected
  - valid_capabilities_persisted
  - manager_user_id_self_rejected
  - manager_user_id_cycle_rejected

cargo test -p aionui-work-tasks --test service_integration
→ ok 21 passed (full suite incl. prior org-admin cases)

cargo test -p aionui-auth --test middleware_tests
→ ok 23 passed

cargo test -p aionui-db --lib bootstrap_admin_is_org_admin_after_fresh_init
→ ok (migration chain incl. 026 applies on fresh init)

cargo check -p aionui-price-library -p aionui-supplier-directory -p aionui-work-tasks -p aionui-auth
→ Finished ok
```

## H1 / H2 / H3 evidence

### H1 — write ACL

- Price: `can_write_price_library(username, is_admin, capabilities, config)`  
  — `is_admin` OR `price_library.write` OR env username (`PRICE_ADMIN_USERNAMES`).
- Supplier: `can_write_supplier_directory(...)`  
  — `is_admin` OR `supplier_directory.write` OR env username (`SUPPLIER_DIR_ADMIN_USERNAMES`).
- Auth middleware loads `capabilities` onto `CurrentUser` each request; write routes pass them into the gate.
- Unit tests in `aionui-price-library` / `aionui-supplier-directory` `rbac` modules: no cap → deny; cap or admin → allow; env transitional OR still works.

### H2 — whitelist

- `validate_capabilities` rejects any string outside `price_library.write` / `supplier_directory.write`.
- Org user create/update call whitelist before `update_org_identity`.
- Test: `invalid_capability_string_rejected` → `InvalidStatus`; `valid_capabilities_persisted` → stored & returned.

### H3 — manager cycle

- `ensure_manager_acyclic`: reject self; walk up from proposed manager and reject if `user_id` appears (descendant-as-manager).
- Tests: `manager_user_id_self_rejected`, `manager_user_id_cycle_rejected` (A→B then B→A).

## Out of scope (parent)

- Frontend Settings UI (4.1 / 4.3)
- Git commit / bootstrap.sh
- Security-review agent (4.2d — parent)
