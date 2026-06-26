# CCB-Wanding Agent 工程化成熟度评估（探索稿）

> **用途：** 对照业界 agent 工程化八层框架（任务边界、架构、工具、上下文、状态、权限、eval、观测），盘点 CCB-Wanding / AionUI 现状、缺口与优先补齐项。  
> **版本：** 2026-06-16（探索稿，非实施计划）  
> **关联：** [平台架构总览](./ccb-wanding-platform-architecture.md) · [Agent 统一模型 spec](../.trellis/spec/integration/agents-unified-model.md) · [MCP 业务 spec](../.trellis/spec/backend/mcp-business.md)

---

## 1. 一句话结论

**CCB-Wanding 在「任务边界 + 工具 + 上下文分层」上已明显领先于典型 demo 型 agent；短板集中在「可运营」三件套：run/step 状态落库、agent 级 eval、生产指标/trace 聚合。**

当前阶段可概括为：

```text
Phase 1 稳定单 Agent（工具层）  →  大体完成（专家 fast path 可用）
Phase 2 状态 + trace             →  刚起步（有 hook/会话日志，无 run 模型）
Phase 3 Eval                     →  几乎未开始（agent 级）
Phase 4 拆子 Agent               →  已提前进入（orchestrator 模式，但有约束）
```

---

## 2. 参考框架（八层 + 十二原则）

### 2.1 八层模型

```text
稳定 agent =
  明确任务边界
+ 单 agent 起步（必要时受控多 agent）
+ 高质量工具
+ 可控上下文
+ 持久状态
+ 权限/安全
+ eval/trace
+ 人工接管
```

### 2.2 十二原则（速查）

| # | 原则 | CCB 现状（摘要） |
|---|------|------------------|
| 1 | 能用函数就不用 agent | ⚠️ 核心逻辑在 Python 确定性函数，外层仍包 agent |
| 2 | 能单 agent 就不多 agent | ⚠️ 已多 agent；Guid 直连专家是 fast path 缓解 |
| 3 | 工具比 prompt 重要 | ✅ 投入最大 |
| 4 | 工具返回结构化 | ✅ |
| 5 | 写操作要审批 | ⚠️ 有 ACP 权限，但 bypass 常开 |
| 6 | agent 状态必须落库 | ❌ |
| 7 | 长任务可恢复 | ❌ |
| 8 | 知识库不塞上下文 | ✅ 按需 Read |
| 9 | 每步 trace | ⚠️ 会话级有，run/step 级无 |
| 10 | 改动要 eval | ⚠️ 工具有，agent 无 |
| 11 | 失败可解释 | ⚠️ 工具有，agent 层弱 |
| 12 | 先可靠助理再自动员工 | ✅ 设计意图对；UI 默认偏全自动 |

---

