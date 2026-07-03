# WanD 第一版发货 — 整合清单（一个完整 exe）

> **你要的两件事，只看本文：**
>
> | # | 问题 | 章节 |
> |---|------|------|
> | **1** | 打包哪些才算**完整前后端 exe**？ | **§1** |
> | **2** | 现在发给别人能否直接用？**缺口 / 还要补什么**？ | **§2** |
>
> **文件级 IN/OUT 白名单：** [`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md)  
> **CCB dist build：** [`../backend/build-deploy-verify.md`](../backend/build-deploy-verify.md) §1  
> **Agent keep-set 权威：** [`../../ccb-installer/config/agents/README.md`](../../ccb-installer/config/agents/README.md) + `mcp-health-manifest.json`  
> **组织知识（装完还要登录）：** [`org-knowledge-phase0-rollout.md`](./org-knowledge-phase0-rollout.md)  
> **内网更新：** 客户端 **已实现**（P3–P5）；**ops 可后做** — [`internal-update.md`](./internal-update.md) §12.7  
> **MVP v1.0 范围（不含 /tasks、不含 unified SSO）：** [`wanding-mvp-v1.md`](./wanding-mvp-v1.md)

> **Current baseline (2026-06-26):** Recovered **1.1.2** oracle at `D:\CCB-Wanding`; next ship target **`1.1.3-dev`** (Phase 4 full cold build — [`guides/mixing-meta-repo.md`](../guides/mixing-meta-repo.md)). §5 及以下示例命令中的 `1.0.x` 为历史记录；**新打包请用 `1.1.3-dev`**（热更 patch 可用 `1.1.3.1` 等，见 [`internal-update.md`](./internal-update.md) §12.9）。

---

## 0. 目标定义

**「完整 exe」= 对方 Windows 上双击安装后，无需再装 Node/Bun/Python/Git，也无需 clone 仓库，即可：**

- 打开 **AionUI 图形界面** 聊天；
- 走 **CCB-Wanding + route-b** 调报价 / Accurate / Word / Excel MCP；
- 使用 **本地价库 + 业务知识 md** 做报价（离线可用）；
- （可选）连 **中心组织知识库** — 需 VPS 账号 + 首次登录，见 §2.3。

**产物名（v2）：** `CCB-Wanding-x.y.z.exe`（**一个** NSIS，内含 `AionUi\` + `dist\` + `vendor\`）。

---

## 1. 完整前后端 exe — 必须打包什么

### 1.1 安装后目录（一个 exe 装完应长这样）

```text
%LOCALAPPDATA%\Programs\CCB-Wanding\     ← $INSTALL（程序，升级可覆盖）
├── AionUi\AionUi.exe                    ← 【前端】Electron GUI
├── AionUi\resources\bundled-aioncore\   ← 【前端内置】aioncore + ACP（须 route-b 补丁）
├── dist\cli.js + chunks\                ← 【后端】claude-code-B 编译产物
├── vendor\bun\ … git\ … ripgrep\ … python-wanding\
├── vendor\mcp-servers\                  ← quotation / accurate / excel* / word*
├── vendor\wanding\python\ + data\       ← 报价 Python + 价库 xlsx/md
├── scripts\                             ← 安装后 hook（MCP pip、settings、seed）
├── seed\agents\ + seed\skills\          ← 首次写入 $CONFIG 的种子
├── ccb.ico, ccb-wanding.cmd, ccb-diagnose.cmd, **ccb-launch-aionui.cmd**
└── uninstall.exe

%LOCALAPPDATA%\CCB-Wanding\.claude\       ← $CONFIG（用户配置，升级保留）
%APPDATA%\AionUi\                        ← AionUI 会话数据（与 CCB 配置分离）
```

**桌面快捷方式（v2.1）：** 指向 **`$INSTALL\AionUiLauncher.exe`**（**不是**直接 `AionUi.exe`）。`AionUiLauncher.exe` 是无终端窗口 wrapper，实际调用 `$INSTALL\ccb-launch-aionui.cmd`；cmd launcher 跑 bootstrap、route-b sync、内网更新 env，再 `start AionUi.exe`。权威：[`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md) §6.0 / §17.6。

**图标（2026-06-23）：** 不需要手工记替换步骤。`build-wanding.ps1 -Version x.y.z` 默认从 `data\ChatGPT Image*.png` 选最新 PNG 生成 `ccb-installer\resources\ccb.ico`，再打进 `staging\ccb.ico`；可用 `-IconSource <png>` 覆盖。

---

### 1.2 打包容器清单（按层）

#### A. 前端（AionUI + aioncore）

