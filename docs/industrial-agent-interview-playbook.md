# 工业 Agent 面试学习手册（CCB-Wanding 实战版）

> **用途：** 用本仓库真实落地的 CCB-Wanding 案例，系统准备「AI Agent / LangChain / 制造业智能化」类岗位面试。  
> **建议学时：** Phase 1（2–3h）→ Phase 2（30min）→ Phase 3（1–2h 动手）  
> **关联文档：** [STAR 主回答](./ccb-wanding-project-star-interview.md) · [工程化成熟度](./ccb-wanding-agent-engineering-maturity.md) · [平台架构](./ccb-wanding-platform-architecture.md)  
> **Spec 入口：** [`.trellis/spec/backend/acp-session-flow.md`](../.trellis/spec/backend/acp-session-flow.md) · [`.trellis/spec/backend/mcp-business.md`](../.trellis/spec/backend/mcp-business.md)

---

## 怎么用这份手册

| Phase | 目标 | 产出 |
|-------|------|------|
| **1** | 吃透自己的案例 | 能白板画出全链路 + 讲清一条完整业务流 |
| **2** | 概念映射 | 把 MCP/ACP 翻译成面试官熟悉的 ReAct / HITL / LangGraph 语言 |
| **3** | 补岗位关键词 | 最小 LangGraph demo + 一句「生产 vs 学习」话术 |

**面试主武器是你做过的系统，不是背 API。** LangChain/LangGraph 是翻译层，CCB-Wanding 是证据层。

---

## Phase 1 — 吃透自己的案例

### 1.1 白板总图：AionUI → ACP → MCP → Python

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  Layer 1 · AionUI 桌面端（消费者）                                         │
│  Guid 卡片 · 聊天 UI · MessageAcpPermission · MessageAcpToolCall          │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ HTTP/SSE → IPC
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Layer 2 · aioncore + route-b 桥接                                       │
│  启动 CCB-Wanding CLI · 设置 CLAUDE_CONFIG_DIR · 注入 guide_mcp           │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ stdio NDJSON (ACP)
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Layer 3 · Claude Code B (--acp)  ·  Agent 运行时                        │
│  entry.ts → AcpAgent → QueryEngine 循环                                  │
│  permissions.ts · promptConversion.ts · MCP prefetch                     │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ stdio MCP
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Layer 4 · MCP Servers（工具层）                                          │
│  quotation-server · excel-mcp · accurate · …                             │
│  TypeScript/Bun 壳 → spawn Python 子进程                                  │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ JSON stdin/stdout
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Layer 5 · Python 业务引擎（确定性层）                                     │
│  match_quotation_union · wanding_fuzzy_matcher · fill_quotation_sheet    │
│  价格库 xlsx · 历史映射表 · 组织知识库                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

**四层责任（面试必背）：**

```text
UI 只消费事件，不修生产者 bug
ACP 负责会话、权限、工具循环
MCP 负责工具契约与进程隔离
Python 负责业务正确性（匹配、填表、权限校验）
```

源码锚点：

| 层 | 路径 |
|----|------|
| ACP 生产者 | `D:\claude-code-B\src\services\acp\agent.ts` |
| 权限桥接 | `D:\claude-code-B\src\services\acp\permissions.ts` |
| MCP 报价服务 | `mcp_servers/quotation-server/` |
| Python 入口 | `python/main.py` → `quotation/match_dispatch.py` |
| L1 路由 SOP | `ccb-installer/config/agents/quotation-agent.md` |

---

### 1.2 完整链路：「查直接50价格并生成报价单」

用户输入示例：`查询直接50价格` → `帮我生成报价单`

#### Step 0 — 会话建立

```text
AionUI 新建 Guid 会话（quotation-agent 卡片）
  → aioncore warmup
  → route-b 启动: bun.exe D:\CCB-Wanding\dist\cli.js --acp
  → ACP session/new
```

`createSession()` 关键动作：

