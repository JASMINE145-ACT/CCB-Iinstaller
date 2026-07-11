# Work Routing vs Execution — Domain Contracts

**Status:** in_progress  
**Created:** 2026-07-09  
**Source:** `docs/asda` §3 + §6 (Rudder borrow list)

## Goal

把万鼎 agent 运行时里混在一起的 **「谁该干活」** 与 **「怎么跑、怎么记」** 在 Trellis 文档上显式拆开，并落成可链接的 **domain contract registry**——改 guard 时不误伤 hook/ROE，改 sync spawn 时不误改 playbook 派工规则。

**零行为变更。** 不移动代码、不改 runtime。

## Background

| 现状 | 痛点 |
|------|------|
| Routing 散落在 L1 playbook + `evaluateOrchestratorToolGuard` | 改 MCP guard 时容易连带动 ROE / Stop hook |
| Execution 在 `runAgent.ts` + env bootstrap + QueryEngine | 改 sync-wait 时被当成「路由策略」去改 orchestrator.md |
| Trellis spec + eval 已有碎片证据 | 缺统一 contract id → code/tests 硬链接（Rudder `registry.yml` 风格） |

刚验收的 `07-06-delegation-nested-view-steps` 是 **Execution 观测层**（DelegationRun UI），本 task 补 **概念域 + 合约表**，与之正交。

## In scope

1. **Spec** — `.trellis/spec/integration/work-routing-execution-contracts.md`
   - 两域定义、边界、改动归类决策树（3 问）
   - Rudder ↔ WanD 映射表（ASSIGNMENT / REVIEWER / EXECUTION / ADMISSION）
   - 与 L0–L4、hook 层、UI observability 的交叉引用
2. **Registry** — `.trellis/spec/integration/contracts/agent-runtime-registry.yml`
   - `WANd.ROUTING.*` / `WANd.RUN.*` / `WANd.OBSERVE.*` 条目
   - 每项：`code`, `tests`, `spec`, `ui`（可选）
3. **Index 入口** — `integration/index.md` + `agent-team-architecture.md` 指针
4. **Research** — `research/rudder-wand-mapping.md`（探索笔记归档）

## Non-goals

- 不实现 Rudder 级 Postgres Run kernel / heartbeat
- 不改 `evaluateOrchestratorToolGuard` / `runAgent.ts` 行为
- 不新增 CI lint 强制 contract id（列入 backlog）
- B1 CCB `_meta.delegationRun` bridge（`07-06` deferred）

## Acceptance criteria

- [ ] AC1 新 spec 含 Routing / Execution 定义 + ASCII 域图 + 改动决策树
- [ ] AC2 registry.yml ≥8 条合约，每条含 code + tests 或 spec 链接
- [ ] AC3 `agent-team-architecture.md` 新增 § Work Routing vs Execution 并链到新 spec
- [ ] AC4 `integration/index.md` 新增 when-to-read 行
- [ ] AC5 5 条 curated 改动场景试归类（guard / runAgent / roe-judge / playbook / View Steps）全部可判定
- [ ] AC6 `task.py validate` PASS

## Curated classification scenarios (AC5)

| # | 改动场景 | 期望域 |
|---|----------|--------|
| 1 | 多拦一个 orchestrator 顶层 MCP | Routing (`WANd.ROUTING.ASSIGNMENT.001`) |
| 2 | `runAgent` 子 agent profile merge 顺序 | Execution (`WANd.RUN.EXECUTION.001`) |
| 3 | `:roe-judge` Stop 阈值文案 | Routing (`WANd.ROUTING.REVIEWER.001`) |
| 4 | `wande-orchestrator.md`「报价走 quotation-agent」 | Routing (L1 playbook) |
| 5 | `MessageToolGroupSummary` 委派树分组 | Observability (`WANd.OBSERVE.DELEGATION.001`) |
