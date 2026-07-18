# PRD — CCB-Wanding 2.0.0 Full NSIS 发布（全量捆绑）

| Field | Value |
|-------|--------|
| **Task ID** | `07-18-release-2.0.0` |
| **Created** | 2026-07-18 |
| **Status** | planning |
| **Priority** | P0 |
| **Scenario** | J（发布/打包）+ 局部 C（安装现场 bug 收口） |
| **Repos** | claude-code-best（installer / dist / MCP / python / seed）· aionui-src（renderer/main/preload）· AionCore（aioncore.exe） |
| **Baseline** | 1.1.9（`delivery-1.1.9-2026-07-12.md`，SHA256 `5D964506…947B`，config_generation 7） |
| **Build path** | **Full NSIS**（禁止 `-SkipAionUiBuild`；aioncore `cargo build --release`） |

## Goal

把 1.1.9 之后累积的**全部**未提交工作打成一个 2.0.0 Full NSIS 安装包，其中**头等目标**是让"安装残留 / 版本解析"现场问题（Symptom A/B）在员工机上可闭环自愈：

1. **安装自愈（用户最重要）**：Full NSIS 一步 stale-purge（`DirectoryLeave`）+ 桌面端 InstallDir resolve 修复（Programs + 注册表）随同一个包发货 —— 两半必须同包，否则 A 仍复现。
2. **全量特性入包**：供应商名录 / Word 文档工具链 / 会话沉淀 / orchestrator handoff+relay / 员工智能层 + org-knowledge mutate / 价库 / 报价 / work-tasks / 库存 AI / workspace-todo 等 dev 已验内容。
3. **打包完整性**：对每个入包特性走 `wanding-release-standard` §0 四链（源→产物→$INSTALL→$CONFIG/$RUNTIME）；不重复 §11 历史缺口。

## 版本号语义

1.1.9 → **2.0.0** major bump：安装器交互行为变更（`DirectoryLeave` 主动清理残树）+ 全量特性捆绑，属破坏性/里程碑级发布。

## Symptoms this release must close（现场，安装侧）

| ID | Surface | 机制 | 2.0.0 修复 |
|----|---------|------|-----------|
| **A** | 应用内更新失败「无法读取当前安装版本信息」 | InstallDir/CLI resolve 落到旧/空树 → snapshot null | purge 清残 + 桌面 resolve 补 Programs/registry（同包） |
| **B** | Guid 顶栏 `config check failed: .env.accurate / price-library dist / price_library_main.py` | health 在解析到的 InstallDir 查 required_paths 失败 | resolve 修 + bootstrap `ensure-wanding-settings` + 核价库 vendor 是否真漏包（H2/H3 判定） |

## Acceptance criteria

- [ ] **Phase 0 特性清单**：全量未提交工作归类为 feature matrix（§8.1 Full NSIS 模板），每行标 源/产物/$INSTALL/$CONFIG-$RUNTIME/验收；dev 未验或有风险的显式标 IN/OUT。
- [ ] **注册闭包**（§4 pre-build）：每个新 skill / slash command / agent / runtime script 都答完 build 产物 / NSIS File / $CONFIG deploy / $RUNTIME / manifest / hot-zip 六问。
- [ ] **安装头等项**：stale-purge + resolve 两半同包；`DirectoryLeave` 交互 + `/S` 静默路径 smoke PASS；`ccb-check-install` 通过；干净 VM 双树 smoke（现场 dual-tree 转 IT 事后核验）。
- [ ] **config_generation 7→8**（有 agent/seed 变更）；`Test-StagingWanDInstall` / `Test-NsisPayloadCoverage` PASS（gen 8）。
- [ ] **四链**：staging 含每个特性文件；NSIS `File` / hot §16.1 已登记；bootstrap 冷装+升级到 $CONFIG；`ccb-check-install` runtime route-b + acp-agent OK。
- [ ] **回归**：aioncore `cargo test`（含 supplier crate）；MCP 单测；`test-mcp-health.ps1 -Probe -Session`；`smoke-wanding-e2e.ps1`；`run-agent-eval-suite.ps1 -Suite smoke`。
- [ ] **交付物**：`CCB-Wanding-2.0.0.exe` + sha256；`delivery-2.0.0-*.md`（feature matrix 签字 + git SHAs + dirty）；`release-notes-员工.md` / `release-notes-ops.md`（合入 `release-notes-ops-draft-2.0.0-stale-purge.md`）；build log（Tee-Object）。
- [ ] **§6.9**：任何出 exe 之后的 packaging 修复 → 必须重打并刷新 SHA256。

## Non-goals

- 修 Word 公文排版能力本身（另 task）
- 全盘 redesign 更新 UI
- 现场 dual-tree 实机取证作为**发货阻塞**（已定 defer 到 IT 事后）
- VPS org API 部署（发版后运维，非安装包阻塞）

## Related

- Spec：`wanding-release-standard.md`（§0/§2.3/§4/§5.5/§6.8-6.9/§10）· `wanding-packaging-whitelist.md`（§7 $shipScripts + 运行时闭包 · §16.1 hot）· `.cursor/rules/wanding-release-packaging.mdc`
- 前置 task：`07-15-install-1-1-9-residue-continuity`（安装自愈）· `07-12-release-1.1.9`（打包模板）
- Ops 草稿：`ccb-installer/release-notes-ops-draft-2.0.0-stale-purge.md`
- Backlog：`ccb-installer/packaging-backlog-1.1.9.md`