| 必须包含 | 来源 | 备注 |
|----------|------|------|
| 整个 `win-unpacked\**` | `aionui-src` → `build-with-builder.js --pack-only` | 不要 electron-builder 自带 NSIS |
| route-b 补丁后的 ACP `index.js` | `ccb-installer/patches/aionui-ccb-route-b/` | 写入 bundled-aioncore ACP 槽位 |
| `AionUi.exe` + `resources\bundled-aioncore\win32-x64\aioncore.exe` | staging → NSIS | 硬依赖 |

#### B. 后端（CCB-Wanding dist）

| 必须包含 | 来源 | 备注 |
|----------|------|------|
| `dist\cli.js`, `cli-bun.js`, `cli-node.js`, `chunks\**` | **`D:\claude-code-B\dist\`**（`bun run build`） | **禁止**用 `ccb-installer\dist\` 当权威后端 |
| `dist\VERSION` | `build-wanding.ps1` staging 时写入 | 热更新与版本比对用 |

#### C. 运行时 vendor

| 必须包含 | 路径 |
|----------|------|
| Bun / ripgrep / Git / python-wanding / ppt-master-skill | `ccb-installer\vendor\` 对应子树 |

#### D. MCP + 报价 Python + 数据

| 必须包含 | 来源 |
|----------|------|
| quotation MCP | `mcp_servers\quotation-server\dist\**` → staging |
| accurate MCP | `vendor\mcp-servers\accurate-mcp\server.py` |
| Wanding Python | `python\`（见 whitelist §5.4） |
| 价库 xlsx + SOP md | `data\`（见 §1.2.1 — **build 必须校验**） |
| org-server 种子 | `resources\org-server.json` → 安装时写入 `%APPDATA%\AionUi\aionui\` |

| 安装后生成（NSIS 跑脚本） | 脚本 |
|--------------------------|------|
| office-word / haris excel MCP | `install-office-word-mcp.ps1`, `install-excel-mcp-server.ps1` |
| ppt skill → `$CONFIG` | `install-ppt-master.ps1` |
| `settings.json` | `ensure-wanding-settings.ps1` |

| 可选 | 说明 |
|------|------|
| `excel-mcp\mcp-excel.exe` | COM Excel，lazy，非报价主路径阻塞 |

#### 1.2.1 `data\` — build-wanding 存在性检查（fail-closed）

`build-wanding.ps1` **不得**假设 CI/git 一定有 xlsx；缺 **必需** 文件应 **直接 exit 非零**：

| 文件 | 必需 | 说明 |
|------|------|------|
| `data\price_library_cleaned_2026_05_15.xlsx` | **是** | 首次启动 LKG 快照前的 bootstrap seed；org 可达后由远端活跃版本替代 |
| `data\空白标准报价单.xlsx` | **是** | 填表模板 |
| `data\mapping_table.xlsx` | 否 | nonfatal；缺则 warn |
| `data\*.md`（SOP / 业务知识） | **是** | 见 whitelist §5.4 列表 |

> **Bootstrap-seed 合同（2026-06-27 修订）**：`price_library_cleaned_2026_05_15.xlsx` 以 `source=bundled_seed` 角色保留于安装包。一旦客户端完成首次远端同步并提升 LKG 快照，bundled seed 退出运行时权威。远端不可达且无 LKG 时，仍使用 bundled seed，但需附 stale 警告。详见 `remote-shared-price-library` PRD §Bootstrap and Offline Contract。
> `data\wanding_price_lib.xlsx` 已从 build 必需列表移除；保留于 `data/` 作回归测试 fallback，不进入运行时默认路径。

#### E. Agent 与技能种子（keep-set — 以脚本 + README 为准）

**权威来源（实现时对齐，不要只数 legacy NSIS 里写了几个 File）：**

1. [`ccb-installer/config/agents/README.md`](../../ccb-installer/config/agents/README.md) — Current Keep Set 表  
2. [`ccb-installer/scripts/deploy-seed-agents.mjs`](../../ccb-installer/scripts/deploy-seed-agents.mjs) — 复制 `config/agents\` 下除 `README.md` 外全部 `{id}.md` + `{id}.aionui.json`  
3. [`ccb-installer/config/mcp-health-manifest.json`](../../ccb-installer/config/mcp-health-manifest.json) — 装后 `test-mcp-health` 期望

**v2 staging：** 整目录 mirror → `staging\seed\agents\`（与 `config\agents\` 同步）。  
**v2 安装后：** 必须跑 `deploy-seed-agents.ps1` + `patch-subagent-gate-hooks.ps1`（legacy NSIS **未**跑全量 deploy）。

当前 keep-set（8 agent id，各 md + sidecar）：  
`wande-orchestrator`, `quotation-agent`, `accurate-agent`, `word-creator`, `word-form-creator`, `excel-creator`, `ppt-creator`, `cowork`

技能 seed：`config\skills\ccb-subagent-gate\` → `staging\seed\skills\ccb-subagent-gate\`

**Post-install 顺序（不可乱）** — whitelist §10：

```text
install-office-word-mcp → install-excel-mcp-server → install-ppt-master
→ ensure-wanding-settings → deploy-seed-agents → patch-subagent-gate-hooks
```

#### F. 安装器附带 scripts / 资源

见 whitelist §6–§9。**不要打进包：** `patches\`、`_tmp-*`、`test-*`、**`ccb-installer\dist\`**、repo 源码树。

---

### 1.3 构建流水线（v2 四步）

```text
Step 1  claude-code-B\     bun run build              → staging\dist\  (+ VERSION)
Step 2  aionui-src\       --pack-only + route-b      → staging\AionUi\
Step 3  vendor + python + data + mcp + seed + scripts → staging\  （self-contained）
Step 4  installer-wanding-v2.nsi                      → CCB-Wanding-x.y.z.exe
```

**Staging 根：** `ccb-installer\staging\` — v2 NSIS **只读 staging**，禁止 `..\data` / `..\mcp_servers` 路径逃逸（legacy 反模式，见 whitelist §15）。

---

### 1.4 两个硬任务（下一步实现分工）

| 任务 | 职责 | 不做的事 |
|------|------|----------|
| **`build-wanding.ps1`** | 触发/收集 build；复制到 staging；**存在性校验**（§1.2.1 xlsx、dist、quotation dist、win-unpacked）；写 `staging\dist\VERSION`；可选 `-SkipBuild` | 不内嵌 NSIS 逻辑 |
| **`installer-wanding-v2.nsi`** | **仅从** `ccb-installer\staging\` 打包；post-install §1.2 E 脚本链；快捷方式 → **`AionUiLauncher.exe`** → `ccb-launch-aionui.cmd` | 不访问 repo 根 `..\data` |

两者均已实现（2026-06-19）。Legacy 参考：`package-aionui-exe.ps1`（仅 AionUI）、`installer-wanding.nsi`（终端栈，见 §2.1）。

**实操路径与踩坑：** **§5**（首次打通 2026-06-19）。

---

### 1.5 装完验收（发给别人之前必须过）

```powershell
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
.\ccb-installer\scripts\smoke-wanding-e2e.ps1 -InstallDir "$env:LOCALAPPDATA\Programs\CCB-Wanding"
```

**硬路径（节选）** — 全表 whitelist §12：

```text
ccb.ico
AionUiLauncher.exe
ccb-launch-aionui.cmd
AionUi\AionUi.exe
dist\cli.js
vendor\bun\bun.exe
vendor\mcp-servers\quotation-server\dist\index.js
vendor\wanding\data\*.xlsx（必需价库）
```

**人工：** 开始菜单 → **`ccb-launch-aionui.cmd`**（勿直接 `AionUi.exe`）→ 发消息 → 报价 agent / MCP 无「未配置」。

---

## 2. 发给别人能否直接用 — 缺口与补充

### 2.1 阻塞项（第一版 P0）

| 缺口 | 说明 |
|------|------|
| ~~**`build-wanding.ps1` + `installer-wanding-v2.nsi`**~~ | ✅ **已实现** 2026-06-19（见 §2.6） |
| **Legacy 不是「完整 GUI 包」** | 见 §2.1.1 — 有 CCB 栈但 **无 `$INSTALL\AionUi\`** |
| **`data\*.xlsx` 打前校验** | ✅ `build-wanding.ps1` fail-closed |

**第一版 P0 只有：合并安装包 + 本机 §1.5 验收。** 内网 manifest / VPS / rollout **不是**第一版阻塞（无首包之前做更新无意义）。

#### 2.1.1 Legacy `installer-wanding.nsi` 实际能力（避免误判）

| Legacy **有** | Legacy **无 / 不足** |
|---------------|----------------------|
| CCB `dist\`、bun/git/rg/python-wanding | **`AionUi\AionUi.exe`**（无 GUI 合并包） |
| vendor MCP（含 `..\mcp_servers` 逃逸取 quotation） | route-b 合并在 AionUI 内（需另装 AionUI） |
| wanding python + data xlsx/md | 桌面快捷方式 → **PowerShell 终端** `launch-ccb-wanding.ps1` |
| post-install：word/excel MCP pip、ppt-master、ensure-wanding-settings | **未跑** `deploy-seed-agents` / `patch-subagent-gate-hooks` |
| seed 目录里 **仅显式** ppt-creator + cowork（NSIS File 列表） | 完整 keep-set（§1.2 E）— v2 应 staging 全量 + deploy 脚本 |

**结论：** Legacy 可装出 **终端版 CCB+报价栈**，**不能**当作「一个 exe = AionUI 全功能 GUI 包」。

---

### 2.2 打包包机前置（build-wanding 输入）

| 输入 | 前置 |
|------|------|
| `claude-code-B\dist\` | `bun run build` |
| `aionui-src\out\win-unpacked\` | `--pack-only` + route-b |
| `mcp_servers\quotation-server\dist\` | 项目内 build |
| `data\` 必需 xlsx | 打包包机自备（§1.2.1） |
| `vendor\mcp-servers\excel-mcp\mcp-excel.exe` | 可选 |

| Wrong | Correct |
|-------|---------|
| clone 后直接 makensis | 先 `build-wanding.ps1` staging + 校验 |
| 用 `ccb-installer\dist\` | 只用 **`claude-code-B\dist\`** |

---

### 2.3 对方 exe 之外还要什么

| 能力 | v2 合并包 | 还要补充 |
|------|-----------|----------|
| 本地报价 / MCP / 价库 | ✅ | 无 |
| AionUI GUI | ✅ | legacy 需另装 AionUI |
| 组织知识库 | seed `org-server.json` | VPS 账号 + **首次 org 登录** |
| 内网自动更新 | 可选 | **第一版跳过** |

发给对方建议附带：安装说明（打开 **AionUI**）；若用组织知识则给 org 账号。

---

### 2.4 临时路径（非第一版标准）

| 路径 | 产出 | 与 v2 差距 |
|------|------|------------|
| `installer-wanding.nsi` | CCB 终端栈 exe | 无 AionUI；agent deploy 不全；路径逃逸 |
| `package-aionui-exe.ps1` | 仅 AionUI exe | 无 CCB vendor/MCP/价库 |
| 两者都装 | 联调级 | 两个 exe + 手动维护，非发货标准 |

---

### 2.5 优先级（审核后）

```text
P0  build-wanding.ps1 + installer-wanding-v2.nsi
P0  build-wanding 对 data\ 必需 xlsx fail-closed
P0  装完 §1.5 两条 smoke + GUI 人工测

