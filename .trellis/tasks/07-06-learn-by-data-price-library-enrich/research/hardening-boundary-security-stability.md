# learn-by-data Section C — 边界 / 安全 / 稳定性加固清单

**Context:** Phase 2 已落地；**Phase 2.1 P0 已实现**（2026-07-06）：H-01/H-02/H-03/H-04。

**Skills invoked (planning session):**

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-before-dev | Read: | `integration/price-library.md`, `integration/agents-unified-model.md` § learn-by-data Phase 2 |
| org_price_admin_preview | Read: | upsert keyed by `material_code`; `creates_new` when active missing |
| data.Md | Read: | 推荐唯一键 `source_file + source_sheet + source_row`；`material` 非全局唯一 |

---

## 1. 边界性（Boundary）

### 1.1 已存在的边界

| 边界 | 现状 |
|------|------|
| 写路径 | org API `price_admin` + CSRF；非 admin 403 |
| 确认链 | `confirmed=false` 预览 → 用户确认 → `confirmed=true` |
| Agent 分工 | Section C 在 **quotation-learn-by-data** skill；非 price-library-agent 主 SOP |
| 发布 | SKILL 禁止 learn-by-data 调 `publish_price_library_draft`（除非用户明确要求） |

### 1.2 新引入的边界风险

| 风险 | 原因 | 建议措施 |
|------|------|----------|
| **报价 agent 持写 MCP** | `quotation-agent` 增加 `price-library` | SKILL **白名单工具**：仅 `get_price_library_active` / `get_price_library_draft` / `upsert_price_library_item`；**禁止** import/publish/revert/delete |
| **跨能力耦合** | `business.pricing.quote` agent 写 `manage` 数据 | 文档 + eval `forbidden_tools`；长期可选：quotation MCP **proxy 只读+单条 upsert** |
| **metadata-only 行** | 无 `price_b` 等 | Section C 表头注明「待补价」；publish 前人工或 price-library-agent 补档 |
| **Orchestrator 误委派** | 路由可能进 quotation | learn-by-data 仅 quotation-agent skill 表触发；orchestrator 不绑 skill |

### 1.3 推荐 P0 边界（SKILL + eval）

1. **工具面硬约束（skill 文案 + agent-eval）**
   - Allowed: `mcp__price-library__upsert_price_library_item`, `get_price_library_*`
   - Forbidden: `publish_*`, `apply_price_library_import`, `delete_*`, `revert_*`
2. **作用域**：Section C **仅** `not-in-candidates` 且 `top_code` 不在 PL 的行；0 候选不做 C。
3. **不替代 bulk import**：≥5 行补全 → 提示走 `export` / `price-library-edit` / prepare 脚本。

---

## 2. 安全性（Security）

### 2.1 已有控制（保持）

- JWT + `PRICE_ADMIN_USERNAMES` on VPS
- Double-submit CSRF on POST
- 两阶段 `confirmed`（MCP 层）
- AionUI Guid 卡 `requires_price_admin` 与 draft GET 探针

### 2.2 建议加固

| 措施 | 层级 | 说明 |
|------|------|------|
| **预览必显 diff** | SKILL | `confirmed=false` 后同轮展示 `field_changes`；update 与 create 区分文案 |
| **来源审计字段必填** | SKILL + 可选 Python 校验 | `source_file/sheet/row` 三者缺一 → 拒绝 upsert preview |
| **路径消毒** | SKILL | `source_file` 仅 basename，禁止 `..`、UNC 注入 |
| **Stop hook（可选）** | ccb-subagent-gate | quotation 会话若 `upsert confirmed=true` 但未 publish → warn（复用 price-library unpublished 模式） |
| **Eval 负向** | agent-eval | learn-by-data case：`forbidden_tools: publish_price_library_draft` |

### 2.3 非目标（避免过度）

- 不在 quotation-server 复制 write API（扩大攻击面）
- 不让非 price_admin 写 draft「方便测试」

---

## 3. 稳定性（Stability）

