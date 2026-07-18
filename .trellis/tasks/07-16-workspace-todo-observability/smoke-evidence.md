# Smoke evidence — `07-16-workspace-todo-observability`

> Unit + code-reviewer gates recorded below. Manual exe smoke still pending.

## Environment

- Date: 2026-07-16
- Mixing version / branch: aionui-src (local dev, uncommitted)
- Launcher: `start-dev-full.ps1 -SkipBootstrap`

## Automated gates (Phase 4)

### vitest — 12/12 PASS

```text
npm run test -- \
  tests/unit/workspace/workspaceTreeHasVisibleContent.test.ts \
  tests/unit/renderer/useWorkspaceCollapse.dom.test.ts \
  tests/unit/renderer/resolveLatestPlanForDelegation.test.ts \
  tests/unit/renderer/MessagePlan.dom.test.tsx \
  tests/unit/renderer/SubagentDrawer.dom.test.tsx
Duration: 24.47s — 5 files, 12 tests passed
```

### code-reviewer — PASS (post-fix)

- Layer A: **PASS** (A1 producer reuse, A5/A6 observability wiring)
- Layer B: **PASS** (IconPark smoke: CheckOne, List, Right, Down, Checklist)
- Runtime Crash Checklist: clean
- Important fixes applied after review:
  - `pushSuppressedPlan` always syncs to last `tool_summary` (late plans reach drawer)
  - CTA open uses `openedViaMidSessionCtaRef` so collapsed pref does not immediately re-collapse

## WORKSPACE.001 — mid-session auto-expand

- [ ] Trigger: research-agent writes `research/*.md`
- [ ] Result: 项目 panel expanded OR toast「查看项目」shown (if user had collapsed pref)
- [ ] Screenshot / log:

## PLAN.001 — parent Todo (main chat)

- [ ] Parent plan shows `X of Y Done` + three states
- [ ] Screenshot:

## PLAN.002 — subagent Todo (drawer)

- [ ] Main chat: no standalone subagent plan card
- [ ] View Steps → SubagentDrawer: read-only plan visible
- [ ] Screenshot:
