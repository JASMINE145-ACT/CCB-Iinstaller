# Execution Plan — `07-12-release-1.1.9`

| Field | Value |
|-------|--------|
| **Status** | **done** — installer built; VPS/manifest skipped per user |
| **Approved** | 2026-07-12 |
| **Scenario** | **J**（发布打包） |
| **Plan depth** | **Full** |
| **Verification profile** | **Release** |
| **Active phase** | Phase -1 / 0 — planning complete; build blocked until **执行** |
| **Baseline** | [`ccb-installer/delivery-1.1.8-2026-07-07.md`](../../../ccb-installer/delivery-1.1.8-2026-07-07.md) |
| **Parent feature** | [`07-12-supplier-directory-vs-price-library`](../07-12-supplier-directory-vs-price-library/execution-plan.md) |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | Scenario J playbook; Contract → TDD → Contract Verification |
| trellis-before-dev | Read: | `get_context.py --mode packages` → backend/frontend/integration layers |
| wanding-release-standard | Read: | §0 四链、§3.1 Full NSIS、config_generation |
| packaging-backlog-1.1.8 | Read: | 1.1.8 门禁 + build 命令范式 |
| delivery-1.1.8 | Read: | gen 6、aioncore 0.1.29、org mapping scope |
| 07-12-supplier-directory | Read: | Phases 1–7c done; Phase 7 smoke + Phase 8 fidelity in repo |
| git log (claude-code-best) | Shell: | HEAD `bfbe88da`; main ahead; supplier + work-tasks + ACP in recent commits |
| git status (aionui-src) | Shell: | HEAD `6536e96`; large uncommitted UI delta (suppliers, work-tasks, wecom, employee) |
| conversation evidence | — | Phase 7b/7c PASS; code-reviewer Layer A/B PASS on supplier deploy + SuppliersPage |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | done | capability matrix + scenario J locked |
| Phase 0 plan lint | done | `lint_execution_plan.py` PASS |
| Phase 0 approve | done | user: Phase8 列入；双仓 commit OK；WeCom 文档链接 fleet 默认关；**manifest 要做** |
| Phase 0 WeCom docs gate | done | preload `__wecomDevDocs` + code-reviewer PASS |
| Phase 0 commit + gen 7 | done | aionui `be8ff2c`; ccb `cc9e3aa0`+`891d9be2`; AionCore `750e28d`; gen 7 |
| Phase 1 pre-build tests | done | cargo 9 + bun 4 + health 2/2 + eval 80/80 |
| Phase 2 Full NSIS | done | `CCB-Wanding-1.1.9.exe` sha256 `94DE17B1…0E6998` |
| Phase 3 verification | done | staging supplier ✅; delivery written; manual checklist on install |
| Phase 4 VPS/manifest | **skipped** | user 2026-07-12：不需要上传 VPS，打包 1.1.9 即可 |

---

## Task summary

**Goal:** 打出 **CCB-Wanding 1.1.9** Full NSIS，**囊括 1.1.8 之后 dev 已验的全部 fleet 可见更新**（用户明确要求）。

**1.1.9 用户可见变化（相对 1.1.8）：**

1. **供应商名录全栈** — Org API + MCP + `supplier-directory-agent` + orchestrator 委派 + `#/suppliers` UI
2. **NL 查询 + MCP 硬化** — product/supplier query normalize；CSRF retry；agent `q` 契约（Phase 7c）
3. **Field fidelity** — migration 023 + 距离/JSON 列（代码已在 AionCore + aionui；发版前需 re-seed smoke）
4. **Work tasks v2** — RBAC、roster MCP、dashboard/detail、admin manager 识别修复
5. **Price library L2 edit** + knowledge/price 路由增量
6. **Employee profile / org context** + **WeCom** extension 增量
7. **ACP guards** — supplier 委派、direct `mcp__`、禁止 ExecuteExtraTool
8. **config_generation 6 → 7** — 升级刷新 agents + MCP 注册（supplier-directory）

**Explicit NOT in installer:**

| 项 | 说明 |
|----|------|
| VPS org supplier rows | `deploy-org-aioncore-vps.ps1` + `bootstrap-supplier-directory.py` |
| VPS quotation mapping | 803 rows 已存在；不重复 bootstrap |
| manifest publish | Phase 4，用户确认后 |

