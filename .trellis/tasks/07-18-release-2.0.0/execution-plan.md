# Execution Plan — `07-18-release-2.0.0`

| Field | Value |
|-------|--------|
| **Status** | active — Phase 4/5（exe built; other-PC install pending） |
| **Scenario** | J（发布/打包）+ 局部 C（安装现场收口） |
| **Plan depth** | Full |
| **Verification profile** | Release（+ UI for 安装/更新面板 smoke） |
| **Active phase** | Phase 5（交付物已落盘；装机验收转其他电脑） |
| **Repos** | claude-code-best · aionui-src · AionCore |
| **Risk tags** | `packaging` `cross-repo` `ui` `migration`(config_gen) `long-running` |
| **Baseline** | 1.1.9（config_generation 7） |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | plan-only · Contract→TDD→Verify · Scenario J |
| skill-selection §三 J | Read: | 打包硬门禁：先读 release spec + 闭包再 build |
| wanding-release-standard | Read: | §0 四链 · §2.3 seed skill · §5.5 LASTEXITCODE · §6.8 live≠staging · §6.9 repack · §10 wallet card |
| wanding-packaging-whitelist | Read: | §7 $shipScripts + bootstrap/deploy 运行时闭包 · §16.1 hot IN |
| 07-15-install residue task | Read: | prd/plan/p05/research —— 安装两半状态与缺口 |
| git status/log + build-wanding.ps1 + installer-wanding-v2.nsi | Shell/Grep: | 安装脚本已入 $shipScripts(L801-803) + NSI DirectoryLeave(L76-140) |
| config-ship-manifest.json | Read: | 当前 config_generation = 7 |

> **ecc:verification-loop**（Scenario J 步 4）待 Phase 0 后于执行期取验证命令集（本仓库 Cursor：`Read:` 等价 + `ecc:verification-loop` 若可用）。

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | done | capability matrix + plan lint PASS |
| Phase 0 | done | `feature-matrix-2.0.0.md` |
| Phase 1 | done | purge wiring PASS · config_gen **8** · code-reviewer PASS |
| Phase 2 | done | vitest 19/19 · purge smokes · python fixed · aioncore release build · CCB 12 known stale non-blocking |
| Phase 3 | done | `CCB-Wanding-2.0.0.exe` · SHA256 `67D427CB…2A54` · BUILD_EXIT=0 · staging validation PASS |
| Phase 4 | partial | staging四链 spot-check PASS；**装机/升级** → 用户其他电脑 |
| Phase 5 | done | `delivery-2.0.0-2026-07-18.md` · 员工/ops notes |
| Gate | in_progress | code-reviewer PASS（代码改动）→ 装机证据待其他电脑 → finish |

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| 特性清单/探索 | `Agent: explore` → 落盘 feature matrix | available | 主 session grep/read + 手写 |
| 打包验证命令集 | `ecc:verification-loop` | 待测（Cursor 可能 unavailable） | `Read:` release spec §5–6 命令 |
| Build | `build-wanding.ps1 -Version 2.0.0` | available | — |
| Staging gate | `Test-StagingWanDInstall` / `Test-NsisPayloadCoverage` | available | manifest 手对 |
| Runtime verify | `ccb-check-install.cmd` / `test-install-health.ps1` | available | — |
| MCP smoke | `test-mcp-health.ps1 -Probe -Session` | available | — |
| E2E/eval | `smoke-wanding-e2e.ps1` / `run-agent-eval-suite.ps1` | available | — |
| Review | `code-reviewer` agent | available | trellis-check |
| aioncore build | `cargo build --release` + `cargo test` | available | — |
| aionui build | `build-with-builder.js --pack-only` | available | — |

## Contract map