## 3. 运行时全景（与评估的关系）

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        AionUI Guid / 会话 UI                         │
│   选 agent 卡片 · 模型 · 权限模式 · 初始消息                            │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ ACP
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│              CCB-Wanding (--acp)  ·  wande-orchestrator              │
│   L0 CLAUDE.md · L1 agents/*.md · Agent() 委派 · Stop hooks          │
└───────┬─────────────────────────────┬───────────────────────────────┘
        │ Agent(subagent_type=…)       │ 直连（Guid preset）
        ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│ quotation-agent  │          │ accurate-agent   │
│ quotation + excel│          │ accurate MCP     │
└────────┬─────────┘          └────────┬─────────┘
         │ stdio MCP                   │
         ▼                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  python/main.py dispatch  →  匹配 / 填单 / Accurate 汇总（确定性）      │
└─────────────────────────────────────────────────────────────────────┘
```

**评估视角：** 上面四层里，第 1–2 层（边界、委派）和第 4 层（工具）工程化较好；第 1–2 层与 UI 之间的**会话偏好传递**（模型、权限模式）仍有漂移风险；贯穿全链的 **run 级观测与 eval** 尚未建立。

---

## 4. 逐层成熟度

### 4.1 任务边界 — ✅ 已做到

**判断：** 报价 / 库存 / Accurate / 办公文档属于「多步 + 非结构化数据 + 规则难维护」场景，适合 agent。

**已有证据：**

| 组件 | 边界 |
|------|------|
| `wande-orchestrator` | 只路由，不直接调业务 MCP |
| `quotation-agent` | 报价专家；禁止再委派；直连 `quotation` MCP |
| `accurate-agent` | 账务汇总专家；直连 `accurate` MCP |
| Guid preset 卡片 | fast path：跳过 orchestrator，减少一层不确定性 |

配置分层见 [agents-unified-model.md](../.trellis/spec/integration/agents-unified-model.md) 的 L0–L4 表。

**缺口：**

- 无结构化 `task_type` / `risk_level` 意图对象（eval 第一层那种 JSON）
- 意图仍主要靠 L1 路由表 + 自然语言，难以批量回归

---

### 4.2 架构（单 → 多 Agent）— ⚠️ 超前但受控

**框架建议：** 先单 agent + 多工具，失控后再拆。

**现状：** 已进入 Phase 4（orchestrator + 专家），但有减损设计：

```text
                    ┌─────────────────────┐
                    │ wande-orchestrator  │
                    │  同步 Agent() 委派   │
                    │  禁止 background     │
                    └──────────┬──────────┘
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
   quotation-agent      accurate-agent      office creators
           │                   │                   │
           └───────────────────┴───────────────────┘
                               │
              Guid 直连 preset ─┘（绕过 orchestrator）
```

| 做对的 | 说明 |
|--------|------|
| 子 agent 当工具调 | `Agent(subagent_type=…)`，同步等待，verbatim 转发结果 |
| MCP 最小集 | quotation 仅 `quotation` + `excel`（excel 仅后处理） |
| fast path | 高频查价/账务走 Guid 卡片直连专家 |
| 禁止专家互聊 | L1 写死「勿委派」 |

| 风险 / 缺口 | 说明 |
|-------------|------|
| 无单 agent 基线 eval | 难量化「拆不拆更稳」 |
| 委派路径已知抖动 | spec 记录：orchestrator 委派 erratic，直连 session 正常 |
| 延迟未系统度量 | 多一跳成本无 `average turns` / p95 latency 看板 |

---

### 4.3 工具系统 — ✅ ~70–80%（最强层）

业界观点：agent 稳定性约 80% 取决于工具。本项目投入与框架最对齐。

**已做到：**

| 标准 | 实现 |
|------|------|
| 名字清楚 | `match_quotation`, `fill_quotation_sheet`, `match_price_and_get_inventory` … |
| 参数 schema | MCP JSON Schema + `python/main.py` dispatch |
| 结构化返回 | `{ success, error, candidates, rows_count, … }` |
| 错误可解释 | 文件缺失、openpyxl 未装、无数据等分型返回 |
| 工具分三类 | Data（quotation/accurate）/ Action（fill/office）/ Orchestration（Agent） |
| 反幻觉 gate | `quotation-mcp.sh`：声称有报价输出但 transcript 无成功 MCP 则 warn/block |

**缺口：**

| 项 | 现状 |
|----|------|
| 统一错误码 | 多为 `success: false + error: string`，无 `NO_DATA` / `TIMEOUT` 枚举 |
| 幂等契约 | 查价只读 OK；`fill_quotation` 重复调用可能重复写文件 |
| `request_human_approval` | 不存在；高风险依赖 ACP 权限弹窗 + bypass |
| 工具 eval | 有单测与 E2E smoke，无跨 prompt 的 agent 工具选择 eval |

**验证入口（已有）：**

```powershell
# MCP 连通
cd D:\Projects\claude-code-best\ccb-installer
node test-runtime-mcp.mjs

# ACP + 真工具
$env:CCB_TEST_PROMPT = "查询直接50价格"
node test-native-acp-agent.mjs

# 填单 E2E
cd D:\Projects\claude-code-best\ccb-installer\scripts
.\smoke-wanding-e2e.ps1 -InstallDir D:\CCB-Wanding
```

---

### 4.4 上下文工程 — ✅ 设计领先

**已做到：**

| 层级 | 内容 | 保存方式 |
|------|------|----------|
| System | L0 `CLAUDE.md` + L1 `agents/*.md` | 版本化 seed + deploy |
| Task | 用户输入、会话历史 | AionUI / ACP session |
| Tool | MCP 返回 | 会话 transcript（临时） |
| Knowledge | `wanding_business_knowledge.md` 等 | **按需 Read**；MCP 只返 `knowledge_source` |
| Memory | `memory/business/*.md` | 触发式 Read/Write |
| Compaction | ACP bridge 事件 | 运行时自动 |

**关键设计（值得保留）：**

- 知识库**不**塞进 prompt；专家 L1 写清触发条件再 Read
- `selection_context.knowledge_source` 指针化，避免 inline 大段知识
- 价格口径 `customer_level` 映射表结构化写在 L1，减少 LLM 自由发挥

**缺口：**

- 工具结果无「每 N 步压缩保留关键字段」pipeline
- 任务结束无结构化 `task_summary` 落盘
- 无独立于 chat history 的 workflow state（当前步骤、重试次数）

---

### 4.5 状态与持久执行 — ❌ 明显缺口

**框架建议的状态表：**

```text
agent_runs      → run_id, task_type, status, cost_tokens, error …
agent_steps     → step_type: model/tool/approval, latency …
agent_artifacts → file_path, report_json …
```

**现状：**

| 有 | 没有 |
|----|------|
| AionUI conversation 持久化 | run 级状态机 |
| 同步委派（等子 agent 返回） | checkpoint / 中断恢复 |
| `ExecutionTracer`（inventory 旧路径，内存） | 统一 step 存储 |
| Trellis runtime audit（人工审计） | 可查询的 run 数据库 |

**实际影响：** Stop hook 卡 120s、模型 m3→thinking 漂移、fill 字段回归——都说明缺的是**可回放的状态机 + 运维数据**，而不只是再改 prompt。

---

### 4.6 权限、安全、人工接管 — ⚠️ 半成品

**已有机制：**

```text
AionUI Guid
  → permissionMode (default / acceptEdits / bypassPermissions)
  → buildAgentConversationParams → extra.acp_meta.permissionMode
  → CCB ACP permissions.ts → requestPermission() / auto-allow MCP
  → Stop hook / subagent-gate 输出校验
```

| 能力 | 状态 |
|------|------|
| 只读查价 MCP auto-allow | ✅ |
| 工具级权限弹窗 | ✅ |
| 输出须有 MCP 证据（quotation gate） | ✅ |
| 动作级 L0–L4 风险表 | ❌ 未形式化 |
| 专用 `request_human_approval` 工具 | ❌ |
| 默认「全自动」vs「先草稿再确认」 | ⚠️ 与框架 L2 意图不完全一致 |

**建议的风险分级（目标态）：**

| 等级 | 动作 | 确认 |
|------|------|------|
| L0 | 读知识库、总结 | 否 |
| L1 | 查价、库存、Accurate 只读 | 否（可 auto-allow） |
| L2 | 生成报价单/报告草稿 | 导出前确认 |
| L3 | 写库、发邮件 | 必须确认 |
| L4 | 删除、付款、提交合同 | 默认禁止 |

---

### 4.7 Eval 体系 — ⚠️ 仅工具层

**已有：**

| 类型 | 位置 |
|------|------|
| Python 单测 | `python/test_*.py`, `test_fill_enrich.py` … |
| MCP E2E smoke | `smoke_wanding_e2e.py`, `smoke-wanding-e2e.ps1` |
| ACP native smoke | `test-native-acp-agent.mjs` |
| 运行时审计 | `.trellis/tasks/.../runtime-audit-*.md` |

**缺失（框架四层 eval）：**

```text
┌────────────────┬──────────────────────────────────────────┐
│ Eval 层        │ 状态                                      │
├────────────────┼──────────────────────────────────────────┤
│ 意图识别       │ ❌ 无 agent_eval_cases                    │
│ 工具选择       │ ⚠️ 仅 quotation-mcp.sh 事后校验           │
│ 工具参数       │ ❌                                        │
│ 最终输出       │ ❌ 无 must_not / 反幻觉批量集              │
└────────────────┴──────────────────────────────────────────┘
```

**目标样例（尚未落地）：**

```json
{
  "id": "quote-direct50-b",
  "input": "查一下直接50的B级价格",
  "agent": "quotation-agent",
  "expected_tools": ["mcp__quotation__match_quotation"],
  "expected_params": { "customer_level": "B" },
  "must_not": ["fabricate_price", "delegate_agent"],
  "risk_level": "read_only"
}
```

---

### 4.8 观测与运维 — ⚠️ 开发期够用

**已有：**

- ACP bridge 事件（含 compaction）
- 前端 `useAcpInitialMessage` 等诊断日志
- subagent-gate warn
- Trellis spec 中的 symptom → layer 表（MCP 冷启动、hook stdin、权限卡住）

**缺失的生产指标：**

| 指标 | 重要性 |
|------|--------|
| task success rate | 任务是否真的完成 |
| tool success rate | MCP 稳定性 |
| wrong tool rate | 是否乱选工具 |
| hallucination rate | 无 MCP 证据却报数 |
| average turns / p95 latency | 成本与体验 |
| human escalation rate | 权限/审批频率 |

当前运维模式：**出问题 → 翻 transcript + 手动 smoke**，尚非可运营软件。

---

## 5. 与「最该补四件事」的对照

| 优先级 | 内容 | 完成度 | 说明 |
|--------|------|--------|------|
| 1 | 工具 schema 标准化 | **~75%** | 有 schema + 结构化返回；补 error code / 幂等 |
| 2 | agent run/step 状态表 | **~10%** | 仅 chat session |
| 3 | trace + 日志系统 | **~40%** | 分散日志，无统一查询 |
| 4 | 业务 eval 测试集 | **~20%** | smoke/单测有，无 50 条 agent eval |

---

## 6. 推荐补齐路径（探索结论，非承诺排期）

### 6.1 路径 A：最小可运营（投入产出比最高）

不先换框架（LangGraph / OpenAI Agents SDK），在现有 ACP 链上补三层：

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ agent_eval   │     │ runs.jsonl   │     │ 权限分级      │
│ 50 条 jsonl  │     │ 每会话一步   │     │ L2 填单确认   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┴────────────────────┘
                            │
              每次改 L1/MCP/模型 必跑 eval
              每次生产问题 可查 run 记录
```

**runs.jsonl 最小字段（建议）：**

```json
{
  "run_id": "uuid",
  "conversation_id": "...",
  "agent_id": "quotation-agent",
  "user_input": "...",
  "tools_called": ["mcp__quotation__match_quotation"],
  "model_id": "minimax-m3",
  "permission_mode": "default",
  "latency_ms": 4200,
  "status": "succeeded",
  "error": null,
  "ts": "2026-06-16T..."
}
```

**落点候选（待设计）：** ACP bridge 写 `%LOCALAPPDATA%\CCB-Wanding\logs\runs.jsonl`，或本机 aioncore SQLite 旁表——先文件后库。

### 6.2 路径 B：eval 先行

建 `eval/agent_eval_cases.jsonl`：

| 桶 | 条数 | 覆盖 |
|----|------|------|
| 报价查询 | 10 | 口径映射、多候选、无数据 |
| 库存 | 10 | 有货/无货、编码 vs 描述 |
| Accurate | 10 | 月汇总、供应商/客户 |
| 知识库 | 10 | 触发 Read vs 不触发 |
| 混合 / 路由 | 10 | orchestrator 委派 vs 直连 |

配套脚本：读 jsonl → 调 `test-native-acp-agent.mjs` 或 headless ACP → 比对 `expected_tools` / `must_not`。

### 6.3 路径 C：权限与产品默认值对齐

- Guid 默认：**查价 = default 或 acceptEdits**，而非 bypass
- `fill_quotation_sheet`、写文件、发邮件：**强制 requestPermission**
- 可选：新增 `request_human_approval(action_summary)` MCP 工具（L2/L3 统一入口）

### 6.4 不建议现在做的

| 方向 | 原因 |
|------|------|
| 整体迁移到 LangGraph | 现有 CCB+ACP+MCP 链已深；迁移成本 >> 补 eval/trace |
| 再加更多自由聊天 multi-agent | 已有 orchestrator；应先修委派路径 eval |
| 把知识库塞回 system prompt | 与现有 L0–L4 设计相反 |

---

## 7. 开放问题（继续探索用）

1. **run 日志写哪里？** CCB 进程、本机 aioncore、还是 AionUI 侧——谁最接近完整 tool transcript？
2. **eval 跑在哪？** CI 无 GUI 时，native ACP smoke 是否足够代表 Guid 用户体验？
3. **orchestrator 还要保留吗？** 若 80% 流量走 Guid preset，orchestrator 是否降级为「默认通用入口」而非主路径？
4. **中心 MCP 服务化后**，eval 与 trace 是否要上中心聚合，还是仍本机 jsonl？
5. **模型/权限漂移**（m3 → thinking、全自动 → 默认）应归入 eval 必测项，还是单独做「会话偏好契约」spec？

---

## 8. 相关文档索引

| 文档 | 内容 |
|------|------|
| [agents-unified-model.md](../.trellis/spec/integration/agents-unified-model.md) | L0–L4、委派、Stop hook、fast path |
| [mcp-business.md](../.trellis/spec/backend/mcp-business.md) | MCP 工具面、smoke 命令 |
| [chat-acp-flow.md](../.trellis/spec/frontend/chat-acp-flow.md) | AionUI 会话、模型/权限传递 |
| [ccb-wanding-platform-architecture.md](./ccb-wanding-platform-architecture.md) | 四层链、双 JWT、中心 org |
| [dev-runtime-layers.md](../.trellis/spec/integration/dev-runtime-layers.md) | 开发时 source vs dist 层 |

---

## 9. 变更记录

| 日期 | 说明 |
|------|------|
| 2026-06-16 | 初稿：基于 agent 工程化八层框架 + 代码库/Trellis spec 对照探索 |

---

*探索稿。若要将 §6 某项纳入实施，建议先开 OpenSpec change 或 Trellis task，再动代码。*
