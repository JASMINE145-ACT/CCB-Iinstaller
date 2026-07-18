# Execution Plan — `07-15-webui-business-parity-exe`

| Field | Value |
|-------|--------|
| **Status** | in_progress |
| **Approved** | 2026-07-15（用户「执行」） |
| **Scenario** | A (clear AC) + **cross-repo** aionui-src；access prerequisite `07-14-web-1-1-9-apple-access` |
| **Plan depth** | Full |
| **Verification profile** | UI (+ Cross-repo) |
| **Repos** | aionui-src (primary) · claude-code-best docs/Trellis |
| **Spec entry** | `.trellis/spec/frontend/index.md` · `file-map.md` · `dev-test-ship.md` · `code-review-layer-a.md` · `integration/org-knowledge.md` |
| **Active phase** | P6 host rebuild + manual Web/Safari smoke |
| **UI doctrine** | ui-ux-pro-max: shell may differ; Safari touch OK; **no** cosmetic redesign |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | plan-only · Contract→TDD→Verify |
| trellis-before-dev | Read: | frontend/index · packages layers · web-host notes in electron-architecture/dev-test-ship |
| explore (code paths) | Agent: | [WebUI vs exe parity](aafef2e1-76fe-481d-a0c0-e17ff6cc24f1) — org gate / CCB IPC / assistants HTTP fallback |
| ui-ux-pro-max | Read+CLI: | `research/ui-ux-pro-max-webui.md` — allow layout delta; touch/nav constraints |
| research persist | Write: | `research/web-exe-parity-gaps.md` |
| code-reviewer | Agent: | [WebUI HTTP-first PASS](585c325b-7bbc-4147-8862-18d49464d118) — Layer A/B PASS after hang gates |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | done | capability matrix |
| Phase 0 | done | PRD + research; 用户「执行」 |
| Phase 1 | done | `p1-org-inject-done.md` |
| Phase 2 | done | `p2-org-http-done.md` |
| Phase 3–4 | done | `p3-p4-ccb-http-done.md` (HTTP-first + Guid→send) |
| Phase 5 | deferred | `p5-memory-deferred.md` |
| Phase 6–7 | **done** | 本机验收：`127.0.0.1` + 本机 Tailscale IP；UI 齐全、报价 MCP 可调用（无远端苹果门禁） |

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Requirements | trellis-brainstorm / PRD | available | this PRD |
| Research | explore + research/*.md | available | — |
| Implementation | trellis-implement / inline aionui-src | available | — |
| Review | code-reviewer (Layer A/B) | available | — |
| TDD | vitest in aionui-src | available | — |
| UI smoke | Safari/Chrome + Guid hand | available | — |

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.WEB.ORG_NAV.001` | Org DB sider (知识库/价格库/供应商) visible when org server configured; routes work under Web auth | `orgHttpBridge.ts` · `OrgDatabaseSiderSection.tsx` · `web-host` inject/proxy | unit: `isOrgServerConfigured` web path; UI smoke open 3 routes | `ui` `cross-repo` |
| `WANd.WEB.ASSISTANTS.001` | WanD CCB agent catalog identity matches exe (ids/labels) | `fetchAssistantsCatalog.ts` · HTTP agents API or bridge | catalog snapshot test vs disk agents; Guid picker smoke | `ui` Layer A |
| `WANd.WEB.CCB_AUTH.001` | Web session gets CCB-authority-equivalent so gated surfaces unlock | `useCcbAuthorityActive` · HTTP authority endpoint | unit SWR/provider; smoke memory/sider flags | `ui` |
| `WANd.WEB.MEMORY.001` | Memory usable on Web **or** explicit deferred AC | `Sider/index.tsx` · memory IPC→HTTP | smoke or runbook defer row | `ui` |
| docs-only UX note | Shell may differ; Safari touch checklist | runbook / research | manual | — |

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 1 | P0 | Web runtime inject: `__orgServerUrl` (+ SSO/org JWT contract) into WebUI SPA | `WANd.WEB.ORG_NAV.001` | cross-repo | TDD → implement | `web-host` · preload-equivalent bootstrap · `orgHttpBridge` | org sider visible in browser | UI |
| 2 | P0 | Browser org HTTP: cookie credentials + proxy `/org-api/*` or CORS-safe path | `WANd.WEB.ORG_NAV.001` | security ui | TDD · security checklist | `orgHttpBridge` · web-host proxy | 3 pages read smoke | UI |
| 3 | P0 | CCB assistants catalog over HTTP for Web (same ids as disk agents) | `WANd.WEB.ASSISTANTS.001` | ui Layer A | TDD | `fetchAssistantsCatalog` · aioncore/desktop HTTP | Guid list ≡ exe sample | UI |
| 4 | P0 | CCB authority plane for Web (`isAuthorityActive` HTTP) | `WANd.WEB.CCB_AUTH.001` | ui | TDD | `useCcbModelInfo` · IPC bridge HTTP fallback | `ccbAuthorityActive===true` on Web when CCB install present | UI |
| 5 | P1 | Memory parity **or** defer AC | `WANd.WEB.MEMORY.001` | ui | decide + implement/docs | memory services · runbook | PASS or deferred note | UI |
| 6 | P1 | ui-ux smoke: Safari sider + Layer A check; update Apple runbook | docs-only / contracts above | ui | manual | `docs/wanding-web-apple-access-1.1.9.md` | checklist rows | UI |
| 7 | — | Gate | all | — | code-reviewer → tests → trellis-update-spec | specs | finish-work | UI |

**Serial merge:** Phase 1 inject before Phase 2 pages; Phase 4 before Phase 5 if memory stays behind authority.

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| Org inject | `WANd.WEB.ORG_NAV.001` | sider null without `__orgServerUrl` | targeted vitest orgHttpBridge/web bootstrap | same |
| Org pages | `WANd.WEB.ORG_NAV.001` | 401/empty when cookies wrong | vitest + manual Web smoke | same |
| Catalog | `WANd.WEB.ASSISTANTS.001` | Web list ≠ disk agents set | unit snapshot / fixture compare | same |
| Authority | `WANd.WEB.CCB_AUTH.001` | Web `active===false` with CCB present | unit mock HTTP true + smoke | same |
| Memory | `WANd.WEB.MEMORY.001` | hidden with no AC | implement or documented defer | — |

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| `WANd.WEB.ORG_NAV.001` | WebUI open `/org-knowledge` `/price-library` `/suppliers` | screenshot + command log | **PASS** 用户 UI 齐全 2026-07-15 |
| `WANd.WEB.ASSISTANTS.001` | Guid picker Web vs exe id list | Layer A note + screenshot | **PASS** 报价专家会话可用 |
| `WANd.WEB.CCB_AUTH.001` | Web `ccbAuthorityActive` true | console/SWR or UI gate | **PASS** HTTP + 实机调用 |
| `WANd.WEB.MEMORY.001` | memory page or defer doc | AC checkbox | **deferred** — `p5-memory-deferred.md` |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-15-webui-business-parity-exe/execution-plan.md` | PASS | pending |

## Verification profile and gate

**Selected:** UI · Cross-repo

1. Contract Verification rows  
2. **code-reviewer** primary（Layer A mandatory on assistants; Layer B if renderer）  
3. aionui vitest scoped + WebUI manual (Chrome + Safari if available)  
4. `trellis-update-spec` — frontend/web parity note  
5. jsonl + PRD AC  
6. commit only if asked  
7. `/trellis:finish-work`

## Parallelization

Not full Scenario D until Phase 1 lands. Optional later: Agent A = web-host inject/proxy · Agent B = catalog HTTP — merge on shared auth header contract.

## Manual steps (human)

- [ ] Host WebUI + Tailscale up (`07-14-web…`)
- [ ] Exe 对照：记下助手 id 列表 + 三库入口
- [ ] Web 对照同一 URL：入口与列表
- [ ] Apple Safari 一轮（触控点侧栏）

## Recovery and re-approval

| Trigger | Return to | Re-approval? |
|---------|-----------|--------------|
| Org JWT cannot be shared to browser safely | Phase 2 redesign (proxy-only) | yes |
| Catalog only via Electron forever | Phase 3 alternative seed HTTP in aioncore | yes |
| Memory IPC-only hard stop | Phase 5 defer | no if AC updated |

## Defer / out of scope

- Pixel parity with exe
- Enable-WebUI settings page inside browser Mixing
- Native iOS app