P1  发给对方：exe +（可选）org 账号说明

Defer（第一版不阻塞发货）
  VPS 首包 upload + 员工 rollout（manifest 404 时 About 检查更新无意义）

已实现（Unified WanD Update Path — 2026-06-21）
  Phase 1 code: ccb-wanding-versions.cmd IN, ccb-update-notify.ps1, launcher env + update-server.env
  Phase 2 source: ccbUpdateBridge, parseCcbBlock, UpdateModal dual rows, bundled install_mode
  Ops helpers: upload-staged-manifest.ps1, smoke-hot-update-trial.ps1, publish -AionUiInstallMode bundled

仍 Defer / ops
  VPS upload + 4 trial users + test-mcp-health -Probe on full install
  app.asar rebuild (no -SkipAionUiBuild) — packaged About 双轨
  max_from_version、Authenticode、HTTPS flip、UpdateModal「全部更新」
```

---

### 2.6 实现状态

| 交付物 | Spec | 代码 | 第一版可发货 |
|--------|------|------|-------------|
| 整合清单 | ✅ 本文 | — | 执行依据 |
| 文件白名单 | ✅ whitelist | — | 细节参考 |
| **合并 exe** | ✅ §1.3–1.4 | ✅ `build-wanding.ps1` + `installer-wanding-v2.nsi` | 装 NSIS 后打 exe + §1.5 验收 |
| Legacy CCB exe | 部分 | ✅ `installer-wanding.nsi` | ⚠️ 终端栈，非 GUI 完整包 |
| AionUI 单独 exe | — | ✅ `package-aionui-exe.ps1` | ⚠️ 仅前端 |
| 装后验收 | ✅ §1.5 | ✅ test-mcp-health / smoke-e2e | 可用 |
| 内网更新客户端 | ✅ internal-update §3.1–3.7 | ✅ P3–P5 已实现 | **ops 可后做**（VPS + fresh pack） |
| 内网更新 E2E | ✅ §12.7 | ⏳ manifest 404 / 无 fresh asar | **阻塞 About 验收** |

---

## 3. 文档索引

| 主题 | 文档 |
|------|------|
| 装什么 | **§1** + [`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md) §3–§12 |
| build dist | [`build-deploy-verify.md`](../backend/build-deploy-verify.md) §1 |
| Agent keep-set | [`config/agents/README.md`](../../ccb-installer/config/agents/README.md) |
| legacy AionUI only | [`dev-test-ship.md`](../frontend/dev-test-ship.md) §7 |
| 组织知识 | [`org-knowledge-phase0-rollout.md`](./org-knowledge-phase0-rollout.md) |
| 内网更新（客户端 + ops） | [`internal-update.md`](./internal-update.md) §12.7 |
| **打包实操 / 踩坑** | **§5** |

