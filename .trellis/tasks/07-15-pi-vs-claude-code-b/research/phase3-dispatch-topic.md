# Phase 3 — 定题：Agent / Subagent 派遣优化

**Status:** topic locked 2026-07-15 · **exploration done** `phase3-dispatch-exploration.md` · implementation **not started**  
**Parent task (merged):** `07-15-pi-vs-claude-code-b` — 与 Guid 单入口合并；实现跟父 `execution-plan.md` Phase D。  
**Relation to Phase 2:** Phase 2 = 安装/懒加载/测量（不碰业务执行）。**Phase 3 = 碰派遣路径**，必须单独 TDD + UI smoke。

---

## Working title

**「派遣薄化」— Faster Specialist Dispatch without breaking MCP business I/O**

中文题目建议：`agent-subagent-dispatch-thinning`  
一句话：让 `wande-orchestrator → Agent(specialist)`（以及 Guid 直达专员）更少废话、更少钩子税、更少错误委派；**不改变** `match_quotation` / Accurate 工具契约。

---

## Why (from pi contrast)

Pi 故意 **不做** 内置 subagent。WanD 的卖点恰恰是 **专员 + MCP**。Phase 3 不是“学 pi 删掉派遣”，而是：

1. 派遣链路做减法（错派、空壳、二次委派、Stop 钩子尾延迟）  
2. 已知意图时优先 **Guid / 专员直达**，少绕 orchestrator  
3. Subagent spawn 时 MCP prefetch **只带目标专员** allowlist（已有一半，继续收紧）

---

## In scope

| Track | Intent | Primary surfaces |
|-------|--------|------------------|
| **T1 Wrong / empty dispatch** | Specialist direct session 永不空壳 `Agent()`；orchestrator 路由表短而硬 | `agents-unified-model` L1、`isSpecialistDirectSession`、`sessionDelegatableAgents` |
| **T2 Orchestrator route latency** | 主会话少思考、少读无关 SOP；尽快 `Agent(description, agent=…)` | `wande-orchestrator` md、delegation index、可选 routing eval |
| **T3 Subagent return tax** | Stop / SubagentStop / gate 路径不人为 +120s；返回摘要短 | `ccb-subagent-gate`、Stop hooks、View Steps 观测 |
| **T4 Prefetch on spawn** | `Agent()` 子进程只预取该专员 MCP；不拖 Excel/word 全场 | `mcpSessionPrefetch` + spawn path |
| **T5 Observability** | 派遣失败可归因：错 profile / gate / MCP / 空壳 | logs + 可选 eval |  

---

## Out of scope (explicit)

- 换 pi runtime / 去掉 ACP  
- 改报价匹配算法或 Accurate SQL 语义  
- Phase 2 的 packaging pin（另途）  
- 并行多 specialist 乱序落地（除非单独证明顺序契约）  
- 砍权限弹窗换速度  

---

## Provisional contracts

| Contract | Behavior protected |
|----------|-------------------|
| **WANd.DISPATCH.SPECIALIST_DIRECT.001** | Guid 专员会话：无 `Agent()` 目标列表；模型直调本员 MCP |
| **WANd.DISPATCH.ORCH_ROUTE.001** | Orchestrator 默认路径：短路由 → 一次正确 `Agent(specialist)`；禁止业务 MCP 挂在主会话 |
| **WANd.DISPATCH.RETURN_TAX.001** | Subagent 完成到主会话可见结果：无已知 Stop-stdin 类多余长等 |
| **WANd.DISPATCH.SPAWN_MCP.001** | Spawn 预取 ⊆ 目标专员 allowlist |

（实现时晋升进 `.trellis/spec/integration/agents-unified-model.md` / work-routing contracts。）

---

## Success sketch (acceptance later)

1. Guid「万鼎报价专家」：0 次错误 `Agent()` 尝试；首刀进 `match_quotation`（warmed 前提）。  
2. 默认 Guid / orchestrator：「帮我报价 xxx」→ **一轮内**正确出现 `Agent → quotation-agent`（或产品规定的等价直达）。  
3. Subagent 返回：无回归 Stop-hook ~120s 假挂。  
4. 业务工具 JSON 契约回归：既有 quotation/accurate smoke **绿灯**。  

---

## Suggested new Trellis task (when approve)

| Field | Value |
|-------|--------|
| Slug | `agent-subagent-dispatch-thinning` |
| Priority | P1 |
| Scenario | **A**（功能）兼 **C** if regressing gates |
| Depends on | keep Phase 2 green borrows；warm-timeout task may run parallel |
| Spec entry | `agents-unified-model.md` · `agent-team-architecture.md` · `work-routing-execution-contracts.md` |

**Do not start coding until** `/trellis:plan-execution` on that child task + user「执行 task」。

---

## Pi inspiration map (dispatch only)

| Pi stance | Phase 3 use |
|-----------|-------------|
| No built-in subagents | Keep WanD subagents; **optimize** cost of using them |
| Minimal default tools | Spawn/profile MCP allowlist minimal |
| beforeToolCall gate | Use existing hooks as policy, not new permission UX |
| Parallel tools | **Deferred** — Yellow Y1；Phase 3 先做路由正确性与返回税 |