---

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Release spec | `wanding-release-standard.md` | available | packaging-backlog-1.1.9 |
| Pre-flight health | `test-package-health-split.ps1` | available | manual manifest |
| CCB overlay sync | `sync-claude-code-b-mcp-prefetch.ps1` | available | — |
| Full NSIS build | `build-wanding.ps1` | available | — |
| AionUI rebuild | electron-builder via build-wanding | **required** | **禁止** `-SkipAionUiBuild` |
| aioncore inject | `-AioncorePath` release build | **required** | 1.1.8 exe **不可** — 无 supplier API |
| Supplier unit tests | `cargo test -p aionui-supplier-directory` | available | blocking if fail |
| MCP unit tests | `bun test preview.test.mjs` | available | blocking if fail |
| Agent eval gate | `run-agent-eval-suite.ps1 -Suite smoke` | available | ≥7/15 (1.1.8 同门槛) |
| Code review | code-reviewer | available | trellis-check |
| VPS deploy | `deploy-org-aioncore-vps.ps1` | ops parallel | 非安装包阻塞 |
| VPS manifest | `publish-update-bundle.ps1` | **deferred** | 见 §B9；非发版阻塞 |

**Plan depth:** **Full**  
**Verification profile:** **Release**

---

## 边界与注意点

### B1 — 必须 Full NSIS

| 变更 | 路径 | 原因 |
|------|------|------|
| AionUI | `aionui-src` `#/suppliers`、work-tasks、price-library、wecom | [`wanding-build-path-decision.md`](../../spec/guides/wanding-build-path-decision.md) |
| vendor MCP | `supplier-directory-server`、work-tasks-agent | NSIS robocopy |
| aioncore | 含 `aionui-supplier-directory` + migration 022/023 | 嵌入 release exe |

打包前：

```powershell
Test-Path D:\Projects\aionui-src\out\win-unpacked\AionUi.exe   # False → 禁止 SkipAionUiBuild
# electron-builder 曾被 kill → 删 out\win-unpacked + out\.build-hash 后全量重打
```

### B2 — 四链验收（supplier directory 示例）

