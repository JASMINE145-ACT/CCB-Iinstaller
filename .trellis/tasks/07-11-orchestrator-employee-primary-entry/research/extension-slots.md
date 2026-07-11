# Extension slots — Employee Primary Entry

> **Task:** `07-11-orchestrator-employee-primary-entry`  
> **Purpose:** Capture future additions so identity stays unlocked and routing remains one tool among many.  
> **Status:** living doc — update when a slot is claimed or deferred to another task.

## Mental model

```text
Employee Primary Entry (identity — stable)
  └── tools (grow over time)
        ├── Agent() routing          ✅ exists
        ├── personal memory R/W      ✅ partial
        ├── employee-profile inject  ✅ exists (passive)
        ├── skills (intake/split)     ⬜ P1 slot
        ├── thin employee MCP        ⬜ P2 slot
        └── EIL role-biased route    ⬜ P3 slot
```

## Slot catalog

| Slot ID | Candidate | What it adds | Depends on | Owner suggestion | Status |
|---------|-----------|--------------|------------|------------------|--------|
| S0 | Persona + intent-split playbook | Identity unlock | — | **07-11 P0** | planned |
| S1 | Skill `employee-intake` | Opening / how to use identity | S0 | 07-11 P1 or child | open |
| S2 | Skill `intent-split` | Mixed business+personal utterances | S0 | 07-11 P1 or child | open |
| S3 | Skill `role-aware-routing` | Bias specialist choice by role | EIL context | 07-11 P3 / 07-14 | open |
| S4 | Skill `daily-brief` | 「今天怎么样」script | S0 + work-tasks | child | open |
| S5 | MCP `me_context` | Read EIL `/users/me/context` | 07-14 P1 API | wire in 07-11 or child; API in 07-14 | open |
| S6 | MCP `my_tasks_brief` | Read-only today/overdue summary | work-tasks API | **07-11-work-tasks-platform-v2** P2 (`work_tasks_brief`) | open |
| S7 | MCP `explain_capability` | 「我能不能…」from role/scope | S5 | child | open |
| S8 | Active memory intake | Use workflow.md at session start when useful | personal-memory | soft playbook in P0 | open |
| S9 | Product copy / Guid label | Display name「工作助手」 | Q1 | UI optional | open |

## Hard non-slots (do not add to main entry)

| Item | Why |
|------|-----|
| `mcp__quotation__*` | Business specialist only |
| `mcp__accurate__*` | Business specialist only |
| `mcp__price-library__*` | Admin / specialist |
| Full `work_tasks_create/edit` on main entry | Avoid dual mutate; keep on `work-tasks-agent` |
| Org field writes (dept/manager) | Settings / admin; EIL Q4 |

## Decision log (fill as we go)

| Date | Decision | Note |
|------|----------|------|
| 2026-07-11 | Identity = employee primary entry; routing = tool | From explore + user lock |
| 2026-07-11 | P0 = persona/playbook/spec only; MCP deferred | Leave room for later additions |
