# Execution Plan — `07-01-price-library-admin-agent`

> **Purpose:** Stable source of truth for phased execution. Agents read/update **this file**, not chat memory.  
> **Skill:** `.agents/skills/trellis-task-execution/SKILL.md`  
> **PRD:** [`prd.md`](./prd.md) · **Spec:** [`.trellis/spec/integration/price-library.md`](../../spec/integration/price-library.md)

| Field | Value |
|-------|--------|
| **Status** | `in_progress` |
| **Approved** | 2026-07-02（用户确认「按思路执行」） |
| **Scenario** | A + D-lite |
| **Repos** | `claude-code-best`（主）+ `aionui-src`（P1 catalog） |
| **Plan depth** | **Full**（edit 体系完善） |
| **Verification profile** | **UI**（Guid smoke 为主） |
| **Active phase** | **P4** child `07-11-price-library-row-edit-ui` implemented 2026-07-11（P3 publish smoke **waived**） |

---

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|--------|---------------------|
| P-1 Fleet org-primary | ✅ | [`p1-fleet-org-primary-done.md`](./p1-fleet-org-primary-done.md) |
| P0A Design / audit | ✅ | [`research/audit-plan-review-2026-07-02.md`](./research/audit-plan-review-2026-07-02.md) |
| **P0B** MCP read + preview | ✅ | [`p0b-mcp-read-preview-done.md`](./p0b-mcp-read-preview-done.md) · pytest 10/10 · code-review PASS |
| **P0C** publish + 409 | ✅ | [`p0c-publish-done.md`](./p0c-publish-done.md) · pytest 14/14 · code-review PASS |
| **P0D** import/revert + path security | ✅ | [`p0d-import-revert-done.md`](./p0d-import-revert-done.md) · unittest 19/19 · code-review PASS |
| **P1** Guid agent + catalog gate | ✅ | [`p1-guid-agent-catalog-done.md`](./p1-guid-agent-catalog-done.md) · deploy-seed 16 files · health PASS |
| P1.5 Orchestrator delegate | ⬜ | optional — defer |
| **P2-Edit-a** 单条对话 SOP + hooks | ✅ | [`p2-edit-done.md`](./p2-edit-done.md) · pytest 23/23 · gate 4/4 |
| **P2-Edit-b** 批量 SOP + prepare 衔接 | ✅ | `skills/price-library-edit/SKILL.md` |
| **P2-Edit-c** list versions MCP | ✅ | `list_price_library_versions` |
| **P3** E2E + 记录 | 🟡 partial | upsert PASS 2026-07-10；publish **waived** for P4 start |
| **P4** L2 row edit UI | ✅ | child 07-11 · bun 15/15 · code-review PASS · **UI smoke PASS 2026-07-11** |

**Child task done:** [`07-03-price-library-supplier-ui-column`](../07-03-price-library-supplier-ui-column/)

---

## Architecture (target)

```
price_admin user
      │
      ├─ P1: Guid 直连 ──► price-library-agent (delegatable: false)
      │
      └─ P1.5: orchestrator ──► price-library-agent (after CCB gate)
                    │
                    ▼
              price-library MCP (独立进程)
                    │
                    ▼
              org AionCore API (draft → publish → active)
```

**Write contract:** `confirmed=false` → preview only · `confirmed=true` → POST · publish 绑定 `revision` · 409 → 停、重读、禁止 auto-replay

---

## Phase 0 — Activate & read

| Step | Tool / skill | Output | Done |
|------|--------------|--------|------|
| Activate task | `task.py start 07-01-price-library-admin-agent` | `in_progress` | ✅ |
| Pre-dev | `trellis-before-dev` → integration + org-knowledge + agents-unified-model | spec paths | ⬜ |
| Read precedent | `06-28-org-knowledge-agent-write-path` | confirmed + CSRF pattern | ✅ |
| Read API | `vps-price-library-runbook.md` §3–4 | curl templates | ✅ |

---

## Phase 1…N — Workstreams