---

## 5. 打包实操 — 正确路径与踩坑记录

> **Verified:** 2026-06-19 — 本机 `D:\NSIS` + `build-wanding.ps1` 打出 `CCB-Wanding-1.0.0.exe`（约 846 MB）。

### 5.1 路径一览（打包包机）

| 角色 | 路径 |
|------|------|
| **NSIS（本机）** | `D:\NSIS\makensis.exe`（v3.12；`build-wanding.ps1` 已内置此候选路径） |
| **打包驱动** | `D:\Projects\claude-code-best\ccb-installer\scripts\build-wanding.ps1` |
| **NSIS 脚本（v2）** | `D:\Projects\claude-code-best\ccb-installer\installer-wanding-v2.nsi` |
| **Staging 根** | `D:\Projects\claude-code-best\ccb-installer\staging\` |
| **安装包产物** | `D:\Projects\claude-code-best\ccb-installer\CCB-Wanding-{Version}.exe` |
| **后端权威 dist** | `D:\claude-code-B\dist\`（**禁止**用 `ccb-installer\dist\` 当源） |
| **AionUI unpacked** | `D:\Projects\aionui-src\out\win-unpacked\` |
| **route-b 补丁源** | `ccb-installer\patches\aionui-ccb-route-b\index.js` |
| **价库 / data** | `D:\Projects\claude-code-best\data\*.xlsx` + md |
| **quotation MCP dist** | `mcp_servers\quotation-server\dist\` |
| **同事装完 $INSTALL** | `%LOCALAPPDATA%\Programs\CCB-Wanding\` |
| **同事 GUI 入口** | `%LOCALAPPDATA%\Programs\CCB-Wanding\ccb-launch-aionui.cmd` → `AionUi\AionUi.exe` |
| **同事 $CONFIG** | `%LOCALAPPDATA%\CCB-Wanding\.claude\` |

**Legacy（勿作 v2 发货标准）：**

| 产物 | 路径 |
|------|------|
| 仅 CCB 终端栈 | `ccb-installer\installer-wanding.nsi` → `CCB-Wanding-1.1.2.exe` |
| 仅 AionUI | `package-aionui-exe.ps1` → `aionui-src\out\AionUi-*.exe` |

### 5.2 标准命令

```powershell
# 全量（build dist + pack AionUI + staging + NSIS）
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.0

