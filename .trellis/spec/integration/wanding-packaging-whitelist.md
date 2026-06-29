# CCB-Wanding 合并安装包 — 打包白名单

> **第一版发货入口：** **[`wanding-first-ship.md`](./wanding-first-ship.md)** — §1–§2 清单与缺口 · **§5 打包路径与踩坑**  
> **Status:** v2 **implemented** (2026-06-19) — `build-wanding.ps1` + `installer-wanding-v2.nsi`.  
> **Supersedes:** ad-hoc `installer-wanding.nsi` file list for WanD shipping. Legacy NSIS = backup / terminal-stack only.  
> **Related:** [`wanding-first-ship.md`](./wanding-first-ship.md) · [`../frontend/dev-test-ship.md`](../frontend/dev-test-ship.md) §7 · [`../backend/build-deploy-verify.md`](../backend/build-deploy-verify.md) · [`aionui-ccb-boundary.md`](./aionui-ccb-boundary.md) · [`mcp-health.md`](./mcp-health.md) · [`../frontend/aionui-update-mechanism.md`](../frontend/aionui-update-mechanism.md) · [`internal-update.md`](./internal-update.md) §16

---

## 1. Product layout

| Path | Role |
|------|------|
| `%LOCALAPPDATA%\Programs\CCB-Wanding\` | **Program files** (`$INSTALL`) — overwritten on upgrade |
| `%LOCALAPPDATA%\CCB-Wanding\.claude\` | **User config** (`$CONFIG`) — preserved on upgrade |
| `%APPDATA%\AionUi\` | AionUI session / user data — separate from CCB config |

**Merged tree (v2):**

```text
%LOCALAPPDATA%\Programs\CCB-Wanding\
├── AionUi\                    ← Electron frontend + bundled aioncore (route-b patched)
│   ├── AionUi.exe
│   └── resources\bundled-aioncore\win32-x64\...
├── dist\                      ← CCB-Wanding cli.js + chunks
├── vendor\                    ← bun, git, ripgrep, python, MCP, wanding data
├── scripts\                   ← post-install hooks
├── seed\                      ← agent + gate skill seeds (deployed to $CONFIG)
├── ccb.ico
├── ccb-launch-aionui.cmd        ← 主快捷方式 target
├── ccb-check-install.cmd        ← Check Install
├── ccb-wanding-versions.cmd     ← 更新入口「检查更新 / 版本选择」
├── ccb-verify-update.cmd        ← 运维诊断
├── ccb-wanding.cmd              ← terminal / diagnostic fallback
├── ccb-diagnose.cmd
└── uninstall.exe
```

**route-b** resolves `$INSTALL` via `%LOCALAPPDATA%\Programs\CCB-Wanding` when `dist\cli.js` + `vendor\bun\bun.exe` exist — no ACP-layer change required. See `ccb-installer/patches/aionui-ccb-route-b/index.js` `resolveInstallDir()`.

**Desktop shortcut (v2):** `$INSTALL\ccb-launch-aionui.cmd` (not direct `$INSTALL\AionUi\AionUi.exe`). The launcher runs `run-wanding-bootstrap.ps1` before AionUI and exports `CCB_INSTALL_DIR` / `CCB_WANDING_HOME` so route-b uses this install root instead of stale fallback slots.

---

## 2. Build pipeline (four steps)

| Step | Source | Staging | Notes |
|------|--------|---------|-------|
| 1 | `D:\claude-code-B\` → `bun run build` | `staging\dist\` | Do **not** use `ccb-installer\dist\` |
| 2 | `D:\Projects\aionui-src\` → `build-with-builder.js --pack-only` | `staging\AionUi\` | From `out\win-unpacked\` only; no electron-builder NSIS |
| 3 | Repo vendor + `python\` + `data\` + `mcp_servers\` | `staging\vendor\`, `staging\seed\`, … | Self-contained; no `..\` escapes |
| 4 | NSIS | `CCB-Wanding-x.y.z.exe` | Reads **only** `ccb-installer\staging\` |

**Staging root:** `D:\Projects\claude-code-best\ccb-installer\staging\`

**Planned driver:** `ccb-installer\scripts\build-wanding.ps1` — implemented; OOTB contract §17.

**route-b + acp-agent patch (build step 2, before NSIS):**

```text
index.js 源: ccb-installer/patches/aionui-ccb-route-b/index.js
acp-agent.js 源: ccb-installer/patches/aionui-acp/acp-agent.js
目标目录: staging\AionUi\resources\bundled-aioncore\win32-x64\managed-resources\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\
```

`build-wanding.ps1` 在 robocopy 后写入两者；`Test-StagingWanDInstall` fail-closed。**禁止** `sync-aionui-ccb-patch.ps1` 覆盖 `index.js`。

---

## 3. Section A — AionUI (`staging\AionUi\`)

**Copy rule:** mirror entire `D:\Projects\aionui-src\out\win-unpacked\**` → `staging\AionUi\**` → `$INSTALL\AionUi\**`

**Hard dependencies:**

```text
$INSTALL\AionUi\AionUi.exe
$INSTALL\AionUi\resources\bundled-aioncore\win32-x64\aioncore.exe
$INSTALL\AionUi\resources\bundled-aioncore\win32-x64\managed-resources\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\index.js
```

**Exclude from copy:** `D:\Projects\aionui-src\out\` artifacts other than `win-unpacked\` (setup.exe, blockmap, zip).

---

## 4. Section B — CCB dist (`staging\dist\`)

```text
D:\claude-code-B\dist\**
  → staging\dist\**
  → $INSTALL\dist\**
