# Phase 3 — Dispatch 四方面真实探查（2026-07-15）

**Method:** 代码 + spec + eval smoke + 07-04 矩阵；只读，未跑 live eval。  
**Parent:** `phase3-dispatch-topic.md`

---

## 总览

| # | 你的问题 | 结论 | 一句话 |
|---|----------|------|--------|
| 1 | dispatch 存在且 smoke OK？ | **存在 · smoke 部分** | 代码栈完整；`smoke.json` 有 4 条委派用例；07-04 CLI 仍有 FAIL |
| 2 | agent 独立进程返回主 agent？ | **存在 · 非 OS 独立进程** | 同进程 **sync sidechain**；结果 yield 回 orchestrator；jsonl 旁路落盘 |
| 3 | 主 agent 能翻阅 subagent 执行记录？ | **存在 · 人机分层** | 模型看 Agent 返回；人看 View Steps B0；jsonl 给 hook/eval，非模型 Read API |
| 4 | 主 agent 拆解串行/并行/派遣？ | **派遣+串行有 · 并行无** | 同步 `Agent()` + L1 拆解规则；**禁止** background/并行写 Agent |

---

## 1. Dispatch 功能存在且 smoke OK

### 存在证据

| 层 | 路径 | 作用 |
|----|------|------|
| Agent 工具 | `ccb-installer/claude-code-b-src/packages/builtin-tools/src/tools/AgentTool/runAgent.ts` | `runAgent()` 同步子链、yield 回父会话 |
| ACP 接线 | `.../src/services/acp/agent.ts` | `createSession`、delegatable agents、orchestrator guard |
| 路由守卫 | `.../src/services/acp/agentSessionProfile.ts` | `sanitizeOrchestratorAgentInput`、`evaluateOrchestratorToolGuard` |
| 禁后台 | `.../src/services/acp/wanDEnvBootstrap.ts` | `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` |
| L1 剧本 | `ccb-installer/packages/vertical/com.wanding.trade/agents/wande-orchestrator.md` | 路由表、Handoff Brief、禁止 `run_in_background` |
| 架构 | `.trellis/spec/integration/agent-team-architecture.md` | Path A/B、委派时序 |
| 单测 | `.../__tests__/agentSessionProfile.test.ts`、`handoffBrief.test.ts` | guard / Brief 回归 |

### Smoke 证据

```powershell
# 发布门禁（含 4 条 orchestrator 委派）
.\ccb-installer\scripts\run-agent-eval-suite.ps1 -Suite smoke -Run -InstallDir D:\CCB-Wanding -Json

# 单条委派
node eval/run-agent-eval.mjs --run --case orchestrator-quote-delegates

# MCP profile（orchestrator 不得挂业务 MCP）
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
```

`eval/suites/smoke.json` 含：`orchestrator-quote-delegates`、`orchestrator-accurate-delegates`、`orchestrator-research-delegates`、`orchestrator-no-price-library-mcp`。

### 缺口（smoke 未全绿）

- **07-04 矩阵**（`.trellis/tasks/07-04-orchestrator-dispatch-hardening/delivery-smoke-matrix.md`）：
  - Case 1 默认 orchestrator → **FAIL（120s 超时，无 Agent 完成）**
  - Case 3 Guid 报价专家 → **FAIL（L0 bleed，误委派/AskUser）**
  - 多条仍 **manual pending**
- `orchestrator-decomp-*` 在 `agent_eval_cases.jsonl`，**不在 smoke/core**，仅 full suite
- Phase 3 thinning **尚未开码**

**Phase 3 含义：** 优化前先 **绿 smoke + 07-04 矩阵**；T1 错派/空壳、T2 路由延迟是实病。

---

## 2. Subagent「独立进程」→ 返回主 agent

### 真实模型（重要纠正）

**不是**第二个 OS 进程 / 第二个 `cli.js --acp`。是 **同一 ACP/Node 进程内的 sync sidechain**：

```text
orchestrator turn
  → Agent() tool
  → runAgent: new agentId + query() 子循环
  → recordSidechainTranscript → {session}/subagents/agent-{agentId}.jsonl
  → yield messages → orchestrator 同轮收到（verbatim forward）
```

| 机制 | 证据 |
|------|------|
| 同步子链 | `runAgent.ts` — `isAsync=false`，`shareSetAppState: !isAsync` |
| 旁路 transcript | `agent-team-architecture.md` — `subagents/agent-{agentId}.jsonl` |
| 子链可用业务 MCP | `agentSessionProfile.ts` — `context.agentId` 时 bypass orchestrator guard |
| 返回税 | `ccb-subagent-gate/scripts/subagent-gate.sh` — SubagentStop + ROE；stdin `timeout 8 cat`（修过 ~120s 假挂） |
| 禁后台 | `run_in_background` strip、`TaskOutput` block |

