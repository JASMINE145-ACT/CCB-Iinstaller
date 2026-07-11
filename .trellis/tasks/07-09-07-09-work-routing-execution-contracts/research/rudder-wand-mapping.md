# Research — Rudder ↔ WanD Work Routing / Execution mapping

**Date:** 2026-07-09  
**Source:** `docs/asda` §3, §6; codebase grep; `agent-team-architecture.md`

## Exploration summary

Rudder 把 agent 工作拆成两个正交域：

```text
┌──────────────────── Work Routing ────────────────────┐
│ 谁干活？谁 review？checkout 归属？                      │
│ 输出：Agent(subagent_type) / reviewer assignment      │
└────────────────────────┬─────────────────────────────┘
                         │ 决策已定
                         ▼
┌──────────────────── Execution ───────────────────────┐
│ 怎么 spawn？sync/async 准入？transcript 写哪？          │
│ 输出：subagents/agent-*.jsonl、同轮 verbatim forward  │
└──────────────────────────────────────────────────────┘
```

万鼎 **已有** 两域实现，但文档混在 `agent-team-architecture.md` 一张大图里：

| Rudder contract | WanD 实现 | 文件 |
|-----------------|-----------|------|
| `ROUTING.ASSIGNMENT.001` | orchestrator → `Agent(quotation-agent\|…)` | `wande-orchestrator.md`, `filterDelegatableCustomAgents`, eval `orchestrator-quote-delegates` |
| `ROUTING.REVIEWER.001` | `:roe-judge` on Stop | agent `.md` Stop frontmatter → `subagent-gate.sh` |
| `RUN.EXECUTION.001` | sync `runAgent.ts` spawn | `claude-code-b-src/.../runAgent.ts` |
| `RUN.ADMISSION.001` | no background Agent | `wanDEnvBootstrap.ts`, `sanitizeOrchestratorAgentInput`, `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` |

**第三域（观测，非 Rudder 原词）：** `07-06-delegation-nested-view-steps` 的 `DelegationRun` / View Steps — 只反映 Execution 事实，不做 Routing 决策。

## Why document split matters

典型误伤：

1. 修 **sync-wait**（Admission）→ 有人去改 orchestrator playbook 的「派谁」段落
2. 修 **guard**（Assignment  enforcement）→ 误改 `roe-judge` 或 PreToolUse knowledge gate
3. 修 **View Steps UI** → 误以为要改 `runAgent` spawn 逻辑

决策树（30 秒）：

```text
这次改动回答的问题是？
  ├─ 「谁该做 / 谁审」→ Routing
  ├─ 「怎么跑 / 等不等 / 写哪条 jsonl」→ Execution
  └─ 「UI 怎么展示已发生的事实」→ Observability
```

## Open questions (not blocking)

- CI 是否将来 lint「改 guard 文件必须 touch registry」— defer
- B1 `_meta.delegationRun` 应挂在 `WANd.OBSERVE.*` 还是 `WANd.RUN.*` — 倾向 OBSERVE until bridge ships
