# 价格库 L2 行编辑 UI（P4）

## Goal

在 AionUI `#/price-library` 为 `price_admin` 提供 **L2 行抽屉**编辑：改 P0 字段 → 预览 diff → 写入共享 draft → 可选 publish。复用现有 org API，无新 backend。

## Gate waiver (user 2026-07-11)

- Parent P3 publish smoke **skipped** by explicit user approval（upsert 两阶段已 PASS）。
- Residual risk: UI publish 路径需本任务 smoke 自验。

## Parent

`07-01-price-library-admin-agent` § P4

## Scope

### In

- IPC: `getDraft` / `upsertItem` / `publishDraft`
- Admin gate: `resolveIsOrgPriceAdmin`（或 getDraft 403）
- Row drawer: `price_a`–`price_e`, `description`, `description_cn`, `supplier`, `unit`
- Two-phase confirm in UI (diff modal → write; publish second confirm with revision)
- Unit tests under `tests/unit/priceLibrary/`
- zh-CN + en-US i18n

### Out

- Full-table inline CRUD
- Import wizard / revert UI
- Audit timeline
- Schema migration
- P4-c data.Md tooltips (defer)

## Contracts

| ID | Behavior |
|----|----------|
| `WANd.PRICE_LIBRARY.UI.RBAC.001` | 非 admin 无编辑入口；403 服务端权威 |
| `WANd.PRICE_LIBRARY.CONFIRMATION.001` | 写前 diff 确认；publish 二次确认 |
| `WANd.PRICE_LIBRARY.REVISION.001` | publish 绑定 revision；409 停并提示重读 |

## Acceptance

1. Non-admin: `#/price-library` 无「编辑」按钮
2. Admin: 点行编辑 → 改 `price_b` → 预览 diff → 确认 → draft 写入成功 toast
3. Admin: 发布确认展示 revision → publish → active 刷新 / version 递增（或明确错误）
4. `bun test tests/unit/priceLibrary/` PASS
5. Spec `price-library.md` 增补 § AionUI row edit

## Canonical files (aionui-src)

- `packages/desktop/src/common/types/priceLibrary/priceLibraryTypes.ts`
- `packages/desktop/src/common/adapter/ipcBridge.ts`
- `packages/desktop/src/renderer/pages/priceLibrary/*`
- `tests/unit/priceLibrary/*`
- i18n `locales/{zh-CN,en-US}/priceLibrary.json`