| Chain | 1.1.9 检查点 |
|-------|----------------|
| ① 源码→staging | `staging\vendor\mcp-servers\supplier-directory\`；`staging\seed\agents\supplier-directory-agent.md` |
| ② staging→$INSTALL | NSIS vendor + seed/agents |
| ③ $INSTALL→$CONFIG | `config_generation` **7** + bootstrap → `ccb-mcp.json` 含 supplier-directory |
| ④ $INSTALL→$RUNTIME | `sync-aionui-ccb-route-b` + agentSessionProfile 补丁；完全退出重开 |

**Fleet 运行时前提（VPS）：**

- migration **022** (+ **023** if fidelity shipped)
- `bootstrap-supplier-directory.py` seed
- 员工 **org 登录**

### B3 — aioncore 策略（与 1.1.8 不同）

| 选项 | 1.1.9 |
|------|-------|
| 复用 1.1.8 embedded exe | **禁止** — 无 supplier REST/migration |
| `cargo build --release -p aionui-app` | **必须** |
| Windows `STATUS_STACK_BUFFER_OVERRUN` | 改用 Linux cross-build 或 VPS-built artifact；delivery 记录 SHA |

### B4 — config_generation

`ccb-installer/seed/config-ship-manifest.json`：**6 → 7**

触发：`ensure-wanding-settings.ps1` 新增 `supplier-directory` MCP；`supplier-directory-agent` + work-tasks/orchestrator agent seeds 变更。

**不 bump 的后果：** 老用户无 supplier MCP 注册、Guid 仍缺 supplier agent card。

### B5 — 双仓 commit（用户确认：可以）

| Repo | 状态 |
|------|------|
| `claude-code-best` | main ahead + feature 修改（supplier, ACP, build scripts, Trellis） |
| `aionui-src` | uncommitted（suppliers, work-tasks, wecom, employee） |

**用户已同意：** 打包前 **两仓 `git commit`**，delivery 记录 BUILD SHA（不再走 dirty build 路径）。

### B6 — Phase 8 fidelity（用户确认：列入）

代码已在 tree（migration 023、UI `distance_km` 列）。**纳入 1.1.9** — 发版前必须：

- [ ] `bootstrap-supplier-directory.py` re-seed 后 UI 18 列 smoke PASS

### B8 — 企业微信开发文档链接（用户确认：fleet 默认关）

**需求：** 员工安装包内**不显示/不可点**「企业微信开发文档」外链；仅发版负责人本机需要打开文档配置 Bot。

**实现（Phase 0 小改，aionui-src）：**

| 项 | 行为 |
|----|------|
| Fleet 默认 | 隐藏 `WecomAibotExtensionPanel` / `WecomConfigForm` 中的 dev docs 按钮 |
| 本机开启 | 启动 AionUI 前设 `CCB_WANDING_WECOM_DEV_DOCS=1`（或 `true`） |
| 取消 auto-expand | 删除 `ChannelModalContent` 首次发现 ext-wecom 自动展开 |

**不做的：** 不从安装包移除 ext-wecom 扩展代码（仍可在 Settings 手动启用渠道）；VPS manifest 与 WeCom 无关。

**本机示例（PowerShell）：**

```powershell
$env:CCB_WANDING_WECOM_DEV_DOCS = '1'
# 然后启动 AionUI / 从桌面快捷方式需把变量写入 launcher 或用户环境变量
```

### B9 — VPS manifest 是什么？（用户问：不知道什么意思）

**一句话：** 把打好的 `CCB-Wanding-1.1.9.exe` **登记到 VPS 更新服务器**，员工机 **关于 → 检查更新** 才能自动拉到 1.1.9。

| 不做 manifest | 做了 manifest |
|---------------|---------------|
| 安装包在打包机/网盘，需 **人工拷贝 exe** 给员工 | VPS 上有 `manifest.json` 指向 1.1.9 exe + sha256 |
| 员工仍显示旧版本 | 启动时可提示下载并静默/半静默升级 |

**工具：** `ccb-installer/scripts/publish-update-bundle.ps1` + 上传到 `67.216.206.3`（见 `wanding-update-runbook.md`）。

**本计划默认：** **defer** — 你先在本机验 1.1.9，满意后再说「发 manifest」，我们单独做 Phase 4（约 10 分钟运维，不阻塞打 exe）。

### B7 — 1.1.8 继承门禁

| 门禁 | 1.1.9 沿用 |
|------|-----------|
| `Test-NsisPayloadCoverage` gen 7 | PASS |
| `Test-StagingWanDInstall` | PASS |
| Agent eval smoke | ≥7/15 |
| org 历史报价回归 | PASS |
| orchestrator 4/4 全绿 | **defer** |

---

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| **WANd.RELEASE.119.001** | 1.1.9 installer 含 1.1.8 后全部 dev 验收入口 | `build-wanding.ps1`, staging, NSIS | `Test-NsisPayloadCoverage`; `dist/VERSION=1.1.9` | 员工缺功能需手工 sync |
| **WANd.SUPPLIER.DIRECTORY.001** | Org 供应商名录 CRUD + list API | `AionCore/.../supplier_directory`, migration 022 | `cargo test -p aionui-supplier-directory` | 找厂/地址失败 |
| **WANd.SUPPLIER.MATCH.001** | 产品/车型匹配 + NL normalize | `match_score.rs`, MCP preview.mjs | cargo + `bun test preview.test.mjs` | 错误召回 |
| **WANd.SUPPLIER.FIDELITY.001** | 距离 + products/locations JSON 列 | migration 023, SuppliersPage | UI smoke + API field check | 列空白/错位 |
| **WANd.ROUTING.SUPPLIER_DIR.001** | orchestrator → supplier-directory-agent | `wande-orchestrator.md`, `agentSessionProfile.ts` | Agent A/B/C smoke; MCP health | Guid 直调 MCP |
| **WANd.AGENT.GUID_VISIBLE.001** | Guid 可见 supplier agent card | seed agents, deploy-seed-agents | `test-mcp-health -Probe` | 无卡片 |
| **WANd.WORKTASKS.RBAC.002** | manager/admin ACL + roster | work-tasks-agent MCP, aionui dashboard | work-tasks manual smoke | 任务不可见 |
| **WANd.CONFIG.GEN.007** | 升级刷新 agents/MCP gen 7 | `config-ship-manifest.json`, ensure-wanding-settings | post-install `.config-generation.json` | 老配置滞留 |

### Contract card — WANd.RELEASE.119.001

**Behavior protected:** Full NSIS 1.1.9 交付 dev 已验的全部 fleet 功能，四链可达。  
**Primary code:** `ccb-installer/scripts/build-wanding.ps1`, `seed/config-ship-manifest.json`  
**Tests:** `test-package-health-split.ps1`; build-wanding staging tests  
**Eval / smoke:** `dev-test-checklist-1.1.9.md` P0–P5  
**Risk if broken:** 生产员工仍跑 1.1.8 或无 supplier 能力

---

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 0 | P0 | Approve plan + commit strategy | docs-only | ops | User | — | `Status: approved` | Release |
| 0 | P0 | Bump config_generation → 7 | WANd.CONFIG.GEN.007 | config | inline | `seed/config-ship-manifest.json` | gen 7 manifest | Release |
| 0 | P0 | Pre-flight gates | WANd.RELEASE.119.001 | build | Shell | — | health 2/2; eval schema 72/72 | Release |
| 1 | P0 | AionCore release build | WANd.SUPPLIER.* | build | `cargo build --release` | `AionCore/` | `aioncore.exe` with 022/023 | Release |
| 1 | P0 | Unit tests GREEN | WANd.SUPPLIER.* | regression | Shell | supplier crate, MCP | 9+4 tests pass | Release |
| 0 | P1 | WeCom dev docs fleet gate | WANd.WECOM.UI.DOCS.001 | ui | inline | `WecomAibotExtensionPanel.tsx`, `ChannelModalContent.tsx` | 默认隐藏链接 | Release |
| 1 | P1 | aionui-src commit + pin | WANd.SUPPLIER.*, WORKTASKS | ui | git | `aionui-src` | clean SHA in delivery | Release |
| 1 | P0 | claude-code-best commit | WANd.RELEASE.119.001 | ops | git | repo root | clean SHA or dirty doc | Release |
| 2 | P0 | sync + Full NSIS build | WANd.RELEASE.119.001 | build | `build-wanding.ps1` | ccb-installer | `CCB-Wanding-1.1.9.exe` | Release |
| 3 | P0 | Post-build verification | all contracts | release | Shell + eval | staging, install dir | Phase 3 gate table | Release |
| 3 | P0 | code-reviewer | WANd.RELEASE.119.001 | review | Agent: code-reviewer | packaging scope | Layer A PASS | Release |
| 4 | P2 | VPS org deploy | WANd.SUPPLIER.DIRECTORY.001 | ops | deploy scripts | VPS | migration + seed | Release |
| 4 | P2 | manifest publish | docs-only | ops | publish-update-bundle | VPS | deferred | Release |
| 5 | P0 | Delivery artifacts | WANd.RELEASE.119.001 | docs | inline | ccb-installer | delivery + sha256 | Release |

---

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| Supplier match + NL | WANd.SUPPLIER.MATCH.001 | N/A — already GREEN in dev | `cargo test -p aionui-supplier-directory` | same |
| MCP preview + CSRF | WANd.SUPPLIER.MATCH.001 | N/A | `bun test preview.test.mjs` (supplier-directory-server) | same |
| Packaging gates | WANd.RELEASE.119.001 | N/A | `.\ccb-installer\scripts\test-package-health-split.ps1` | same |
| Eval schema | WANd.RELEASE.119.001 | N/A | `node eval\run-agent-eval.mjs` | same |
| NSIS staging | WANd.RELEASE.119.001 | N/A | `build-wanding.ps1` exit 0 + `Test-NsisPayloadCoverage` | same |
| Agent smoke | WANd.ROUTING.SUPPLIER_DIR.001 | N/A | `run-agent-eval-suite.ps1 -Suite smoke -Run` ≥7/15 | same |
| ACP guards | WANd.ROUTING.SUPPLIER_DIR.001 | existing vitest in overlay | `pnpm test` agentSessionProfile (if touched pre-build) | same |

---

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| WANd.SUPPLIER.DIRECTORY.001 | `cargo test -p aionui-supplier-directory` | 9 passed | pending |
| WANd.SUPPLIER.MATCH.001 | `bun test preview.test.mjs` | 4 passed | pending |
| WANd.RELEASE.119.001 | `build-wanding.ps1 -Version 1.1.9` + sha256 | build log + exe hash | pending |
| WANd.CONFIG.GEN.007 | post-install `.config-generation.json` = 7 | screenshot or Get-Content | pending |
| WANd.AGENT.GUID_VISIBLE.001 | `test-mcp-health.ps1 -Probe` supplier agent | PASS line | pending |
| WANd.ROUTING.SUPPLIER_DIR.001 | Guid Agent A/B/C manual | chat transcript or checklist tick | pending |
| WANd.SUPPLIER.FIDELITY.001 | `#/suppliers` 距离列 + VPS seed | UI smoke | pending |
| 1.1.8 regression | org `match_quotation` 历史报价 | checklist P4 | pending |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-12-release-1.1.9/execution-plan.md` | PASS output | pending |

---

## Phase 0 — 落盘与 pre-flight

| Step | Tool | Output |
|------|------|--------|
| 0a | User approve plan | `Status: approved` |
| 0b | `git commit` 两仓（若用户同意） | BUILD SHA |
| 0c | Bump `config_generation` → **7** | `seed/config-ship-manifest.json` |
| 0d | `packaging-backlog-1.1.9.md` + `dev-test-checklist-1.1.9.md` | ✅ 已落盘 |
| 0e | `test-package-health-split.ps1` | 2/2 PASS |
| 0f | `node eval/run-agent-eval.mjs` | 72/72 PASS |

---

## Phase 1 — Build inputs

| Step | Command | Output |
|------|---------|--------|
| 1a | `cargo build --release -p aionui-app` (AionCore) | `target/release/aioncore.exe` |
| 1b | `cargo test -p aionui-supplier-directory` | 9 pass |
| 1c | `bun test preview.test.mjs` | 4 pass |
| 1d | `sync-claude-code-b-mcp-prefetch.ps1` | overlay synced |
| 1e | `sync-dev-wanding-vendor.ps1`（dev 机可选预检） | live vendor parity |

**Normative build block:**

```powershell
cd D:\Projects\claude-code-best

