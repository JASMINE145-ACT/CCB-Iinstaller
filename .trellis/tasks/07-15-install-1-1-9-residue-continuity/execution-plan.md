# Execution Plan — `07-15-install-1-1-9-residue-continuity`

| Field | Value |
|-------|--------|
| **Status** | in_progress |
| **Scenario** | **C**（现场 bug）+ **J**（安装/释放） |
| **Plan depth** | Full |
| **Verification profile** | Release (+ UI) |
| **Repos** | aionui-src · ccb-installer · Trellis specs |
| **Spec entry** | `wanding-release-standard.md` · `wanding-packaging-whitelist.md` §17 · frontend CCB continuity |
| **Active phase** | Phase 0.5 stale-purge shipped; still need Phase 0 field evidence + InstallDir resolve |
| **Risk tags** | `packaging` `ui` `cross-repo` |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | plan-only · Contract→TDD→Verify |
| trellis-debug-route | Read: | Scenario C → root-cause before fix |
| systematic-debugging | Read: | (path miss on plugin; followed doctrine inline) 假设→证据→排除 |
| release specs | Read: | release-standard §0–1 · whitelist §17 OOTB / repair |
| code path trace | Shell/Read: | continuity throw · readiness config fail · InstallDir **缺 Programs** |
| research persist | Write: | `research/residue-root-cause.md` |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | done | capability matrix |
| Phase 0 | pending | 员工机：`missing:` 绝对路径 + list-installs |
| Phase 0.5 | **done** | NSIS `DirectoryLeave` + purge; smokes PASS — `p05-stale-purge-nsis-smoke-done.md` |
| Phase 1 | **done** | Programs+registry in `ccbWandingRuntimeNode` — vitest 2/2; audit `research/audit-can-purge-solve-ab.md` |
| Phase 2 | pending | Continuity / banner 诊断文案 |
| Phase 3 | pending | H2/H3：白名单或 bootstrap；runbook |
| Gate | pending | — |

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Debug | systematic-debugging + research | available | inline |
| Research | trellis-research / main | available | research/*.md |
| Implementation | aionui-src + ccb-installer | available | — |
| Review | code-reviewer | available | — |
| TDD | vitest install-resolve / health | available | — |
| Release verify | ccb-check-install · Test-Staging | available | — |

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.INSTALL.RESOLVE.001` | Resolve 官方 `Programs\CCB-Wanding` + HKCU InstallDir；不吞声落到残树 | `ccbWandingRuntimeNode.ts` | unit：候选序；fixture Programs vs stale | packaging |
| `WANd.INSTALL.STALE_PURGE.001` | 检测 Keep 之外带 VERSION 的安装树并安全删除 owned 足迹；永不删 `.claude` | `purge-stale-wanding-installs.ps1` · `ccb-purge-stale-installs.cmd` | `test-purge-stale-wanding-installs.ps1` | packaging |
| `WANd.INSTALL.CONTINUITY.001` | Authority 开 ⇒ snapshot 可读 **或** 可操作错误（非空糊 exception） | `ccbContinuitySnapshot.ts` · `conversationContinuity.ts` | unit null 分支；UI 更新面板 smoke | ui |
| `WANd.MCP.HEALTH.CONFIG.001` | required_paths 相对同一 InstallDir；banner 含绝对 missing | `ccbMcpHealth.ts` · `ccbStartupReadiness.ts` · manifest | unit health fail ids；Guid banner | ui |
| docs-only runbook | 员工残留清盘步骤 | update-runbook / FAQ | manual | packaging |

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 0 | P0 | 现场诊断：list-installs + 三文件 Test-Path + 记下 health 绝对 missing | contracts above | packaging | ops / user | research | `field-evidence.md` 钉 H1/H2/H3 | Release |
| 1 | P0 | TDD：InstallDir 候选含 Programs + registry；优先序 | `WANd.INSTALL.RESOLVE.001` | packaging | TDD → implement | `ccbWandingRuntimeNode.ts` | GREEN unit | Standard |
| 2 | P0 | Continuity：null 原因分级文案；可选不阻断仅更新面板 | `WANd.INSTALL.CONTINUITY.001` | ui | implement | continuity* | 错误可操作 | UI |
| 3a | P1 | 若 H2：价库路径进 staging gate / whitelist | packaging | packaging | build gate | whitelist · manifest | staging PASS | Release |
| 3b | P1 | 若 H3：bootstrap/`ensure-wanding-settings` 保证 `.env.accurate` | packaging | packaging | bootstrap | ensure-wanding-settings | file exists after Quick/Full | Release |
| 4 | P1 | Runbook：完全退出 · repair · 重装；链到 Check Install | docs | — | doc | guides | linked from delivery-1.1.9 | Fast |
| 5 | — | Gate：code-reviewer → vitest → 复现机或干净装 smoke | all | — | code-reviewer | — | PASS | Release |

**Serial:** 0 定 H → 1 必做 → 2 → 3a/3b 按证据 → 4 → 5。

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| Install resolve | `WANd.INSTALL.RESOLVE.001` | 当前候选表无 Programs → 新测期望 resolve 到 Programs fixture | aionui vitest `ccbWandingRuntime*` / 新增 | same |
| Continuity null | `WANd.INSTALL.CONTINUITY.001` | authority+null install → 旧 throw 模糊；RED=诊断错误类型 | unit | same |
| Health ids | `WANd.MCP.HEALTH.CONFIG.001` | N/A characterization：fail ids 匹配 screenshot | vitest collect failed ids | same |

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| `WANd.INSTALL.RESOLVE.001` | unit + 员工机 `resolve`/Check Install | 路径 = Programs | pending |
| `WANd.INSTALL.CONTINUITY.001` | 更新面板不再无意义 INTERNAL；或 snapshot OK | screenshot | pending |
| Health B | Guid banner 消失或仅可行动提示 | screenshot | pending |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-15-install-1-1-9-residue-continuity/execution-plan.md` | PASS (2026-07-15) | done |

## Verification profile and gate

**Selected:** Release · UI

1. Phase 0 field evidence（禁止无路径瞎改 NSIS）  
2. Contract Verification  
3. **code-reviewer**（Layer A if settings/picker；Layer B if renderer banner）  
4. `ccb-check-install` + 可选 clean VM 1.1.9  
5. `trellis-update-spec`（resolve 规则写入 whitelist/release）  
6. finish-work  

## Parallelization

Phase 4 runbook 可与 Phase 1 并行（docs）。Phase 3a 仅 H2 确认后开，避免与「只修 resolve」抢范围。

## Manual steps (human / IT)

- [ ] 员工机跑 research 中诊断块；贴回 `field-evidence.md`  
- [ ] 完全退出（托盘）后用 **AionUiLauncher** 重开试一次  
- [ ] 若仅缺 `.env.accurate`：`ensure-wanding-settings.ps1 -InstallDir Programs\...`  
- [ ] 多根：`repair-wanding-install-dir` / 卸残留后再装  
- [ ] 更新面板 + Word 助手会话各 smoke 一次  

## Recovery and re-approval

| Trigger | Return to | Re-approval? |
|---------|-----------|--------------|
| 证据证明 H2 包装漏 | Phase 3a | yes（范围扩到 NSIS） |
| 仅 H3 bootstrap | Phase 3b；可降 Release 深度 | no if AC 不变 |
| 修 resolve 后 B 仍缺价库 | Phase 0 再采证 | yes |

## Defer / out of scope

- Word 公文排版  
- Memory OpenSpec change  
- Guid 单入口 / orchestrator dispatch（其它 task）  
