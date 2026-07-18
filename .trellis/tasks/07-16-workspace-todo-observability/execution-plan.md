# Execution Plan — `07-16-workspace-todo-observability`

| Field | Value |
|-------|--------|
| **Status** | **implementing** — Phase 4 automated gates done; manual exe smoke pending |
| **Active phase** | Phase 4 (manual smoke) |
| **Scenario** | **A** (renderer UX + workspace behavior) |
| **Plan depth** | **Standard** |
| **Verification profile** | **UI** |
| **Repos** | `aionui-src` primary；`.trellis/spec/frontend` + `agent-runtime-registry.yml` |
| **Release impact** | **None** — renderer-only; dev smoke via `start-dev-full.ps1` (no NSIS / whitelist change) |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | Contract→TDD→Verify；Scenario A |
| skill-selection | Read: | Review = code-reviewer Layer A/B |
| trellis-before-dev | Read: | spec layers: frontend + integration |
| ui-ux-pro-max | Skill: | `--design-system -p "Mixing Todo Panel" --density 7` |
| codebase probe | Read: | `useWorkspaceCollapse.ts`；`useWorkspaceTree.ts:136` sole `dispatchWorkspaceHasFilesEvent` producer；`useWorkspaceEvents.ts` refresh chain；`MessageList.tsx` L314-322；`SubagentDrawer.tsx` no plan UI |
| system-review absorb | Chat: | 2026-07-16 independent + System Review Report — plan revised below |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | **done** | capability matrix + scenario A |
| Phase 0a | **done** | `research/workspace-auto-open-root-cause.md` |
| Phase 0b | **done** | 5 vitest files (12 tests) |
| Phase 1 | **done** | `workspaceTreeHasVisibleContent`, toast CTA, collapse fix |
| Phase 2 | **done** | spec + registry + `resolveLatestPlanForDelegation.ts` |
| Phase 3a | **done** | `PlanChecklist.tsx` |
| Phase 3 | **done** | `MessagePlan.tsx` |
| Phase 3b | **done** | SubagentDrawer + MessageList plan plumbing |
| Phase 4 | **partial** | code-reviewer PASS + vitest 12/12; manual smoke pending |
| plan lint | **done** | `lint_execution_plan.py` PASS (re-run after this edit) |

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Explore / root cause | systematic-debugging | available | Phase 0a trace log |
| Design | ui-ux-pro-max | available | reference screenshots |
| TDD | superpowers:test-driven-development | available | vitest DOM (scaffold Phase 0b) |
| Implement | trellis-implement / inline | available | — |
| Review | Agent: code-reviewer | available | Layer A N/A unless picker；Layer B mandatory |
| Verify | UI manual smoke | available | `smoke-evidence.md` |

## Scenario + risk

- **Scenario A** — UX gaps from live session + System Review hardening
- **Risk tags:** `ui` · `workspace` · `delegation-observe` · `renderer` · `data-plumbing`
- **Not Scenario C** — hook intent (`isUserPicked ‖ isMidSession`) is sound; bug likely **producer / refresh / preference / conversation_id** chain

## Architectural decision — Todo list 在内还是外（locked）

| Layer | What | Main chat | SubagentDrawer | View Steps |
|-------|------|-----------|----------------|------------|
| **Parent** | `plan` without `parentToolUseId` | **Yes** — `MessagePlan` | — | — |
| **Subagent** | `plan` with `parentToolUseId` | **No** — `MessageList` suppress | **Yes** — read-only `PlanChecklist` | — |
| **Decomposition** | `DecompositionPlanTimeline` | — | — | **Yes** — above tool tree (`DELEGATION.002`) |

**Verdict:** 主聊显父、Drawer 显子、View Steps 显工具链（不是 Todo）。

## Contract map (canonical IDs — promote in Phase 2)