### 缺口

- 文档说「独立进程」易误解 — 实际是 **逻辑隔离（agentId + jsonl）**，非 fork
- 07-04 CLI case 1 超时说明 **端到端返回** 在部分模型/路径仍不稳
- MCP prefetch「子进程」在 T4 指 **spawn 时 MCP 连接范围**，不是 OS process

**Phase 3 含义：** 优化 **T3 返回税**（Stop/gate 延迟）和 **T4 spawn MCP 范围**；不必先做真多进程。

---

## 3. 主 agent 翻阅 subagent 执行记录

### 三层「谁在看什么」

| 观察者 | 能看到什么 | 证据 |
|--------|------------|------|
| **Orchestrator 模型** | `Agent()` 工具返回的正文 + 子链 tool 结果（同轮注入上下文） | `runAgent.ts` yield |
| **操作员 UI** | View Steps **B0**：`委派 → {label}` 嵌套子工具行 | `chat-acp-flow.md` §3.4c；task `07-06-delegation-nested-view-steps` **PASS** |
| **Hook / eval / 运维** | `subagents/agent-*.jsonl`；`subagent-gate.sh` 读 `agent_transcript_path` | `subagent-gate.sh`；eval `parentToolUseId` |

### 不存在的能力

- Orchestrator **没有**默认 `Read` 工具去打开 `subagents/*.jsonl`（那是 hook/人工排障）
- **B1** `_meta.delegationRun` CCB→UI 桥 **deferred**；UI 靠 `parentToolUseId` + 顺序 fallback
- aionui-src 实现不在本 repo；证据来自 spec + task status

**Phase 3 含义：** **T5 可观测性** — 推进 B1 meta、结构化委派摘要；让「翻阅记录」对人可靠、对模型够用，不靠 jsonl 考古。

---

## 4. 拆解：串行 / 并行 / 派遣

### 今天实际支持

| 模式 | 状态 | 证据 |
|------|------|------|
| **派遣** `Agent(specialist)` | ✅ 主路径 | sync Agent；playbook「第一步就是 Agent」 |
| **串行多步** | ✅ L1 + eval | `ASSIGNMENT.004`：多意图 → 可见计划 + **硬确认** → 逐步 Agent；写副作用必须串行 |
| **Handoff Brief** | ✅ 代码+L1 | `handoffBrief.ts` + orchestrator sanitize |
| **拆解 UI** | ✅ aionui | `decompositionPlan.ts`（`07-14-orchestrator-handoff-brief-decomp-plan` done） |

### 今天不支持 / 明确禁止

| 模式 | 状态 | 证据 |
|------|------|------|
| **并行多个 Agent** | ❌ | `wande-orchestrator.md`：「不要并行多个写 Agent」；`run_in_background` 剥离 |
| **并行只读专员** | ❌ 未实现 |  playbook：多查询仍「一次委派」 |
| **运行时并行调度器** | ❌ | 拆解靠 **prompt 纪律**，非执行引擎 |

Eval：`orchestrator-decomp-single-still-one-agent`、`orchestrator-decomp-multi-intent-plan-gate` 在 full，**未进 smoke**。

**Phase 3 含义：** 优化 **派遣正确性 + 串行拆解可观测**；**并行 dispatch 明确 out of scope**（phase3-dispatch-topic Yellow Y1）。

---

## 对你四个问题的直接回答

1. **Dispatch 有，smoke 部分 OK** — 基础设施在；要用 `run-agent-eval-suite -Suite smoke` + 补绿 07-04 才算「真 smoke OK」。
2. **有返回，但不是独立 OS 进程** — sidechain + jsonl + yield；主 agent 同轮拿到结果。
3. **主 agent 能「看」子执行** — 模型看工具返回；人看 View Steps；完整逐步记录在 jsonl（hook/运维），不是主 agent 默认 Read 文件。
4. **派遣 + 串行拆解有；并行派遣没有** — 产品故意禁并行写 Agent；多步靠计划+确认+逐步 Agent。

---

## Phase 3 优化顺序（基于探查）

1. 证明层：smoke 委派 4 条 + 07-04 矩阵补测  
2. T1 错派/空壳（Case 3 类）  
3. T3 返回税（subagent-gate 部署一致）  
4. T4 spawn MCP 只带目标专员  
5. T5 + B1：委派可观测、decomp 进 core/smoke  
6. **不做**并行 Agent 引擎（除非你另开产品决策）