1. 读取 `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json` → `mcpServers`（quotation、excel-mcp…）
2. 合并 AionUI 注入的 `guide_mcp`（**merge，不能 either/or**）
3. `prefetchAllMcpResources()` → 注册 `mcp__quotation__*` 到 QueryEngine `tools` 数组
4. 加载 `quotation-agent` profile → L1 SOP 注入上下文

#### Step 1 — 意图理解与工具选择（ReAct 隐式循环）

模型读 `quotation-agent.md` 工具决策表：

| 用户意图 | 路径 |
|----------|------|
| 仅查价 | `match_quotation(keywords="直接50")` |
| 价 + 库存 | `match_quotation` → 选型 → `get_inventory_by_code` |
| 生成报价单 | 先 match → 再 `fill_quotation_sheet`（Path C） |

**硬约束（体现「可控」）：**

- `keywords` 用用户原话，禁止擅自改写（如「直接dn50」必须原样传）
- 禁止调用不存在的工具（`match_price_and_get_inventory`、`search_inventory` 作英文直搜）
- 多候选时**先给推荐价**，禁止甩锅式「请选 1/2/3」

#### Step 2 — 工具调用：match_quotation

```text
QueryEngine 发出 tool_use
  → model 名: mcp__quotation__match_quotation
  → MCP quotation-server
  → python/main.py
  → match_quotation_union()
      ├─ mapping_table_matcher（历史报价）
      └─ wanding_fuzzy_matcher（价格库字段匹配）
  → merge + enrich + rank
  → selection_owner = "claude_code"
  → 返回 candidates + recommended
```

模型结合 `wanding_business_knowledge.md` 做最终选型（**LLM 选型 + 确定性召回** 分工）。

#### Step 3 — 权限回合（Human-in-the-loop）

写操作或敏感工具前：

```text
QueryEngine 请求执行工具
  → permissions.ts → createAcpCanUseTool
  → ACP requestPermission
  → AionUI MessageAcpPermission 卡片
  → 用户 Allow / Deny / 全自动 bypassPermissions
  → 结果回传 engine
```

读类工具（match、get_inventory）通常直接执行；`fill_quotation_sheet`、`append_business_rule` 等写操作在「确认模式」下需人工点头。

#### Step 4 — 生成报价单 fill_quotation_sheet

用户说「生成报价单」且 session 已有匹配结果 → **Path C**：

```text
fill_quotation_sheet(
  fill_items=[{code, name, spec, qty, unit_price, ...}],
  require_exact_codes=true
  # 省略 file_path — 使用内置 VANTSING 空白模板
)
  → Python resolve_direct_template_path()
  → 写 data/空白标准报价单.xlsx
  → 输出到 workspace_path
```

**禁止：** `file_path: "blank"` 或编造路径（Path guard 会拒绝）。

#### Step 5 — 结果回传 UI

```text
session/update 事件流:
  agent_message_chunk（流式文本）
  tool_call（工具名 + 参数摘要）
  tool_result（结构化 JSON 或错误码）
  → useAcpMessage → MessageAcpToolCall / MessageBubble
```

#### 时序图（面试可画）

```text
User          AionUI        ACP/Engine       MCP           Python
 │               │              │              │              │
 │─「查直接50」──▶│─prompt──────▶│              │              │
 │               │              │─match_quot──▶│─stdin JSON──▶│
 │               │              │◀─candidates──│◀─stdout──────│
 │               │◀─text+tool───│              │              │
 │◀─推荐价+表────│              │              │              │
 │─「生成报价单」▶│─prompt──────▶│              │              │
 │               │              │─permission?──▶│ (UI确认)     │
 │─Allow────────▶│─────────────▶│              │              │
 │               │              │─fill_sheet──▶│─────────────▶│
 │               │◀─文件路径────│◀─────────────│◀─────────────│
 │◀─下载/打开────│              │              │              │
```

---

### 1.3 ACP 会话生命周期（session → tool → permission → result）

