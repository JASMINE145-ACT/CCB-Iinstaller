# CCB-Wanding 1.1.6 打包前待办（2026-07-04 探索记录）

> 来源：用户反馈 + `/trellis-plan-execution` 探索。**本文件仅记录，1.1.5 已出包不回头改。**  
> **Dev 测试清单（Issue 1–6）：** [`dev-test-checklist-1.1.6.md`](dev-test-checklist-1.1.6.md) — 用 `start-dev-full.ps1` 启动后逐项勾选。

---

## Issue 1 — 五个 CCB-Wanding user skills 必须进包并部署

> 截图基准（2026-07-04）：**设置 → 技能** 应显示 5 项 — `ccb-subagent-gate`、`ppt-master`、`price-library-edit`、`quotation-learn-by-data`、`wanding-deep-research`  
> 路径：`%LOCALAPPDATA%\CCB-Wanding\.claude\skills\`

### 现象（历史）

- `quotation-agent` frontmatter 已声明 `skills: [quotation-learn-by-data]`
- 用户侧 `%LOCALAPPDATA%\CCB-Wanding\.claude\skills\quotation-learn-by-data\` 时有时无
- `D:\CCB-Wanding\.claude\skills\quotation-learn-by-data\` 在 dev 安装目录常缺失
- `/learn-by-data`、按数据学习 无法触发 skill 正文

### 根因（已确认）

```
安装/升级路径
─────────────────────────────────────────────────────────────
run-wanding-bootstrap (Quick，日常启动)
  │
  ├─ apply-ship-config-reset  → 只 deploy-seed-agents + patch hooks
  │                              ❌ 不部署任何 user skills
  │
  └─ install-ppt-master
       ├─ 条件：ppt vendor 存在 AND (Full OR ppt-master 不存在)
       └─ Quick + ppt-master 已存在 → SKIP 整段
            ❌ quotation-learn-by-data 一并跳过（耦合在 ppt-master 脚本里）

仅 dev 路径 deploy-ccb-skills.ps1（start-dev-full）会部署 learn-by-data
```

| 环节 | learn-by-data 是否部署 |
|------|------------------------|
| NSIS seed（`staging/seed/skills/`） | ✅ 有 |
| `deploy-quotation-learn-by-data-skill.ps1` 在 shipScripts | ✅ 有 |
| `apply-ship-config-reset`（config_generation 升级） | ✅ 含 skills + commands（gen 4） |
| `run-wanding-bootstrap` Quick（ppt 已装） | ✅ 缺 skill/command 时仍部署 |
| `install-health` 断言 skill 文件 | ✅ 五 skill + command + orchestrator/research |

### 建议修复（1.1.6 实施）

**状态：2026-07-04 已落地脚本（待 1.1.6 exe 验证）**

| # | 动作 | 状态 |
|---|------|------|
| 1 | `apply-ship-config-reset.ps1` → `deploy-ccb-skills.ps1 -InstallDir` | ✅ |
| 2 | `run-wanding-bootstrap.ps1` → 缺任一 seed skill 或 Full/reset 时 `deploy-ccb-skills` | ✅ |
| 3 | `build-wanding.ps1` shipScripts 含 `deploy-ccb-skills.ps1` | ✅ |
| 4 | `install-health-manifest.json` seed + config 五 skill 断言 | ✅ |
| 5 | 打包后 UI「我的技能」= 5 项（见下表） | 待 exe smoke |

### 1.1.6 必须进包的 5 个 user skills（normative）

与 AionUI **设置 → 技能** 列表一致；目标路径 `%LOCALAPPDATA%\CCB-Wanding\.claude\skills\`：

| # | Skill ID | 安装包来源 |
|---|----------|------------|
| 1 | `ccb-subagent-gate` | `seed/skills/ccb-subagent-gate/` |
| 2 | `ppt-master` | `vendor/ppt-master-skill/` → `install-ppt-master` / `deploy-ppt-master-skill` |
| 3 | `price-library-edit` | `seed/skills/price-library-edit/` |
| 4 | `quotation-learn-by-data` | `seed/skills/quotation-learn-by-data/` |
| 5 | `wanding-deep-research` | `seed/skills/wanding-deep-research/` |

`build-wanding.ps1` 已 mirror 上述 seed 目录；bootstrap / config-reset 负责拷到 user config。

### 原建议（归档）

### 临时 workaround（字段/Dev）

```powershell
& .\ccb-installer\scripts\deploy-ccb-skills.ps1
# 或单独
& .\ccb-installer\scripts\deploy-quotation-learn-by-data-skill.ps1 -InstallDir D:\CCB-Wanding
```

---

## Issue 7 — 打包遗漏审计修复（slash command · config gen · research · health）

> 来源：2026-07-04 `/trellis-plan-execution` 打包审计 + 用户「执行修复」。**脚本已落地 2026-07-04；1.1.6 exe 仍待 smoke。**

### 根因摘要

| ID | 遗漏 | 影响 |
|----|------|------|
| G1 | `/learn-by-data` 仅在 `start-dev-full` 部署 | exe 用户无 slash command |
| G2 | `config_generation` 仍为 3 | 升级不刷新 orchestrator / agents |
| G5 | `install-research-toolstack` 未进 bootstrap | research sidecar / probe 链缺口 |
| G6 | install-health 未断言 command + 关键 agents | 漏部署仍 green |

### 已实施（2026-07-04）

| # | 改动 | 文件 |
|---|------|------|
| 1 | 新增 `deploy-wanding-commands.ps1`（`learn-by-data.md` → `.claude/commands/`） | `scripts/deploy-wanding-commands.ps1` |
| 2 | bootstrap：缺 command / Full / config-reset 时部署；research stack 按 sidecar `exa+tavily` 判断 | `run-wanding-bootstrap.ps1` |
| 3 | config-reset gen 4：部署 commands | `apply-ship-config-reset.ps1` |
| 4 | `config_generation` 3 → **4**（orchestrator deny + commands + research seeds） | `seed/config-ship-manifest.json` |
| 5 | install-health：seed `resources/commands/learn-by-data.md`；config 断言 command + `wande-orchestrator` + `research-agent` + sidecar | `resources/install-health-manifest.json`、`packages/.../install-health.json` |
| 6 | shipScripts 含 `deploy-wanding-commands.ps1`；`deploy-ccb-skills` 移出 devOnly 重复项 | `build-wanding.ps1` |
| 7 | 修复 bootstrap auth-reset 死代码（`exit 0` 后不可达） | `run-wanding-bootstrap.ps1` |
| 8 | `test-package-health-split` fixture 按 manifest `config_files` 造 stub | `test-package-health-split.ps1` |
| 9 | dev 路径统一调用 `deploy-wanding-commands` | `start-dev-full.ps1` |

### 验证（自动化）

```powershell
# commands 部署
.\ccb-installer\scripts\deploy-wanding-commands.ps1 -InstallDir D:\CCB-Wanding