.\ccb-installer\scripts\test-package-health-split.ps1
node eval\run-agent-eval.mjs

Push-Location AionCore
cargo build --release -p aionui-app
cargo test -p aionui-supplier-directory
Pop-Location

Push-Location ccb-installer\mcp_servers\supplier-directory-server
bun test preview.test.mjs
Pop-Location

.\ccb-installer\scripts\sync-claude-code-b-mcp-prefetch.ps1

Push-Location ccb-installer\scripts
try {
  .\build-wanding.ps1 -Version 1.1.9 `
    -AioncorePath D:\Projects\claude-code-best\AionCore\target\release\aioncore.exe `
    2>&1 | Tee-Object -FilePath ..\build-1.1.9-staging-nsis.log
  if ($LASTEXITCODE -ne 0) { throw "build-wanding exit $LASTEXITCODE" }
} finally { Pop-Location }
```

---

## Phase 2 — Post-build verification

| Gate | Command / check | Pass criteria |
|------|-----------------|---------------|
| Version | `staging\dist\VERSION` or install `dist/VERSION` | `1.1.9` |
| Gen | `seed/config-ship-manifest.json` | `7` |
| Supplier MCP | `Test-Path staging\vendor\mcp-servers\supplier-directory\index.mjs` | True |
| Supplier agent | `staging\seed\agents\supplier-directory-agent.md` | True |
| NSIS | `CCB-Wanding-1.1.9.exe` + sha256 | recorded |
| Silent install | `/S /D=D:\CCB-Wanding-test` | bootstrap OK |
| MCP health | `test-mcp-health.ps1 -InstallDir ... -Probe` | PASS incl. supplier |
| Agent eval | `run-agent-eval-suite.ps1 -Suite smoke -Run -Json` | ≥7/15 |
| Route B | `ccb-check-install.cmd` | markers OK |
| **1.1.9 feature** | Guid supplier 委派 + `#/suppliers` | checklist P1 |
| **1.1.8 regression** | org 历史报价 | checklist P4 |