摘自 `acp-session-flow.md`，压缩为面试版：

```text
Client (AionUI)
  │  session/new
  ▼
AcpAgent.createSession()
  │  MCP tools 注册到 QueryEngine
  ▼
session/update (capabilities, model, modes)
  │
  │  session/prompt (用户消息)
  ▼
promptConversion → QueryEngine.submitMessage
  │  LLM 推理 → tool_use
  ▼
permissions.ts → createAcpCanUseTool → AionUI 权限 UI
  │  allow / deny
  ▼
MCP 执行 → tool_result
  │
  ▼
session/update (assistant content, tool_call, tool_result)
  │  可能多轮 tool loop 直到 end_turn
  ▼
空闲 / 下一条用户消息
```

**关键模块：**

| 模块 | 职责 |
|------|------|
| `agent.ts` | 会话、引擎接线、ACP 方法处理 |
| `permissions.ts` | 引擎权限检查 → ACP 权限请求 |
| `promptConversion.ts` | ACP prompt（含图片）→ QueryEngine 输入 |
| `bridge.ts` | ACP ↔ engine 共享辅助 |

**权限模式：**

- `default` — 敏感操作弹窗确认
- `bypassPermissions` — UI「全自动」，引擎侧 `hasPermissionsToUseTool` 放行（生产常见，面试要诚实说 tradeoff）

**澄清机制：** CCB-Wanding **禁用** `AskUserQuestion` 权限轮；模型必须在**普通聊天文本**里澄清（`denyAskUserQuestionUseChat`）。多候选报价走 `ask_clarification` 工具返回 payload + 助手自然语言。

---

### 1.4 MCP 工具契约与路由规则

#### 核心工具（P0）

| MCP 名（会话内） | 用途 |
|------------------|------|
| `mcp__quotation__match_quotation` | 自然语言 → 候选 SKU |
| `mcp__quotation__match_quotation_batch` | 批量关键词（≤50） |
| `mcp__quotation__get_inventory_by_code` | 按编码查库存 |
| `mcp__quotation__get_inventory_by_code_batch` | 批量库存 |
| `mcp__quotation__fill_quotation_sheet` | 写入报价 Excel |
| `mcp__quotation__parse_excel_smart` | 解析用户上传询价单 |
| `mcp__quotation__ask_clarification` | 多候选消歧 payload |
| `mcp__quotation__append_business_rule` | 组织知识库追加（先预览后确认） |

#### 路由硬规则（来自 quotation-agent L1）

```text
中文产品名查库存:
  用户说「XX库存」→ match_quotation → get_inventory_by_code
  禁止直接 search_inventory（仅英文场景）

批量优先:
  ≥2 产品 → match_quotation_batch
  多个 code → get_inventory_by_code_batch

PVC 歧义:
  用户只说「pvc」→ 先澄清品类（6 类）再匹配

写知识库:
  append_business_rule(confirmed=false) → 展示 rule_text → 用户确认 → confirmed=true
```

#### fill 三路经（Path A/B/C）

| Path | 场景 | 关键参数 |
|------|------|----------|
| **C**（默认） | 会话已 match，用户要填单 | `fill_items` + `require_exact_codes=true`，**省略** `file_path` |
| **A** | 用户给了磁盘上已有询价 Excel | `file_path` only |
| **B** | 冷启动关键词列表 | `items: [{keywords, quantity}]` |

**禁止：** `file_path: "blank"` / `template` / 编造输出文件名。

---

### 1.5 失败矩阵（面试体现「可追踪」）

