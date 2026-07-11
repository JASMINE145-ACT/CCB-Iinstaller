# PRD — Orchestrator as Employee Primary Entry

> **Task:** `07-11-orchestrator-employee-primary-entry`  
> **Status:** draft (planning)  
> **Priority:** P1  
> **Date:** 2026-07-11

## One-line definition

**`wande-orchestrator` is the employee's primary WanD entry agent** — a work assistant that understands who you are and advances your work. **Routing / `Agent()` delegation is one implementation tool**, not the agent's locked identity.

## Problem

Today the default session agent is contractually framed as:

> 「全局路由助手 / 只路由，不直连业务 MCP」

That framing is **correct as a safety boundary for business MCP**, but **wrong as a product identity**:

| Locked-as-router consequence | Employee expectation |
|------------------------------|----------------------|
| Self-intro =「我负责委派」 | 「我是你的工作助手」 |
| Personal / workbench intents feel second-class | 「我今天干什么」「我能不能查下属」应一等公民 |
| Future skills / thin MCP look like violations | Extensions look like natural employee capabilities |
| Specs say "router only" everywhere | Hard to evolve without rewriting the mental model |

Employees bring **two streams** into the default session:

```text
业务需求  →  领域专家（quotation / accurate / work-tasks / office / research）
个人/工作台 →  主入口自己应能理解、解释、轻量推进
```

Routing alone serves the first stream well and under-serves the second.

## Strategic decision (locked for this task)

> **Unlock identity: employee primary entry.**  
> **Keep safety: no business MCP on the main entry (quotation / accurate / price-library / …).**  
> **Routing is a tool** — same class as future skills / thin employee MCP / EIL context — not the definition of the agent.

```text
┌─────────────────────────────────────────┐
│  Employee Primary Entry (orchestrator)  │
│  Identity: 员工工作助手 / 默认主入口      │
├─────────────────────────────────────────┤
│  Tools (extensible set):                │
│    • Agent() routing  ← already have    │
│    • personal memory Read/Stop          │
│    • (later) skills                     │
│    • (later) thin employee MCP          │
│    • (later) EIL context injection      │
├─────────────────────────────────────────┤
│  Hard boundary (unchanged):             │
│    forbidden business MCP allowlist     │
└─────────────────────────────────────────┘
```

## Relationship to other tasks

| Task | Relationship |
|------|----------------|
| `07-14-employee-intelligence-layer` | **Sibling / consumer.** EIL owns org identity API, RBAC, audit table. This task owns **agent persona + entry contract** that will *consume* EIL context when ready. |
| `07-09-agent-work-tasks-collaboration-system` | **Completed specialist.** Work-tasks CRUD stays on `work-tasks-agent`; main entry may later add brief/read-only, not duplicate mutate tools. |
| `07-06-employee-profile-settings-prompt` | **Baseline.** Profile injection already exists; this task makes the main agent *use* identity in persona/routing bias, not only receive it. |
| `07-04-orchestrator-dispatch-hardening` | **Keep.** Sync `Agent()`, no background, verbatim forward — still valid as **routing-tool** contracts. |
| `07-09-work-routing-execution-contracts` | **Update language.** Routing domain stays; rename mental model from "orchestrator = router" to "entry agent uses routing tool". |

## Goal (v1 of this task)

1. **Persona unlock** — L1 md + aionui sidecar + health notes: employee primary entry, not "router-only".
2. **Intent split playbook** — business → delegate; personal/workbench → handle with available tools (today: memory + clarify + delegate work-tasks).
3. **Extension slots documented** — explicit "future additions" section so later skills / thin MCP / EIL do not fight the identity.
4. **Safety preserved** — `forbidden_mcp` / empty business allowlist / `WANd.ROUTING.ASSIGNMENT.001` still hold for business tools.

## Non-goals (v1)

- Do **not** attach quotation / accurate / price-library MCP to the main entry.
- Do **not** implement full thin `employee-context` MCP in v1 (slot only; may land in a follow-on phase or EIL P2+).
- Do **not** duplicate `work-tasks-agent` mutate tools on the main entry.
- Do **not** build HR UI or replace EIL backend work.
- Do **not** rename agent id (`wande-orchestrator` stays for compatibility); product language may say「员工主入口 / 工作助手」.

