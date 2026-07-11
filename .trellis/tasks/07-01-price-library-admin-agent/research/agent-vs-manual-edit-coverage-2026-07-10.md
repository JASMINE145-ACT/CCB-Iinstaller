# Agent vs Manual Edit Coverage — 2026-07-10

- **Query**: Can `price-library-agent` (11 MCP tools + hooks + `price-library-edit` skill) cover MOST maintenance scenarios? What gaps require manual AionUI edit UI (P4)?
- **Scope**: mixed (internal synthesis)
- **Date**: 2026-07-10
- **Task**: `07-01-price-library-admin-agent` — planning session 2026-07-10

## Executive verdict

**结论：Agent-first 已可覆盖绝大多数日常维护场景（约 80%+ 按频次加权），但 P4 手动编辑 UI 仍有明确价值。** 截至 2026-07-03 P2-Edit 交付，`price-library-agent` 挂载独立 `price-library` MCP **11 个工具**（`mcp_servers/price-library-server/dist/index.js`）、`price-library-edit` skill（三分法 bulk SOP）、以及 PreToolUse/PostToolUse/Stop hooks（`ccb-installer/.../agents/price-library-agent.md`），在服务端 API 已完备的前提下（`draft/items`、import preview/apply、publish/revert、409 revision — `.trellis/spec/integration/price-library.md` § Agent write path），可完成单条改价、多字段同 SKU、增删恢复、供应商、RUCIKA 多档、几十行 export-edit-import、全库 prepare 脚本规范化、发布、409 冲突处理、版本回滚等运维路径。缺口集中在：**非技术 price_admin 的 Guid 对话门槛**、**MCP JSON schema 未完整暴露 42 列**（Python `UPDATABLE_FIELD_NAMES` 更全）、**细粒度 audit 浏览**（无 `GET /audit` MCP）、**schema/列结构变更**（PRD 明确 out of scope）、以及 **P3 E2E 用户烟测仍未签字**（`p3-e2e-pending.md`）。P4 建议做 **L2 行抽屉**（非全表 CRUD），复用现有 org API，补齐高频单点编辑 UX；bulk / normalize / revert / schema 仍优先 Agent 或运维脚本。

---

## Scenario matrix