| 条件 | 症状 | 根因 / 修复 |
|------|------|-------------|
| settings.json 被 skip | `Tool not found` for `mcp__quotation__*` | `resolveSessionMcpConfigs` 必须 merge，不能 either/or |
| MCP 只在 mcpClients 未进 tools | 模型报 tool not available | tools 数组必须含 MCP tools |
| 占位 file_path | `FILE_NOT_FOUND` / path guard | 用 Path C，传 `fill_items` |
| 多候选未选型就 fill | 错误 SKU 入单 | 先推荐价 + 用户确认 code |
| Dev/Prod AppData 不一致 | 组织写入 401 | 统一 `org_session` token 来源 |
| 旧会话 idle 后重连 | `Session not found` | warmup force + session id 重定向 |
| AUQ 依赖 | 澄清卡死 | 已禁用 AUQ，走聊天文本澄清 |

日志锚点：`[ccb-acp-mcp] loaded N servers`、ACP `agent session profile applied: quotation-agent`。

---

### 1.6 Phase 1 自测清单

- [ ] 不看文档能画出五层架构图
- [ ] 能口述 match_quotation 内部双路召回（历史 + 价格库）
- [ ] 能解释 permission 回合何时触发
- [ ] 能说出 Path C fill 的三个参数要点
- [ ] 能举 2 个真实失败场景及定位方法

---

## Phase 2 — 概念映射（30 分钟对照表）

### 2.1 Agent 六要素 → 本项目

| 面试概念 | 定义（一句话） | CCB-Wanding 实例 |
|----------|----------------|------------------|
| **大模型** | 推理与规划核心 | Claude / MiniMax-M3 via QueryEngine |
| **Tool Calling** | 模型调用外部能力 | MCP `mcp__quotation__*` |
| **ReAct** | Reason + Act 交替 | QueryEngine tool loop；Python `execute_react` |
| **CoT** | 分步推理 | 模型思考块 + L1 SOP 分步决策表 |
| **Planner / Executor** | 拆任务 vs 执行 | Planner=模型+L1 SOP；Executor=MCP+Python |
| **Memory 短期** | 当前任务上下文 | ACP session 对话 + match 结果留在上下文 |
| **Memory 长期** | 跨会话知识 | `wanding_business_knowledge.md` + `append_business_rule` |
| **HITL** | 关键操作人工确认 | `permissions.ts` → AionUI 权限卡 |
| **失败处理** | 重试/回滚/审计 | path guard、session 重建、stderr 日志、禁止盲目重试 |
| **RAG** | 检索增强生成 | 按需 Read 业务知识库；matcher 读价格库 xlsx |

### 2.2 与 LangChain 术语对照

| LangChain / LangGraph | 本项目等价物 |
|-----------------------|--------------|
| `PromptTemplate` | `CLAUDE.md` + `quotation-agent.md` L1 |
| `LLM` | QueryEngine 调 Anthropic/MiniMax API |
| `Output Parser` | MCP tool JSON schema + Python 返回契约 |
| `Chain` | ACP prompt → engine → tool → result 单轮链 |
| `Tool` | MCP tool handler |
| `AgentExecutor` | QueryEngine + `createAcpCanUseTool` |
| `Retriever` | 价格库加载 + `wanding_business_knowledge.md` |
| `StateGraph` | 隐式：会话状态 + 工具决策表（未用 LangGraph 库） |
| `interrupt()` | ACP `requestPermission` 暂停等用户 |
| `checkpoint` | ⚠️ 弱：会话 transcript 有，run 级落库无 |

### 2.3 用 LangGraph 重述同一条报价流

若用 LangGraph 显式编排，节点可拆为：

```text
                    ┌─────────────┐
                    │   START     │
                    └──────┬──────┘
                           ▼
                    ┌─────────────┐
              ┌────│ parse_intent │────┐
              │    └─────────────┘    │
              │ 仅查价              要填单
              ▼                       ▼
       ┌─────────────┐         ┌─────────────┐
       │match_product│         │match_product│
       └──────┬──────┘         └──────┬──────┘
              ▼                       ▼
       ┌─────────────┐         ┌─────────────┐
       │candidates>1?│         │candidates>1?│
       └──┬───────┬──┘         └──┬───────┬──┘
      否  │       │ 是       否  │       │ 是
          ▼       ▼              ▼       ▼
    ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐
    │show_price│ │clarify   │ │human_   │ │clarify   │
    └────┬────┘ │+recommend│ │confirm  │ │+recommend│
         │      └────┬─────┘ └────┬────┘ └────┬─────┘
         │           │            │           │
         ▼           ▼            ▼           ▼
       ┌─────────────────────────────────────────┐
       │              END (回复用户)              │
       └─────────────────────────────────────────┘
                           │
              填单分支     ▼
                    ┌─────────────┐
                    │ fill_excel  │
                    └──────┬──────┘
                           ▼
                    ┌─────────────┐
                    │    END      │
                    └─────────────┘
```

