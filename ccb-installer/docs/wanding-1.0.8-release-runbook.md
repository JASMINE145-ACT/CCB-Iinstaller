# WanD 1.0.8 发版运维手册

> **Scope:** 从 1.0.7 增量发布 **CCB-Wanding-1.0.8** — 内网双轨更新 UI、scripts 热更自更新、兼容门控、AionUiLauncher + SSO。  
> **Spec:** [`.trellis/spec/integration/wanding-first-ship.md`](../../.trellis/spec/integration/wanding-first-ship.md) §5.2.1 · [`internal-update.md`](../../.trellis/spec/integration/internal-update.md) · [`unified-org-sso-rollout.md`](../../.trellis/spec/integration/unified-org-sso-rollout.md)  
> **Tasks:** `06-23-update-system-hardening-v1-0-8` · `06-23-scripts-self-update-hot-patch-v1-0-8` · `06-23-manifest-compat-gates-*`

---

## 0. 本版变更摘要

| 能力 | 进全量 NSIS | 进热 zip | 说明 |
|------|-------------|----------|------|
| About 双轨更新 UI | ✅ `AionUi\app.asar` | ❌ | **禁止** `-SkipAionUiBuild` |
| `ccb-update-auto.ps1` 启动热更 | ✅ `scripts\` | ✅ `-Components scripts` | 1.0.8 打底后脚本可自更新 |
| `internal-upgrade.ps1`（含 `scripts` HotPath） | ✅ | ✅ | 1.0.7 无此路径，须全量装一次 |
| `rollback-last-update.ps1` | ✅ | ✅ | |
| `Test-HotUpdateEligible` 三门控 | 客户端 | manifest | `requires_full_install` / `layout_version` / `max_from_version` |
| `AionUiLauncher.exe` + `ccb.ico` | ✅ 自动 | ❌ | `build-wanding.ps1 -Version` 自动处理 |
| SSO `JWT_SECRET` | ✅ `sso.env.example` | — | `scripts/org-phase0/env.local` 注入 |
| `claude-code-B\dist` | ✅ | 可选 | 与 1.0.7 同份时可 `-SkipBuild` |

---

## 1. 打包前检查

```powershell
# SSO 注入源（勿 commit）
Test-Path D:\Projects\claude-code-best\scripts\org-phase0\env.local

# NSIS
Test-Path D:\NSIS\makensis.exe

# aionui-src 更新相关改动已保存
cd D:\Projects\aionui-src
git status --short packages/desktop/src/process/bridge packages/desktop/src/renderer/components/settings
```

---

## 2. 全量 NSIS（必做）

```powershell
cd D:\Projects\claude-code-best

# 避免复用旧 app.asar
Remove-Item -Force "D:\Projects\aionui-src\out\.build-hash" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "D:\Projects\aionui-src\out\win-unpacked" -ErrorAction SilentlyContinue

# dist 未改：-SkipBuild；禁止 -SkipAionUiBuild
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.8 -SkipBuild
```

**产物：** `ccb-installer\CCB-Wanding-1.0.8.exe`

**打包机 staging 已完整、只重编 AionUI 时（约 15–20 min）：**

```powershell
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.8 `
  -SkipBuild -SkipStagingClear -SkipPipMcp
# 仍禁止 -SkipAionUiBuild
```

---

## 3. 热更新 zip

```powershell
# 默认已是 dist + scripts；显式指定业务层变更
.\ccb-installer\scripts\build-wanding-hot.ps1 -Version 1.0.8 `
  -Components scripts,python,seed,quotation-mcp

# 或
.\ccb-installer\scripts\build-wanding-hot.ps1 -Version 1.0.8 -AutoFromGitDiff
```

**产物：** `ccb-installer\out\hot\CCB-dist-1.0.8-win-x64.zip` + `.sha256`

**验证 zip 含 scripts：**

```powershell
Expand-Archive -LiteralPath ".\ccb-installer\out\hot\CCB-dist-1.0.8-win-x64.zip" `
  -DestinationPath $env:TEMP\hot-108-test -Force
Test-Path "$env:TEMP\hot-108-test\scripts\ccb-update-auto.ps1"
Test-Path "$env:TEMP\hot-108-test\scripts\internal-upgrade.ps1"
```

---

## 4. 装后验收（本机试装后再发同事）

```powershell
# 静默或交互安装 CCB-Wanding-1.0.8.exe 后：
$install = "$env:LOCALAPPDATA\Programs\CCB-Wanding"

.\ccb-installer\scripts\test-install-health.ps1 -InstallDir $install
.\ccb-installer\scripts\verify-update-server.ps1 -InstallDir $install
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session

# 必须从开始菜单 / 桌面 AionUiLauncher 进（不要裸 AionUi.exe）
# About → 检查更新 → 双轨 UI（有 VPS 更新时）
```

| 检查 | 通过标准 |
|------|----------|
| `AionUiLauncher.exe` | `test-install-health` PASS |
| `scripts\ccb-update-auto.ps1` | 存在 |
| `internal-upgrade.ps1` 含 `'scripts'` | `Select-String` 命中 |
| SSO | `sso.env` 非空 JWT；`verify-sso-jit.ps1`（可选） |
| 启动链 | Launcher → cmd → auto → AionUi |