| Phase | PRD | Workstream | Tool / agent | Canonical files | Done |
|-------|-----|------------|--------------|-----------------|------|
| **P0B** | P0 | Read client + preview | TDD → implement | `org_price_admin_client.py`, `org_price_admin_preview.py`, `org_price_admin_dispatch.py`, `org_price_admin_payloads.py` | ✅ |
| **P0B** | P0 | MCP shell + registry | implement | `mcp_servers/price-library-server/`, `price_library_main.py`, `ccb-mcp.json`, `ensure-wanding-settings.ps1` | ✅ |
| **P0B** | P0 | Tests | pytest | `python/tests/test_org_price_admin_client.py` | ✅ |
| **P0C** | P0 | `publish_price_library_draft` | TDD → implement | extend client + dispatch + MCP `index.js` | ✅ |
| **P0C** | P0 | 409 revision conflict | implement + test | map `OrgVersionConflictError`; no silent replay | ✅ |
| **P0C** | P0 | Vendor sync | shell | `sync-dev-wanding-vendor.ps1 -UpdateSettings` | ✅ |
| **P0D** | P0 | import preview/apply | TDD → implement | multipart + confirmed two-phase | ✅ |
| **P0D** | P0 | revert + path guard | TDD | path whitelist ≤10MB `.xlsx` | ✅ |
| **P0D** | P0 | MCP health 四态 | manifest | `mcp-health-manifest.json`, manual matrix | ✅ |
| **P1** | P1 | Agent md + sidecar | implement | `ccb-installer/config/agents/price-library-agent.md` | ✅ |
| **P1** | P1 | Catalog `price_admin` gate | TDD → aionui-src | `ccbAgentCatalog.ts` + unit test | ✅ |
| **P1** | P1 | Deploy agents | scripts | `deploy-seed-agents.ps1 -ForceMd` | ✅ 2026-07-02 |
| **P1.5** | opt | Orchestrator delegate | spike | CCB gate + `wande-orchestrator.md` | defer |
| **P2** | P2 | Bulk SOP | doc | `prepare-price-library-import.py` refs | ⬜ |
| **P3** | P3 | E2E acceptance | manual + pytest | PRD §P3 checklist · [`p3-e2e-pending.md`](./p3-e2e-pending.md) | ⬜ user |

### Recommended order (single thread)

```
P0B ✅ → P0C → P0D → P1(ccb) → P1(aionui) → P2 → P3
                              └─ P1.5 optional spike
```

**Per-milestone mini-gate:** code-reviewer PASS → pytest → vendor sync → spec + jsonl → update **this file** Progress table.

---

## Verification gate (single chain)

```
改代码
  → code-reviewer PASS（P0–P2）/ trellis-check（P3 收口可选）
  → pytest + smoke 证据
  → sync-dev-wanding-vendor.ps1（MCP/python 变更时）
  → trellis-update-spec → price-library.md
  → implement.jsonl + check.jsonl + prd AC [x]
  → 更新 execution-plan.md Progress
  → git commit（仅用户要求）
  → /trellis:finish-work
```

| Milestone | Primary evidence |
|-----------|------------------|
| P0B | pytest 10/10; live `get_price_library_active` v3/3299 |
| P0C | publish confirmed 两阶段; 409 单测或 mock |
| P3 | admin Guid smoke; quotation 新会话 `org_api` |

---

## Parallelization (P1 only — D-lite)

| Agent | Scope | Merge rule |
|-------|-------|------------|
| **A** | `claude-code-best`: agent md + MCP + python | 先完成并 sync vendor |
| **B** | `aionui-src`: catalog `price_admin` filter | **A 的 agent id 稳定后**再改 |

**禁止并行：** 同轮改 `ccb-mcp.json` + `ensure-wanding-settings.ps1` + 手改 vendor。

---

## Manual steps (human)

**P3 smoke checklist (admin org SSO → VPS v3/3299):**