安装为头等契约；其余为"入包完整性"契约（Phase 0 逐特性登记，四链验收）。

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.INSTALL.STALE_PURGE.001` | `DirectoryLeave` 检测 Keep 外带 VERSION 树并清 owned 足迹；永不删 `.claude`；`/S` = IT 预同意 | `purge-stale-wanding-installs.ps1` · `installer-wanding-v2.nsi` · `ccb-purge-stale-installs.cmd` | `test-purge-stale-wanding-installs.ps1` · `test-purge-packaging-wiring.ps1` | packaging |
| `WANd.INSTALL.RESOLVE.001` | 桌面 InstallDir resolve = env→registry→Programs→legacy；不吞声落残树 | aionui-src `ccbWandingRuntimeNode.ts`（**须随 Full NSIS 出桌面包**） | vitest `ccbWandingRuntimeNode.test.ts`（2/2） | packaging |
| `WANd.RELEASE.CHAIN.2.0.0` | 每入包特性满足四链（源→产物→$INSTALL→$CONFIG/$RUNTIME）；§11 缺口不复现 | `build-wanding.ps1` · `installer-wanding-v2.nsi` · manifest | `Test-StagingWanDInstall` · `Test-NsisPayloadCoverage` · `ccb-check-install` | packaging |
| `WANd.RELEASE.CONFIGGEN.001` | agent/seed 变更 → config_generation 7→8 → ship reset + runtime 清缓存 | `seed/config-ship-manifest.json` | Check Install `.config-generation.json` | migration |
| docs-only/no-runtime-contract | 员工/ops release notes + runbook（合入 stale-purge 草稿） | `release-notes-*.md` · runbook | link/schema 校验 | packaging |

> 前置 task `07-15-install-1-1-9-residue-continuity` 的 STALE_PURGE/RESOLVE 已 done（smoke+vitest+code-reviewer PASS）；本任务对其做**同包核验 + 装机验收**，不重做实现。

## Feature scope（full bundle — Phase 0 产出 `feature-matrix-2.0.0.md` 逐行四链）

> 下表为 git WIP 归类初稿；每行的 源/产物/$INSTALL/$CONFIG-$RUNTIME/dev 验收 由 Phase 0 钉实并标 **IN/OUT**。未 dev 验或有风险的默认 **OUT** 直到取证。

| # | 特性域 | 代表变更 | 需重建 | 登记要点（§4 六问） |
|---|--------|----------|--------|----------------------|
| F0 | **安装自愈（头等）** | NSI DirectoryLeave · purge/find/repair 脚本 · list/purge cmd · aionui resolve | aionui-src | $shipScripts✓ · NSI File✓ · Start-Menu 快捷方式 · 桌面包必带 resolve |
| F1 | 供应商名录/检索 | `supplier-directory-server` · **删** supplier-directory-agent.md | dist/MCP | agent 删除 → seed deploy 需清旧 md · config_gen |
| F2 | Word 文档工具链 | `lib/wand-document-spec/` · word-creator.md · install-office-word-mcp.ps1 | — | site-packages 闭包（§17.5）· seed agent · MCP DocumentSpec 工具 |
| F3 | 会话沉淀 | precipitation worker/gates/outcome/redaction + tests | dist/python | skill deploy + `$requiredSeedSkills` · $shipScripts |
| F4 | Orchestrator handoff/relay | `handoffBrief.ts` · outcome relay(已提交) · wanDMcpWarmup | dist | acp overlay $RUNTIME sync · dist rebuild |
| F5 | 员工智能层 + org mutate | `org_knowledge_mutate.py` · admin client/dispatch/payloads | python | vendor/wanding/python 白名单 · manifest |
| F6 | 价库 | `price-library-server/dist` · load-hang 修 | dist/MCP | Symptom B 相关 required_paths · settings MCP 登记 |
| F7 | 报价 | quotation dist · quotation-agent · learn-by-data SKILL | dist/MCP | fill_* python 门禁(§16.6 pack gate) · seed skill |
| F8 | work-tasks | `work-tasks-query-server` | dist/MCP | settings MCP · node 裸命令可移植性风险 |
| F9 | 库存 AI 辅助 | inventory item_dump/store/price_gap_fill | python | vendor python 白名单 |
| F10 | workspace-todo 观测 | aionui-src（另仓）workspace 自动展开 + PlanChecklist | aionui-src | 随 Full NSIS 桌面包 |
| F11 | eval/agent-eval | run-agent-eval + response-assertions | — | dev/CI only —— 默认 OUT（不入 $INSTALL） |
| Fdoc | specs/docs/journal | 大量 .md | — | docs-only；不阻塞 release |

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 0 | P0 | **特性清单+注册闭包**：归类 git WIP → feature matrix 四链；每新 skill/cmd/agent/script 答 §4 六问；标 IN/OUT | `WANd.RELEASE.CHAIN.2.0.0` | packaging | `Agent: explore` → 落盘 | `feature-matrix-2.0.0.md` | 每行四链 + IN/OUT + 闭包表 | Release |
| 1a | P0 | **安装两半同包核验**：stale-purge 脚本/NSI + `ccbWandingRuntimeNode` resolve 随桌面包 | `WANd.INSTALL.STALE_PURGE.001` `WANd.INSTALL.RESOLVE.001` | packaging | verify | build-wanding · nsi · aionui | 两半在 staging/桌面包 | Release |
| 1b | P0 | **config_generation 7→8** + reset_targets 核对 | `WANd.RELEASE.CONFIGGEN.001` | migration | edit + gate | config-ship-manifest.json | gen=8；Check Install 读到 | Release |
| 2 | P0 | **源码回归**：aioncore cargo build+test；MCP 单测；python 单测；aionui vitest（含 resolve/workspace-todo） | all above | cross-repo | TDD/回归 | 各仓测试 | 全绿命令输出 | Standard |
| 3 | P0 | **Full NSIS build**：aioncore→aionui pack→build-wanding 2.0.0（Tee-Object log；禁 SkipAionUiBuild）→ makensis | `WANd.RELEASE.CHAIN.2.0.0` | packaging | build | build-wanding.ps1 | staging gate PASS(gen8) + exe | Release |
| 4 | P0 | **装机验证**：clean VM 冷装 + 1.1.9→2.0.0 升级；四链 A/B/C/D；安装 A/B smoke；MCP/E2E/eval smoke | all | packaging/ui | ccb-check-install + smokes | — | 四链 PASS + 截图 | Release/UI |
| 5 | P1 | **交付物**：delivery-2.0.0 + feature matrix 签字 + git SHAs/dirty；员工/ops notes（合入 stale-purge 草稿）；SHA256 | docs-only/no-runtime-contract | packaging | doc | delivery/notes | 交付包完整 | Fast |
| G | — | **Gate**：code-reviewer → Contract Verification → trellis-update-spec → finish-work | all | — | code-reviewer | — | PASS | Release |

**Serial:** 0 → 1a/1b → 2 → 3 → 4 →（若修包 §6.9 repack 回 3）→ 5 → G。

## TDD contract

发布任务以"回归绿 + 装机验收"为 TDD 等价；实现契约已在各前置 task 完成，本任务 RED = 打包/装机门禁的失败态。

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| 安装两半 | `WANd.INSTALL.STALE_PURGE.001` | 移除 NSI File / shipScripts 行 → wiring smoke FAIL | `powershell -File .\ccb-installer\scripts\test-purge-packaging-wiring.ps1`（+ `test-purge-stale-wanding-installs.ps1`）→ PASS | 同命令保持 GREEN |
| resolve | `WANd.INSTALL.RESOLVE.001` | 旧候选无 Programs → vitest RED | aionui `vitest ccbWandingRuntimeNode`（2/2 GREEN） | same |
| staging 完整性 | `WANd.RELEASE.CHAIN.2.0.0` | 漏 ship 某新 script/skill → `Test-StagingWanDInstall` FAIL（RED） | `Test-StagingWanDInstall` / `Test-NsisPayloadCoverage`(gen8) GREEN | same |
| config_gen | `WANd.RELEASE.CONFIGGEN.001` | gen 仍为 7 → Check Install 不触发 reset（RED） | Check Install 读 `.config-generation.json`=8 GREEN | same |
| 源码回归 | all | 现失败/未跑测试 | `cargo test` + MCP `bun test` + `pytest` + aionui vitest 全 GREEN | same |

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| `WANd.INSTALL.STALE_PURGE.001` | `test-purge-packaging-wiring.ps1` + `test-purge-stale-wanding-installs.ps1` + 装机 DirectoryLeave/`/S` | GREEN + purge log | pending |
| `WANd.INSTALL.RESOLVE.001` | aionui vitest + clean VM 更新面板不再 INTERNAL | vitest 2/2 + 截图 | pending |
| `WANd.RELEASE.CHAIN.2.0.0` | `Test-StagingWanDInstall` + `Test-NsisPayloadCoverage`(gen8) + `ccb-check-install` | build gate PASS + Check Install OK | pending |
| `WANd.RELEASE.CONFIGGEN.001` | Check Install `.config-generation.json` | =8 + reset 触发 | pending |
| Symptom B（价库/.env） | `ccb-check-install` 绝对 missing 判定 H2(漏包)/H3(bootstrap) | banner 消失或仅可行动 env 提示 | pending |
| MCP/E2E/eval | `test-mcp-health.ps1 -Probe -Session` · `smoke-wanding-e2e.ps1` · `run-agent-eval-suite.ps1 -Suite smoke` | PASS/≥阈值 | pending |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-18-release-2.0.0/execution-plan.md` | PASS | pending |

