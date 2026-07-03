# 价格库管理 Agent — `price-library-agent`

## Goal

为 **price_admin** 用户提供专用子助手，通过对话完成组织远端价格库的**查、改、增、删、批量导入、发布**——无需手写 VPS curl，也**禁止**把本地 xlsx 当权威直接改。

业务诉求（来自 explore 2026-07-02）：

- 修改具体字段值（如某物料 `price_b`、RUCIKA `price_d`、`supplier`）
- 新增 / 软删除产品行
- 批量维护（小范围 Excel → preview → apply）
- **不是**运行时改列名/改 schema（见 §Out of scope）

## 进度（2026-07-02）

| Phase | Status |
|-------|--------|
| P-1 Fleet org-primary | ✅ |
| P0B–P0D MCP write path | ✅ unittest 19/19 |
| P1 Guid agent + catalog gate | ✅ deploy-seed + health PASS |
| **P3 E2E** | ⬜ 待 admin Guid smoke — [`p3-e2e-pending.md`](./p3-e2e-pending.md) |

Canonical plan: [`execution-plan.md`](./execution-plan.md) · Spec: [`.trellis/spec/integration/price-library.md`](../../spec/integration/price-library.md) § Agent write path

## 已确认决策（2026-07-02）

| # | 问题 | 决定 |
|---|------|------|
| 1 | 非 `price_admin` 用户 Guid 卡片 | **隐藏** — 目录/Guid 不展示 `price-library-agent`；orchestrator 也不向非 admin 委派 |
| 2 | MCP 挂载 | **独立** — 新建 `mcp_servers/price-library-server`（不扩 `quotation-server`） |
| 3 | Fleet 前置 | **同意** — 本 task 验收前完成 org 主路径恢复：关 `PRICE_USE_BUNDLED_FIRST` + VPS 部署 migration **018** + 发布含 `supplier` 的 `import_ready` |
| 4 | Orchestrator 委派 vs `delegatable` | **分阶段** — P1：`delegatable: false`，**仅 Guid 直连**（无 orchestrator 路由）；P1.5：CCB `price_admin` 门控就绪后再开 orchestrator 委派（sidecar 可改 `true`）。见 §Audit 2026-07-02 |
| 5 | 写操作确认 | **`confirmed=false/true`** — 预览不碰共享 draft；`confirmed=true` 才 upsert/import/publish（同 org-knowledge 先例） |

### Fleet 前置清单（P-1，阻塞 P3 验收） ✅ 2026-07-01

当前 fleet 临时模式（`price-library.md` § Temporary local mode）下，agent publish 到 org **不会**被 quotation 读到。P3 E2E 前必须：

1. VPS：部署含 migration `018_price_library_supplier.sql` 的 AionCore；`import/apply` + `draft/publish` `data/price_library_import_ready.xlsx`（42 列，3299 行）
2. 打包：`ensure-wanding-settings.ps1` **移除** `PRICE_USE_BUNDLED_FIRST=1`；bundled xlsx 与 org 对齐（或接受 org-primary + seed 仅 bootstrap）
3. 员工：新 Guid 会话；可选清 `%APPDATA%/AionUi/aionui/price-library/` LKG
4. 烟测：`get_price_data()` → `source=org_api`；spot-check `supplier` 行

## 背景：现在缺什么

```
┌─────────────────────────────────────────────────────────────────┐
│                    价格库能力现状 (2026-07-02)                    │
└─────────────────────────────────────────────────────────────────┘

  AionCore org API (VPS)          Python org_price_client        Agents
  ─────────────────────          ─────────────────────          ──────
  ✅ GET /active                  ✅ get_price_data (只读)         quotation-agent
  ✅ GET/POST draft/*             ❌ 无 write client              → 只读查价
  ✅ import/preview|apply         ❌ 无 MCP 写工具
  ✅ draft/publish|revert
  ✅ export xlsx

  AionUI #/price-library          运维
  ─────────────────────          ──────
  ✅ 42 列表格只读（含 supplier） VPS curl + prepare 脚本
  ❌ price_admin 编辑 UI          （06-27 PR4 deferred）
```