```

**Required:**

```text
$INSTALL\dist\cli.js
$INSTALL\dist\cli-bun.js
$INSTALL\dist\cli-node.js
$INSTALL\dist\chunks\**
$INSTALL\dist\VERSION                    ← single-line bundle id (e.g. 2026.06.18); see §16
```

**`dist/VERSION` write points (shared with hot-update pipeline):**

| When | Script |
|------|--------|
| Dev deploy | `ccb-installer\scripts\deploy-claude-code-b-to-wanding.ps1` (end of run) |
| Release zip / NSIS staging | `build-wanding.ps1` or `publish-update-bundle.ps1` (before pack) |

`internal-upgrade.ps1` reads `{install}/dist/VERSION` only — does not invent version strings.

**`dist/BUILD-INFO.json` (provenance sidecar — 2026-06-21):** `build-wanding.ps1` writes it beside `VERSION` with `version`, `built_utc`, `skip_build`, `skip_aionui_build`, and git `{commit,branch,dirty}` for both source repos (`claude-code-B`, `aionui-src`). Diagnostic only — does **not** alter the `VERSION` contract; lets a shipped exe be audited post-hoc for "which source built this". When `-SkipBuild` / `-SkipAionUiBuild` is used, the build also prints a loud **non-fatal** WARN that `dist\` / `AionUi\` ship from pre-existing artifacts (not rebuilt from source) — the main freshness footgun.

**Exclude if present:**

```text
*\loadAgentsDir-head-test.js
*\loadAgentsDir-test108.js
*\node_modules\**
```

---

## 5. Section C — Vendor runtime

### 5.1 Bun / ripgrep / Git / python-wanding

```text
D:\Projects\claude-code-best\ccb-installer\vendor\bun\**
  → $INSTALL\vendor\bun\**          (hard: bun.exe)

D:\Projects\claude-code-best\ccb-installer\vendor\ripgrep\**
  → $INSTALL\vendor\ripgrep\**

D:\Projects\claude-code-best\ccb-installer\vendor\git\**
  → $INSTALL\vendor\git\**

D:\Projects\claude-code-best\ccb-installer\vendor\python-wanding\**
  → $INSTALL\vendor\python-wanding\**   (hard: python.exe)
```

### 5.2 ppt-master skill (vendor copy; deploy to $CONFIG at install)

```text
D:\Projects\claude-code-best\ccb-installer\vendor\ppt-master-skill\**
  → $INSTALL\vendor\ppt-master-skill\**
```

**Exclude:**

```text
D:\Projects\claude-code-best\ccb-installer\vendor\ppt-master-src\**
```

### 5.3 MCP servers

| MCP | Build source | Install path | Method |
|-----|--------------|--------------|--------|
| quotation | `D:\Projects\claude-code-best\mcp_servers\quotation-server\dist\**` + runtime `node_modules\**` | `$INSTALL\vendor\mcp-servers\quotation-server\dist\**` + `$INSTALL\vendor\mcp-servers\quotation-server\node_modules\**` | Pre-staged |
| accurate | `D:\Projects\claude-code-best\ccb-installer\vendor\mcp-servers\accurate-mcp\server.py` | `$INSTALL\vendor\mcp-servers\accurate-mcp\server.py` | Pre-staged |
| excel-mcp (COM, lazy) | **External** `mcp-excel.exe` (not in git) | `$INSTALL\vendor\mcp-servers\excel-mcp\mcp-excel.exe` | Pre-staged binary |
| office-word | — | `$INSTALL\vendor\mcp-servers\office-word-mcp\` | Post-install `install-office-word-mcp.ps1` |
| excel (haris) | — | `$INSTALL\vendor\mcp-servers\excel-mcp-server\` | Post-install `install-excel-mcp-server.ps1` |
| exa | — | (none — HTTP in settings) | `ensure-wanding-settings.ps1` |

**Include in staging:**

```text
$INSTALL\vendor\mcp-servers\quotation-server\dist\**
$INSTALL\vendor\mcp-servers\quotation-server\node_modules\**
$INSTALL\vendor\mcp-servers\accurate-mcp\server.py
$INSTALL\vendor\mcp-servers\excel-mcp\mcp-excel.exe
```

**Exclude:**

```text
D:\Projects\claude-code-best\ccb-installer\vendor\mcp-servers\accurate-mcp\test_fixes.py
D:\Projects\claude-code-best\ccb-installer\vendor\mcp-servers\ccb-deploy-mcp\**
Do not exclude `D:\Projects\claude-code-best\mcp_servers\quotation-server\node_modules\**`: current quotation `dist/index.js` imports `@modelcontextprotocol/sdk` at runtime and is not self-contained.
**\__pycache__\**
**\*.pyc
```

> **Naming:** `install-excel-mcp-server.ps1` installs **haris** `excel` MCP (`mcp__excel__*`). COM `excel-mcp` (`mcp-excel.exe`) is a **separate** optional/lazy server — both remain in WanD settings per [`mcp-health-manifest.json`](../../../ccb-installer/config/mcp-health-manifest.json).

### 5.4 Wanding Python + data

**Python (from repo root, filtered):**

```text
D:\Projects\claude-code-best\python\main.py
D:\Projects\claude-code-best\python\quotation\**
D:\Projects\claude-code-best\python\inventory\**
D:\Projects\claude-code-best\python\admin\org_knowledge_client.py
D:\Projects\claude-code-best\python\admin\org_price_client.py
D:\Projects\claude-code-best\python\admin\repository.py
D:\Projects\claude-code-best\python\admin\cache.py
  → $INSTALL\vendor\wanding\python\**
```

**Exclude:**

```text
D:\Projects\claude-code-best\python\test_*.py
D:\Projects\claude-code-best\python\tests\**
D:\Projects\claude-code-best\python\.pytest_cache\**
D:\Projects\claude-code-best\python\_tmp_*.txt
D:\Projects\claude-code-best\python\admin\test_org_knowledge_client.py
D:\Projects\claude-code-best\python\smoke_wanding_e2e.py
```

**Data:**

```text
D:\Projects\claude-code-best\data\ccb-wanding-claude-index.md       → $INSTALL\vendor\wanding\data\  (upgrade: skip if exists)
D:\Projects\claude-code-best\data\ccb-wanding-quotation.md
D:\Projects\claude-code-best\data\ccb-wanding-accurate.md
D:\Projects\claude-code-best\data\wanding_business_knowledge.md
D:\Projects\claude-code-best\data\wanding-matching-architecture.md

