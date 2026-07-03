# P0D — import / revert + 文件安全

**Date:** 2026-07-02  
**Task:** `07-01-price-library-admin-agent`

## Delivered

| Layer | Change |
|-------|--------|
| Client | `_api_multipart_post` + `preview_import` / `apply_import` / `revert_version` |
| Guard | `price_library_import_guard.py` — workspace whitelist, `.xlsx` only, ≤10MB, fail-closed |
| Dispatch | `preview_price_library_import`, `apply_price_library_import`, `revert_price_library_version` |
| MCP | 3 new tools in `price-library-server/dist/index.js` |
| Health | `mcp-health-manifest.json` + `ccbMcpHealthManifest.ts` — `price-library` probe + agent profile |
| Tests | **19/19** unittest pass |

## Verification

- `python -m unittest tests.test_org_price_admin_client` → 19 OK
- code-reviewer → **PASS** ([56fae068](56fae068-830e-4f56-aaca-01adde0a369c))
- Vendor sync: `sync-dev-wanding-vendor.ps1 -UpdateSettings` from repo root

## VPS smoke（用户 — price_admin）

1. 准备小 xlsx（1–3 行改价）放到 workspace
2. `preview_price_library_import` — 确认 counts
3. `apply_price_library_import` `confirmed=false` → `confirmed=true`
4. `publish_price_library_draft` 两阶段
5. 可选：`revert_price_library_version` 两阶段 → active 恢复

## MCP health 四态（manual）

| 状态 | 预期 |
|------|------|
| 未登录 org | `get_price_library_active` 失败 / 401 |
| 非 admin | `get_price_library_draft` → 403 / `PERMISSION_REQUIRED` |
| admin 无 CSRF | POST 写工具 → 403 CSRF |
| admin OK | active/draft/import/publish 正常 |