| 能力 | 服务端 | 客户端 / Agent |
|------|--------|----------------|
| 全员查 active | ✅ | ✅ quotation + UI |
| draft 改单字段 | ✅ API 已有 | ❌ 无 MCP / 无专用 agent |
| Excel 批量 merge | ✅ import API | ⚠️ 仅脚本，无 agent SOP |
| publish / revert | ✅ | ❌ 仅 runbook |
| 改列名 / 删列 | ❌ schema 固定 | — |

**参照先例：** [`06-28-org-knowledge-agent-write-path`](../06-28-org-knowledge-agent-write-path/task.json) — 补 MCP 写路径 + 专用 agent 边界，禁止 shadow 文件当权威。

---

## 架构（目标态）

```
用户（price_admin）
      │
      ├─ P1：Guid 直连 ──► price-library-agent（delegatable: false）
      │
      └─ P1.5：wande-orchestrator ──委派──► price-library-agent
                    │                      （仅 price_admin + CCB gate）
                    ▼
              price-library-agent
                    │
                    ├─ Read data/data.Md（字段语义）
                    ├─ MCP price-library-server *
                    └─ excel MCP（仅本地 prepare / 小表编辑）
                    ▼
              org AionCore API
                draft/items → draft/publish → active
                    ▼
              全员 quotation-agent 下次查价自动用新版本（org_price_client）
```

**Orchestrator 路由（P1.5 才启用 — 勿与 P1 同时写进 sidecar）：**

| 用户意图 | 委派 |
|----------|------|
| 改价格库、上新物料、删 SKU、导入价格表、发布价格、回滚版本 | `price-library-agent`（caller 须为 price_admin） |

P1 阶段 orchestrator 遇改价意图 → 回复「请使用价格库管理 Guid 卡片或联系价格管理员」，**不**调用 `Agent(price-library-agent)`。

### 与 quotation-agent 分界

| | quotation-agent | price-library-agent |
|--|-----------------|---------------------|
| 用户 | 全员 | **price_admin** |
| 权限 | 读 active | draft 写 + publish |
| 典型任务 | 查价、出报价单 | 改价、上新 SKU、删品、批量导入 |
| MCP | `quotation`, `excel` | **`price-library`**（独立 server）, 可选 `excel` |
| Guid 可见性 | 全员 | **仅 price_admin**（卡片隐藏） |
| 禁止 | 改中心价格库 | 代替用户做报价填单 |

---

## 数据契约（Agent 必须遵守）

权威字段列表：`data/data.Md` + `.trellis/spec/integration/price-library.md`。

### 可改（draft item 字段）

- 标识：`material`（业务编码，版本内唯一）
- 描述：`description`, `description_cn`, `description_english`, `product_type`
- 价格：`factory_*`, `purchase_exc_tax`, `price_a`~`price_e`, `price_d_low`, `local_*`, `rucika_*`, `pe_*`
- 元数据：`supplier`（migration 018）、`unit`, `volume`（CEILING 稀疏列）
- 标记：`is_preferred_price`（全库去重后通常 TRUE；新增行需显式设置）

### 不可通过 Agent「改列名」

- Excel/API **列名 = schema 契约**（41/42 固定列）。用户说「把 price_b 改成默认价」→ 解释语义（Read `data.Md`），**不是**重命名列。
- 若真要增删 schema 列 → 单独 AionCore migration 任务，**不在本 agent 范围**。

### 写路径铁律

| Wrong | Correct |
|-------|---------|
| 直接改 `data/price_library_cleaned_*.xlsx` 期望全员生效 | draft API → publish → org active |
| 用 excel MCP 改员工 bundled seed | prepare 脚本生成 `import_ready` → import/apply |
| 未 preview 就 apply 全量表 | 先 `import/preview`，展示 diff/errors |
| import 缺行推断删除 | 仅 **显式** soft-delete API |
| 非 price_admin 调写 MCP | 403 + 引导找管理员 |

### Draft → Publish 流程（每次变更）

**关键：** 服务端 `POST /draft/items` **无** `expected_revision` — upsert/import/apply **立即修改共享 draft**。MCP 必须用 `confirmed` 门禁（见下）。

```
1. GET /draft → revision（只读）
2. MCP confirmed=false → 返回 proposed diff（本地计算或 import/preview API），**不写 draft**
3. 用户确认
4. MCP confirmed=true → POST /draft/items 或 import/apply
5. GET /draft → 新 revision
6. MCP publish confirmed=false → 摘要 + revision
7. 用户二次确认
8. POST /draft/publish { reason, revision } + CSRF
9. GET /active 验收
```