**Gate order (mandatory):** code-reviewer PASS → post-build commands → manual checklist → delivery doc.

---

## Phase 3 — Delivery artifacts

| Artifact | Path |
|----------|------|
| Installer | `ccb-installer/CCB-Wanding-1.1.9.exe` |
| Delivery note | `ccb-installer/delivery-1.1.9-2026-07-12.md` |
| Build log | `ccb-installer/build-1.1.9-staging-nsis.log` |
| Dev checklist | `ccb-installer/dev-test-checklist-1.1.9.md` |
| Backlog | `ccb-installer/packaging-backlog-1.1.9.md` |

---

## Feature matrix — Full NSIS 1.1.9

| Feature | Source | Staging artifact | $INSTALL | $CONFIG | Verified |
|---------|--------|------------------|----------|---------|----------|
| Supplier REST + DB | AionCore 022/023 | aioncore.exe embed | ✅ | — | ☐ |
| Supplier MCP | supplier-directory-server | vendor/mcp-servers | ✅ | ccb-mcp gen7 | ☐ |
| Supplier agent | package agents | seed/agents | seed | agents gen7 | ☐ |
| Orchestrator routing | wande-orchestrator.md | seed/agents | seed | agents | ☐ |
| Suppliers UI | aionui-src | AionUi.exe | ✅ | — | ☐ |
| Work tasks v2 | work-tasks-agent + UI | vendor + AionUi | ✅ | MCP | ☐ |
| Price L2 edit | aionui renderer | AionUi.exe | ✅ | — | ☐ |
| ACP guards | claude-code-B overlay | dist + runtime sync | ✅ | $RUNTIME | ☐ |
| Org 历史报价 (1.1.8) | quotation MCP | vendor | ✅ | skills gen6→7 refresh | ☐ |