D:\Projects\claude-code-best\data\price_library_cleaned_2026_05_15.xlsx  → always overwrite (gitignored — supply at build); role: bootstrap seed until LKG promoted from org
D:\Projects\claude-code-best\data\mapping_table.xlsx                       (nonfatal)
D:\Projects\claude-code-best\data\空白标准报价单.xlsx
```

**Exclude data:**

```text
D:\Projects\claude-code-best\data\ccb-wanding-update-server.md
D:\Projects\claude-code-best\data\ccb-wanding-pricing-system.md
D:\Projects\claude-code-best\data\data.Md
```

> **Ship rule (2026-06-21):** `build-wanding.ps1` ships `data\*.md` by **enumeration minus the "Exclude data" denylist above** (was a hardcoded 5-name list → new SOP/knowledge `.md` got silently dropped). A newly added `.md` now auto-ships; only the three denylisted names stay out. `.xlsx` continue to glob-copy.

### 5.5 Windows Terminal (optional — **default OFF for AionUI ship**)

AionUI 桌面路径（`ccb-launch-aionui.cmd` → `AionUi.exe`）**不依赖** Windows Terminal。仅终端 TUI 栈（`ccb-wanding.cmd` / 旧 CCB 快捷方式）才推荐 WT。

| Build flag | Staging | NSIS post-install |
|------------|---------|-------------------|
| 默认（无 flag） | **不复制** `vendor\windows-terminal\` | `skip_wt`（无 vendor 即跳过） |
| `-IncludeWindowsTerminal` | 复制 vendor + ship `install-windows-terminal.ps1` | 非阻塞跑 WT 安装脚本 |

```text
D:\Projects\claude-code-best\ccb-installer\vendor\windows-terminal\**
  → $INSTALL\vendor\windows-terminal\**   (only when -IncludeWindowsTerminal)
