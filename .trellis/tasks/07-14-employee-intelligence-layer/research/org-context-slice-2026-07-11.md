# EIL Focused Slice — Org Context + Settings + Subagent (explore 2026-07-11)

> **Scope:** User-selected concerns #1, #6, #7 only — not full EIL (no scope resolver, audit table, lifecycle).
> **Parent task:** `07-14-employee-intelligence-layer`
> **Scenario:** B slice (large spec, narrow first delivery)

## Already shipped (related tasks)

| Concern | Task | Status | What works today |
|---------|------|--------|------------------|
| Profile → prompt (client) | `07-06-employee-profile-settings-prompt` | **completed** | Settings → `user.employeeProfile` → `employee-profile.json` → `session/new` merge |
| Subagent inheritance (#7) | `07-06` P9 | **completed** | `runAgent.ts` → `mergeEmployeeProfileIntoResolvedUserContext`; AC9 user smoke PASS 2026-07-05 |
| Proactive name address | `07-06` P8 | **completed** | `derivePreferredAddressName`; user smoke PASS |
| Employee primary entry framing | `07-11-orchestrator-employee-primary-entry` | **completed** | Persona unlocked; S5 `me_context` slot deferred here |
| Login identity (minimal) | org SSO + `GET /api/auth/user` | **shipped** | Returns `id`, `username`, `work_task_role` only — **no dept/manager/status** |

**Verdict:** ~70% of the **plumbing** for #1 and #7 exists. Gap is **authority source** (org server fields) + **Settings merge policy** (#6). Subagent path needs **DTO upgrade**, not a new mechanism.

## Gap (user-visible)

| # | Desired effect | Today |
|---|--------------|-------|
| 1 | AI knows dept/manager/status from **company account** | AI knows what user typed in Settings (may disagree with VPS account) |
| 6 | Org fields read-only in Settings; notes editable | All profile fields editable client-side |
| 7 | Delegated agents inherit **same org identity** | Delegated agents inherit **client** profile block (works; wrong source when org differs) |

## Deferred in this slice (full EIL later)

- `is_admin`, business_roles, data scope resolver
- `employee_audit_log`, lifecycle gates
- Manager scoped queries, department filters

## Provisional contracts

| ID | Behavior |
|----|----------|
| `WANd.EMPLOYEE.ORG_CONTEXT.001` | New session + subagent receive server-sourced org identity block; client notes supplemental only |
| `WANd.EMPLOYEE.SETTINGS_MERGE.001` | Settings shows org fields read-only; `notes`/email/phone editable; save does not overwrite org authority |
| `WANd.EMPLOYEE.SUBAGENT_INHERIT.001` | `Agent()` delegation merges same org+client block as main session (07-06 P9 regression) |

## Recommended delivery order

```text
AionCore: migration (minimal org columns) + GET /api/users/me/context
  → aionui: fetch context on login/warmup; extend handoff file shape
  → aionui: Settings read-only org section (#6)
  → claude-code-B: extend employeeProfile merge (org block first, client notes second)
  → regression: P9 subagent smoke + unit tests
```

## Evidence to cite at implement time

- `07-06` `test-records.md` P5/P9 PASS
- `agent-team-architecture.md` § Subagent context asymmetry (fixed 2026-07-05)
- `eil-contract.md` Q4 Settings merge policy
- `extension-slots.md` S5 `me_context` → this slice