## Acceptance criteria

- [x] **AC1** `wande-orchestrator.md` self-intro + core duties describe **employee primary entry**; routing listed as a **tool/capability**, not the sole identity.
- [x] **AC2** Explicit playbook: personal/workbench vs business intent split. **v1 thin:** identity + habit/memory + clarify; "today's work" → **delegate** `work-tasks-agent` (main entry does not self-answer task lists in P0).
- [x] **AC3** Business MCP forbidden contract unchanged (`package.json` mcpServers `[]`, health `forbidden_mcp`, guard behavior). Extended strip to `work-tasks-agent`.
- [x] **AC4** Spec updates: `agent-team-architecture.md` + `agents-unified-model.md` + routing contracts use "primary entry + routing tool" language; **register** provisional `WANd.ENTRY.*.001` in `contracts/agent-runtime-registry.yml`; no leftover「只路由」identity contradiction (grep L1 + `.aionui.json` + specs).
- [x] **AC5** Extension map in task `research/extension-slots.md` lists candidate future additions (skills / thin MCP / EIL) with "in/out of this task" markers — ready for later phases without re-litigating identity.
- [x] **AC6** Manual smoke: default session self-intro no longer sounds like a pure switchboard; a business ask still delegates (quotation or accurate). Do not over-expect workbench self-serve in P0. — **PASS** 2026-07-11 user smoke
- [x] **AC7** Fix literal `` `n`n `` artifact in `wande-orchestrator.md` §工作任务 during P0 rewrite; confirm `git status/diff` before any `build-wanding.ps1` pack.

## Phased delivery (extensible)

| Phase | Scope | Lock? |
|-------|--------|-------|
| **P0** | Identity + playbook + spec language + extension-slots doc | **This task core** |
| **P1** | Optional skill(s): `employee-intake` / `intent-split` / `role-aware-routing` (prompt-only) | Optional follow-on in same task if approved |
| **P2** | Thin employee MCP (`me_context`, `my_tasks_brief`) — depends on EIL context API | **Deferred slot**; may become child task |
| **P3** | Role-biased routing from EIL `business_roles` | Deferred; needs EIL |

**Principle:** P0 unlocks the identity so P1–P3 are additive tools, not identity rewrites.

## Open questions (do not block P0)

| # | Question | Default if deferred |
|---|----------|---------------------|
| Q1 | Product display name: keep「万鼎协作主 Agent」or「员工工作助手」? | Keep id; soften copy in L1 first |
| Q2 | Ship P1 skills in this task or separate? | Separate unless user says include |
| Q3 | Thin MCP under 07-11 vs 07-14? | Prefer 07-14 owns API; 07-11 or child owns agent wiring |
| Q4 | Guid card visibility for orchestrator? | Keep hidden; default session only |

## Risks

| Risk | Mitigation |
|------|------------|
| Model starts calling business MCP after persona soften | Keep runtime guards + eval/smoke for forbidden MCP |
| Spec drift ("router" vs "entry") | Single glossary row in agent-team-architecture |
| Scope creep into EIL backend | Hard non-goal; link 07-14 |
| Dual mutate paths for tasks | Brief-only on entry; mutate stays on work-tasks-agent |

## Canonical files (expected touch set for P0)

- `ccb-installer/packages/vertical/com.wanding.trade/agents/wande-orchestrator.md`
- `ccb-installer/packages/vertical/com.wanding.trade/agents/wande-orchestrator.aionui.json` (if present)
- `ccb-installer/packages/vertical/com.wanding.trade/health/mcp-health-manifest.json` (notes only)
- `.trellis/spec/integration/agent-team-architecture.md`
- `.trellis/spec/integration/agents-unified-model.md` (targeted sections)
- `.trellis/spec/integration/work-routing-execution-contracts.md` (glossary / framing)
- `{task}/research/extension-slots.md` (new)