## Verification profile and gate

**Selected:** Release（+ UI）

1. Phase 0 特性清单 + 注册闭包（**未完成不得开跑 build-wanding**，§skill-selection J 硬门禁）
2. 源码回归绿 → Full NSIS build → staging gate（gen8）
3. **Contract Verification**（上表每行证据）
4. **code-reviewer** 主审（安装脚本/NSI → Layer A settings/routing 视触及；aionui renderer → Layer B `smoke-renderer-imports.mjs`）
5. 装机四链 A/B/C/D + `ccb-check-install`（**live≠staging §6.8**）
6. `trellis-update-spec`：resolve/purge 规则与 2.0.0 gen 写入 whitelist/release-standard §11 状态更新
7. delivery + notes + SHA256；**§6.9：出 exe 后再修包必须 repack 刷 SHA256**
8. `git commit`（用户明确要求时）→ `/trellis:finish-work`

## Parallelization（Scenario D-lite，串行合并）

| Agent | Scope | Merge rule |
|-------|-------|------------|
| A | ccb-installer staging/manifest/NSI + $shipScripts 闭包 | manifest/JSON 先落 |
| B | aionui-src（resolve + workspace-todo）+ vitest | 桌面包 pack 在 build 前串行合并 |
| C | AionCore cargo build/test | 二进制注入 build-wanding `-AioncorePath` |