| Contract | Behavior protected | Primary code | Tests / smoke | Risk |
|----------|--------------------|--------------|---------------|------|
| `WANd.OBSERVE.WORKSPACE.001` | Mid-session write → desktop 项目面板 auto-expand；collapsed 偏好时 toast +「查看项目」 | `useWorkspaceTree.ts` (producer), `useWorkspaceEvents.ts` (refresh), `useWorkspaceCollapse.ts` (consumer) | vitest + manual | **P0** |
| `WANd.OBSERVE.PLAN.001` | 父 plan 三态 UI；子 plan 主聊 suppress | `PlanChecklist.tsx`, `MessagePlan.tsx`, `MessageList.tsx` | vitest DOM | med |
| `WANd.OBSERVE.PLAN.002` | Drawer 展示子 plan（从 **message list**，非 tool messages） | `resolveLatestPlanForDelegation.ts`, `SubagentDrawer.tsx`, `MessageToolGroupSummary.tsx` | vitest + manual drawer | **P0** |
| `WANd.OBSERVE.DELEGATION.002` | Decomposition vs MessagePlan 视觉/数据分工 | `chat-acp-flow.md` § new subsection | doc cross-ref | low |

### Phase 3b plan lookup API (sketch — lock in Phase 2)

```typescript
// aionui-src/.../resolveLatestPlanForDelegation.ts
function resolveLatestPlanForDelegation(
  messages: TMessage[],
  parentToolUseId: string,
): IMessagePlan | null;
// Filter: type === 'plan' && content.parentToolUseId === parentToolUseId
// Return: latest by created_at / list order
// NOT from turnToolMessages — plan messages are not tool calls
```

`MessageToolGroupSummary` must pass `turnPlanMessages` (or full turn messages slice) into `SubagentDrawer`.

## Workstreams

| Phase | Priority | Workstream | touches | Tool | Files | Required output |
|-------|----------|------------|---------|------|-------|-----------------|
| **0a** | **P0** | Trace before fix | WORKSPACE.001 | Read + repro | `research/workspace-auto-open-root-cause.md` | Log: refresh fired? `hasFiles` heuristic? `isInitial`? `preferenceKey`? **parent vs child conversation_id** on delegated Write |
| **0b** | P0 | vitest scaffold | all | write stubs | `useWorkspaceCollapse.test.ts`, `MessagePlan.dom.test.tsx`, `SubagentDrawer.dom.test.tsx`, `resolveLatestPlanForDelegation.test.ts` | Empty RED tests committed |
| **1** | **P0** | Fix at correct layer | WORKSPACE.001 | TDD→implement | Producer and/or consumer per 0a verdict | Mid-session expand on temp workspace; **AC:** collapsed pref → toast CTA (not silent fail) |
| **2** | P0 | Spec + registry + API | PLAN.* + WORKSPACE.001 + DELEGATION.002 | implement | `chat-acp-flow.md`, `agent-runtime-registry.yml`, `resolveLatestPlanForDelegation.ts` | Promote 4 IDs; visual split paragraph (Decomposition vs MessagePlan) |
| **3a** | **P0** | `PlanChecklist` component | PLAN.001 | ui-ux-pro-max + TDD | `PlanChecklist.tsx`, CSS, i18n keys | Shared checklist UI |
| **3** | P0 | Main chat wiring | PLAN.001 | implement | `MessagePlan.tsx` | Thin wrapper over `PlanChecklist` |
| **3b** | **P0** | Drawer Todo | PLAN.002 | TDD→implement | `SubagentDrawer.tsx`, `MessageToolGroupSummary.tsx` | Plan section; no plan → no placeholder |
| **4** | P0 | Gates + smoke | all | code-reviewer → vitest | `smoke-evidence.md` | Layer A N/A or PASS；Layer B PASS；0 P0 findings |

### Deferred (follow-up task — not this plan)

