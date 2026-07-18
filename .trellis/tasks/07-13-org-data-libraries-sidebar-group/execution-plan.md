# Execution Plan — org-data-libraries-sidebar-group

| Field | Value |
|-------|--------|
| **Status** | approved (user ok 2026-07-13) — implementing |
| **Scenario** | A |
| **Plan depth** | Standard |
| **Verification profile** | UI |
| **Repos** | aionui-src |
| **Active phase** | Phase 4 review + test |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-brainstorm | Read: | decisions locked in prd |
| ui-ux-pro-max | Skill: | Enterprise sider; icon+label parity |
| explore sider | Agent: | flat peers; TeamSiderSection pattern |

## Progress snapshot

| Phase | State | Delivery |
|-------|-------|----------|
| Phase 0 PRD | **done** | prd.md locked |
| Phase 1 registry + section | **done** | orgDatabaseNavRegistry + OrgDatabaseSiderSection |
| Phase 2 Sider wire | **done** | Sider/index.tsx |
| Phase 3 i18n | **done** | orgDatabase.json zh/en；suppliers t() |
| Phase 4 review + test | **PASS** | code-reviewer 2× PASS；bun test 3/3 |
| Phase 5 smoke | **PASS** | CDP Dev：AC-1/2/5 + a11y；进供应商 hash+展开 |

## Contract map

| Contract | Behavior protected | Primary code | Tests / smoke | Risk |
|----------|--------------------|--------------|---------------|------|
| WANd.UI.SIDER.DATA_LIBS.001 | 折叠组：图标+文案+caret；展开/持久化/active | SiderDataLibrariesSection | vitest + manual | ui |
| WANd.UI.SIDER.DATA_LIBS.REGISTRY.001 | 注册表扩展 | dataLibrariesNavRegistry | vitest | ui |
| WANd.UI.SIDER.DATA_LIBS.I18N.001 | zh/en；供应商不硬编码 | dataLibraries.json | manual en | ui |

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool | Files | Required output | Profile |
|-------|----------|------------|---------|------|------|-------|-----------------|---------|
| 1 | P0 | Registry + helpers | REGISTRY.001 | ui | TDD | dataLibrariesNavRegistry.ts | vitest GREEN | UI |
| 2 | P0 | Section UI | DATA_LIBS.001 | ui | — | SiderDataLibrariesSection.tsx | 同款顶栏行 | UI |
| 3 | P0 | Wire Sider | DATA_LIBS.001 | ui | — | Sider/index.tsx | 去三 flat | UI |
| 4 | P1 | i18n | I18N.001 | ui | — | locales | AC-5 | UI |
| 5 | P0 | code-reviewer Layer B | DATA_LIBS.* | ui | Task | renderer/Sider | PASS | UI |
| 6 | P0 | Manual smoke | DATA_LIBS.001 | ui | human | Dev | AC-1..5 | UI |

## TDD contract

| Workstream | Contract | RED | GREEN | Refactor |
|------------|----------|-----|-------|----------|
| Registry | REGISTRY.001 | no helper | bun test dataLibrariesNav | same |

## Contract Verification

| Contract | Verification | Evidence | Status |
|----------|--------------|----------|--------|
| DATA_LIBS.001 | manual AC | smoke | pending |
| REGISTRY.001 | bun test | pass | pending |
| plan structure | lint_execution_plan.py | PASS | pending |

## Manual smoke

- [ ] 组头有图标+「数据库」+caret，行高与任务一致
- [ ] 展开见三子项；收起隐藏；刷新保持
- [ ] 进价格库时组展开且子项 active
- [ ] collapsed sider OK
- [ ] en-US OK