| 场景 | 频次 | Agent 路径 | 覆盖率 | 摩擦 | 需手动 UI? |
|------|------|------------|--------|------|------------|
| **单字段修改**（如改 `price_b`） | 高 | `get_price_library_draft` → `upsert_price_library_item` 两阶段 → `publish_price_library_draft` 两阶段 | **完整** | 低（需 Guid + 自然语言） | 可选 — UI 更快 |
| **同 SKU 多字段修改** | 中高 | 同上，`upsert` 一次传多字段（`fields` 或顶层） | **完整** | 低–中 | 可选 |
| **新增 SKU** | 中 | `upsert` + `material_code` + 必要字段；skill 要求设 `is_preferred_price` | **完整** | 中（需知必填列） | 可选 — 表单更直观 |
| **软删除 / 恢复** | 低–中 | `delete_price_library_item` / `restore_price_library_item` 两阶段 | **完整** | 低 | 否（低频） |
| **供应商维护** | 中 | `upsert` 字段 `supplier`（migration 018，可选元数据） | **完整** | 低 | 可选 |
| **RUCIKA 多档价** | 中 | Read `data/data.Md`（PreToolUse gate）→ `upsert` 传 `rucika_quote_price_*` 等；发布后 quotation `get_product_price_tiers` 验证 | **功能完整，schema 摩擦** | **中–高** — MCP `inputSchema` 仅列子集（`index.js` L14–33），`rucika_*`/`factory_*` 在 Python `org_price_admin_payloads.py` L36–45 支持但未在 MCP schema 文档化 | **建议 P4 v1 含多档价字段** |
| **搜索 + 核对** | 高 | `get_price_library_active` / `get_price_library_draft`；AionUI `#/price-library` 只读 42 列+搜索（`price-library.md` L196–212） | **只读完整**；写仍走 Agent | 低（读 UI + 写 Agent 分裂） | **读已有 UI；写可选 P4** |
| **导出-编辑-导入**（几十行） | 中 | skill 三分法：`export_price_library` → excel MCP → `preview`/`apply` 两阶段 → publish（`price-library-edit/SKILL.md` L16–18） | **完整** | 中（Excel 路径白名单 ≤10MB） | 否 — Agent+Excel 更合适 |
| **全库规范化**（prepare 脚本） | 低 | `prepare-price-library-import.py` → `import_ready.xlsx` → preview/apply（PRD L367、skill L18） | **完整** | 高（运维级） | 否 — 不应做进 UI |
| **发布 draft → active** | 高 | `publish_price_library_draft` 绑定 `revision` 两阶段 | **完整** | 低 | 可选 — P4 可带「发布」按钮 |
| **409 revision 冲突** | 低（关键） | Agent SOP：停止、重读 draft、禁止 silent replay（`price-library-agent.md` L72–76, L144） | **完整**（协议层） | 中（需用户理解 revision） | 否 — UI 同样需重读 |
| **版本回滚** | 低 | `list_price_library_versions` → `revert_price_library_version` 两阶段（P2-Edit 补齐） | **完整** | 中 | 否 — 低频高危，Agent 两阶段足够 |
| **审计轨迹浏览** | 低 | `list_price_library_versions`（`reason`, `published_at`）；publish/revert 可写 `reason` | **部分** — 无 per-field audit MCP（`edit-capability-audit-2026-07-03.md` L27 defer `GET /audit`） | 中 | **P4 v2+ 或继续 Agent** |
| **多管理员并发** | 低 | 共享 draft + publish `revision` 409；PRD P3 待验（`p3-e2e-pending.md` L33） | **服务端完整**；无 draft merge UI（06-27 PRD L513 out of scope） | 高（后写者需重读） | 否 |
| **非技术 price_admin UX** | 中 | Guid「价格库管理」卡片 + 自然语言 + diff 表确认 | **功能可达，UX 门槛高** | **高** — 需熟悉 Guid、两阶段确认、revision 概念 | **是 — P4 主目标用户** |
| **紧急热修**（单物料快速改价） | 中 | Agent 单条 upsert + publish（~多轮对话） | **完整但慢** | 中–高 vs 点选 UI | **是 — P4 核心价值场景** |
| **Schema / 列结构变更** | 极低 | PRD §Out of scope + 06-27 PRD — 需 AionCore migration 任务 | **不覆盖（也不应由 Agent）** | N/A | 否 — 独立 migration 任务 |

---

## Agent coverage score

**估计：~82%（按维护频次加权）**

| 维度 | 权重 | 得分 | 依据 |
|------|------|------|------|
| 高频单点改价 / 发布 | 35% | 95% | PRD 验收路径 + agent SOP + MCP upsert/publish 已落地 |
| 批量（几十行 + 全库 normalize） | 15% | 90% | skill 三分法 + import API + prepare 脚本衔接 |
| 增删 / 供应商 / 回滚 | 15% | 90% | 11 工具全覆盖；`list_versions` P2 补齐 |
| 搜索核对（含 RUCIKA 语义） | 15% | 75% | 只读 UI 已有；RUCIKA 写路径依赖 data.Md + 非 schema 字段 |
| 非技术 admin / 紧急热修 UX | 15% | 55% | 能力在，摩擦高；无表格内联编辑 |
| Schema 变更 | 5% | 0% | 明确 out of scope |

**未计入降分因素：** P3 E2E 用户烟测未签字（`p3-e2e-pending.md`）— 工具链就绪但生产信心待补；MCP JSON schema 与 `UPDATABLE_FIELD_NAMES`（`org_price_admin_payloads.py` L7–50）不一致，可能降低 LLM 对 `factory_*`/`rucika_*`/`pe_*` 的调用率。

---

## Gaps that Agent cannot/should not cover

1. **Schema / 列增删改名** — PRD L132–135、L328–330；42 列固定，需 migration 任务。
2. **全库规范化 / dedupe / 税映射** — 应走 `prepare-price-library-import.py`（3299 行级），不应 Agent 逐格或 P4 全表编辑（PRD L367、skill L20）。
3. **Maker-checker 审批流** — 06-27 PRD L511 out of scope。
4. **多管理员实时协作 / draft merge** — 06-27 PRD L513；仅 revision 409，无合并 UI。
5. **细粒度 audit 时间线** — `GET /audit` 无 MCP wrapper（`edit-capability-audit-2026-07-03.md` L27）；`list_versions` 仅版本级 `reason`。
6. **非 price_admin 授权管理** — `PRICE_ADMIN_USERNAMES` 运维配置，非 Agent/UI 范围（06-27 PRD L534–536）。
7. **直接改 bundled seed / 本地 xlsx 当权威** — 双端禁止（agent §WANd.PRICE_LIBRARY.AUTHORITY.001）。
8. **MCP schema 未文档化的扩展列** — Python 接受 `factory_inc_tax`、`rucika_quote_price_1` 等，但 `index.js` `priceFieldProperties` 仅 19 项；Agent 可能漏传（实现 gap，非业务不可做）。
9. **P1.5 orchestrator 委派** — 仍 defer（`edit-capability-audit` L25）；非 admin 无法经 orchestrator 改价（by design P1）。