**409 revision conflict：** 停止 → 重新 GET draft → 重新展示 diff → **禁止**自动覆盖或 silent replay。

---

## 权限模型（三层 — 不可只靠 UI 隐藏）

| 层 | 职责 | 边界 |
|----|------|------|
| **AionUI** | Guid/catalog 是否展示 `price-library-agent` | **UX only**，非安全边界 |
| **CCB / orchestrator** | P1.5 前禁止委派；P1.5 后仅 `price_admin` 会话可 `Agent(price-library-agent)` | 须读 org 角色（JWT claims 或 org bridge）；登出/换账号清 catalog 缓存 |
| **AionCore** | 所有写 API 校验 `PRICE_ADMIN_USERNAMES` | **最终权威**；MCP 收到 403 须停止并提示 |

**角色来源：** org 登录 JWT + VPS env `PRICE_ADMIN_USERNAMES=admin`（可扩展用户名列表）。客户端不得缓存「我是 admin」跨 logout。

**Wrong：** 仅靠隐藏 Guid 卡片阻止写操作 — 任意会话仍可调 MCP 直到 AionCore 403。

---

## Import 文件安全（MCP 契约）

`preview_price_library_import` / `apply` 读取 xlsx 时：

| 规则 | 要求 |
|------|------|
| 路径 | 仅 `WANDING_WORKSPACE_POINTER` 下、AionUI 附件目录、或 agent 会话工作区 — **拒绝**任意绝对路径、UNC、`..`、symlink 逃逸 |
| 扩展名 | `.xlsx` only |
| 大小 | ≤ 10 MB（可配置） |
| 行数 | apply 前 preview 须报告 row_count；超限拒绝 |
| 临时文件 | 上传副本用 temp + finally 删除 |
| Agent | 不得 `Read` 系统路径 bypass；由 MCP 参数 `file_path` 白名单校验 |

---

## MCP 工具设计（草案）

新模块：`python/admin/org_price_admin_client.py` + `org_price_admin_dispatch.py`  
注册到 **独立** `mcp_servers/price-library-server`（与 `quotation-server` 分进程；quotation 保持只读查价边界）。

`ccb-mcp.json` / `mcp-health-manifest.json` 新增 `price-library` 条目；**不**向 `quotation-agent` 暴露写工具。

| Tool | 用途 | 映射 API | `confirmed` |
|------|------|----------|-------------|
| `get_price_library_active` | 查已发布 | GET `/active` | — |
| `get_price_library_draft` | 查草稿 + revision | GET `/draft` | — |
| `upsert_price_library_item` | 按 material 新增/改字段 | POST `/draft/items` | false=proposed diff only; true=apply |
| `delete_price_library_item` | 软删除 | POST `/draft/items` | 同上 |
| `restore_price_library_item` | 恢复已删 | POST `/draft/items` | 同上 |
| `preview_price_library_import` | xlsx 预览 diff | POST `/import/preview` | false=preview only |
| `apply_price_library_import` | 合并入 draft | POST `/import/apply` | false=返回 counts；true=apply |
| `publish_price_library_draft` | 发布 | POST `/draft/publish` | false=摘要+revision；true=publish |
| `revert_price_library_version` | 回滚 | POST `/versions/:id/revert` | false=确认摘要；true=revert |
| `export_price_library` | 下载 active xlsx | GET `/export` | — |

**CSRF：** 所有 POST 走共享 `org_session`（`07-02` profile 对齐）；与 `org_knowledge_client` 同模式 — 见 `.trellis/spec/integration/org-knowledge.md`。

**权限门：** AionCore 403 `price_admin` 为最终权威；dispatch 层映射友好错误，**不**假装客户端 RBAC 已足够。

---

## Agent 定义（草案）

**文件：** `ccb-installer/config/agents/price-library-agent.md` + `price-library-agent.aionui.json`

