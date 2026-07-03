# P3 — E2E acceptance (pending user smoke)

**Date opened:** 2026-07-02  
**Task:** `07-01-price-library-admin-agent`  
**Prerequisite:** P-1 through P1 complete; VPS org v3/3299; local dev stack running

## Environment (verified 2026-07-02)

| Item | Value |
|------|--------|
| Dev UI | `http://localhost:5173/` (org SSO) |
| Org API | `http://67.216.206.3:13401` |
| Install dir | `D:\CCB-Wanding` |
| Agents deployed | `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\price-library-agent.*` |
| MCP tools | 11 (read + upsert + publish + import + revert + **list versions**) |

**Note:** Local embedded aioncore may log `PRICE_ADMIN_USERNAMES is not set` — irrelevant for MCP writes; org VPS has admin configured.

## Smoke script (admin)

1. Login admin → Guid →「价格库管理」→ **new session**
2. `get_price_library_draft` → record `revision`
3. `upsert_price_library_item` — `confirmed=false` → review → `confirmed=true`
4. `publish_price_library_draft` — two-phase confirm with same `revision`
5. `get_price_library_active` → expect `version_number` increment (was 3 → 4)
6. `list_price_library_versions` `limit=5` → active `version_id` matches step 5
7. *(optional)* import preview/apply on small xlsx; revert with separate confirm

## PRD checklist (record results here when done)

- [ ] Non-admin: no Guid card (needs aionui-src rebuild if old desktop)
- [ ] Admin Guid direct: upsert → publish → quotation new session `source=org_api`
- [ ] Concurrent publish 409 → `REVISION_CONFLICT`, no silent overwrite
- [ ] Revert independent confirmed

## Evidence to capture

- `version_number` before/after
- Any 409 responses
- Screenshot or log snippet from Guid session