# 已有最新 claude-code-B\dist 与 win-unpacked 时（快）
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.0 -SkipBuild -SkipAionUiBuild

# 增量 staging 重打 NSIS（保留 staging 内 pip 产物，跳过 pip）
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.0 -SkipBuild -SkipAionUiBuild -SkipStagingClear -SkipPipMcp

# 只填 staging、暂不打 exe
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.0 -SkipBuild -SkipAionUiBuild -SkipNsis
# AionUI-only（默认不打包 windows-terminal vendor）：
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.1 -SkipBuild -SkipAionUiBuild
# 终端 TUI 栈需要 WT 时：
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.1 -IncludeWindowsTerminal

# 热更新 zip（已装机员工机 — 只打变更部位，无 AionUi/vendor 运行时/pip）
.\ccb-installer\scripts\build-wanding-hot.ps1 -Version 1.0.2 -Components dist,python,seed
.\ccb-installer\scripts\build-wanding-hot.ps1 -Version 1.0.2 -AutoFromGitDiff

# 目标机应用（需 sha256 sidecar）
$zip = 'D:\Projects\claude-code-best\ccb-installer\out\hot\CCB-dist-1.0.2-win-x64.zip'
$sha = (Get-Content "$zip.sha256" -Raw).Trim()
.\ccb-installer\scripts\internal-upgrade.ps1 -ZipPath $zip -ExpectedVersion 1.0.2 -ExpectedSha256 $sha