---

## 5. 生成 manifest

**权威脚本：** `ccb-installer/scripts/publish-update-bundle.ps1`  
（旧路径 `scripts/update/publish-update-bundle.ps1` 已弃用 — 见文件头说明）

```powershell
cd D:\Projects\claude-code-best
New-Item -ItemType Directory -Force -Path .\_publish\updates | Out-Null

.\ccb-installer\scripts\publish-update-bundle.ps1 -Version 1.0.8 `
  -HotZipPath ".\ccb-installer\out\hot\CCB-dist-1.0.8-win-x64.zip" `
  -InstallerPath ".\ccb-installer\CCB-Wanding-1.0.8.exe" `
  -MinFromVersion "1.0.8" `
  -MaxFromVersion "1.0.12" `
  -LayoutVersion 1 `
  -RequiresFullInstall $false `
  -ReleaseNotes "内网双轨更新；scripts 热更；AionUiLauncher；兼容门控" `
  -OutFile ".\_publish\updates\manifest.json" `
  -WhatIf   # 先预览 JSON，去掉 -WhatIf 写盘

# 写盘后 + 打印 scp 命令（stub，手工上传）
.\ccb-installer\scripts\publish-update-bundle.ps1 ... -Upload
```

### 兼容字段（`ccb-check-update.ps1` → `Test-HotUpdateEligible`）

| manifest 字段 | 1.0.8 推荐值 | 效果 |
|---------------|--------------|------|
| `min_from_version` | `"1.0.8"` | 1.0.7 须先全量 NSIS（无 scripts 热路径） |
| `max_from_version` | `"1.0.12"` | 安装版本高于此 → 走全量 NSIS |
| `layout_version` | `1` | 客户端 `SupportedHotLayoutVersion=1` |
| `requires_full_install` | `false` | 日常热更；紧急时改 `true` |

---

## 6. 上传 VPS

```powershell
# 方式 A：按 publish -Upload 打印的 scp 三条执行
scp -P 39222 .\ccb-installer\CCB-Wanding-1.0.8.exe root@67.216.206.3:/var/www/updates/ccb/CCB-Wanding-1.0.8.exe
scp -P 39222 .\ccb-installer\out\hot\CCB-dist-1.0.8-win-x64.zip root@67.216.206.3:/var/www/updates/ccb/
scp -P 39222 .\_publish\updates\manifest.json root@67.216.206.3:/var/www/updates/manifest.json

# 方式 B（若存在）
.\scripts\update\upload-staged-manifest.ps1
```

**VPS 验证：**

```bash
curl -s http://67.216.206.3/updates/manifest.json | head -c 500
```

---

## 7. 员工升级路径

| 现状 | 操作 |
|------|------|
| **1.0.7** | 发 `CCB-Wanding-1.0.8.exe` 全量装一次；或 About → 下载合并包 |
| **已 1.0.8** | 下次启动 `ccb-update-auto` 可拉热 zip；或 About 检查更新 |
| **新账号** | VPS 建号手册：[`scripts/org-phase0/vps-create-employee-runbook.md`](../../scripts/org-phase0/vps-create-employee-runbook.md) |
| **SSO** | 1.0.7→1.0.8 一般不需重配；`JWT_SECRET` 随安装模板保留 |

---

## 8. Wrong vs Correct

| Wrong | Correct |
|-------|---------|
| `build-wanding -Version 1.0.8 -SkipAionUiBuild` 当正式版 | 必须重编 AionUI |
| `MinFromVersion 1.0.7` 指望热 zip 送 scripts 能力 | `MinFromVersion 1.0.8` |
| 只发热 zip 给 1.0.7 员工 | 必须先全量 1.0.8 NSIS |
| 双击 `AionUi.exe` 验更新 | 桌面 `AionUiLauncher` / 开始菜单 CCB-Wanding |
| 手写 manifest sha256 | `publish-update-bundle.ps1` |
| 用 `scripts/update/publish-update-bundle.ps1` | `ccb-installer/scripts/publish-update-bundle.ps1` |

---

## 9. 一键复制（顺序执行）

```powershell
cd D:\Projects\claude-code-best
Remove-Item -Force "D:\Projects\aionui-src\out\.build-hash" -EA SilentlyContinue
Remove-Item -Recurse -Force "D:\Projects\aionui-src\out\win-unpacked" -EA SilentlyContinue
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.8 -SkipBuild
.\ccb-installer\scripts\build-wanding-hot.ps1 -Version 1.0.8 -Components scripts,python,seed,quotation-mcp
.\ccb-installer\scripts\test-install-health.ps1
New-Item -ItemType Directory -Force -Path .\_publish\updates | Out-Null
.\ccb-installer\scripts\publish-update-bundle.ps1 -Version 1.0.8 `
  -HotZipPath ".\ccb-installer\out\hot\CCB-dist-1.0.8-win-x64.zip" `
  -InstallerPath ".\ccb-installer\CCB-Wanding-1.0.8.exe" `
  -MinFromVersion "1.0.8" -MaxFromVersion "1.0.12" `
  -OutFile ".\_publish\updates\manifest.json" -Upload
```

---

*Last updated: 2026-06-23*