**条件边（Conditional Edge）示例：**

- `candidates > 1` → `clarify` 节点（对应 `ask_clarification` + 聊天澄清）
- `intent == fill` && `!confirmed` → `human_confirm`（对应 ACP permission）
- `tool_error == FILE_NOT_FOUND` → `retry_match` 或 `explain_error`

**面试说法：**

> 生产上我用 MCP+ACP 做工具循环和权限中断；若用 LangGraph，我会把「匹配→澄清→确认→写入」画成显式状态图，便于测试每条边。

### 2.4 制造业岗位类比翻译

| 岗位 JD 场景 | 本项目的同构场景 |
|--------------|------------------|
| 生产排程调整 | 多 SKU 匹配 + 选型 + 填报价单（改的是 Excel 而非 MES） |
| 物料自动呼叫 | `get_inventory_by_code` 查库存（读 ERP 接口的同构） |
| 报表自动生成 | `fill_quotation_sheet` 输出 VANTSING 模板 |
| 故障代码查询 | `match_quotation` 模糊召回 + 知识库 SOP |
| 工程文档问答 | Read `wanding_business_knowledge.md` + 组织知识库 |
| 生产数据分析 | `match_quotation_batch` + 批量库存 + Excel 解析 |

**迁移一句话：**

> 架构不变——自然语言 → 结构化工具链 → 写系统前 HITL → 全链路日志；变的只是工具从 quotation MCP 换成 MES/ERP API。

---

## Phase 3 — LangChain / LangGraph 补位

### 3.1 面试话术（生产 vs 学习）

> 我生产落地的是 **Claude Code + ACP + MCP + Python** 分层架构，不是 LangChain 全家桶。但 Agent 核心模式一致：ReAct 工具循环、RAG 业务知识、写操作前人工确认。我用 LangGraph 做过同构的最小 demo 验证「显式状态机」编排，便于单测每条分支。

### 3.2 最小 LangGraph Demo 大纲

目标：复刻「读 Excel → 匹配 → 确认 → 写入」四步，与 CCB Path A/C 同构。

```python
# 概念骨架（学习用，非本仓库生产代码）
from langgraph.graph import StateGraph, END
from typing import TypedDict, Literal

class QuoteState(TypedDict):
    keywords: str
    candidates: list
    selected_code: str | None
    user_confirmed: bool
    output_path: str | None
    error: str | None

def parse_excel(state): ...
def match_product(state): ...
def need_clarify(state) -> Literal["clarify", "confirm", "done"]:
    if len(state["candidates"]) > 1: return "clarify"
    if state.get("intent") == "fill": return "confirm"
    return "done"
def human_confirm(state): ...  # interrupt_before 在此节点
def fill_sheet(state): ...

graph = StateGraph(QuoteState)
graph.add_node("parse", parse_excel)
graph.add_node("match", match_product)
graph.add_node("clarify", clarify)
graph.add_node("confirm", human_confirm)
graph.add_node("fill", fill_sheet)

graph.set_entry_point("parse")
graph.add_edge("parse", "match")
graph.add_conditional_edges("match", need_clarify, {
    "clarify": "clarify", "confirm": "confirm", "done": END
})
graph.add_edge("clarify", "match")  # 用户补充信息后重匹配
graph.add_edge("confirm", "fill")
graph.add_edge("fill", END)

app = graph.compile(interrupt_before=["confirm"])
```