1. Login **admin** → Guid →「**价格库管理**」→ **new session**
2. `get_price_library_draft` → note `revision`
3. `upsert_price_library_item` `confirmed=false` → review diff → `confirmed=true`
4. `publish_price_library_draft` two-phase (`confirmed=false` → `confirmed=true`)
5. `get_price_library_active` → `version_number` should increment
6. *(optional)* small xlsx import preview/apply; revert with independent confirm
7. Report: `version_number`, any 409 `REVISION_CONFLICT`

- [ ] P3: admin upsert `confirmed` 两阶段 → publish → `version_number++`
- [ ] P1: non-admin（yjc）Guid **无**价格库卡片（需 aionui-src rebuild 若旧 exe）
- [ ] P1: Guid **直连**改价（不经 orchestrator）
- [ ] P3：双 admin 并发 publish 409
- [ ] P3：quotation 新会话 `get_price_data()` → `source=org_api`

---

## Defer / out of scope

- AionUI price_admin 表格编辑 UI（06-27 PR4）
- AionCore `expected_revision` on draft/items（另开 API task）
- Schema v3 / maker-checker / WS push

---

---

## P2-Edit — Edit 体系完善（2026-07-03，**draft 待批准**）

> **动机：** MCP 写路径已齐，但「主力维护工具」的对话体验、批量路径、读能力缺口尚未闭环。  
> **原则：** 探索 → 落档 → 实现 → 测试 → 记录；每里程碑 mini-gate。

### Edit 能力矩阵（现状 vs 目标）

| 场景 | 工具路径 | 代码 | Agent SOP | E2E |
|------|----------|------|-----------|-----|
| 单字段改价（price_b 等） | `upsert` 两阶段 | ✅ | 基础 | ⬜ |
| 同 SKU 多字段 | `upsert` 多字段一次 | ✅ | 缺示例 | ⬜ |
| 新增 SKU | `upsert` + `is_preferred_price` | ✅ | 缺说明 | ⬜ |
| 软删 / 恢复 | `delete` / `restore` | ✅ | 基础 | ⬜ |
| supplier 维护 | `upsert` supplier | ✅ | 缺 | ⬜ |
| RUCIKA 多档 | `upsert` rucika_* | ✅ | 缺 + 验收用 quotation tiers | ⬜ |
| 小表批量（≤N 行） | excel → `preview`/`apply` | ✅ | 基础 | ⬜ |
| 全量规范化 | `prepare-price-library-import.py` → import | 脚本 ✅ | **缺衔接** | ⬜ |
| 导出→改→再导入 | `export` + excel + import | ✅ | **缺** | ⬜ |
| 发布 / 409 并发 | `publish` 两阶段 | ✅ | 基础 | ⬜ |
| 回滚 | `revert` 需 `version_id` | revert ✅ | **缺 list versions** | ⬜ |
| 审计 / 版本列表 | GET `/versions` `/audit` | API ✅ | **无 MCP** | — |

**关键缺口：** ① sidecar 无 hooks（data.Md / 未 publish 提醒）；② revert 无 `list_price_library_versions`；③ P2 bulk 与 prepare 脚本未写入 agent skill。

### Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Spec read | `trellis-before-dev` | available | 主会话读 integration spec |
| Explore / gap audit | `/opsx:explore` | available | `research/edit-capability-audit-2026-07-03.md` |
| Sidecar + hooks | `trellis-implement` | available | 主会话改 agent md + gate scripts |
| MCP read 补全 | TDD → implement | available | 主会话 |
| Review | `code-reviewer` agent | available | trellis-check |
| Test | `pytest` + Guid manual | available | — |
| Spec 沉淀 | `trellis-update-spec` | available | 主会话改 price-library.md |
| P3 smoke | 用户 Guid | available | `p3-e2e-pending.md` 填结果 |

### Phase E0 — Explore & 落档（无代码）

| Step | Output | Done |
|------|--------|------|
| 读 sidecar + quotation-agent hooks 先例 | gap 列表 | ⬜ |
| 读 `prepare-price-library-import.py` + runbook §1.1 | bulk 三分法决策 | ⬜ |
| 写 `research/edit-capability-audit-2026-07-03.md` | 能力矩阵 + 场景路由 | ⬜ |