---

## P4 Manual Edit UI — recommended scope

### L2 row drawer only vs full CRUD

**推荐：v1 = L2 行抽屉（side drawer / modal），不做全表内联 CRUD。**

| 选项 | 建议 | 理由 |
|------|------|------|
| L2 row drawer | **v1 ✅** | 对齐紧急热修 + 非技术 admin；改动面小；复用 `#/price-library` 搜索定位 |
| 全表内联编辑 | defer | 42 列宽表 UX 重；与 Agent bulk 路径重叠；06-27 PR4 原 scope 含 draft editor 但 task 07-01 将 UI defer |
| Import / publish 全向导 | v2 或继续 Agent | import 已有 API；UI 向导 ROI 低于 Agent+Excel |

### v1 字段（建议）

按频次 + PRD 可改字段（`prd.md` L124–130）与 MCP 已验证路径：

| 优先级 | 字段 | 说明 |
|--------|------|------|
| P0 | `price_b`, `price_a`, `price_c`, `price_d`, `price_e` | 最高频改价 |
| P0 | `description`, `description_cn`, `supplier` | 描述/供应商 |
| P1 | `price_d_low`, `unit`, `product_type` | 次要档位与分类 |
| P1 | `rucika_quote_price_1`, `rucika_quote_price_2`, `rucika_discount` | RUCIKA 多档（补 MCP schema 摩擦） |
| P2 | `factory_inc_tax`, `factory_exc_tax`, `local_inc_tax`, `pe_factory_price` | 按 product_type 条件展示 |
| 不做 v1 | `raw_json`, `source_*`, `is_preferred_price` | 运维/导入元数据 — 留 Agent |

### 仍 Agent-only 的流程

- 全库 `prepare-price-library-import.py` 规范化
- 几十行以上 export-edit-import（Excel 更高效）
- `revert_price_library_version`（低频高危 — 保持 Agent 两阶段）
- Schema migration
- 并发 409 后的三方协调（重读 draft — 无 merge）

### API reuse（无需新 backend）

**是 — v1 可零 backend 变更**，直接复用 AionCore 已有端点（`price-library.md` L83–89）：

| UI 动作 | API |
|---------|-----|
| 读 active / 定位行 | `GET /api/price-library/active`（已有 `ipcBridge.priceLibrary.getActive`） |
| 读 draft + revision | `GET /api/price-library/draft` |
| 保存单行 | `POST /api/price-library/draft/items` + CSRF |
| 发布 | `POST /api/price-library/draft/publish` + `revision` + CSRF |
| 软删/恢复 | 同上 `change_type` |

新增仅为 **renderer IPC 封装**（mirror `orgHttpBridge` CSRF 模式，参照 `org-knowledge.md` / work-tasks POST 模式）。

### RBAC + 两阶段确认 in UI

| 层 | 现状 | P4 建议 |
|----|------|---------|
| 卡片可见 | `resolveIsOrgPriceAdmin()` probe `GET /draft` 200（`p1-guid-agent-catalog-done.md` L13） | 复用；抽屉仅 `isPriceAdmin` 显示「编辑」 |
| 写权限 | AionCore `PRICE_ADMIN_USERNAMES` 403 权威 | UI 403 toast；不假装客户端 RBAC 足够（PRD L167–177） |
| 确认 | Agent `confirmed=false/true` | UI：**预览 diff 模态** → 用户点「确认写入 draft」→ **发布二次确认**（revision 展示） |

### Files likely in aionui-src

（路径来自 `.trellis/spec/frontend/file-map.md`、`price-library.md`；`aionui-src` 为独立仓库，本 workspace 无源码副本）