```

---

## 6. Section D — Install root launchers

### IN (v2)

```text
D:\Projects\claude-code-best\ccb-installer\resources\ccb.ico         → $INSTALL\ccb.ico
D:\Projects\claude-code-best\ccb-installer\ccb-launch-aionui.cmd     → $INSTALL\ccb-launch-aionui.cmd     ← 主快捷方式（bootstrap → AionUi.exe；§1）
D:\Projects\claude-code-best\ccb-installer\ccb-check-install.cmd     → $INSTALL\ccb-check-install.cmd     ← Check Install（test-install-health.ps1；§17.6）
D:\Projects\claude-code-best\ccb-installer\ccb-wanding-versions.cmd  → $INSTALL\ccb-wanding-versions.cmd  ← 更新入口「检查更新 / 版本选择」→ ccb-check-update.ps1 -Select（开始菜单快捷方式；internal-update §3.2/§3.7）
D:\Projects\claude-code-best\ccb-installer\ccb-verify-update.cmd     → $INSTALL\ccb-verify-update.cmd     ← 运维诊断（verify-update-server.ps1）
D:\Projects\claude-code-best\ccb-installer\ccb-wanding.cmd           → $INSTALL\ccb-wanding.cmd           ← 终端 / 诊断回退
D:\Projects\claude-code-best\ccb-installer\ccb-diagnose.cmd          → $INSTALL\ccb-diagnose.cmd
```

> **更新入口快捷方式（2026-06-21，internal-update Phase 1 §1.2）：** `ccb-wanding-versions.cmd` 从 legacy「OUT」**提升为 IN** —— 它是员工自助更新的唯一入口（wrap `ccb-check-update.ps1 -Select`，热更新优先逻辑见 `ccb-check-update.ps1`）。打包契约：`build-wanding.ps1` 根启动器拷贝段必须复制它；`installer-wanding-v2.nsi` 建开始菜单快捷方式 **「检查更新 / 版本选择」**。其依赖 `ccb-check-update.ps1` 已在 §17.5 IN 集随包。`ccb-versions.cmd`（CCB-Lite 变体）与 `ccb-update.cmd`（legacy）**仍 OUT**。

### OUT (legacy — do not package)

```text
D:\Projects\claude-code-best\ccb-installer\ccb-flat.cmd
D:\Projects\claude-code-best\ccb-installer\ccb-safe.cmd
D:\Projects\claude-code-best\ccb-installer\ccb-text.cmd
D:\Projects\claude-code-best\ccb-installer\ccb-wanding-flat.cmd
D:\Projects\claude-code-best\ccb-installer\ccb-wanding-safe.cmd
D:\Projects\claude-code-best\ccb-installer\ccb-wanding-text.cmd
D:\Projects\claude-code-best\ccb-installer\ccb-lite.cmd
D:\Projects\claude-code-best\ccb-installer\ccb-template.cmd
D:\Projects\claude-code-best\ccb-installer\ccb.cmd
D:\Projects\claude-code-best\ccb-installer\ccb1.cmd
D:\Projects\claude-code-best\ccb-installer\ccb-recent.cmd
D:\Projects\claude-code-best\ccb-installer\ccb-update.cmd
D:\Projects\claude-code-best\ccb-installer\ccb-wanding-recent.cmd
D:\Projects\claude-code-best\ccb-installer\ccb-versions.cmd
D:\Projects\claude-code-best\ccb-installer\ccb-fix-terminal.cmd
D:\Projects\claude-code-best\ccb-installer\start-aionui.cmd
D:\Projects\claude-code-best\ccb-installer\start-local.cmd
```

---

## 7. Section E — `scripts\` (shipped under `$INSTALL\scripts\`)

| File | Role |
|------|------|
| `D:\Projects\claude-code-best\ccb-installer\scripts\ensure-wanding-settings.ps1` | Bootstrap `$CONFIG\settings.json` |
| `D:\Projects\claude-code-best\ccb-installer\scripts\install-office-word-mcp.ps1` | pip office-word |
| `D:\Projects\claude-code-best\ccb-installer\scripts\install-excel-mcp-server.ps1` | pip excel (haris) |
| `D:\Projects\claude-code-best\ccb-installer\scripts\install-ppt-master.ps1` | ppt skill + gate + partial agents |
| `D:\Projects\claude-code-best\ccb-installer\scripts\deploy-ppt-master-skill.ps1` | |
| `D:\Projects\claude-code-best\ccb-installer\scripts\deploy-subagent-gate-skill.ps1` | |
| `D:\Projects\claude-code-best\ccb-installer\scripts\ensure-ppt-master-deps.ps1` | |
| `D:\Projects\claude-code-best\ccb-installer\scripts\sync-ppt-master-agents.ps1` | ppt-creator + cowork |
| `D:\Projects\claude-code-best\ccb-installer\scripts\deploy-seed-agents.ps1` | **v2:** full keep-set agents |
| `D:\Projects\claude-code-best\ccb-installer\scripts\deploy-seed-agents.mjs` | |
| `D:\Projects\claude-code-best\ccb-installer\scripts\patch-subagent-gate-hooks.ps1` | **v2:** Stop hooks in live `.md` |
| `D:\Projects\claude-code-best\ccb-installer\scripts\smoke-wanding-e2e.ps1` | Post-install smoke |
| `D:\Projects\claude-code-best\ccb-installer\scripts\install-windows-terminal.ps1` | Optional WT component |
| `D:\Projects\claude-code-best\ccb-installer\scripts\ccb-diagnose.ps1` | Diagnostics |
| `D:\Projects\claude-code-best\ccb-installer\scripts\ccb-check-update.ps1` | Manifest check + full installer `/S` (内网双通道) |
| `D:\Projects\claude-code-best\ccb-installer\scripts\internal-upgrade.ps1` | Hot-update zip + rollback（内网更新 P2；第一版 exe 不依赖） |
| `D:\Projects\claude-code-best\ccb-installer\scripts\register-update-scheduled-task.ps1` | **Not in repo** — IT silent `-CcbOnly`（Defer） |

**Optional / not in main WanD package:**

```text
launch-ccb-wanding.ps1, fix-terminal-launcher.ps1, install-wt-fragment.ps1,
patch-i18n.ps1, normalize-i18n-literals.mjs, launch-ccb.ps1,
ccb-recent.ps1, ccb-update-info.ps1
```

**Never ship (dev/CI only):**

```text
deploy-claude-code-b-to-wanding.ps1, package-aionui-exe.ps1,
build-wanding.ps1, sync-aionui-ccb-patch.ps1, test-mcp-health.ps1, test-native-acp-agent.mjs
```

**Must ship under `$INSTALL\scripts\` (OOTB repair):**

```text
sync-aionui-ccb-route-b.ps1, run-wanding-bootstrap.ps1, test-install-health.ps1,
ensure-wanding-settings.ps1, deploy-seed-agents.ps1, deploy-seed-agents.mjs,
patch-subagent-gate-hooks.ps1, smoke-wanding-e2e.ps1
```

**Build-time drift guard (2026-06-21):** `build-wanding.ps1` keeps `$shipScripts` as the authoritative SHIP whitelist and adds a `$devOnlyScripts` denylist (the "Never ship" + "Optional / not in main WanD package" names above). After staging, any `scripts\*.ps1` / `*.mjs` in **neither** list triggers a **non-fatal** WARN ("unclassified — add to `$shipScripts` or `$devOnlyScripts`"), so a newly added script can't be silently dropped from the package. Whitelist stays authoritative (denylist would risk auto-shipping dev/CI helpers).

---


## 8. Section F — `seed\`

### 8.1 Agents (full keep-set — v2 expands old NSIS which only seeded ppt-creator + cowork)

**Source:** `D:\Projects\claude-code-best\ccb-installer\config\agents\`  
**Staging:** `staging\seed\agents\`  
**Deploy target:** `$CONFIG\agents\` (via `deploy-seed-agents.ps1`)

```text
D:\Projects\claude-code-best\ccb-installer\config\agents\wande-orchestrator.md
D:\Projects\claude-code-best\ccb-installer\config\agents\wande-orchestrator.aionui.json
D:\Projects\claude-code-best\ccb-installer\config\agents\quotation-agent.md
D:\Projects\claude-code-best\ccb-installer\config\agents\quotation-agent.aionui.json
D:\Projects\claude-code-best\ccb-installer\config\agents\accurate-agent.md
D:\Projects\claude-code-best\ccb-installer\config\agents\accurate-agent.aionui.json
D:\Projects\claude-code-best\ccb-installer\config\agents\word-creator.md
D:\Projects\claude-code-best\ccb-installer\config\agents\word-creator.aionui.json
D:\Projects\claude-code-best\ccb-installer\config\agents\word-form-creator.md
D:\Projects\claude-code-best\ccb-installer\config\agents\word-form-creator.aionui.json
D:\Projects\claude-code-best\ccb-installer\config\agents\excel-creator.md
D:\Projects\claude-code-best\ccb-installer\config\agents\excel-creator.aionui.json
D:\Projects\claude-code-best\ccb-installer\config\agents\ppt-creator.md
D:\Projects\claude-code-best\ccb-installer\config\agents\ppt-creator.aionui.json
D:\Projects\claude-code-best\ccb-installer\config\agents\cowork.md
D:\Projects\claude-code-best\ccb-installer\config\agents\cowork.aionui.json
```

**Exclude:** `D:\Projects\claude-code-best\ccb-installer\config\agents\README.md`

### 8.2 ccb-subagent-gate skill

**Source:** `D:\Projects\claude-code-best\ccb-installer\config\skills\ccb-subagent-gate\`  
**Staging:** `staging\seed\skills\ccb-subagent-gate\` (exclude `tests\`)  
**Deploy target:** `$CONFIG\skills\ccb-subagent-gate\`

```text
...\ccb-subagent-gate\SKILL.md
...\ccb-subagent-gate\config\modes.json
...\ccb-subagent-gate\scripts\subagent-gate.sh
...\ccb-subagent-gate\scripts\lib\fail.sh
...\ccb-subagent-gate\scripts\lib\warn.sh
...\ccb-subagent-gate\scripts\lib\mode.sh
...\ccb-subagent-gate\scripts\lib\parse-transcript.sh
...\ccb-subagent-gate\scripts\lib\parse_transcript_roe.py
...\ccb-subagent-gate\scripts\lib\roe-common.sh
...\ccb-subagent-gate\scripts\validators\quotation-roe.sh
...\ccb-subagent-gate\scripts\validators\office-docx.sh
...\ccb-subagent-gate\scripts\validators\office-pptx.sh
...\ccb-subagent-gate\scripts\validators\office-xlsx.sh
...\ccb-subagent-gate\scripts\validators\office-word-form.sh
...\ccb-subagent-gate\scripts\validators\word-creator-mcp.sh
...\ccb-subagent-gate\scripts\validators\quotation-mcp.sh
...\ccb-subagent-gate\scripts\validators\accurate-mcp.sh
...\ccb-subagent-gate\scripts\validators\excel-creator-mcp.sh
```

**Exclude:** `...\ccb-subagent-gate\tests\**`

### 8.3 Quotation MCP health (#20)

**Source:** `mcp_servers/quotation-server/dist/config.js` + **`python-spawner.js`** + `ccb-installer/config/mcp-health-manifest.json` + `ccb-installer/lib/mcp-stdio-probe.mjs` + `ccb-installer/scripts/ensure-wanding-settings.ps1`  
**Staging:** `vendor/mcp-servers/quotation-server/dist/` (config + spawner) + **`vendor/wanding/.env.accurate`** (UTF-8 **no BOM**, ensure-wanding-settings)  
**Verify:** `test-mcp-health.ps1 -Probe -Session` — 29 config (incl. `.env.accurate` BOM/parse); probe `match_quotation` + `get_inventory_by_code`. Guid inventory false-negative: [`mcp-health.md`](./mcp-health.md) § AOL inventory — closed root cause.

### 8.4 App startup MCP warm (#23)

**Source:** `ccb-installer/lib/warm-wanding-mcp.mjs`  
**Staging:** `{install}/lib/warm-wanding-mcp.mjs` (same path AionUI main reads via `ccbStartupReadiness.ts`)  
**Dev sync:** `start-dev-full.ps1` copies on every dev launch — not yet in NSIS/hot zip whitelist (open).  
**Verify:** Guid banner L1→L2; first send no `Failed to fetch`; `bun test ccbStartupReadinessShared.test.ts`. Spec: [`mcp-health.md`](./mcp-health.md) § App startup readiness gate.

---

## 9. Section G — `resources\` (installer reads; partial write to `$CONFIG`)

**First-install only → `$CONFIG`:**

```text
D:\Projects\claude-code-best\ccb-installer\resources\settings\settings.json
  → %LOCALAPPDATA%\CCB-Wanding\.claude\settings.json   (if missing)

