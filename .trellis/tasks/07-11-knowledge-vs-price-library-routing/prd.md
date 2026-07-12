# PRD — 知识库 vs 价格库路由消歧

> **Task:** `07-11-knowledge-vs-price-library-routing`  
> **Status:** planning  
> **Priority:** P1  
> **Date:** 2026-07-11

## One-line

**「知识库」= 业务知识库 → `append_business_rule`；「价格库」→ `price-library-agent`；仅混信号时澄清一句。**

## Problem

用户说「测试一下知识库更新，随便加一条 test」时，会话误走：

```text
Skill: price-library-edit → quotation-agent → upsert_price_library_item
```

正确应为组织业务知识追加：

```text
quotation-agent → append_business_rule (confirmed=false → 预览 → confirmed=true)
```

根因分层：

| # | 层 | 缺口 |
|---|-----|------|
| 1 | 词义 | 「知识库」≠「价格库/价库」；模型常混用 |
| 2 | `quotation-agent` 工具决策表 | 无「更新/追加知识库 → `append_business_rule`」行 |
| 3 | `wande-orchestrator` 路由表 | 无知识库追加 / 价格库维护分流；歧义无澄清话术 |
| 4 | Skill | `price-library-edit` 被「知识库」误触发 |

## Product vocabulary (locked 2026-07-11)

| 用户/产品说法 | 正式含义 | 系统路径 |
|---------------|----------|----------|
| **知识库** / **业务知识库** | 组织业务规则（选型、口径、`wanding_business_knowledge`） | `quotation-agent` → `append_business_rule`；全文改 → `#/org-knowledge` |
| **价格库** / **价库** | 组织物料单价库（SKU / draft / publish） | `price-library-agent` → `price-library-edit` / upsert |

**命名铁律：** 不要用「知识库」指价格库；不要用「价格库」指业务规则。L1 / skill / 澄清话术统一用上表两词。

## Product rules (locked 2026-07-11)

| 用户说法 | 行为 |
|----------|------|
| **知识库** / **业务知识库** / 业务规则 / 追加规则 / `#/org-knowledge` | → `quotation-agent` → `append_business_rule`（默认：**知识库 = 业务知识库**） |
| **价格库** / **价库** / 改价 / 加 SKU 进价库 / `price_admin` 维护 | → `price-library-agent`（Guid 或委派）→ `price-library-edit` / upsert |
| **混信号**（例如「知识库」却带物料编码/单价/SKU，或「价格库」却像写选型规则） | **必须先澄清一句**，再委派；禁止直接 upsert 或 append |

澄清句最小模板（仅混信号时；用正式词）：

> 你是要改 **业务知识库**（选型/口径规则），还是 **价格库**（物料单价）？

## In scope

| WS | Deliverable |
|----|-------------|
| **A** | `wande-orchestrator.md` 路由表 + 意图分流：知识库消歧 / 业务知识→quotation / 价库→price-library-agent |
| **B** | `quotation-agent.md` 工具决策表增加 `append_business_rule` 行；禁止把「知识库更新」当价库 upsert |
| **C** | `price-library-edit` / `price-library-agent` description：触发词限定「价格库/价库」，排除裸「知识库」 |
| **D** | Spec：`agents-unified-model.md` 或 `work-routing-execution-contracts.md` + registry 合同 `WANd.ROUTING.KB_DISAMBIG.001` |
| **E** | 手工 smoke 矩阵 ≥3 条（歧义澄清 / 业务知识 append / 价库 upsert） |

## Out of scope

- 改 MCP 工具实现（`append_business_rule` / upsert 行为本身已存在）
- Org Knowledge UI「更新人」显示（task `07-11-org-knowledge-history-updater-display`）
- 给 orchestrator 挂业务 MCP
- 自动新建测试 SKU 进价库作为默认「知识库」行为
- **WeCom 截图 + `Value 'yolo' is not selectable for config option 'mode'`** — 见 [`research/wecom-yolo-mode-not-selectable-2026-07-12.md`](./research/wecom-yolo-mode-not-selectable-2026-07-12.md)；归属 `07-01` mode alias / `07-05` WeCom 入站，**不**扩本 task AC

## Related follow-up (parked explore 2026-07-12)

| Finding | Recommended home |
|---------|------------------|
| Claude 会话 setMode(`yolo`) → AIONUI_INTERNAL_ERROR | `07-01-aionui-full-auto-permission-sync`：`yolo` → `bypassPermissions` |
| Agent 声称不能读图（企微截图） | 查会话 agent_id + WeCom 是否注入 image part（`07-05`） |

## Acceptance criteria

- [x] **AC1** 「知识库更新 / 业务知识库」且无混信号 → 走业务知识库路径（`quotation-agent` / `append_business_rule` 链）；**禁止** `upsert_price_library_item` / `price-library-edit` — **PASS 2026-07-12**：默认会话委派报价专家；无规则原文时 `ask_clarification`（非价库）
- [ ] **AC2** 「价格库 / 价库」→ `price-library-agent` → upsert/publish；**禁止** `append_business_rule`
- [ ] **AC3** 混信号（知识库+物料编码/单价，或价格库+选型规则）→ **先澄清一句**（业务知识库 vs 价格库），再委派
- [x] **AC4** `quotation-agent` 工具决策表有显式 `append_business_rule` / 业务知识库行；价库 upsert 不出现在「知识库」路径
- [x] **AC5** Spec + `agent-runtime-registry.yml` 登记消歧合同；L1 用词统一「业务知识库」「价格库」；deploy seed 后新会话生效
- [x] **AC6** Smoke 矩阵：#1 知识库→quotation **PASS**（user）；#2/#3 可选补测

## Canonical files

| File | Role |
|------|------|
| `ccb-installer/packages/vertical/com.wanding.trade/agents/wande-orchestrator.md` | 主入口消歧 + 路由 |
| `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md` | 工具决策表 + append SOP |
| `ccb-installer/packages/vertical/com.wanding.trade/agents/price-library-agent.md` | 价库专家入口 |
| `ccb-installer/packages/vertical/com.wanding.trade/skills/price-library-edit/SKILL.md` | Skill 触发词收紧 |
| `.trellis/spec/integration/org-knowledge.md` | append 合同 |
| `.trellis/spec/integration/work-routing-execution-contracts.md` | 路由合同 |
| `.trellis/spec/integration/contracts/agent-runtime-registry.yml` | 新 contract ID |

## Related tasks

| Task | Relationship |
|------|----------------|
| `06-28-org-knowledge-agent-write-path` | 写路径已存在；本 task 修可发现性与路由 |
| `07-01-price-library-admin-agent` | 价库 SOP 已存在；本 task 修消歧与委派目标 |
| `07-04-orchestrator-dispatch-hardening` | 委派基建；本 task 补意图行 |
| `07-11-orchestrator-employee-primary-entry` | 主入口身份；本 task 补业务消歧 playbook |
| `07-11-org-knowledge-history-updater-display` | 无关（UI 更新人显示） |

## Explore evidence (2026-07-11)

用户实测：`Skill price-library-edit` + `get_price_library_draft` + `upsert` 误响应「知识库更新」。探索会话裁定三条产品规则（见上 locked）。