| 用途 | 路径 |
|------|------|
| 路由 | `packages/desktop/src/renderer/components/layout/Router.tsx` — `/price-library` |
| 侧栏入口 | `SiderNav/SiderPriceLibraryEntry.tsx` |
| 类型/42 列 | `priceLibraryTypes.ts` — `PRICE_LIBRARY_COLUMNS` |
| 只读页 | `pages/priceLibrary/`（或等价目录） |
| 搜索过滤 | `filterProducts.ts` |
| IPC 读 | `ipcBridge.priceLibrary.getActive` |
| **新增** IPC 写 | `ipcBridge.priceLibrary.*` — `getDraft`, `upsertItem`, `publishDraft` |
| Admin 门控 | `ccbAgentCatalog.ts` — `filterGuidCatalogAgents`, `resolveIsOrgPriceAdmin` |
| i18n | `locales/{zh-CN,en-US}/priceLibrary.json` |
| 单元测试 | `tests/unit/priceLibrary/`（现有 7 pass per spec L471） |

---

## Recommendation: Agent-first now vs when to build P4

### Agent-first now ✅（当前至 P3 E2E 完成）

| 行动 | 理由 |
|------|------|
| 完成 P3 用户烟测 | `p3-e2e-pending.md` — 验证 upsert/publish/409/revert 真实链路 |
| 运维培训 price_admin 使用 Guid「价格库管理」 | 11 工具 + skill 已覆盖 80%+ 场景 |
| 修复 MCP schema 与 `UPDATABLE_FIELD_NAMES` 对齐 | 低成本提升 RUCIKA/工厂价覆盖率；不改 backend |
| Bulk / normalize 继续脚本 + Agent | PRD 明确分工（L367） |

### 何时启动 P4

| 触发条件 | 说明 |
|----------|------|
| **P3 E2E PASS** | Agent 路径生产信心成立后再做 UI，避免双轨未验证 |
| **≥1 名非技术 price_admin 反馈 Guid 门槛过高** | P4 主 ROI：紧急热修、点选改价 |
| **RUCIKA/多档价改价投诉** | 优先 L2 drawer 含 `rucika_*`，或先补 MCP schema |
| **不急** | 若仅 1 名技术 admin 且 Guid 熟练 — P4 可延至 07-xx 独立 task |

### 不建议现在做 P4 的部分

- 全表 42 列内联 CRUD
- Import 向导（Agent + Excel 足够）
- Audit 时间线 UI（先补 MCP `GET /audit` 再评估）
- Orchestrator 委派（P1.5 独立）

---

## Evidence index

| 来源 | 路径 |
|------|------|
| PRD 可改字段 / 流程 / defer UI | `.trellis/tasks/07-01-price-library-admin-agent/prd.md` |
| P2 三分法 / 仍 defer 项 | `.trellis/tasks/07-01-price-library-admin-agent/research/edit-capability-audit-2026-07-03.md` |
| 11 MCP 工具 / API / 只读 UI | `.trellis/spec/integration/price-library.md` § Agent write path |
| Agent SOP + hooks | `ccb-installer/packages/vertical/com.wanding.trade/agents/price-library-agent.md` |
| Bulk skill | `ccb-installer/packages/vertical/com.wanding.trade/skills/price-library-edit/SKILL.md` |
| MCP tool 注册列表 | `mcp_servers/price-library-server/dist/index.js` L34–157 |
| Python 全量可改字段 | `python/admin/org_price_admin_payloads.py` L7–50 |
| P3 待验 | `.trellis/tasks/07-01-price-library-admin-agent/p3-e2e-pending.md` |
| 06-27 PR4 原 scope / out of scope | `.trellis/tasks/06-27-remote-shared-price-library/prd.md` L497–517 |
| Frontend 文件定位 | `.trellis/spec/frontend/file-map.md` L103–106 |

## Caveats / Not Found

- **P3 E2E** 仍未用户签字 — 覆盖率评估基于工具链与 spec，非生产烟测证据。
- **aionui-src** 不在本 repo workspace — P4 文件路径来自 spec/file-map，实施需在 `aionui-src` 仓库确认实际目录名。
- **`GET /audit`** — spec/PRD 提及 audit history，但 MCP 与 client 均无 wrapper（`grep` `python/admin` 无 audit）；版本级 `reason` 仅 via `list_price_library_versions`。
- **MCP schema 子集** — `index.js` 与 `UPDATABLE_FIELD_NAMES` 不一致；需 implement 任务确认是否为已知技术债。