| 项 | 值 |
|----|-----|
| Guid 卡片 | 价格库管理 — **`guid_primary` 仅 price_admin 可见**（AionUI catalog 按 org 角色过滤） |
| `delegatable` | **`false`（P1）** — Guid 直连专用；P1.5 评估改 `true` + CCB gate（见 `agents-unified-model.md` § Office preset delegatable boundary） |
| model | 与 quotation 同级 |
| mcpServers | `price-library`（独立 server） |
| skills | **无** `trellis-before-dev` — 仅业务 SOP + Read `data/data.Md` |
| hooks | PreToolUse：写 MCP 前 Read `data/data.Md`；Stop：若本会话有 `confirmed=true` 写操作未 publish，提示用户 |

**Guid 隐藏实现要点（P1）：**

- Sidecar `price-library-agent.aionui.json`：`guid_primary: true`，catalog IPC 增加 `price_admin` 门控
- 非 admin：Assistants / Guid **不返回**该 agent
- Admin：Guid 直连新会话（**不**经 orchestrator）

**SOP 要点：**

1. 用户给 material + 字段 + 新值 → `get_draft` → `upsert(..., confirmed=false)` → 展示 diff → 用户确认 → `upsert(..., confirmed=true)` → `publish(..., confirmed=false)` → 用户二次确认 → `publish(..., confirmed=true)`
2. 用户给 Excel → `prepare-price-library-import.py`（全量）或 agent 小表 → `preview` → `apply(confirmed=false)` → 用户确认 → `apply(confirmed=true)` → publish 同上
3. 多档价语义 → Read `data.Md` §来源映射
4. 发布后提醒：员工**新会话**查价

**路由（P1.5 才改 orchestrator）：** 见 §架构目标态。

---

## 实现阶段

> **Audit 2026-07-02：** 见 [`research/audit-plan-review-2026-07-02.md`](research/audit-plan-review-2026-07-02.md)。P0 拆为 A–D；**P1 先于 orchestrator（P1.5）**。

### P-1 — Fleet org-primary 恢复 ✅ 2026-07-01

（同前 — 见 `p1-fleet-org-primary-done.md` + 子任务 `07-03` UI supplier 列）

### P0A — 设计 / 元数据（实施前）

- [x] 解决 `delegatable` vs orchestrator 冲突（分阶段决策）
- [x] 权限三层 + `confirmed` 写门禁写入 PRD
- [x] 修 `task.json` JSON；清理 `implement.jsonl`（仅 spec/research）
- [ ] `trellis-before-dev` 读 spec：`agents-unified-model.md`、`org-knowledge.md`、`price-library.md`

### P0B — MCP 只读 + 本地 preview ✅ 2026-07-02

> 交付记录：[`p0b-mcp-read-preview-done.md`](p0b-mcp-read-preview-done.md)

- [x] `org_price_admin_client.py`：GET active/draft/export；CSRF session
- [x] `org_price_admin_dispatch.py`：`confirmed=false` 路径（proposed diff）
- [x] `mcp_servers/price-library-server` 骨架 + `ccb-mcp.json` 注册
- [x] 单元测试：CSRF、403 映射、preview 不 mutate draft

### P0C — 单点写入 + publish revision

- [x] `confirmed=true` → draft/items（create/update/soft_delete/restore）— *P0B 已接通*
- [x] `publish`：`confirmed` 两阶段 + `revision` 绑定；409 → `REVISION_CONFLICT`
- [x] `sync-dev-wanding-vendor.ps1` 同步 — *P0B 已跑*

### P0D — import / revert + 文件安全

- [x] import preview/apply（confirmed 两阶段）
- [x] revert（独立 confirmed）
- [x] 路径白名单 + 大小/行数限制
- [x] MCP health manifest + 四态 manual matrix（`p0d-import-revert-done.md`）

### P1 — Guid 直连 Agent + catalog 门控

- [x] `price-library-agent.md` + sidecar（**`delegatable: false`**）
- [x] AionUI：`ccbAgentCatalog` / `resolveIsOrgPriceAdmin` 过滤 — `aionui-src`
- [x] `deploy-seed-agents.ps1 -ForceMd`；`mcp-health-manifest.json`
- [ ] PreToolUse Read `data.Md` hook
- [ ] **不**改 `wande-orchestrator` 路由表（留 P1.5）

### P1.5 — Orchestrator 条件委派（可选，依赖 CCB gate）

- [ ] CCB：`price_admin` 角色检测 + `CCB_ROUTER_DELEGATABLE_AGENT_IDS` 或 spec 批准的 orchestrator bypass
- [ ] `wande-orchestrator.md` 路由行 + sidecar `delegatable: true`（若 gate 就绪）
- [ ] 非 admin orchestrator 会话：明确拒绝委派文案