# 平台 vs 包健康拆分
.\ccb-installer\scripts\test-package-health-split.ps1   # PASS 2/2（2026-07-04）

# code-review agent：PASS（7902a0c3）
```

### 仍待 1.1.6 exe

- [ ] 升级安装：`config_generation` 4 触发 reset → orchestrator.md 刷新
- [ ] `test-install-health.ps1 -Profile Full`（装包后，含新 config 路径）
- [ ] dev-test §1.7 `/learn-by-data` 在**仅 bootstrap**路径（非 start-dev-full 手写）通过
- [ ] CCB dist + AionUI 重打（Issue 3 overlay、Issue 5 View Steps）— **出包流程项，非本 Issue 脚本**

### 临时 workaround

```powershell
& .\ccb-installer\scripts\deploy-wanding-commands.ps1 -InstallDir D:\CCB-Wanding
# 强制 agent/skill/command 全量刷新（模拟 gen 4 reset）：
& .\ccb-installer\scripts\apply-ship-config-reset.ps1 -InstallDir D:\CCB-Wanding
# 若 user generation 已 >= 4，需手动删 .config-generation.json 或 bump gen 再跑
```

---

## Issue 2 — quotation 查价输出：选中品未进主表，候选反而成表

### 现象

- 用户期望：**每个 keyword 的选中/推荐品** → markdown **主结果表**（一行 keyword 一行推荐）
- 实际：Agent 把 **其他候选** 铺成大表，或把 tool 返回的 `candidates[]` 整表倒灌

### 根因（已确认）

**规范层冲突 + batch 数据结构诱导：**

| 来源 | 说了什么 | 问题 |
|------|----------|------|
| `quotation-agent.md` §查后多候选 | 推荐价「表格或段落均可」；其他可能 ≤4 **bullet** | 多品场景未强制「主表 N 行」 |
| `quotation-agent.md` §回复形态 | 查价应用表格 | 与 §查后 bullet 规则未区分 batch |
| `selection_payloads.py` instructions | `ONE recommended line (price table)` | 「一行 vs 一表」歧义 |
| `match_quotation_batch` 返回 | 每项含完整 `candidates[]`（最多 10 条/keyword） | LLM 易直接表格化 candidates |
| `post-match-knowledge-nudge.py` | 多候选 nudge 针对单 keyword | batch 场景无专门 nudge |

MCP 层已有正确意图（`do NOT dump the full candidates table`），但 agent 规范与 batch 输出 SOP 不够硬。

### 期望输出形态（normative）

**多品查价 / batch 后（≥2 个 keyword）：**

```markdown
| 询价关键词 | 推荐编码 | 名称 | 规格 | 印尼/英文名 | B档单价 | 供应商 |
|-----------|---------|------|------|------------|--------|--------|
| 直接50    | 8020…   | …    | dn50 | …          | 1,219  | …      |
| 三通50    | 8020…   | …    | …    | …          | 4,869  | …      |