D:\Projects\claude-code-best\ccb-installer\resources\commands\modo.md
  → %LOCALAPPDATA%\CCB-Wanding\.claude\commands\modo.md   (always overwrite)
```

**Recommended v2 slash-command seed:**

```text
D:\Projects\claude-code-best\ccb-installer\resources\commands\写邮件.md
D:\Projects\claude-code-best\ccb-installer\resources\commands\总结.md
D:\Projects\claude-code-best\ccb-installer\resources\commands\表格分析.md
D:\Projects\claude-code-best\ccb-installer\resources\commands\翻译.md
D:\Projects\claude-code-best\ccb-installer\resources\commands\写报告.md
D:\Projects\claude-code-best\ccb-installer\resources\commands\会议纪要.md
D:\Projects\claude-code-best\ccb-installer\resources\commands\调研简报.md
D:\Projects\claude-code-best\ccb-installer\resources\commands\协作小组.md
  → %LOCALAPPDATA%\CCB-Wanding\.claude\commands\**
```

### 9.1 Update server config (内网双通道 — first install seed)

**Source (repo):** `D:\Projects\claude-code-best\ccb-installer\config\update-server.env.example` (optional; first exe may omit)
**Install target:** `%LOCALAPPDATA%\CCB-Wanding\config\update-server.env` (if missing; IT fills IP)

```text
AIONUI_UPDATE_MANIFEST_URL=http://192.168.x.x/updates/manifest.json
CCB_UPDATE_MANIFEST_URL=http://192.168.x.x/updates/manifest.json
```

Read by `ccb-check-update.ps1`, `internal-upgrade.ps1`, and AionUI `updateBridge` (main process only). Not under `$INSTALL` — lives beside `$CONFIG` under `%LOCALAPPDATA%\CCB-Wanding\`.

---

## 10. Post-install sequence (v2)

Run after NSIS file copy (order matters):

```powershell
$INSTALL = "$env:LOCALAPPDATA\Programs\CCB-Wanding"
$CONFIG  = "$env:LOCALAPPDATA\CCB-Wanding\.claude"