### P2 — 批量 / 规范化辅助

- [ ] Agent SOP：调用 `prepare-price-library-import.py` 的明确场景
- [ ] `preview` 结果人类可读摘要（create/update/unchanged/error counts）
- [ ] 与上一对话「skipped.json 瘦身 / import_ready 死列」联动：bulk 用脚本，单点用 draft API

### P3 — 验收（price_admin 账号）

- [ ] 非 price_admin：Guid **无**价格库卡片；MCP 写 → 403
- [ ] Guid 直连：改 1 物料 `price_b` → confirmed 两阶段 → publish → quotation 新会话 `org_api`
- [ ] RUCIKA 多档 → `get_product_price_tiers` 验证
- [ ] 小表 import confirmed 两阶段
- [ ] **双 admin 并发：** A 改 draft 后 B publish 409 → 重读 diff，无 silent overwrite
- [ ] revert 独立 confirmed → active 恢复
- [ ] P1.5（若做）：orchestrator 委派 smoke

### Deferred（另开任务）

- AionUI price_admin 表格编辑 UI（06-27 PR4）
- Schema v3 / 按来源拆表 / 列删减
- WS push `price-library.updated`
- Maker-checker 审批流

---

## Out of scope

- **运行时改列名、删列、增列**（schema migration）
- 替 quotation-agent 查价（只读应继续用 quotation）
- 非 price_admin 授权 UI
- 直接编辑 `%APPDATA%` LKG 或 bundled seed 作为发布手段
- Accurate / 库存联动

---

## Acceptance

1. price_admin 在 Guid 选「价格库管理」会话，用自然语言完成：**查某编码各档价 → 改 B 档 → 发布 → 回报 version_number**。
2. 写操作**零**次直接修改 `vendor/wanding/data/price_library_cleaned_*.xlsx` 作为权威。
3. MCP 写工具 registry 测试通过；`test-mcp-health.ps1` 覆盖新 agent。
4. `.trellis/spec/integration/price-library.md` 增补 § Agent write path（mirror org-knowledge）。

---

## Related

| 文档 / 任务 | 关系 |
|-------------|------|
| `.trellis/spec/integration/price-library.md` | API + CSRF + 42 列契约 |
| `.trellis/spec/integration/org-knowledge.md` | **`confirmed=false/true`** + org_session CSRF 先例 |
| `.trellis/spec/integration/agents-unified-model.md` | **`delegatable` / `filterDelegatableCustomAgents`** |
| `.trellis/spec/frontend/file-map.md` | AionUI catalog / `#/price-library` 文件定位 |
| `.trellis/spec/frontend/coding-rules.md` | Renderer 规则 |
| `data/data.Md` | 字段语义（Agent Read 硬约束） |
| `scripts/org-phase0/prepare-price-library-import.py` | 全量 import 前处理 |
| `06-27-remote-shared-price-library` | 服务端已完成；PR4 UI deferred |
| `06-28-org-knowledge-agent-write-path` | MCP 写路径先例 |
| `07-03-price-library-supplier-ui-column` | UI 42 列 supplier（done） |
| `research/audit-plan-review-2026-07-02.md` | 实施前审计与决议 |

---

## Explore 记录（2026-07-02）

**用户原问延伸：** 价格库列规范化 / skipped.json 瘦身 — 适合 **P2 批量脚本 + import API**，不适合 agent 逐格改 3000 行。单点改价走 draft API；结构性格式化走 `prepare-price-library-import.py` 重生成。

**关键张力：** `data.Md` 说 PE/LESSO 重合「不得去重删除」，但 `import_ready` 为 org 唯一键做了 dedupe。Agent 文档须写清：**draft 库 material 唯一**；历史对比行在 `price_library_cleaned` / `raw_rows`，不在 org active。

**决策落盘（2026-07-02）：** Guid 隐藏 / 独立 MCP / Fleet org-primary 前置 — 见 §已确认决策。

**Audit 落盘（2026-07-02）：** delegatable 分阶段、confirmed 写门禁、权限三层、import 路径安全、P0 拆分 — 见 [`research/audit-plan-review-2026-07-02.md`](research/audit-plan-review-2026-07-02.md)。