**Bulk 三分法（拟落档）：**

```
┌─────────────────────────────────────────────────────────────┐
│  用户意图              │  路径                              │
├────────────────────────┼────────────────────────────────────┤
│  1–5 行改几个字段       │  upsert 两阶段（不走 Excel）        │
│  几十行局部更新         │  export → excel 改 → preview/apply │
│  全库/规范化/去重/映射  │  prepare 脚本 → import_ready → apply│
└─────────────────────────────────────────────────────────────┘
```

### Phase P2-Edit-a — 单条改价对话体验

| WS | Risk | Tool | Files | Required output | Profile |
|----|------|------|-------|-----------------|---------|
| Sidecar SOP 增强 | ui | edit md | `price-library-agent.md`, `.aionui.json` | 多场景 SOP + diff 展示模板 + recommended_prompts | UI |
| PreToolUse data.Md | ui | hook | `ccb-subagent-gate` 新 script 或复用模式 | 首次 upsert/import 前强制 Read | UI |
| Stop 未 publish 提醒 | ui | hook | 同上 Stop matcher | 会话有 confirmed write 未 publish → nudge | UI |
| PostToolUse confirmed nudge | ui | hook | preview 后提醒用户确认再 true | 减少 skip preview | UI |

**TDD contract（hooks）：**

| WS | Level | RED | GREEN | Regression |
|----|-------|-----|-------|------------|
| gate scripts | unit | 无 Read → block upsert | pytest 新用例 | quotation gate 不回归 |
| sidecar | smoke | N/A | deploy-seed + 人工读 md | — |

### Phase P2-Edit-b — 批量维护 SOP

| WS | Risk | Tool | Files | Required output | Profile |
|----|------|------|-------|-----------------|---------|
| Agent skill | — | new skill | `skills/price-library-edit/SKILL.md` | prepare 场景 + export 小表 + import 摘要格式 | Standard |
| prepare 衔接 | external-api | doc in skill | 引用 `prepare-price-library-import.py` | 何时跑脚本、skipped.json 含义、dedupe 与 data.Md 张力 | Standard |
| import 摘要模板 | ui | agent md | preview counts → 人类可读表 | create/update/unchanged/error 必报 | UI |

**P2 还缺什么（相对 prepare 脚本）：**

1. Agent **不知道何时**跑 prepare（全量 vs 用户小表）
2. **skipped.json / deduped** 解释未写入 sidecar（用户问「为什么行少了」）
3. **export → excel MCP → import** 闭环未文档化
4. import preview **错误行**展示格式未规定
5. prepare 默认 input 路径（supplier draft xlsx）对 agent 不透明

### Phase P2-Edit-c — 读能力补全（revert / 审计）

| WS | Risk | Tool | Files | Required output | Profile |
|----|------|------|-------|-----------------|---------|
| `list_price_library_versions` | external-api | TDD | client + dispatch + MCP `index.js` | GET `/versions` 包装 | Standard |
| `get_price_library_audit`（可选 P2.5） | — | defer OK | GET `/audit` | 若 revert smoke 需要再开 | — |
| revert SOP 更新 | ui | agent md | 用 list → 选 id → revert 两阶段 | — | UI |

**TDD contract：**

| WS | Level | RED | GREEN | Regression |
|----|-------|-----|-------|------------|
| list versions | unit | mock GET /versions | pytest + MCP tool list 11 tools | 现有 19 tests 仍 pass |

### Phase P3 — E2E smoke + 记录

**最短手动路径（admin，~15 min）：**

1. `start-dev-full` + org SSO 登录 **admin**
2. Guid →「**价格库管理**」→ **新会话**
3. 说：「查 draft revision」→ 记下 `revision`
4. 说：「把物料 `8010012697` 的 `supplier` 改成 `TEST-SMOKE`（先预览）」
   - 期望：agent 先 `upsert` `confirmed=false` 展示 diff → 你回复「确认」→ `confirmed=true`