（可选）某行若有多候选未决：
• 直接50 其他可能：8010071381 PPR dn50 ¥7,604
```

**禁止：** 把 `candidates[]` 全量列为主表；禁止仅 bullet 推荐而无主表（多品时）。

**单品多候选：** 仍按现有规则 — 1 条推荐 + ≤4 bullet「其他可能」。

### 建议修复（1.1.6 实施）

| 层 | 改动 |
|----|------|
| `quotation-agent.md` | 新增 **§多品查价主表（硬约束）**；与 §查后多候选 交叉引用 |
| `selection_payloads.py` | batch payload 增加 `batch_reply_instructions`；单选 instruction 改「one row in main table, not candidates dump」 |
| `post-match-knowledge-nudge.py` | 检测 `match_quotation_batch` → nudge「每 keyword 主表一行，candidates 不得铺表」 |
| `ccb-subagent-gate` tests | fixture：batch 回复含主表 N 行 + 无 candidates 全表 |
| （可选）`parse_transcript_roe_judge.py` | warn：主表行数 ≈ batch items 但列名像 candidate 字段 |

### 验证

- 手工：3 行询价 → 主表 3 行推荐，无 10×3 候选大表
- 回归：`test_knowledge_read_gate` + 新 batch-table fixture
- ROE judge：多品 transcript 不 block 但 warn 可记录

---

## Issue 3 — Orchestrator ↔ 专家 Agent 委派（dispatch）健康度

> 来源：2026-07-04 `/trellis:plan-execution` 纯探索（不实施）。结论：**设计合理、运行时护栏较全；生产上 Guid 直连更稳，默认 orchestrator 委派路径仍有已知抖动，缺 eval 量化。**  
> **Trellis task:** [`.trellis/tasks/07-04-orchestrator-dispatch-hardening/`](../.trellis/tasks/07-04-orchestrator-dispatch-hardening/)（`in_progress`；WS C + **主入口 price-library 泄漏** 已 fix dev deploy 2026-07-04）

### 已修复（2026-07-04）— 主 agent 入口查价误调 `price-library` MCP

| 项 | 内容 |
|----|------|
| **现象** | 用户从**主 agent / New Chat**（`wande-orchestrator`）发「查直接50价格」→ 出现 `mcp__price-library__get_price_library_active` + Read/Grep 全库，而非 `Agent(quotation-agent)` |
| **根因** | `wande-orchestrator` 侧car `mcp_allowlist: []`，但 `resolveSessionMcpConfigs` 在 profile 过滤后仍 **merge AionUI `session/new` 的 `mcpServers` 全量 overlay**；护栏原先只 deny `mcp__quotation__` / `mcp__accurate__`，**未 deny `mcp__price-library__`** |
| **修复** | CCB overlay：`filterMcpConfigsForOrchestratorSession`（`ORCHESTRATOR_FORBIDDEN_MCP_SERVER_IDS`）+ `evaluateOrchestratorToolGuard` 增加 `mcp__price-library__`；`wande-orchestrator.md` 查价 playbook 明示禁止 price-library |
| **文件** | `ccb-installer/claude-code-b-src/src/services/acp/agentSessionProfile.ts`、`agent.ts`；镜像 `ccb-installer/src/services/acp/` |
| **验证** | `bun test agentSessionProfile.test.ts` **13/13**；`deploy-claude-code-b-to-wanding.ps1` → `D:\CCB-Wanding\dist`（2026-07-04） |
| **1.1.6 打包** | 须含本次 CCB dist + `deploy-seed-agents -ForceMd`（`wande-orchestrator.md`）；用户侧需**重启 AionUI** 后复测 |
| **证据** | task [`delivery-smoke-matrix.md`](../.trellis/tasks/07-04-orchestrator-dispatch-hardening/delivery-smoke-matrix.md) #7 · [`check.jsonl`](../.trellis/tasks/07-04-orchestrator-dispatch-hardening/check.jsonl) |

**复测期望：** log `[ACP] session mcp servers:` **不含** `price-library`；查价走 `Agent(quotation-agent)` → `match_quotation`。

### 架构关系（normative）

```text
默认会话 (无 Guid 卡片)
  wande-orchestrator
    → Agent(subagent_type=quotation-agent|accurate-agent|office-*|research-agent)
    → 同步等待 → verbatim 转发子 agent 输出
    → 运行时禁止：直接 mcp__quotation__* / mcp__accurate__* / mcp__price-library__* / TaskOutput / Read 业务 SOP

