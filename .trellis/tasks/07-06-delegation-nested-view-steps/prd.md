# View Steps 委派嵌套展示（orchestrator → subagent 工具树）

## Goal

当默认会话 `wande-orchestrator` 成功 `Agent(quotation-agent|accurate-agent|…)` 时，AionUI **一眼可见**「主 agent 委派 → 子 agent 工具链 → 转发结果」，不再把子 agent 的 Read/MCP 误读成 orchestrator 顶层直连。

**Approach:** Plan **A 轻量化 + B0 前端 Run 归约器** — 不改 CCB/aioncore 协议，在 aionui-src 用现有 ACP 事件推导 `DelegationRun`，多 surface 共用。

North-star UX（Path A 查价 — **完成后**）：

```text
[wande-orchestrator]
  └─ 委派 → 万鼎报价专家 · done · 2 tools
       ├─ Read 业务知识库
       └─ match_quotation
  └─ 转发报价结果
```

North-star UX（**委派进行中** — B0 增强）：

```text
┌─ 委派中 ────────────────────────────────────────┐
│ 委派 → 万鼎报价专家 · running · 1/2 tools        │
│   ✓ Read 业务知识库                              │
│   ◌ match_quotation …                           │
└──────────────────────────────────────────────────┘
```

## Background

| 事实 | 证据 |
|------|------|
| 运行时委派 **已在工作** | 用户 smoke 2026-07-06：`Agent(subagent_type: quotation-agent)` + 子层 `tool_uses: 2` |
| View Steps **平铺** 子工具 | Spec § UI observability（`agent-team-architecture.md` 2026-07-06） |
| `parentToolUseId` **已有** | `normalizeToolCall.ts` + `groupNormalizedToolCalls.ts`（audit `06-18-quotation-runtime-stability-audit`） |
| 参考实现 | Rudder `RunTranscriptView` + spawn 语义化；B0 契约见 [`research/delegation-run-b0-contract.md`](./research/delegation-run-b0-contract.md) |

**Out of scope for this task:** orchestrator 不委派 / eval FAIL（`07-04-orchestrator-dispatch-hardening`）；hook parity（`07-07`）；**B1 CCB bridge `_meta.delegationRun` enrich**（单独 follow-up，见 PRD §Deferred）。

## In scope

### P0 — `DelegationRun` B0 归约器（必须，先于 UI）

1. 新增 `delegationRun.ts`：`buildDelegationRuns(normalizedTools)` → `DelegationRun[]`（契约见 research）。
2. **复用** `groupNormalizedToolCalls` — 不第二套分组逻辑。
3. 字段：`parentToolUseId`, `subagentType`, `displayLabel`, `children`, `childToolCount`, `status` (`running|done|blocked`).
4. `childAgentId`：Agent tool **output** 解析 `agentId`（完成时有；进行中可空）。
5. 单元测试：fixture 3 行（Agent + Read + MCP）→ 1 run、`status` 随 tool 状态变化、无 Agent 时不造 run。

### P0 — View Steps 嵌套（必须）

6. `MessageToolGroupSummary` 消费 `DelegationRun` 渲染树（非直接 flat map）。
7. 父组标题：`委派 → {displayLabel}` + 可选 `{status} · {n} tools`。
8. 子行语义化摘要：Read 知识库 / 查价 MCP — operator language（Rudder §3.4.1）。
9. **Guid 直连**：无 Agent 父行 → `buildDelegationRuns` 返回空或 specialist-only 路径，**不**引入假委派框。
10. 组件 + grouper 回归测试（扩展 06-18 的 6/6 基线）。

### P1 — 委派进行中轻量条（应做）

11. Agent 或子 tool 任一 `running` 时，在 turn 内显示 **compact delegation chip**（可折叠，不抢主回复）。
12. 显示 `running · k/n tools`（k = 已完成子步数，n = 已知子步总数或 `tool_uses` when done）。
13. Chip 与 View Steps **同一 `DelegationRun` 实例**（禁止双 reducer）。

### P1 — SubagentDrawer 嵌套时间线（应做）

14. Drawer 复用 `buildDelegationRuns` + 同一 nested renderer。
15. 「查看执行」与 View Steps 列表一致；可展示 `childAgentId`（完成时）供 debug。

### P2 — 文档与 smoke（必须）

16. 更新 `chat-acp-flow.md` §3.4c：`DelegationRun` B0 + nested View Steps shipped。
17. Manual smoke 矩阵（默认 orchestrator + Guid + accurate 各 1 条；含 **进行中** 一眼可辨）。

### P2 — Spawn observability contract B0.1（同 task 扩展，2026-07-07）

18. 新增 `delegationSpawnContext.ts`：stable/dynamic/ephemeral 三层 **UI 可观测** 契约（不改 `runAgent.ts`）。
19. `assessTurnDelegationSpawn` + Path A smoke fixture；Guid-direct / orphan-mismatch 检测。
20. 6 单元测试；**不接入** renderer 启动路径（dev 零影响）。

## Out of scope (initial)

- AionUI DB / 持久化 Run 表
- CCB `runAgent.ts` / orchestrator guard / hooks 变更
- **B1:** ACP bridge 主动 emit `_meta.delegationRun`（follow-up task）
- **B2:** 新 SSE 事件类型 / aioncore 协议变更
- Rudder Issue/Board/Heartbeat
- Eval runner 判据变更

## Deferred — B1 bridge enrich (not this task)

| Trigger | Action |
|---------|--------|
| Live dump 子 tool 缺 `parentToolUseId` 且 sequential fallback 仍误导 | 新建 task `delegation-run-bridge-enrich` |
| 需要 spawn 瞬间就有 `childAgentId` | B1 only |

## Acceptance criteria

- [ ] `buildDelegationRuns` unit tests PASS（≥6 cases：running/done/blocked/no-agent/guid-direct/multi-delegate）。
- [ ] 默认「查直接50价格」：**完成后** View Steps 1 父组 + 2 子步嵌套；**进行中** chip 或父组头显示 `running · k/n`。
- [ ] Guid 报价专家：无假 Agent 父组；工具链正常。
- [ ] SubagentDrawer 与 View Steps 同一棵树；完成时可看到 `childAgentId`（若有 output）。
- [ ] `vitest` 全 PASS；code-review PASS；用户 UI smoke PASS。
- [ ] Spec §3.4c 更新为 B0 + nested shipped。

## Product lock (2026-07-06, amended)

| ID | Decision |
|----|----------|
| **D1** | **A + B0 only** — frontend-derived `DelegationRun`; zero CCB deploy requirement for AC |
| **D2** | `parentToolUseId` 仍为分组 authority；B0 不替代 eval 顶层/forbidden 判据 |
| **D3** | Runtime 路由语义不变 — 纯 observability |
| **D4** | 单一 reducer：`buildDelegationRuns` 为 View Steps / Drawer / chip 唯一入口 |
| **D5** | Operator tone — 可读摘要；raw tool 名折叠在 expand |

## Related

| Artifact | Path |
|----------|------|
| B0 contract | [`research/delegation-run-b0-contract.md`](./research/delegation-run-b0-contract.md) |
| Spec gap | `.trellis/spec/integration/agent-team-architecture.md` § UI observability |
| Frontend contract | `.trellis/spec/frontend/chat-acp-flow.md` §3.4c |
| Prior audit | `.trellis/tasks/06-18-quotation-runtime-stability-audit/research/runtime-audit-2026-06-18.md` |
| Sibling | `07-04-orchestrator-dispatch-hardening` |
| Reference | `docs/reference/rudder/ui/src/components/transcript/RunTranscriptView*` |