5. 说：「发布（先预览）」→ 确认 → `publish` `confirmed=true`
6. 说：「查 active version_number」→ 应 **递增**
7. **（可选 5 min）** 导出小 xlsx → 改 1 行 → preview import → apply → publish
8. 填 [`p3-e2e-pending.md`](./p3-e2e-pending.md) + 本 plan Progress 表

**扩展 smoke（有时间再做）：** 双 admin 409 · revert · quotation 新会话 `org_api` · RUCIKA tiers

### Verification profile — **UI**

1. `code-reviewer` PASS（P2-Edit-a/b/c 每里程碑）
2. `python -m pytest python/tests/test_org_price_admin_client.py` — 目标 **≥22**（+list versions）
3. `deploy-seed-agents.ps1 -ForceMd` + `sync-dev-wanding-vendor.ps1`
4. **用户** P3 smoke → 证据写入 `p3-e2e-pending.md`
5. `trellis-update-spec` → `price-library.md` § Agent write path
6. `implement.jsonl` + `check.jsonl` + prd AC
7. commit（仅用户要求）→ `/trellis:finish-work`

### Recovery

| Trigger | Return to | Re-approval |
|---------|-----------|-------------|
| Guid 跳过 confirmed=false | P2-Edit-a hooks | no |
| import 路径 403/拒绝 | 检查 workspace 白名单 | no |
| publish 409 | agent SOP 重读 draft | no |
| list versions API 形态与假设不符 | P2-Edit-c research | yes if scope changes |
| P3 smoke fail | 对应 WS + 重跑 gate | no |

### Recommended order

```
E0 explore 落档 → P2-Edit-c (list versions, 小) → P2-Edit-a (hooks+sidecar)
  → P2-Edit-b (skill+bulk SOP) → P3 smoke 记录 → finish-work
```

P1.5 orchestrator **仍 defer**（不阻塞 edit 体系）。

---

## P4 — Manual Edit UI（L2 row drawer）— 2026-07-10 规划

> **Research:** [`research/agent-vs-manual-edit-coverage-2026-07-10.md`](./research/agent-vs-manual-edit-coverage-2026-07-10.md)  
> **Verdict:** Agent-first 覆盖 **~82%**（按频次加权）；P4 补齐非技术 admin UX + 紧急热修，**不做**全表 CRUD。  
> **Gate:** P3 publish smoke **waived** 2026-07-11（用户「执行 P4，跳过 publish」）；upsert 两阶段已 PASS。P3.5 MCP schema 对齐仍可并行。

### Executive summary

| 问题 | 结论 |
|------|------|
| Agent 能否覆盖大部分场景？ | **是** — 单条/多字段改价、增删恢复、supplier、批量 import、publish、409、revert 均已具备（11 MCP + skill + hooks） |
| 仍缺什么？ | 非技术 admin Guid 门槛、RUCIKA 多档 MCP schema 摩擦、细粒度 audit、schema migration |
| 人工 edit 要做哪些？ | **v1 L2 行抽屉**：P0 价档 + 描述 + supplier；预览 diff → 写 draft → 二次确认 publish；复用 org API，无新 backend |

### Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.PRICE_LIBRARY.AUTHORITY.001` | org AionCore 是唯一写入权威 | `price-library-agent.md`, org API | pytest admin client | 本地 xlsx 误当权威 |
| `WANd.PRICE_LIBRARY.CONFIRMATION.001` | 写操作两阶段确认 | Agent MCP + **P4 UI diff modal** | P3 smoke + P4 UI unit | 跳过预览直接写 |
| `WANd.PRICE_LIBRARY.REVISION.001` | publish 绑定 revision；409 停 | `org_price_admin_client.py`, UI publish | mock 409 + manual | silent replay |
| `WANd.PRICE_LIBRARY.DATA_MD.001` | 字段语义按需 Read data.Md | hooks + **P4 字段 tooltip** | gate pytest | RUCIKA 档位解释错 |
| `WANd.PRICE_LIBRARY.UI.RBAC.001` *(provisional)* | 仅 price_admin 见编辑入口；403 服务端权威 | `ccbAgentCatalog.ts`, `resolveIsOrgPriceAdmin` | bun test catalog | 非 admin 客户端写 |

