# P4 交接 — 已自动完成 vs 需你操作 vs 缺口

**Date:** 2026-07-11  
**Tasks:** `07-11-price-library-row-edit-ui` (P4) · parent `07-01-price-library-admin-agent`

---

## ✅ 已自动完成（无需你动手）

| 项 | 证据 |
|----|------|
| P4 L2 行抽屉代码（aionui-src） | `PriceLibraryRowDrawer.tsx` + `priceLibraryEdit.ts` + IPC `getDraft`/`upsertItem`/`publishDraft` |
| Admin 门控 | `resolveIsOrgPriceAdmin` + 抽屉 `isPriceAdmin` 二次门控 |
| 两阶段确认 UI | diff Modal → 写 draft → 可选 publish（revision） |
| 单元测试 | `bun test tests/unit/priceLibrary/` → **15 pass** |
| code-reviewer | Layer A **PASS** · Layer B **PASS** · Runtime Crash Checklist clean |
| Spec 更新 | `.trellis/spec/integration/price-library.md` § AionUI row edit |
| file-map | `file-map.md` 增加 P4 行编辑定位 |
| P3 upsert 烟测记录 | `p3-e2e-pending.md`（001754 price_b→1000，draft revision 0→1） |
| P3 publish 门禁豁免 | 按你「执行 P4，跳过 publish」落档 |
| P3.5 MCP schema 对齐 | `mcp_servers/price-library-server/dist/index.js` 字段对齐 `UPDATABLE_FIELD_NAMES`（含 rucika_*/factory_*/pe_*） |
| Vendor sync | `sync-dev-wanding-vendor.ps1` ✅ — price-library `index.js` 已拷到 `D:\CCB-Wanding\vendor\...`（**新 Guid 会话**才吃到 MCP schema） |

---

## 👤 需要你操作（手动）

### ~~A. 看 P4 UI~~ ✅ 2026-07-11 用户确认 PASS

### ~~B. 非 admin 负向~~ ✅ 2026-07-11 用户确认 PASS

### C. （可选）收口 P3 Agent publish

此前 Guid 已把 `001754` 的 `price_b=1000` 写进 **draft**，若尚未 publish：

- 进「价格库管理」Guid，说「要 publish，先预览」→ 确认  
- 或在 P4 UI 里对同一物料再走发布（若 draft 仍有 pending）

把结果（`version_number` 前后）回填 `p3-e2e-pending.md` 或直接发我。

### D. （可选）git 提交

改动跨两个仓库，**未自动 commit**（需你明确要求）：

- `D:\Projects\aionui-src` — P4 UI 文件
- `D:\Projects\claude-code-best` — Trellis / MCP schema / vendor 相关

---

## ⬜ 缺口 / 刻意不做

| 缺口 | 状态 | 说明 |
|------|------|------|
| P3 Agent publish 签字 | ⬜ 你可选做 | 已豁免，不阻塞 P4 |
| P4 UI 手动 smoke | ✅ **PASS** 2026-07-11 用户确认 | [`p4-ui-smoke-done.md`](./p4-ui-smoke-done.md) |
| 双 admin 409 并发 | ⬜ defer | 低频；UI 已有 409 文案 |
| Revert UI | ❌ 不做 | 继续走 Agent |
| 全表 inline CRUD / Import 向导 | ❌ 不做 | Agent + Excel |
| Audit 时间线 UI | ❌ 不做 | 无 MCP `GET /audit` |
| P4-c data.Md 字段 tooltip | defer | 非 v1 |
| P1.5 orchestrator 委派改价 | defer | 仍 Guid 直连 |
| 其它 locale（ja/ko…）edit 文案 | 缺口 | 仅 zh-CN + en-US；缺 key 时回退英文/key |
| aionui-src 其它脏改动 | 注意 | 工作区另有 wecom/memory 等未提交改动，提交时请只 stage 价格库相关文件 |

---

## 回传给我即可收口

```text
P4 smoke:
- admin 编辑: PASS/FAIL — material=… price_b=… draft/publish=…
- non-admin 无编辑: PASS/FAIL
- version_number: before=… after=…（若 publish）
```