& "$INSTALL\scripts\install-office-word-mcp.ps1"     -InstallDir $INSTALL
& "$INSTALL\scripts\install-excel-mcp-server.ps1"  -InstallDir $INSTALL
& "$INSTALL\scripts\install-ppt-master.ps1"            -InstallDir $INSTALL -ConfigDir $CONFIG
& "$INSTALL\scripts\ensure-wanding-settings.ps1"     -InstallDir $INSTALL -ConfigDir $CONFIG
& "$INSTALL\scripts\deploy-seed-agents.ps1"          -ConfigDir "$CONFIG\agents"
& "$INSTALL\scripts\patch-subagent-gate-hooks.ps1"   -AgentsDir "$CONFIG\agents"
```

**Generated at install (not in staging):**

```text
$CONFIG\settings.json
$CONFIG\agents\*
$CONFIG\skills\ppt-master\**
$CONFIG\skills\ccb-subagent-gate\**
$INSTALL\vendor\mcp-servers\office-word-mcp\**
$INSTALL\vendor\mcp-servers\excel-mcp-server\**
$INSTALL\uninstall.exe
```

---

## 11. Global exclude (never package)

```text
D:\Projects\claude-code-best\ccb-installer\_tmp-*.js
D:\Projects\claude-code-best\ccb-installer\test-*.mjs
D:\Projects\claude-code-best\ccb-installer\*.exe          (stray root exes)
D:\Projects\claude-code-best\ccb-installer\claude-code-b-src\**
D:\Projects\claude-code-best\ccb-installer\dist\**          (use claude-code-B\dist)
D:\Projects\claude-code-best\ccb-installer\patches\**        (patch at build; don't ship tree)
D:\Projects\claude-code-best\ccb-installer\staging\**        (output dir — don't recurse into itself)
```

---

## 12. mcp-health verification paths

Canonical registry: `D:\Projects\claude-code-best\ccb-installer\config\mcp-health-manifest.json`

After install, these must resolve under `$INSTALL`:

```text
vendor\bun\bun.exe
vendor\python-wanding\python.exe
vendor\mcp-servers\quotation-server\dist\index.js
vendor\wanding\data\
vendor\wanding\python\main.py          (#20 — quotation MCP Python entry; health config + probe)
vendor\mcp-servers\accurate-mcp\server.py
vendor\mcp-servers\office-word-mcp\server.py
vendor\mcp-servers\office-word-mcp\site-packages\
vendor\mcp-servers\excel-mcp-server\server.py
vendor\mcp-servers\excel-mcp-server\site-packages\
vendor\mcp-servers\excel-mcp\mcp-excel.exe          (optional / lazy)
dist\cli.js
AionUi\AionUi.exe
```

```powershell
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
.\ccb-installer\scripts\smoke-wanding-e2e.ps1 -InstallDir "$env:LOCALAPPDATA\Programs\CCB-Wanding"
```

---

## 13. Staging tree (reference)

```text
D:\Projects\claude-code-best\ccb-installer\staging\
├── AionUi\
├── dist\
├── vendor\
│   ├── bun\
│   ├── ripgrep\
│   ├── git\
│   ├── python-wanding\
│   ├── ppt-master-skill\
│   ├── windows-terminal\          (optional)
│   ├── mcp-servers\
│   │   ├── quotation-server\dist\
│   │   ├── accurate-mcp\
│   │   └── excel-mcp\
│   └── wanding\
│       ├── python\
│       └── data\
├── scripts\
├── seed\
│   ├── agents\
│   └── skills\ccb-subagent-gate\
├── ccb.ico
├── ccb-launch-aionui.cmd
├── ccb-check-install.cmd
├── ccb-wanding-versions.cmd
├── ccb-verify-update.cmd
├── ccb-wanding.cmd
└── ccb-diagnose.cmd
```

---

## 14. Open items (implementation)

> **第一版发货优先级与验收：** [`wanding-first-ship.md`](./wanding-first-ship.md) §1.4–§1.5、§2.5

| Item | Status |
|------|--------|
| **`build-wanding.ps1`** | **Implemented** — `ccb-installer/scripts/build-wanding.ps1` |
| **`installer-wanding-v2.nsi`** | **Implemented** — `ccb-installer/installer-wanding-v2.nsi` |
| `data\*.xlsx` 存在性检查 | Spec §5.4 + first-ship §1.2.1 — **build-wanding 必须 fail-closed** |
| `.xlsx` price libs + `mcp-excel.exe` | Gitignored — build machine must supply |
| `package-aionui-exe.ps1` | **Exists** — AionUI-only interim; not merged ship target |
| `installer-wanding.nsi` | **Exists (legacy)** — CCB terminal stack; no AionUi; partial seed |
| Unified update manifest + clients | **Implemented** — ops Defer until first exe; see [`internal-update.md`](./internal-update.md) |
| `register-update-scheduled-task.ps1` | Not in repo — Defer |

---

## 15. Old NSIS gaps (why v2)

| Issue | Old `installer-wanding.nsi` | v2 fix |
|-------|----------------------------|--------|
| Path escape `..\mcp_servers\`, `..\python\`, `..\data\` | L120–139 | Staging self-contained under `ccb-installer\staging\` |
| Legacy `ccb-flat/safe/text.cmd` | L222–224 | Excluded per §6 |
| Partial agent seed (ppt + cowork only) | L248–252 | Full keep-set §8.1 + `deploy-seed-agents.ps1` |
| Main shortcut → terminal launcher | L293 | → `AionUi.exe` §1 |
| `install-excel-mcp-server.ps1` | Still required | haris `excel` MCP — not obsolete |

---

## 16. Coordination — 内网双通道更新 (hot update vs full install)

This section links the **full-install whitelist** (§1–§13) to the **内网双通道更新** implementation. **Ops SOP + manifest schema:** [`internal-update.md`](./internal-update.md) (formal 2026-06-19).

### 16.1 Two whitelists — parent and child

| Layer | Artifact | Scope |
|-------|----------|--------|
| **Full install** (this doc) | `installer-wanding-v2.nsi` → `$INSTALL` | Maximum set: AionUi + dist + all vendor runtimes + scripts + seed |
| **Hot update** (update plan §1.2) | `CCB-dist-{version}-win-x64.zip` | **Subset** of §5 — never whole `$INSTALL` or `/MIR` on `vendor/` |

`publish-update-bundle.ps1` must hard-code the hot-update paths below. Paths inside the zip mirror install-root layout (extract → robocopy per directory).

**Hot-update zip IN (canonical):**

```text
dist/**
vendor/wanding/python/**
vendor/wanding/data/**
vendor/mcp-servers/quotation-server/dist/**
vendor/mcp-servers/quotation-server/node_modules/**
vendor/mcp-servers/accurate-mcp/**
vendor/mcp-servers/office-word-mcp/**
vendor/mcp-servers/excel-mcp-server/**
seed/agents/**
seed/skills/ccb-subagent-gate/**
```

**Build:** `ccb-installer/scripts/build-wanding-hot.ps1 -Components …` (see `wanding-first-ship.md` §5.2). `internal-upgrade.ps1` applies the same paths.

**Hot-update zip OUT (full NSIS only — §5):**

```text
AionUi/**
vendor/bun/
vendor/git/
vendor/ripgrep/
vendor/python-wanding/
vendor/ppt-master-skill/
vendor/mcp-servers/excel-mcp/mcp-excel.exe
.claude/  logs/  backup-*
```

### 16.2 Install root resolution (must match)

| Consumer | Resolution order |
|----------|------------------|
| route-b `resolveInstallDir()` | `CCB_WANDING_HOME` → `CCB_INSTALL_DIR` → bundled install found by walking up from patched AionUI ACP slot → `%LOCALAPPDATA%\Programs\CCB-Wanding` → `D:\CCB-Wanding` |
| `internal-upgrade.ps1` `Resolve-CcbInstallDir` | `D:\CCB-Wanding` → `%LOCALAPPDATA%\CCB-Wanding` → `%LOCALAPPDATA%\Programs\CCB-Wanding` |

After merged NSIS v2 ships, prefer **`Programs\CCB-Wanding` first** in upgrade script (align with route-b primary target). Dev slot `D:\CCB-Wanding` remains for engineers.

### 16.3 Shared post-upgrade chain

Both hot update and full reinstall should end with the same verification gates (update plan §2.1):

```powershell
# After dist/vendor paths applied:
.\ccb-installer\scripts\sync-aionui-ccb-route-b.ps1    # if AionUi present under $INSTALL
$INSTALL\scripts\ensure-wanding-settings.ps1 -InstallDir $INSTALL -ConfigDir $CONFIG
$INSTALL\scripts\deploy-seed-agents.ps1 -ConfigDir $CONFIG\agents   # sidecars; .md user-wins unless -ForceMd
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe
```

Hot update adds: backup → sha256 gate → health fail **rollback** from `backup-before-{version}-{timestamp}/`.

### 16.4 AionUI update mode (phased)

| Phase | Install layout | Manifest / UI |
|-------|----------------|---------------|
| **Now** (update plan Phase 1–4) | Standalone `AionUi-x.y.z-win-x64.exe` + CCB NSIS | `manifest.aionui.url` → standalone exe; CCB via dist zip |
| **After** merged NSIS v2 (this doc §1) | `$INSTALL\AionUi\AionUi.exe` | Add `manifest.aionui.installMode: "bundled"`;「更新 AionUI」→ merged `CCB-Wanding-x.y.z.exe` silent `/S` |

Schema should reserve `installMode: "standalone" | "bundled"` before bundled ships — no IPC rewrite twice.

### 16.5 Implementation order (no hard blocker)

| Track | Can ship independently | Must align first |
|-------|------------------------|------------------|
| 内网 manifest + dist hot-update | Yes (standalone AionUI) | `dist/VERSION`, §16.1 zip paths, `ccb-check-update.ps1` in §7 |
| Merged NSIS v2 | Yes | Same `$INSTALL` tree; §16.4 `bundled` branch when ready |

Cross-refs: [`internal-update.md`](./internal-update.md); add row to [`integration/index.md`](./index.md).

### 16.6 Full NSIS **1.1.3** vs hot zip **1.1.3.1** (2026-06-26)

> **Oracle:** installed **1.1.2** at `D:\CCB-Wanding`. **Full pack** target `1.1.3-dev` / `1.1.3`. **Hot patch** `1.1.3.1` for quotation fixes without rebundling `app.asar`.

| Item | Full NSIS 1.1.3 | Hot zip 1.1.3.1 |
|------|-----------------|-----------------|
| Workspace instant file tree refresh (#1–#4) | ✅ required | ❌ not in zip |
| Org knowledge UI + route (#5–#6) | ✅ required | ❌ |
| `compareCcbVersions` About/update (#7, #15) | ✅ required | ❌ |
| Self-built aioncore 0.1.29 (#8) | ✅ `-AioncorePath` | ❌ |
| Quotation `fill_items` / `fill_row_guard` (#9–#11) | ✅ (cold build) | ✅ primary path |
| `seed/agents` overlay (#12) | ✅ | ✅ |
| `dist/**` CCB rebuild (#13) | optional same release | optional |
| `permissions.ts` excel auto-allow (#18) | ✅ with dist rebuild | ✅ via hot zip `dist` |
| `MessageAcpPermission` radio layout (#17) | ✅ required | ❌ not in zip |
| **ROE Stop gate (#19)** — merged into #22 (2026-06-29); `quotation-agent:roe:off` | ✅ cold build (seed+gate) | ✅ via hot zip `seed` |
| **Quotation MCP Python path + health (#20)** — `config.js` fallback, `mcp-health-manifest.json`, `test-mcp-probe-layer.mjs` `tools/call`, **`vendor/wanding/.env.accurate`** | ✅ NSIS vendor tree | ✅ hot zip `vendor/mcp-servers/quotation-server` + run `ensure-wanding-settings` on target |
| **Mixing brand icons (#21)** — `BrandIcon.tsx`, sidebar `Layout.tsx`, `devResourcesPath.ts`, `packages/desktop/resources/app.{ico,png}`; `Sync-AionUiBrandAssets` | ✅ required (renderer + taskbar `app.ico`) | ❌ not in zip |
| **Universal ROE slim (#22, incl. #19)** — `generic-roe-judge.sh`, `parse_transcript_roe_judge.py`, `modes.json` `{agent}:roe-judge:block` + `quotation-agent:roe:off`, REJECT v4 (Already done + Prior attempt), `roe-judge-profiles/`, `test_roe_judge_realistic.py` | ✅ cold build (seed+gate) | ✅ primary via hot zip `seed` |
| §12.8 NSIS relaunch / Toast / ACP retry / Tool banner (#1–#4) | ✅ if not already on 1.1.2 | partial (`acp-agent.js` in zip if included) |

**Ops note:** After publishing hot `1.1.3.1`, manifest `ccb.version` becomes `1.1.3.1` while employees may still show About AionUI `1.1.2` until full NSIS — expected until #15 ships.

**Build commands:** [`internal-update.md`](./internal-update.md) §12.9.3.

**Pack gate (2026-06-27):** `install-health-manifest.json` + `Test-StagingWanDInstall` require `fill_items.py`, `fill_row_guard.py`, `inquiry_backfill.py`, `system/tool_dispatch.py`, and `quote_tools.py` wiring — fails build if 1.1.3.1 fill supplements missing from staged `vendor/wanding/python/`.

---

## 17. OOTB install hardening (2026-06-20)

> **Goal:** 用户安装后适配本机、开始菜单快捷方式打开即用；不打包 build-only 脚本；AionUI ↔ CCB-Wanding 嵌合由 bootstrap 自愈。

### 17.1 Scope / trigger

| When | Action |
|------|--------|
| 改 build / NSIS / bootstrap / ACP 补丁 | 读本节 + §17.8 验收 |
| 发新 exe | `Test-StagingWanDInstall` PASS 后再 makensis |
| 装完不能聊 / route-b 未就绪 | Check Install + §17.3 启动链 |

### 17.2 `build-wanding.ps1` signatures

```powershell
.\ccb-installer\scripts\build-wanding.ps1 -Version <semver> `
  [-SkipBuild] [-SkipAionUiBuild] [-SkipNsis] [-SkipPipMcp] [-SkipStagingClear] `
  [-IncludeWindowsTerminal]   # 默认 off；AionUI-only 不打包 WT（§5.5）
```

Post-staging: `Test-StagingWanDInstall`（Route B marker + acp-agent `120_000` 默认）。

### 17.3 ACP 双文件 + 启动链

| File | Role | Source |
|------|------|--------|
| `index.js` | Route B → `dist/cli.js --acp` | `patches/aionui-ccb-route-b/index.js` |
| `acp-agent.js` | WanD 超时/初始化 | `patches/aionui-acp/acp-agent.js` |

**Shipped sync:** `scripts/sync-aionui-ccb-route-b.ps1` → bundled + `%APPDATA%\AionUi\aionui\runtime\...`

**Dev-only:** `sync-aionui-ccb-patch.ps1` — 仅 `acp-agent.js`，**永不** `index.js`。

**用户启动：** 开始菜单 → `ccb-launch-aionui.cmd`（**禁止**直接 `AionUi.exe`）。

### 17.4 Bootstrap

| Mode | When | Agents |
|------|------|--------|
| `Full` | 无 `.bootstrap-ok` | 首次：`deploy-seed-agents -ForceMd` |
| `Quick` | 后续打开 / Check Install | sidecar 刷新，md 默认不覆盖 |

NSIS：非空且无 `.ccb-wanding-install-root` → 拒绝安装。

### 17.5 Shipped scripts（最小集）

IN: `ensure-wanding-settings`, `install-office-word-mcp`, `install-excel-mcp-server`, `install-ppt-master`, `deploy-ppt-master-skill`, `deploy-subagent-gate-skill`, `sync-ppt-master-agents`, `ensure-ppt-master-deps`, `deploy-seed-agents`(+mjs), `patch-subagent-gate-hooks`, `sync-aionui-ccb-route-b`, `test-install-health`, `run-wanding-bootstrap`, `smoke-wanding-e2e`, `ccb-diagnose`, `ccb-check-update`, `verify-update-server`, `internal-upgrade`

> **ppt/gate 运行时闭包（2026-06-21）：** `install-ppt-master` 在 Full bootstrap 用 `$PSScriptRoot` 调 `deploy-ppt-master-skill` / `deploy-subagent-gate-skill` / `sync-ppt-master-agents` / `ensure-ppt-master-deps` —— 运行时依赖，必须同包。这四个 + office-word/excel **site-packages** 现已写进 `install-health-manifest.json` 的 `required_files`，由 manifest-driven gate 强制（缺则构建失败）。

OUT: `build-wanding*`, `vendor-ppt-master`（联网抓 skill，仅 `-VendorIfMissing`）, `sync-aionui-ccb-patch`, `test-mcp-health`（dev/CI）

### 17.6 Install health — 单一事实源（manifest）

`install-health-manifest.json` 是**唯一**的 OOTB 关键文件清单，被两侧共读，永不漂移：

| 读者 | 何时 | 查什么 |
|------|------|--------|
| `Test-StagingWanDInstall`（build gate） | 构建机出包前 | `required_files`（staging 相对）+ `route_b.bundled` marker + app.asar（build 专属）；**跳过** `config_files` / `route_b.runtime_*`（装后/启动才有） |
| `test-install-health.ps1`（`ccb-check-install.cmd`） | 用户机 Check Install | `required_files`（$INSTALL 相对）+ `route_b.bundled`/`runtime` + `acp-agent`（`120_000`）+ `config_files` + settings.json 合法性 |

`required_files` 已含 site-packages（office-word/excel）+ ppt/gate 运行时闭包 + bundled `pptx`，故两侧都能拦「漏打包」与「装后被杀软隔离/半截解压」。新增 OOTB 关键文件**只**改 manifest，两侧自动覆盖。

### 17.7 Cases

| Case | Expected |
|------|----------|
| Good: 新装 → Check Install → 快捷方式 | Guid 报价可用 |
| Bad: 直接 AionUi.exe | 可能无 Route B runtime |
| Bad: patch 脚本写 index.js | Route B 被拆掉 |

### 17.8 Tests

```powershell
# Staging health check (manifest-only / skip heavy build) — use current target version:
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.1.3-dev -SkipBuild -SkipAionUiBuild -SkipNsis -SkipStagingClear
.\ccb-installer\scripts\test-install-health.ps1 -InstallDir .\ccb-installer\staging
```

### 17.9 Changelog

| Date | Item |
|------|------|
| 2026-06-21 | §6: `ccb-wanding-versions.cmd` OUT→IN（员工更新入口「检查更新 / 版本选择」→ `ccb-check-update.ps1 -Select`）；§1/§13 root 启动器补齐实况（launch-aionui / check-install / verify-update）；配合 internal-update Phase 1 §1.2 + §3.7 |
| 2026-06-21 | build: **anti-drift guards** — `dist/BUILD-INFO.json` provenance（git commit/branch/dirty × claude-code-B + aionui-src）+ `-SkipBuild`/`-SkipAionUiBuild` 陈旧 WARN（§4）；`data\*.md` 枚举减黑名单（新 SOP md 自动 ship，§5.4）；scripts 白名单漂移 WARN（§7） |
| 2026-06-21 | health: **单一事实源** — `install-health-manifest.required_files` 加 site-packages + ppt/gate 闭包 + bundled pptx（21 项）；`Test-StagingWanDInstall` 改读 manifest，与 Check Install 同源不漂移（§17.6） |
| 2026-06-21 | build: ship ppt/gate 运行时闭包（deploy-ppt-master-skill / deploy-subagent-gate-skill / sync-ppt-master-agents / ensure-ppt-master-deps）—— 修白名单 latent gap |
| 2026-06-20 | build: bundled route-b + acp-agent; staging gate; default skip WT; trim scripts |
| 2026-06-20 | sync-aionui-ccb-route-b: +acp-agent; installed-tree path fix |
| 2026-06-20 | bootstrap: first Full ForceMd; health acp-agent marker |
| 2026-06-20 | NSIS: non-empty unmarked dir block |
| 2026-06-20 | test-mcp-health: EPERM retry（dev only） |