# 手动 NSIS（staging 已就绪）
cd D:\Projects\claude-code-best\ccb-installer
D:\NSIS\makensis.exe /DAPP_VERSION=1.0.0 installer-wanding-v2.nsi
```

2026-06-23 desktop/icon rule: the full `build-wanding.ps1 -Version x.y.z` path automatically includes the latest `data\ChatGPT Image*.png` icon source, generated `resources\ccb.ico`, staged `ccb.ico`, and staged `AionUiLauncher.exe`. You do not need to remember a separate icon/desktop-shortcut copy step. Skip-based commands are only for known-complete staging reuse; they are not the default release path.

**1.0.8 fleet release (update UI + scripts hot self-update):** [`ccb-installer/docs/wanding-1.0.8-release-runbook.md`](../../ccb-installer/docs/wanding-1.0.8-release-runbook.md)

**装完验收（发同事前）：**

```powershell
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
.\ccb-installer\scripts\smoke-wanding-e2e.ps1 -InstallDir "$env:LOCALAPPDATA\Programs\CCB-Wanding"
```

### 5.2.1 打包路径决策 — 全量 vs 热更新 vs 增量 NSIS（**2026-06-21**）

> **Rule 0：** 首装 / 残装 / 新机 → **只能**全量 `build-wanding.ps1`（无 `Skip*`）。日常 CCB 热修 → **`build-wanding-hot.ps1`**。动 AionUI → 必须重编 AionUI + 全量 NSIS。
>
> 思考清单（发版前 30 秒）：[`../guides/wanding-build-path-decision.md`](../guides/wanding-build-path-decision.md)  
> **验收清单（发版后必做）：** [`wanding-release-standard.md`](./wanding-release-standard.md) — 四层链 + 功能矩阵（Draft）

#### 1. Scope / Trigger

| 触发 | 路径 |
|------|------|
| 员工机从未装过 v2 NSIS，或 `%LOCALAPPDATA%\Programs\CCB-Wanding` 缺 `AionUi\AionUi.exe` / `vendor\bun` / `scripts\run-wanding-bootstrap.ps1` | **全量 NSIS** |
| 已完整装机，只改 `claude-code-B` / python / seed / MCP（§16.1 白名单内） | **热更新 zip** |
| 改了 `aionui-src`（含未跟踪的 `internalUpdateManifest.ts` 等） | **全量 NSIS**（删 `out/.build-hash` + `out/win-unpacked` 后重编） |
| 打包机 `staging\` 已完整，只想重打 `CCB-Wanding-x.y.z.exe` | **增量 NSIS**（`-SkipBuild -SkipAionUiBuild -SkipStagingClear -SkipPipMcp`） |

#### 2. 决策树

```text
改了什么？
├── 只动 claude-code-B / repo python / seed / MCP（§16.1 IN）
│   └── build-wanding-hot.ps1  ✅  约 2–10 min
├── 动了 aionui-src（renderer / main / preload / app.asar 契约）
│   └── build-wanding.ps1 全量（无 Skip）  ❌  约 30–60 min
├── 新机 / 残装 / 从没跑过完整 NSIS
│   └── build-wanding.ps1 全量（无 Skip）  ✅
└── staging 已完整，只重打 exe
    └── build-wanding.ps1 -SkipBuild -SkipAionUiBuild -SkipStagingClear -SkipPipMcp  ✅  约 5 min