### 3.1 重复导入 — 多层防护（用户关注点）

`data.Md`：**业务唯一键推荐** `source_file + source_sheet + source_row`；**查询索引**仍含 `material`。

当前 upsert **主键是 `material_code`**：`build_proposed_change` 若 active 已有该码 → **update**，不是拒绝。

| 层级 | 场景 | 建议行为 | 优先级 |
|------|------|----------|--------|
| **L1 会话内去重** | 同一次 `/learn-by-data` 对同一 `top_code` 重复 Section C | SKILL：维护本 turn 已处理集合；第二次 **跳过** 并说明 | P0 |
| **L2 料号已存在** | `get_product_price_tiers(top)` 在 batch 后、upsert 前再次为 hit（竞态） | 重新 tier 查询；若已存在 → **跳过 upsert**（拒绝重复导入 by material） | P0 |
| **L3 来源行重复** | active/draft 已有相同 `source_file+sheet+row` | **拒绝**并提示「重复来源行」；不 silent update | **P0（用户诉求）** |
| **L4 draft 待审重复** | draft 已有同 `material_code` 的 pending create | 预览显示 `creates_new=false` 或合并为 update；SKILL 要求用户确认是否覆盖 | P1 |
| **L5 发布后重复** | 同 Excel 第二次 learn-by-data | L2+L3 拦截；仅允许显式 update 确认 | P1 |
| **L6 Org API（长期）** | 中心库强制来源三元组唯一 | AionCore migration + 409 `DUPLICATE_SOURCE_ROW` | P2 |

**L3 实现路径（推荐）：**

- **Phase A（快）**：SKILL 指令 — upsert 前 `get_price_library_active`（或 draft effective scan）查 `source_file/sheet/row` 三元组；命中 → 不进 `confirmed=false`。
- **Phase B（稳）**：Python `org_price_admin_preview.find_by_source_provenance(file, sheet, row)` + upsert 前校验；单元测试。
- **Phase C（硬）**：AionCore draft apply 拒绝重复来源行。

### 3.2 其它稳定性

| 风险 | 措施 |
|------|------|
| **Draft revision 409** | SKILL：409 → `get_price_library_draft` 重读 revision，**不**自动重放；告知用户 |
| **串行 upsert** | Section C 多行：一行一确认链；禁止并行 `confirmed=true` |
| **无价位空行** | publish 后 matcher 行为：`is_preferred_price=true` 但无 `price_b` → 文档说明 fallback 链；可选 SKILL 警告「发布前补价」 |
| **错误 top_code** | Section C 仅 `candidates[0]`；SKILL 要求表内展示 top 与 actual 对照，避免误入库 |
| **长会话 OOM** | 保持 batch≤10、逐批出表（已有 ROE） |

---

## 4. 建议任务拆分（Phase 2.1 hardening）

| ID | 工作项 | 层级 | 验证 |
|----|--------|------|------|
| H-01 | SKILL：L1/L2/L3 拒绝重复 + 工具白名单 | SKILL + eval | agent-eval forbidden + manual |
| H-02 | `find_by_source_provenance()` + upsert guard | Python + pytest | RED/GREEN |
| H-03 | Section C 表「待补价」+ publish 提醒 | SKILL | manual |
| H-04 | quotation learn-by-data eval 扩展 Section C preview | eval | smoke |
| H-05 | spec：`price-library.md` § learn-by-data provenance dedup | docs | trellis-check |

**Plan depth:** Standard · **Scenario A** · **Profile:** Standard gate

**不纳入本阶段：** L6 AionCore 硬唯一、quotation-agent 移除 price-library MCP（除非边界评审否决当前方案）。

---

## 5. 决策点（需产品/你确认）

1. **L3 命中时**：纯拒绝 vs 允许「覆盖更新」二次确认？
2. **同 material 不同来源行**：是否允许（PE PIPA 历史）？→ 若允许，L3 只拦来源三元组重复，不拦 material update。
3. **无价位 preferred 行**：是否允许 publish，还是 draft 仅保留至补价？