Phase 0 探索可并行；build（Phase 3）必须串行（aioncore → aionui pack → build-wanding → makensis）。

## Manual steps (human / IT)

- [ ] Phase 0：确认 F1–F11 各特性 dev 验收状态，逐条 IN/OUT 签字
- [ ] clean VM 冷装 + 1.1.9→2.0.0 升级各一次；**完全退出（含托盘）**后 AionUiLauncher 重开
- [ ] 更新面板 smoke（Symptom A）+ Guid Word 助手会话 smoke（Symptom B）
- [ ] 现场 dual-tree 实机核验 → **转 IT 事后**（已 defer，ops notes 标注）
- [ ] delivery note feature matrix 签字（cold ☐ / upgrade ☐）

## Recovery and re-approval

| Trigger | Return to | Re-approval? |
|---------|-----------|--------------|
| Phase 0 发现某特性 dev 未验/风险高 | 标 OUT 或降级；更新 feature matrix | yes（缩/扩范围） |
| Symptom B 证明价库真漏包（H2） | Phase 1a 加 whitelist/staging File | yes（NSI 变更） |
| Symptom B 仅 bootstrap（H3） | Phase 1a：ensure-wanding-settings 保证 `.env.accurate` | no（AC 不变） |
| staging/装机门禁 FAIL | 回对应 Phase 修 → 若已出 exe §6.9 repack | no if scope 不变 |
| 同一构建/测试两连败 | `trellis-break-loop` / systematic-debugging；根因落 research | no |

## Defer / out of scope

- 现场 dual-tree 实机取证作为发货阻塞（→ IT 事后）
- VPS org API 部署（发版后运维）
- Word 公文排版能力本身、更新 UI redesign
- `eval/*`、`test-*`、dev/CI 脚本入 $INSTALL（F11 默认 OUT）