```

#### 3. 耗时对照

| 路径 | 命令 | 典型耗时 | 产物 |
|------|------|----------|------|
| **全量首装** | `build-wanding.ps1 -Version x.y.z` | 30–60 min | `CCB-Wanding-x.y.z.exe` |
| **日常热修** | `build-wanding-hot.ps1 -Components …` | 2–10 min | `out/hot/CCB-dist-x.y.z-win-x64.zip` + `.sha256` |
| **自动选组件** | `build-wanding-hot.ps1 -AutoFromGitDiff` | 2–10 min | 同上 |
| **增量 NSIS**（打包机） | `-SkipBuild -SkipAionUiBuild -SkipStagingClear -SkipPipMcp` | ~5 min | 新 exe（staging 须已完整） |
| **禁止当发货** | 任何带 `-SkipAionUiBuild` 的「正式版」 | — | 可能 stale `app.asar` |

#### 4. 热更新白名单（IN / OUT）

| IN（`build-wanding-hot -Components`） | OUT（必须全量 NSIS） |
|---------------------------------------|----------------------|
| `dist` · `python` · `data` · `seed` | `AionUi/**`（含 `app.asar`） |
| `quotation-mcp` · `accurate-mcp` | `vendor/bun` · `vendor/python-wanding` · `vendor/git` |
| `office-word` · `excel` · `mcp-pip` | `scripts/**` · bootstrap 链 · NSIS 安装器本体 |

详表：[`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md) §16.1 · 应用链：[`internal-update.md`](./internal-update.md) §3.6

#### 5. 标准工作流

**A. 首装打底（每个环境一次）**

```powershell
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.2   # 禁止 Skip*
# 装后验收
.\ccb-installer\scripts\test-install-health.ps1 -InstallDir "$env:LOCALAPPDATA\Programs\CCB-Wanding"
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
.\ccb-installer\scripts\smoke-wanding-e2e.ps1 -InstallDir "$env:LOCALAPPDATA\Programs\CCB-Wanding"
```

**B. 日常 CCB 热修（打底完成后）**

```powershell
.\ccb-installer\scripts\sync-claude-code-b-mcp-prefetch.ps1 -Build -Deploy
.\ccb-installer\scripts\build-wanding-hot.ps1 -Version 1.0.3 -Components dist,python,seed
# 目标机
$zip = '...\ccb-installer\out\hot\CCB-dist-1.0.3-win-x64.zip'
$sha = (Get-Content "$zip.sha256" -Raw).Trim()
& "$env:LOCALAPPDATA\Programs\CCB-Wanding\scripts\internal-upgrade.ps1" `
  -ZipPath $zip -ExpectedVersion 1.0.3 -ExpectedSha256 $sha
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
```

**C. AionUI 变更（强制全量）**

```powershell
# 清增量缓存，避免复用旧 app.asar（2026-06-21 1.0.2 教训）
Remove-Item -Force "D:\Projects\aionui-src\out\.build-hash" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "D:\Projects\aionui-src\out\win-unpacked" -ErrorAction SilentlyContinue
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.3   # 无 Skip
```

#### 6. 残装识别（`test-install-health` 等价检查）

| 文件 | 完整 v2 安装 |
|------|----------------|
| `dist\cli.js` | ✅ |
| `AionUi\AionUi.exe` | ✅ |
| `vendor\bun\bun.exe` | ✅ |
| `scripts\run-wanding-bootstrap.ps1` | ✅ |
| `ccb-launch-aionui.cmd` | ✅（但残装时后续 bootstrap 会 fail） |

只有 `dist\cli.js` + 热更新 zip = **半截目录**，不能聊。先 repair 或全量 NSIS 打底，再发热 zip。

**残装一键修复（2026-06-22）：**

```powershell
.\ccb-installer\scripts\repair-wanding-install-dir.ps1 -InstallDir "$env:LOCALAPPDATA\Programs\CCB-Wanding"
# 或 NSIS 静默：CCB-Wanding-x.y.z.exe /S /REPAIR=1
```

详 §17.3.1 [`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md)。

#### 7. Validation & Error Matrix

| 条件 | 结果 | 处理 |
|------|------|------|
| `Test-StagingWanDInstall` 报 `app.asar` 缺 `isInternalUpdateEnabled` | NSIS 阻断 | 删 AionUI 增量缓存后全量重编（§5.2.1 C） |
| `build-wanding-hot` 打到无 `$INSTALL` 的新机 | 缺 bun/AionUi | 改全量 NSIS |
| `-SkipBuild` 全量 `build-wanding` 只为改 dist | 仍 wipe staging + pip | 改用 `build-wanding-hot` |
| hub 第 7 扩展 `aionext-qwen` 下载失败 | AionUI pack 中断 | 补 zip 或 `AIONUI_HUB_SKIP=1`（仅 dev 应急） |
| 员工直接双击 `AionUi.exe` | 绕过 bootstrap | 教同事只用开始菜单「万鼎」→ `ccb-launch-aionui.cmd` |
| 员工曾装 CLI，装 GUI 后仍 `ExecuteExtraTool` | 旧 `.claude\agents` + 旧 AionUI runtime | 发 **≥1.1.1**（config generation 2）；桌面 `AionUiLauncher` 进一次 — §17.4.1 |

#### 8. Wrong vs Correct

| Wrong | Correct |
|-------|---------|
| 残装上只打 `dist` 热 zip 当「能发货」 | 先全量 NSIS 打底，再热修 |
| `-SkipAionUiBuild` 发正式版 | 全量 AionUI 编译；manifest gate 验 `app.asar` |
| 用 `-SkipBuild -SkipAionUiBuild` 做日常 dist 修复 | `build-wanding-hot -Components dist` |
| 复用 06-15 `out/win-unpacked` 当今天 AionUI | 查 mtime + 删 `.build-hash` 后全量 |
| dev 测完直接发同事 | dev 槽 ≠ `$INSTALL`；必须装包验收 §5.2 |
| CLI 老用户手工清配置 | 装新 NSIS + 桌面快捷方式；bootstrap 自动 generation reset |

---

### 5.3 踩坑记录（2026-06-19 首次打通）

| 现象 | 原因 | 处理 |
|------|------|------|
| `makensis not in PATH` | NSIS 装在 `D:\NSIS` 未加入环境变量 | `build-wanding.ps1` 增加 `D:\NSIS\makensis.exe`；或手动指定路径 |
| `Bad text encoding` line 1 | `installer-wanding-v2.nsi` 需 **UTF-8 BOM**；行内 em-dash / 中文易触发 | 保存为 UTF-8 BOM；NSIS 内中文快捷方式改英文；commands 用 `File /r` |
| `could not find: nsExec.nsh` | v2 误加 `!include "nsExec.nsh"` | **删除 include**；与 legacy 一样直接 `nsExec::ExecToLog` |
| `failed opening file` … `sseAndStreamableHttpCompatibleServer.d.ts.map` | AionUi `node_modules` 深层 `examples\` + `.map` 路径过长或残缺 | NSIS：`File /r /x "*.map" /x "*.d.ts" /x "examples"`；`build-wanding` staging 后删 cruft |
| 空白报价单 xlsx 校验失败 | 文件名中文，脚本硬编码路径在部分 shell 下乱码 | `Get-ChildItem data\*.xlsx` 枚举；除价库外第三个 xlsx 视为模板 |
| 安装后 agent 不全 | `deploy-seed-agents.ps1` 调系统 `node` | 改为优先 `$INSTALL\vendor\bun\bun.exe` |
| `deploy-seed-agents` 源目录错 | 安装后无 `config\agents` | `deploy-seed-agents.mjs` 优先 `$INSTALL\seed\agents` |
| staging 很慢 | 全量 robocopy AionUi + vendor | 正常；可用 `-SkipBuild -SkipAionUiBuild` 复用已有产物；**日常热修**用 `build-wanding-hot.ps1` |
| exe 约 800MB+ | 含完整 Electron + bun/git/python + 价库 | 预期；非 bug |

### 5.4 Wrong vs correct

| Wrong | Correct |
|-------|---------|
| `makensis` 未装就打 `-SkipNsis` 以为有 exe | 必须有 NSIS 或手动 `D:\NSIS\makensis.exe` |
| 从 `ccb-installer\dist` 打后端 | 从 `claude-code-B\dist` staging |
| 发 legacy `CCB-Wanding-1.1.2.exe` 当「完整 GUI 包」 | 发 v2 `CCB-Wanding-x.y.z.exe`（含 `AionUi\`） |
| NSIS 里写 `..\data\` | 只读 `staging\`（v2） |
| 假设同事机已装 Node | 安装脚本用捆绑 `bun.exe` |

### 5.5 首次成功产物（存档）

| 项 | 值 |
|----|-----|
| 日期 | 2026-06-19 |
| 版本 | `1.0.0` |
| 文件 | `ccb-installer\CCB-Wanding-1.0.0.exe` |
| 大小 | ~846 MB |
| NSIS | `D:\NSIS\makensis.exe` v3.12 |

---

## 4. Changelog

| Date | Item |
|------|------|
| 2026-06-24 | **CLI→GUI 配置世代重置（§17.4.1）：** `apply-ship-config-reset.ps1` + `config-ship-manifest.json` gen 2；CLI/热更新老用户装新包后自动覆盖 agents + 清 AionUI runtime；建议发 **1.1.1+** |
| 2026-06-23 | **Desktop/icon packaging contract:** full `build-wanding.ps1 -Version x.y.z` automatically regenerates `resources\ccb.ico` from latest `data\ChatGPT Image*.png`, stages `ccb.ico`, stages `AionUiLauncher.exe`, and NSIS shortcuts target `AionUiLauncher.exe` with `$INSTDIR\ccb.ico`; guarded by `install-health-manifest.required_files`. |
| 2026-06-19 | 初版：§1 打包清单 + §2 缺口 |
| 2026-06-19 | **Implemented:** `build-wanding.ps1`, `installer-wanding-v2.nsi`; `deploy-seed-agents` uses bundled `bun.exe` on install |
| 2026-06-19 | **§5 打包实操：** 路径表、标准命令、NSIS/编码/长路径踩坑、首次 `CCB-Wanding-1.0.0.exe` ~846MB |
| 2026-06-20 | **OOTB 加固：** 见 [`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md) §17 — bundled route-b + acp-agent、staging 校验、默认不打包 WT、bootstrap 首次 ForceMd、NSIS 非空目录拦截、装后 health 检查 acp-agent |
| 2026-06-21 | **§5.2.1 打包路径决策：** 全量 vs `build-wanding-hot` vs 增量 NSIS；残装识别；1.0.2 AionUI 缓存/asar 教训；guide [`wanding-build-path-decision.md`](../guides/wanding-build-path-decision.md) |