`config_generation`: **6 → 7**  
`AionUI rebuilt`: **yes** (mandatory)  
`aioncore`: **new release** (supplier crate — not 1.1.8 binary)

---

## Manual steps (human)

- [x] 批准本 execution-plan（2026-07-12）
- [x] 两仓先 `git commit` — 用户确认可以
- [x] Phase 8 fidelity — **列入**
- [ ] 回复「**执行**」启动：WeCom docs gate → commit → build
- [ ] 本机配 WeCom 文档：`CCB_WANDING_WECOM_DEV_DOCS=1`（仅你的电脑）
- [ ] 打包后：完全退出 AionUI → 安装 1.1.9 → org 登录 → 新建 Guid
- [ ] 跑完 `dev-test-checklist-1.1.9.md`
- [ ] VPS：`deploy-org-aioncore-vps.ps1` + supplier bootstrap（与安装包并行）
- [ ] manifest publish — **可选**；需要员工自动更新时再说

---

## Recovery

| Trigger | Action | Re-approval |
|---------|--------|-------------|
| `build-wanding` FAIL | 读 log；NSIS coverage / AionUI OOM | 若改 scope |
| aioncore release 本地失败 | Linux/VPS build artifact | no |
| Agent eval <7/15 | 对照 1.1.7/1.1.8 defer；Guid+supplier 红则阻塞 | yes if lowering gate |
| upgrade 后无 supplier MCP | 确认 gen 7 + bootstrap | no |
| dirty tree | commit 或 delivery 标注 | no |
| Phase 8 seed 未就绪 | 阻塞或 sign-off 022-only | yes |

---

## Parallel split + merge

| Stream | Owner | Merge rule |
|--------|-------|------------|
| A: claude-code-best build + NSIS | packaging agent | Single merge owner — no parallel NSIS |
| B: aionui-src electron build | same session before NSIS | Pin SHA in delivery |
| C: VPS org deploy | ops (human) | Independent; smoke after A installs |

---

## Defer / out of scope

- VPS manifest + `publish-update-bundle.ps1`（Phase 4）
- orchestrator eval 4/4 全绿
- manufacturing pilot
- Trellis finish-work for 07-12（发版后可单独关 task）

---

## Link to parent task

发版完成后更新 [`07-12-supplier-directory-vs-price-library/execution-plan.md`](../07-12-supplier-directory-vs-price-library/execution-plan.md) Progress：

- Phase 7 live smoke → done（若 checklist PASS）
- Phase 8 → done（若 fidelity shipped）