### Contract: WANd.PRICE_LIBRARY.UI.RBAC.001

**Behavior protected:** 非 `price_admin` 用户在 `#/price-library` 仅只读；编辑抽屉与 POST 写路径对非 admin 不可见或 403。  
**Primary code:** `aionui-src/.../ccbAgentCatalog.ts`, `pages/priceLibrary/*`, org HTTP bridge CSRF  
**Tests:** `bun test tests/unit/priceLibrary/` + catalog admin gate  
**Eval / smoke:** admin 见「编辑」→ 改价 → publish `version_number++`；yjc 无编辑按钮  
**Risk if broken:** 非授权改价、全员报价数据污染

### Agent vs Manual — 分工（落档）

```
┌────────────────────────────────────────────────────────────────┐
│  Agent 继续负责（P4 不替代）                                      │
├────────────────────────────────────────────────────────────────┤
│  · 全库 prepare-price-library-import.py 规范化                    │
│  · 几十行 export → Excel → import preview/apply                  │
│  · revert_price_library_version（低频高危）                       │
│  · schema migration                                            │
│  · 并发 409 后重读 draft 协调                                     │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  P4 v1 人工 edit（L2 row drawer）                                │
├────────────────────────────────────────────────────────────────┤
│  · 搜索定位 → 点行「编辑」→ 改 P0 字段 → 预览 diff → 写 draft      │
│  · 可选「发布」二次确认（展示 revision）                          │
│  · 字段：price_a–e, description*, supplier, unit (P0–P1)     │
│  · RUCIKA 多档 (P1) — 或先做 P3.5 MCP schema 对齐                │
└────────────────────────────────────────────────────────────────┘
```

### Phase -1 — Capability matrix (P4)

| Capability | Status | Fallback |
|------------|--------|----------|
| Backend API (draft/items, publish) | ✅ available | — |
| aionui-src IPC CSRF POST pattern | ✅ available (org-knowledge / work-tasks 先例) | research org-knowledge.md |
| `resolveIsOrgPriceAdmin` | ✅ available | probe GET /draft |
| P3 E2E agent smoke | ⬜ pending | **blocks P4 implement** |
| MCP schema 全 42 列 | ⚠️ partial | P3.5 align `index.js` ↔ `UPDATABLE_FIELD_NAMES` |

**Plan depth:** Standard · **Scenario:** E (explore) → A (P4 implement after P3) · **Profile:** UI

### Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| P3 | P0 | Guid E2E smoke | `WANd.PRICE_LIBRARY.*` | ui | 用户 Guid | `p3-e2e-pending.md` | upsert PASS; publish waived | UI |
| P3.5 | P1 | MCP schema 对齐 42 列 | docs-only/runtime | low | trellis-implement | `mcp_servers/price-library-server/index.js`, payloads | LLM 可传 `rucika_*`/`factory_*` | Standard |
| P4-a | P1 | IPC 写路径 + CSRF | `WANd.PRICE_LIBRARY.UI.RBAC.001` | external-api | trellis-implement | aionui-src ipcBridge | `getDraft`, `upsertItem`, `publishDraft` | UI |
| P4-b | P1 | L2 row drawer UI | `WANd.PRICE_LIBRARY.CONFIRMATION.001` | ui | trellis-implement | `pages/priceLibrary/` | diff modal + publish confirm | UI |
| P4-c | P2 | 字段 tooltip + data.Md 链 | `WANd.PRICE_LIBRARY.DATA_MD.001` | ui | trellis-implement | i18n + tooltip | RUCIKA 档位说明 | UI |
| P4-d | defer | Audit 时间线 UI | — | — | — | — | 先补 MCP `GET /audit` | — |
| P4-e | defer | Import 向导 / 全表 inline | — | — | — | — | Agent+Excel 足够 | — |

### TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| P3 E2E | `WANd.PRICE_LIBRARY.CONFIRMATION.001` | N/A (manual) | admin Guid upsert→publish | `p3-e2e-pending.md` 签字 |
| P3.5 MCP schema | `WANd.PRICE_LIBRARY.DATA_MD.001` | upsert 缺 `rucika_*` in schema | `pytest python/tests/test_org_price_admin_client.py` | MCP health PASS |
| P4-a IPC | `WANd.PRICE_LIBRARY.UI.RBAC.001` | mock 403 non-admin POST | `bun test tests/unit/priceLibrary/` | catalog gate 3/3 |
| P4-b drawer | `WANd.PRICE_LIBRARY.CONFIRMATION.001` | save without preview blocked | drawer unit + admin smoke | revision 409 toast |

### Contract Verification (P4 gate chain)

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| `WANd.PRICE_LIBRARY.*` (agent) | P3 Guid smoke | `p3-e2e-pending.md` | upsert PASS; publish waived |
| `WANd.PRICE_LIBRARY.UI.RBAC.001` | yjc 无编辑；admin 有编辑 | user sign-off 2026-07-11 | **PASS** |
| `WANd.PRICE_LIBRARY.CONFIRMATION.001` | UI diff → confirm → draft；publish 二次确认 | user sign-off 2026-07-11 | **PASS** |
| `WANd.PRICE_LIBRARY.REVISION.001` | 409 后 UI 停、展示重读提示 | mock or dual-admin | unit path covered |

### P4 v1 字段范围（人工 edit）

| 优先级 | 字段 | UI 形态 |
|--------|------|---------|
| P0 | `price_a`–`price_e`, `description`, `description_cn`, `supplier` | 抽屉表单 |
| P1 | `price_d_low`, `unit`, `product_type`, `rucika_quote_price_*` | 条件展示（按 product_type） |
| P2 | `factory_*`, `local_*`, `pe_*` | 高级折叠区 |
| 不做 v1 | `source_*`, `raw_json`, `is_preferred_price` | 留 Agent / import |

### Recommended order

```
P3 E2E smoke（用户）→ P3.5 MCP schema（可选并行）→ P4-a IPC → P4-b drawer → P4-c tooltips → spec update
```

**Child task 建议:** `07-xx-price-library-row-edit-ui`（P3 PASS 后 `task.py create`）

### Evidence (planning session 2026-07-10)

| Type | Output |
|------|--------|
| `Agent: trellis-research` | [`research/agent-vs-manual-edit-coverage-2026-07-10.md`](./research/agent-vs-manual-edit-coverage-2026-07-10.md) |
| `Read:` | `price-library.md` § Agent write path · `price-library-agent.md` · `price-library-edit/SKILL.md` |
| `Skill:` | `trellis-task-execution` scenario E→A classification |

---

## Change log

| Date | Change |
|------|--------|
| 2026-07-02 | Plan created; P0B marked complete from delivery note |
| 2026-07-02 | P0D import/revert + MCP health manifest landed |
| 2026-07-02 | P1 deploy-seed + vendor sync + dev restart; active phase → P3 E2E |
| 2026-07-03 | P2-Edit 完善计划（edit 矩阵 + hooks + bulk SOP + list versions + P3 最短 smoke） |
| 2026-07-10 | P4 Manual Edit UI 规划：Agent 覆盖 ~82%；L2 row drawer v1 范围 + contract map；research 落档 |
| 2026-07-11 | P4 implement：child `07-11-price-library-row-edit-ui`；P3 publish waived；bun 15/15；code-review PASS；spec § AionUI row edit |
| 2026-07-11 | P3.5 MCP schema 对齐 + vendor sync；交接见 [`../07-11-price-library-row-edit-ui/USER-OPS.md`](../07-11-price-library-row-edit-ui/USER-OPS.md) |
| 2026-07-11 | **收口**：P4 UI smoke PASS + security sign-off（无 Critical）；见 [`../07-11-price-library-row-edit-ui/security-signoff.md`](../07-11-price-library-row-edit-ui/security-signoff.md) |