| Item | Reason |
|------|--------|
| Phase 1b preview auto-open `.md` | Scope creep; separate task if needed after WORKSPACE.001 GREEN |
| CI Playwright workspace smoke | P2; manual `smoke-evidence.md` sufficient for MVP |
| Standalone `workspace-mid-session-expand.md` | Inline in `chat-acp-flow.md` unless hook authors repeat mistakes |

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| 0b scaffold | — | files exist, tests fail/skipped | `npm run test -- <paths>` runs | — |
| Phase 1 workspace | WORKSPACE.001 | vitest: `isInitial=false` + hasFiles → expand; collapsed pref → toast not expand | `npm run test -- tests/unit/.../useWorkspaceCollapse.test.ts` | user explicit collapse still honored until mid-session write CTA |
| Phase 3a PlanChecklist | PLAN.001 | 5 entries → `1 of 5 Done`, strikethrough, arrow, dashed pending | `npm run test -- tests/unit/.../MessagePlan.dom.test.tsx` | — |
| Phase 3b drawer | PLAN.002 | helper returns plan by `parentToolUseId`; drawer renders; main list suppresses | `npm run test -- tests/unit/.../resolveLatestPlanForDelegation.test.ts` + `SubagentDrawer.dom.test.tsx` | read-only |
| Phase 2 doc | all OBSERVE.* | N/A | registry + chat-acp-flow diff | — |

## i18n keys (Phase 3a — track in PR)

| Key | zh-CN (draft) |
|-----|---------------|
| `plan.checklist.header` | `{done} / {total} 已完成` |
| `plan.drawer.sectionTitle` | 执行计划 |
| `workspace.autoOpen.cta` | 查看项目 |

## UI design notes (ui-ux-pro-max)

| Element | Target |
|---------|--------|
| Container | Card `rd-12px`, `border border-[var(--color-border-2)]`, `p-12px` |
| Header | List icon + `{done} of {total} Done` |
| Completed | Check + `line-through text-t-tertiary` |
| In progress | Circle + arrow + `text-t-primary font-500` |
| Pending | Dashed circle 14px |
| Icons | `@icon-park/react` 16px — Layer B smoke |

## Contract Verification

| Contract | Verification | Evidence path | Status |
|----------|--------------|---------------|--------|
| WORKSPACE.001 | vitest + manual exe smoke | `smoke-evidence.md` § workspace | vitest PASS; manual pending |
| PLAN.001 | vitest DOM | test output | **PASS** (12 tests) |
| PLAN.002 | vitest + manual drawer | `smoke-evidence.md` § drawer-todo | vitest PASS; manual pending |
| DELEGATION.002 | spec diff | `chat-acp-flow.md` | **done** |
| code-reviewer | Agent: code-reviewer | Layer A PASS, Layer B PASS, 0 P0 | **PASS** |
| plan structure | `lint_execution_plan.py` | PASS | pending |

Evidence template: `.trellis/tasks/07-16-workspace-todo-observability/smoke-evidence.md`

## Parallel / merge

串行：**0a → 0b → 1 → 2 → 3a → 3 → 3b → 4**。禁止在 0a 结论前改 Phase 1 生产代码。

## Conditional recovery

| Trigger | Action |
|---------|--------|
| 0a 证明 bug 在 producer | Fix `useWorkspaceTree.ts` / `hasFiles` heuristic first |
| 0a 证明 refresh 未触发（child conversation_id） | Extend refresh subscription or parent-forward artifact signal — **new workstream row before Phase 1 close** |
| `turnToolMessages` 无 plan | Use message-list helper (PLAN.002) — do not patch tool normalizer |
| Layer B icon fail | Swap to smoke-verified IconPark symbol |

## Manual steps (WanD exe)

1. `start-dev-full.ps1 -SkipBootstrap`
2. 委派 research → 等 `research/*.md` 落盘
3. 项目侧栏 auto-expand（或 toast「查看项目」若曾手动折叠）
4. View Steps → SubagentDrawer → 子 Todo 可见；主聊无子 Todo 卡
5. 记录到 `smoke-evidence.md`

## Approval gate

Plan **approved** (user ok 2026-07-16 + System Review absorbed). Implementation starts on **执行 / implement**.