**Demo 学习要点：**

| LangGraph 概念 | Demo 节点 | CCB 对应 |
|----------------|-----------|----------|
| `State` | `QuoteState` | session 上下文 + tool results |
| `Node` | parse / match / fill | MCP tools |
| `Conditional Edge` | `need_clarify` | quotation-agent 决策表 |
| `interrupt_before` | `confirm` | ACP requestPermission |
| `Retry` | clarify → match | 用户纠正后重调 match_quotation |

建议本地用假数据（3 行 CSV 或 mini xlsx）跑通，面试时展示状态图 + 一段 `stream` 输出即可。

### 3.3 LangChain 基础速记（岗位笔试/口述）

| 组件 | 作用 | 一句话例子 |
|------|------|------------|
| `PromptTemplate` | 变量化提示 | `查价 SOP：{keywords}` |
| `LLM` | 调模型 | `ChatAnthropic(...)` |
| `OutputParser` | 结构化输出 | `PydanticOutputParser` |
| `Chain` | 串联步骤 | `prompt \| llm \| parser` |
| `Tool` | 外部函数 | `@tool def match_quotation(...)` |
| `AgentExecutor` | 工具循环 | `create_tool_calling_agent` |
| `Retriever` | 向量/关键词检索 | `VectorStoreRetriever` |

### 3.4 Phase 3 自测清单

- [ ] 能手写 LangGraph 五节点状态图（不要求 API 一字不差）
- [ ] 能解释 `interrupt_before` 与 ACP permission 的对应关系
- [ ] 能对比「LangChain AgentExecutor 隐式循环」vs「LangGraph 显式图」优劣

---

## 面试金句库

### 工业 Agent 定义

> Agent 不是聊天机器人，而是 **大模型 + 工具调用 + 任务规划 + 记忆 + 结果校验 + 人工确认**。在制造业场景，更重要的是 **可控、可追踪、可回滚**。

### 结合本项目的成熟版

> 我做过 B2B 报价 Agent：用户自然语言进来，通过 MCP 调匹配和库存工具，多候选时先给推荐价再澄清，写 Excel 或组织知识库前走 ACP 权限确认。业务正确性由 Python 确定性引擎保证，模型负责意图和选型。若迁移到排产或物料呼叫，我会保持同一模式——**建议方案 → 人工确认 → 调系统接口 → 审计日志**。

### 技术选型

> 我选 MCP 是因为工具要独立进程、多语言（TS 壳 + Python 业务）、可单独 smoke。ACP 解决桌面端权限 UI 与会话协议。LangGraph 适合把复杂制造流程画成可测试的状态机，我用来验证编排思路，生产侧用协议栈更贴近 Claude Code 生态。

### 诚实短板（加分）

> 我们会话级 trace 已有，但 run/step 级状态落库和 agent eval 还在补齐——这是从「能用的助理」到「可运营的员工」的下一阶。

---

## 推荐阅读顺序

1. 本文 Phase 1.2 走一遍真实 prompt（AionUI 或 `test-native-acp-agent.mjs`）
2. [`.trellis/spec/backend/acp-session-flow.md`](../.trellis/spec/backend/acp-session-flow.md) — session 全生命周期
3. [`.trellis/spec/backend/mcp-business.md`](../.trellis/spec/backend/mcp-business.md) — 工具契约
4. [`.trellis/spec/backend/quotation-matching-engine.md`](../.trellis/spec/backend/quotation-matching-engine.md) — 领域算法
5. [STAR 主回答](./ccb-wanding-project-star-interview.md) — 3 分钟口语版
6. LangGraph 官方 tutorial — 补 `StateGraph` + `interrupt`

---

## 修订记录

| 日期 | 说明 |
|------|------|
| 2026-07-03 | 初版：Phase 1–3 学习路径 + 白板图 + LangGraph 映射 |