Guid 专家卡片 (fast path，推荐高频路径)
  quotation-agent | accurate-agent | …
    → 直接 MCP，sessionDelegatableAgents=[]
    → userContextOverride 专家 blocker（挡 L0 orchestrator 规则误伤）
```

| 层 | 机制 | 状态 |
|----|------|------|
| L1 | `wande-orchestrator.md` playbook（查价/账务/办公/调研唯一路径） | ✅ 较完整 |
| Runtime | `evaluateOrchestratorToolGuard` + `sanitizeOrchestratorAgentInput` | ✅ 含 price-library deny + ACP overlay strip（2026-07-04） |
| Runtime | `filterMcpConfigsForOrchestratorSession`（session/new merge 后剥离业务 MCP） | ✅ 2026-07-04 |
| Runtime | `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`（禁后台 Agent） | ✅ `wanDEnvBootstrap.ts` |
| Runtime | `repeatGuardScopeKey(sessionId, agentId)` 主/子独立计数 | ✅ |
| Fast path | `isSpecialistDirectSession` → 无 Agent() 委派列表 | ✅ |
| 索引 | `buildWanDDelegationIndex` 注入 orchestrator system prompt | ✅ |

### Dispatch 是否 OK？

| 路径 |  verdict | 说明 |
|------|----------|------|
| Guid 直连 quotation/accurate | **OK（主路径）** | spec + 大量 smoke 证据；工程上刻意 bypass orchestrator |
| orchestrator → Agent(quotation/accurate) | **基本 OK，有抖动** | 多一跳；历史上 GBK/BOM、Stop hook 120s、profile idle 漂移曾导致 erratic |
| orchestrator → office/research | **可用，Office 步骤多** | word-creator 50+ MCP 步；L1 已加 call-budget |
| 默认会话误绑 orchestrator | **已知风险** | idle 重开 specialist 卡片 → profile drift → guard 误拦 MCP |

### 逻辑完善度（诚实评估）

**融洽的部分：**

- 职责清晰：orchestrator **只路由**，专家 **只执行业务 MCP**
- 双路径互补：混合意图走 orchestrator；高频查价/账务走 Guid
- 护栏分层：prompt 软约束 + `canUseTool` 硬 deny + env 禁后台

**仍不完善的部分：**

1. **无 orchestrator vs 直连的 agent eval** — 难量化「委派是否比单 agent 更稳」
2. **子 agent spawn 上下文不对称** — 直连有 `userContextOverride`；委派子 agent 仅 L1 body（曾受 GBK  corruption 影响，已有 repair 但需 seed 门禁）
3. **`filterDelegatableCustomAgents` 全局** — office `delegatable:false` 曾误伤 orchestrator 自身委派（**CCB orchestratorSession bypass 已落地 2026-07-04**）
4. **`price-library-agent` Guid-only** — 不在 `CCB_ROUTER_DELEGATABLE_AGENT_IDS`，默认会话无法路由
5. **无结构化 intent/task_type** — 路由靠 L1 表格 + LLM，难批量回归

### 1.1.6 建议动作（探索结论，非阻塞出包）

| 优先级 | 动作 | 类型 |
|--------|------|------|
| P1 | 手工 smoke 矩阵：默认会话 3 条（查价/账务/Word）+ Guid 直连对照 | 验证 |
| P1 | idle 重开 specialist 卡片 → 确认 log `[ACP] agent session profile applied: quotation-agent` | 回归 |
| P2 | 新增 eval scenario：`orchestrator-delegation-vs-direct-20260704.md` | eval |
| P2 | CCB：`filterDelegatableCustomAgents` 在 `isWandeOrchestratorSession` 时对 `CCB_ROUTER_DELEGATABLE_AGENT_IDS` bypass sidecar delegatable | 源码 ✅ 2026-07-04 |
| P3 | 文档：`docs/industrial-agent-interview-playbook.md` 补 orchestrator 双路径一节 | 文档 |

### 临时 workaround（字段）

- 高频业务：**用 Guid 专家卡片**，不要默认会话 + 委派
- 委派卡住 120s：确认 `deploy-subagent-gate-skill.ps1` 已部署（hook stdin timeout）
- 专家会话报「orchestrator 不得直接调用业务 MCP」：**新 Guid 会话**（profile drift）

---

## Issue 4 — Research 双源深度调研 (Exa + Tavily, Approach A)

> 来源：2026-07-04 `/trellis:plan-execution` 探索（推荐 A）。**实现已完成（repo + dev deploy）；1.1.6 exe 仍待批准。**  
> **Trellis task:** [`.trellis/tasks/07-04-07-05-research-dual-source-deep-framework/`](../.trellis/tasks/07-04-07-05-research-dual-source-deep-framework/)（`in_progress`；Guid smoke pending）

### 目标

| 约束 | 方案 |
|------|------|
| 主力 MCP | **Exa + Tavily**（HTTP remote，与现有 exa 同级） |
| 调研框架 | deep-research **Phase 0–5**（plan → discover → read → synthesize → deliver） |
| 单进程 | **MiniMax only** — 禁止 `Task`/`Agent` 子 agent；已有 `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` |
| 交付 | 保留 `research/*.md` + `.sources.jsonl` 证据合同 |
| 实现形态 | **Approach A：** skill `wanding-deep-research` + 精简 `research-agent.md` L1 |

**不绑定** 全局 ECC `deep-research` skill（Firecrawl + Task 并行子 agent 冲突）。

### 与 Issue 3 / 06-28 关系

- Parent：[`06-28-research-agent-toolstack`](../.trellis/tasks/06-28-research-agent-toolstack/) — Scrapling/Lightpanda 仍 **Extended**，本 Issue 只改 **Base 双源**。
- Orchestrator 委派 research-agent 路径不变（Issue 3）。

### 1.1.6 实施清单（批准后）

| # | 改动 |
|---|------|
| 1 | 新增 `.agents/skills/wanding-deep-research/SKILL.md`（Phase + Exa/Tavily 路由 + MCP 预算） |
| 2 | `research-agent.md` 瘦身 + frontmatter/sidecar 启用 skill；`mcp_allowlist: [exa, tavily]` |
| 3 | `platform.defaults.json` 注册 tavily HTTP MCP + `secret://platform/tavily/api-key` |
| 4 | `research-capability-manifest.json` Base → `[exa, tavily]` |
| 5 | `install-research-toolstack.ps1` / `probe-research-capabilities.ps1` / `mcp-health-manifest.json` |
| 6 | `research-agent-mcp.sh` 接受 `mcp__tavily__*` |
| 7 | Spec `.trellis/spec/backend/research-dual-source-deep-framework.md` |
| 8 | 手工 smoke：`delivery-smoke-dual-source.md`（深度 prompt → MD+JSONL，transcript 无 Task） |

### 降级

无 Tavily API key → probe **WARN**，exa-only 仍可完成调研（须在 spec 写明）。

### 验证（task gate）

- `probe-research-capabilities.ps1` — tavily 行
- `test-mcp-health.ps1 -Probe` — research-agent profile（有 key 时）
- Guid 资料搜索助手 — 深度调研 smoke
- code-review → test-agent → trellis-update-spec

### 探索记录

- [`research/explore-2026-07-04-dual-source-deep-framework.md`](../.trellis/tasks/07-04-07-05-research-dual-source-deep-framework/research/explore-2026-07-04-dual-source-deep-framework.md)
- [`execution-plan.md`](../.trellis/tasks/07-04-07-05-research-dual-source-deep-framework/execution-plan.md)（Status: **draft**）

---

## Issue 5 — View Steps 首次工具调用名称为空（AionUI renderer）

> 来源：2026-07-04 用户 dev 反馈（price-library 改 supplier）。**代码已在 `aionui-src` 修复 + dev 验证通过；1.1.6 exe 须重新打 AionUI 包才进生产。**  
> **Trellis task:** [`.trellis/tasks/07-04-acp-view-steps-empty-tool-title/`](../.trellis/tasks/07-04-acp-view-steps-empty-tool-title/)（`completed` 2026-07-04）

### 现象

- **View Steps · 1** 首行工具名空白，绿点已完成，agent 正文说明工具已执行
- 典型路径：价库 / org-knowledge 改物料、`tool_call_update` 不带 `title`

### 根因（已确认）

| 层 | 说明 |
|----|------|
| aioncore | `tool_call_update` 故意省略 `title`（merge 契约） |
| renderer | `normalizeAcpToolCall` 仅用 `update.title`；merge 时空串可覆盖 |
| UI | `MessageToolGroupSummary` 只渲染 `name`，无 fallback |

### 已交付（dev，`D:\Projects\aionui-src`）

| 文件 | 改动 |
|------|------|
| `normalizeToolCall.ts` | `resolveAcpToolDisplayName()` fallback 链 |
| `chatLib.ts` | `mergeAcpToolCallContent` 保留非空 title |
| `MessageToolGroupSummary.tsx` | `stepLabel` 兜底 |
| `normalizeToolCall.test.ts` | 5/5 vitest |

Spec：`.trellis/spec/frontend/chat-acp-flow.md` §3.4b

### 1.1.6 打包动作（勿漏）

| # | 检查项 |
|---|--------|
| 1 | **AionUI 构建** — `aionui-src` 含上述 commit/改动后 `bun run build` / electron-vite production |
| 2 | **NSIS / `build-wanding.ps1`** — 新 renderer 进 `D:\CCB-Wanding\AionUi`（或等价 staging） |
| 3 | **冒烟** — 任意 Guid 会话触发工具 → View Steps 首行有名称（非空白） |
| 4 | **非 CCB dist** — 本项与 `D:\CCB-Wanding\dist`（CCB）无关，纯 AionUI 前端 |

### 验证（dev 已通过）

- 用户确认：price-library supplier 场景 View Steps 正常（2026-07-04）
- 自动化：`vitest run tests/unit/common/normalizeToolCall.test.ts` → 5/5

---

## Issue 6 — Platform 解耦 P0–P5（`07-03-platform-business-decoupling`）

> **Epic task:** [`.trellis/tasks/07-03-platform-business-decoupling/`](../.trellis/tasks/07-03-platform-business-decoupling/)（`review` — 自动化 P0–P5 已完成；**人工验收未关**）  
> **人工清单（权威）：** [`manual-verification-checklist.md`](../.trellis/tasks/07-03-platform-business-decoupling/manual-verification-checklist.md)  
> **Closure 证据：** [`07-04-platform-decoupling-closure-audit/platform-decoupling-closure-done.md`](../.trellis/tasks/07-04-platform-decoupling-closure-audit/platform-decoupling-closure-done.md)（Node **16/16** · package health **2/2** · MCP **5/5**）

**与 1.1.6 关系：** 平台解耦 **代码已在 repo + dev/staging**；1.1.6 exe 须确认下列 **ship 产物** 进 NSIS；P0 凭据轮换 / P4 生产切换 / P5 业务验收 **不阻塞 dev 出包**，但阻塞 epic `completed`。

### P0–P5 打包清单（1.1.6）

| Phase | 名称 | 自动化 | 1.1.6 exe / staging 须含 | 打包前检查 | 人工（不写入 git） |
|-------|------|--------|---------------------------|------------|-------------------|
| **P0** | 安全与边界冻结 | ✅ | CI secret scanning；`platform-forbidden-coupling.md`；禁止平台层万鼎硬编码 review | `[ ]` build 无新 secret 入库 | `[ ]` 凭据轮换（[`p0-credential-rotation-runbook.md`](../.trellis/tasks/07-03-p0-security-boundary/research/p0-credential-rotation-runbook.md)） |
| **P1** | 元模型 + Registry | ✅ | `build-wanding` 内 `build-package-registry.mjs --include-packages com.wanding.trade`；staging `config/generated/package-registry.snapshot.json` | `[ ]` registry **0 errors**（允许 ownership WARN） | — |
| **P2** | 配置编译器 | ✅ | ship：`compile-runtime-config.mjs`、`apply-compiled-runtime-config.ps1`、`lib/runtime-config-compiler.mjs`、`lib/package-lifecycle.mjs`；`resources/settings/settings.example.json`（secret ref only） | `[ ]` `--fixture` / staging compile smoke | `[ ]` 真实 secret map 编译 + drift（见 manual §P2） |
| **P3** | `com.wanding.trade` 垂直包 | ✅ | staging `packages/vertical/com.wanding.trade/`；seed agents/skills；`package-lifecycle.mjs`；platform vs package **install-health 拆分** | `[ ]` Full install-health + MCP 5/5；WanD-only registry | `[ ]` 装卸/enable/disable smoke（manual §P3） |
| **P4** | 控制面 + 租户 | ✅ 代码 | 控制面脚本/库随 repo（**非**员工默认路径）；1.1.6 **不要求** OIDC 生产切换 | `[ ]` 未误把 AES/JWKS 私钥打进安装包 | `[ ]` 隔离租户 control-plane + JWKS（manual §P4） |
| **P5** | 第二垂直试点 | ✅ 自动化 | **`com.example.manufacturing-scheduling` 不默认进 1.1.6 ship**（release registry 仅 `com.wanding.trade`） | `[ ]` 确认 staging 无 manufacturing 包误打包 | `[ ]` 双包并存 pilot（manual §P5，future） |

### P0–P5 done 记录索引

| Phase | Evidence |
|-------|----------|
| P0 | [`07-03-p0-security-boundary/p0-security-boundary-done.md`](../.trellis/tasks/07-03-p0-security-boundary/p0-security-boundary-done.md) |
| P1 | [`07-03-platform-business-decoupling/p1-registry-snapshot-done.md`](../.trellis/tasks/07-03-platform-business-decoupling/p1-registry-snapshot-done.md) |
| P2 | [`07-03-p2-config-compiler-v1/p2-config-compiler-done.md`](../.trellis/tasks/07-03-p2-config-compiler-v1/p2-config-compiler-done.md) |
| P3 | [`07-03-p3-wanding-package-extract/p3-wanding-package-done.md`](../.trellis/tasks/07-03-p3-wanding-package-extract/p3-wanding-package-done.md) |
| P4 | [`07-03-p4-control-plane-tenant-governance/p4-control-plane-done.md`](../.trellis/tasks/07-03-p4-control-plane-tenant-governance/p4-control-plane-done.md) |
| P5 | [`07-03-p5-manufacturing-scheduling-pilot/p5-manufacturing-scheduling-done.md`](../.trellis/tasks/07-03-p5-manufacturing-scheduling-pilot/p5-manufacturing-scheduling-done.md) |

### 1.1.6 打包命令（Issue 6 冒烟）

```powershell
# Registry（build 已跑；可单独复验）
node ccb-installer/scripts/build-package-registry.mjs --include-packages com.wanding.trade --check

# 编译器 fixture
node ccb-installer/scripts/compile-runtime-config.mjs --fixture

# 平台 vs 包健康拆分
.\ccb-installer\scripts\test-package-health-split.ps1

# 全量安装健康 + MCP（装包后）
.\D:\CCB-Wanding\scripts\test-install-health.ps1 -Profile Full
```

---

## Issue 8 — Agent eval 回归大全（smoke / core / full）

> 来源：2026-07-06 `/trellis-plan-execution` + 用户「来吧」。**Harness + suite + 入口脚本已落地；live smoke 待打包机/API。**  
> **Trellis task:** [`.trellis/tasks/07-09-agent-eval-regression-suite/`](../.trellis/tasks/07-09-agent-eval-regression-suite/)

### 目标

每次打包或 agent/MCP/路由改动后，跑分层 ACP eval，锁住委派、工具选择、防幻觉等基础逻辑。

| Suite | Cases | 何时跑 |
|-------|-------|--------|
| **smoke** | **15** | **发版/打包一条命令**（路由 9 + 报价 6，~35-45 min） |
| **quotation-smoke** | 6 | 可选：仅重跑报价子集 |
| **core** | 27 | 发版前加深（extends smoke + 12） |
| **full** | 72 | major |

### 报价 6 流程 ↔ case（2026-07-06）

| # | 流程 | Case |
|---|------|------|
| 1 | 查询直接50 | `quote-direct50-post-hook-golden` |
| 2 | 进而查库存 | `quote-smoke-direct50-then-inventory` |
| 3 | 填写报价单 | `quote-smoke-fill-direct50-draft` |
| 4 | 三通50+库存+填单 | `quote-smoke-tee50-inventory-fill` |
| 5 | learn-by-data | `quote-smoke-learn-by-data-vantsing`（VANTSING fixture） |
| 6 | LingWei 批量 | `quote-smoke-lingwei-batch-query` |

### 已实施（2026-07-06 Phase 2）

| # | 改动 | 文件 |
|---|------|------|
| 7 | 多轮 `prompts[]` | `test-native-acp-agent.mjs` |
| 8 | `quotation-smoke` suite | `eval/suites/quotation-smoke.json` |
| 9 | LingWei golden | `data/smoke/lingwei-6.8-quotation.xlsx` |
| 10 | 5 条新 case | `agent_eval_cases.jsonl`（72 total） |

### 命令

```powershell
node eval\run-agent-eval.mjs
.\ccb-installer\scripts\run-agent-eval-suite.ps1 -Suite smoke -Run -InstallDir D:\CCB-Wanding -Json
```

### 1.1.6 exe smoke

| # | 检查 | Pass |
|---|------|------|
| E1 | schema 72/72 | [ ] |
| E2 | **smoke live 15/15** | [ ] |

---

## 1.1.6 打包检查项（汇总）

- [x] Issue 1：skill 部署链（config reset + bootstrap 解耦）— **脚本已落地 2026-07-04**
- [x] Issue 1：install-health 五 skill 断言（seed + config）
- [x] **Issue 7：slash command + config_generation 4 + research bootstrap + health 扩展** — **脚本已落地 2026-07-04**
- [x] **Bootstrap exit 1（generation 4：staging 有、NSIS 未拷 seed/config/resources）** — **修复 2026-07-05** `installer-wanding-v2.nsi` + `Test-NsisPayloadCoverage`；见 §5.3
- [x] **AionCore 0.1.28 降级 → migration 12 冲突（UI 误报安装不完整）** — **修复 2026-07-05** 重打注入 `0.1.29`（`-AioncorePath`）；见 `build-deploy-verify.md` §5.2
- [x] **Issue 8：Agent eval smoke 门禁（harness + suite + PS 入口 + CI schema）** — **脚本 done 2026-07-06**；exe live smoke pending
- [ ] Issue 8：exe live — **`smoke` 15/15**
- [ ] Issue 2：agent + MCP payload + post-nudge 三层对齐
- [ ] Issue 2：gate 测试/fixture
- [ ] Issue 3：orchestrator dispatch smoke 矩阵 + idle resume 回归（见上）
- [x] Issue 3：**主入口查价 price-library MCP 泄漏**（CCB overlay + dev deploy 2026-07-04；1.1.6 exe 待打包）
- [x] Issue 4：research Exa+Tavily 双源 + wanding-deep-research skill（repo + ship wiring；Guid smoke pending）
- [ ] **Issue 5：AionUI View Steps 工具名 fallback**（`aionui-src` 已修；**1.1.6 须重打 AionUI 包** + 冒烟 §Issue5）
- [ ] **Issue 6：Platform 解耦 P0–P5 ship 产物**（registry snapshot · compile/lifecycle scripts · `com.wanding.trade` staging · platform health split）
- [ ] Issue 6：P1 registry `--check` 0 errors · P2 compile `--fixture` · package-health-split 2/2
- [ ] Issue 6：P3 Full install-health + MCP 5/5（**不含** P5 manufacturing 默认 ship）
- [ ] Issue 6：P0 凭据轮换 / P4 生产切换 — **人工 ops**（不阻塞 exe，阻塞 epic `completed`）
- [ ] 沿用 1.1.5：`price-library-server` staging、WanD-only registry、config_generation 递增
- [ ] 修复 `build-wanding.ps1` AionUI Vite stderr / `$ErrorActionPreference Stop`（1.1.5 构建踩坑）
- [ ] 更新 `delivery-1.1.6-*.md` 功能矩阵含上述各项（含 Issue 5 AionUI View Steps）

---

## Issue 1 / 五 skill 打包冒烟（1.1.6 exe 前）

| # | 检查 | Pass |
|---|------|------|
| S1 | 安装目录 `seed/skills/*/SKILL.md` ×4 存在 | [ ] |
| S2 | `vendor/ppt-master-skill/SKILL.md` 存在 | [ ] |
| S3 | 首次启动 / bootstrap 后 **设置→技能** = 5 项 | [ ] |
| S4 | `test-install-health.ps1 -Profile Full` config skill 路径 PASS | [ ] |


| # | 步骤 | Pass |
|---|------|------|
| 5.1 | Guid 任意专家 → 触发一次工具（价库改字段 / 查价均可） | [ ] |
| 5.2 | **View Steps · N** 首行显示工具名（非空白） | [ ] |


## Trellis 任务索引

| Issue | Task dir | Status |
|-------|----------|--------|
| Issue 1–2（skill + 查价主表） | *(本 backlog 内 P1/P2，可另开 task 或并入 1.1.6 release)* | backlog |
| Issue 3（orchestrator dispatch） | [`.trellis/tasks/07-04-orchestrator-dispatch-hardening/`](../.trellis/tasks/07-04-orchestrator-dispatch-hardening/) | `in_progress` |
| Issue 4（research Exa+Tavily） | [`.trellis/tasks/07-04-07-05-research-dual-source-deep-framework/`](../.trellis/tasks/07-04-07-05-research-dual-source-deep-framework/) | `in_progress` |
| Issue 5（View Steps 工具名） | [`.trellis/tasks/07-04-acp-view-steps-empty-tool-title/`](../.trellis/tasks/07-04-acp-view-steps-empty-tool-title/) | `completed`（**待 1.1.6 AionUI 出包**） |
| Issue 6（Platform P0–P5） | [`.trellis/tasks/07-03-platform-business-decoupling/`](../.trellis/tasks/07-03-platform-business-decoupling/) | `review`（自动化 done；见上 §Issue 6 打包清单） |
| Issue 8（Agent eval smoke） | [`.trellis/tasks/07-09-agent-eval-regression-suite/`](../.trellis/tasks/07-09-agent-eval-regression-suite/) | **脚本 done 2026-07-06**；live smoke pending |

**不并行打包：** 用户明确 1.1.6 再出 exe。Issue 3/4/6 实施见各 task 的 `execution-plan.md` / 本文件 §Issue 6。
