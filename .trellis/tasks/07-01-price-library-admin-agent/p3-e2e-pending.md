# P3 — E2E acceptance

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

## PRD checklist

- [ ] Non-admin: no Guid card (needs aionui-src rebuild if old desktop)
- [x] Admin Guid direct: upsert two-phase — **2026-07-10 嘉诚 smoke**
- [x] P4 UI: admin edit + non-admin no edit — **2026-07-11 用户确认 PASS**（见 child `p4-ui-smoke-done.md`）
- [ ] Admin Guid direct: publish → `version_number++` → quotation `source=org_api`（Agent 路径；publish 门禁已豁免，UI 路径已验）
- [ ] Concurrent publish 409 → `REVISION_CONFLICT`, no silent overwrite
- [ ] Revert independent confirmed

## Evidence — 2026-07-10 (嘉诚 / admin Guid)

**Session:** 价格库管理 Guid · user: 嘉诚 · `price_admin` ✅

| Step | Result |
|------|--------|
| Intent routing | Agent 正确说明 price_admin + MCP 写路径 + 两阶段确认 |
| `get_price_library_draft` | `revision = 0` |
| `upsert` `confirmed=false` | 物料 `001754` · `½英寸(DN15)铁吊卡` · diff: `price_b` null → 1000 |
| User confirm | 「ok」 |
| `upsert` `confirmed=true` | ✅ `change_type: update` · `draft_revision: 0 → 1` |
| Publish | ⬜ **未执行** — agent 已提示需 `publish_price_library_draft` 才全员可见 |
| Active verify | ⬜ pending publish |

**Verdict (partial):** P3 upsert 两阶段路径 **PASS**。完整 P3 签字尚需 publish + active `version_number` 验收。

## Evidence to capture (remaining)

- `version_number` before/after publish
- `#/price-library` 搜索 `001754` 确认 `price_b = 1000`（publish 后）
- Any 409 responses (optional dual-admin test)
