# CCB-Wanding 更新发布维护手册

> **角色定位**：运维/发版操作手册，适用于每次给员工推送更新。
>
> **配套 spec**：
> - 架构设计 → [`../integration/internal-update.md`](../integration/internal-update.md)
> - 打包白名单 → [`../integration/wanding-packaging-whitelist.md`](../integration/wanding-packaging-whitelist.md)
> - 打包路径决策 → [`wanding-build-path-decision.md`](./wanding-build-path-decision.md)
>
> **VPS**：`67.216.206.3` · SSH 端口 `39222` · HTTP 端口 `80`
> **Manifest URL**：`http://67.216.206.3/updates/manifest.json`
> **Dev manifest**（可选）：`http://67.216.206.3/updates/manifest-dev.json`
>
> **Nginx 实际 alias 路径**：`/var/www/updates/`（见 §9.1 — 与上传目录 `/var/www/html/updates/` 必须对齐）

> **Current version line (2026-06-26):** Fleet baseline **1.1.2**; next publish **1.1.3-dev** (full NSIS) or hot zip **1.1.3.1** (see [`internal-update.md`](../integration/internal-update.md) §12.9). Examples below citing `1.0.8` → `1.0.9` are **historical** — same mechanics; always bump patch from **current** manifest `ccb.version`.

---

## 1. 核心概念速查

### 两种更新路径

| 路径 | 触发条件 | 员工体验 | 工具 |
|------|---------|---------|------|
| **热更（Hot Zip）** | `claude-code-B/dist/`、`scripts/` 等白名单路径 | 启动时静默 / About「热更新」 | `build-wanding-hot.ps1` |
| **全量安装（NSIS）** | AionUI `app.asar`、vendor、exe 图标、品牌更名 | 下载 exe → 静默或手动安装 | `build-wanding.ps1` |

> **常见误解（2026-06-23 实测）**：热更组件名 `dist` 指 **CCB 后端 `dist/cli.js`**，**不含** `AionUi/app.asar`。侧栏品牌名、About 标题、任务栏 exe 图标 → **只能全量 NSIS**。

### 三道热更门控（`ccb-check-update.ps1`）

客户端在应用热 zip 前自动检查：

| 字段 | 作用 | 触发降级 |
|------|------|---------|
| `min_from_version` | 版本下界，太旧的机器不走热更 | installed < min → 走全量 |
| `max_from_version` | 版本上界，太新的机器不兼容此热包 | installed > max → 走全量 |
| `layout_version` | zip 结构版本（当前硬编码=1） | manifest > 1 → 走全量 |
| `requires_full_install` | ops 紧急开关，强制全量 | `true` → 走全量 |

### 状态文件

```
%LOCALAPPDATA%\CCB-Wanding\updates\state.json    ← 更新检查/应用历史
%LOCALAPPDATA%\CCB-Wanding\logs\                 ← 安装日志（保留 500KB）
%LOCALAPPDATA%\CCB-Wanding\backups\              ← 热更前备份（保留最近 5 份）
```

---

## 2. 判断用哪种更新路径

```
改了什么？
├── 只改了 claude-code-B/dist/ 或 scripts/（后端 chunk、更新脚本）
│   └── → 热更 zip（§3）
├── 改了 AionUI（aionui-src）→ 重建 Electron / app.asar
│   └── → 全量 NSIS（§4）；热更 zip 不会更新 UI
├── 改了 vendor/（Python、bun、MCP 包）
│   └── → 全量 NSIS（§4）
└── 品牌/图标（侧栏 Mixing、exe 任务栏图标、ccb.ico）
    └── → 全量 NSIS（§4）
```

**经验规则**：每次发版前跑 `git diff HEAD~1 --name-only`，有 `AionUi/` 或 `vendor/` → 全量；只有 `dist/` 或 `scripts/` → 热更就够。

---

## 3. 热更发版（最常用）

### 3.1 打热更 zip

```powershell
cd D:\Projects\claude-code-best\ccb-installer\scripts

# 默认打包 dist + scripts（90% 场景）
.\build-wanding-hot.ps1 -Version 1.0.X -Components dist,scripts

# 输出：ccb-installer\out\hot\CCB-dist-1.0.X-win-x64.zip
```

> **版本号约定**：比当前 manifest 里的 `ccb.version` 大一个 patch（例：基线 **1.1.2** → 热更 **1.1.3** 或 **1.1.3.1**）。

### 3.2 生成 manifest

```powershell
.\publish-update-bundle.ps1 `
  -Version       "1.0.X" `
  -HotZipPath    "..\out\hot\CCB-dist-1.0.X-win-x64.zip" `
  -InstallerPath "..\CCB-Wanding-1.0.Y.exe" `   # 已有的最新全量包
  -MinFromVersion "1.0.8" `                       # 能热更的最低版本
  -ReleaseNotes  "本次改动说明" `
  -OutFile       "..\out\manifest.json"

# 先用 -WhatIf 预览 JSON，确认无误再去掉
```

### 3.3 上传 VPS

```powershell
# 顺序：先传 zip，再传 manifest（避免 manifest 已更新但 zip 还没到）
scp -P 39222 "..\out\hot\CCB-dist-1.0.X-win-x64.zip" `
    root@67.216.206.3:/var/www/html/updates/ccb/

scp -P 39222 "..\out\manifest.json" `
    root@67.216.206.3:/var/www/html/updates/manifest.json
```

### 3.4 验证 manifest 可访问

**必须同时验 VPS 本机与外网**（2026-06-23：本机 1459 字节、外网仍 103 字节空壳，根因是 nginx alias 指错目录，见 §9.1）。

```powershell
# 外网（员工 PC 视角）
curl.exe -s "http://67.216.206.3/updates/manifest.json"
# 应含 "ccb":{"version":"1.0.X",...}，而非 "ccb":null

(Invoke-RestMethod "http://67.216.206.3/updates/manifest.json").ccb.version

# 热 zip 也要 200
curl.exe -s -o NUL -w "zip HTTP %{http_code}`n" `
  "http://67.216.206.3/updates/ccb/CCB-dist-1.0.X-win-x64.zip"
```

```bash
# VPS 上（nginx 本机）
wc -c /var/www/updates/manifest.json    # 应与 /var/www/html/updates/manifest.json 一致
curl -s http://localhost/updates/manifest.json | head -c 200
ls -la /var/www/updates/ccb/CCB-dist-*.zip
```

---

## 4. 全量安装包发版

### 4.1 （如需）重建 AionUI

```powershell
cd D:\Projects\aionui-src
bun run build
# 等待编译完成（5-10 分钟）
```

### 4.2 打 NSIS 全量包

```powershell
cd D:\Projects\claude-code-best\ccb-installer\scripts

# 完整构建（首次或 vendor/AionUi 有变动）
.\build-wanding.ps1 -Version 1.0.X

# AionUI 未变动时可跳过重建
.\build-wanding.ps1 -Version 1.0.X -SkipAionUiBuild

# 输出：ccb-installer\CCB-Wanding-1.0.X.exe（约 800+ MB）
```

### 4.3 生成 manifest（含全量包）

```powershell
.\publish-update-bundle.ps1 `
  -Version        "1.0.X" `
  -HotZipPath     "..\out\hot\CCB-dist-1.0.X-win-x64.zip" `   # 可选
  -InstallerPath  "..\CCB-Wanding-1.0.X.exe" `
  -MinFromVersion "1.0.0" `
  -ReleaseNotes   "本次改动说明" `
  -OutFile        "..\out\manifest.json"
```

### 4.4 上传 VPS

```powershell
# 全量包（大文件，需要时间）
scp -P 39222 "..\CCB-Wanding-1.0.X.exe" `
    root@67.216.206.3:/var/www/html/updates/ccb/

# 热 zip（如果同时提供）
scp -P 39222 "..\out\hot\CCB-dist-1.0.X-win-x64.zip" `
    root@67.216.206.3:/var/www/html/updates/ccb/

# manifest 最后传
scp -P 39222 "..\out\manifest.json" `
    root@67.216.206.3:/var/www/html/updates/manifest.json
```

### 4.5 通知员工

全量包员工需要主动下载安装，无法静默推送。告知链接：
```
http://67.216.206.3/updates/ccb/CCB-Wanding-1.0.X.exe
```

---

## 5. AionUI / 品牌改动（Mixing 更名、侧栏图标）

| 改动 | 热更 zip | 全量 NSIS |
|------|----------|-----------|
| `aionui-src` 侧栏名、About、`app.asar` | ❌ | ✅ 必须重建 AionUI |
| `resources/app.ico`、任务栏图标 | ❌ | ✅ |
| `ccb.ico`、快捷方式图标 | ❌ | ✅ `build-wanding.ps1` |
| 仅 `claude-code-B/dist` 后端逻辑 | ✅ `-Components dist` | 可选 |

```powershell
# 全量（品牌 / 图标 / app.asar）
cd D:\Projects\claude-code-best\ccb-installer\scripts
.\build-wanding.ps1 -Version 1.0.X -SkipBuild   # dist 未改时；禁止 -SkipAionUiBuild

# 仅后端 patch 版本号（不含 UI 品牌）
.\build-wanding-hot.ps1 -Version 1.0.X -Components dist,scripts
```

---

## 6. 客户端验证流程

在**员工电脑**上（或你的测试机上）手动触发：

```powershell
# 方法 A：手动触发完整更新链
& "$env:LOCALAPPDATA\Programs\CCB-Wanding\scripts\ccb-update-auto.ps1" -Verbose

# 方法 B：只检查不应用（只看日志）
& "$env:LOCALAPPDATA\Programs\CCB-Wanding\scripts\ccb-check-update.ps1" -Verbose

# 查看更新状态
Get-Content "$env:LOCALAPPDATA\CCB-Wanding\updates\state.json" | ConvertFrom-Json | Format-List
```

**预期结果**：
- `state.json` 里 `available_version` 变成新版本号
- `last_apply_utc` 有值
- About 页 **万鼎后端 vX.Y.Z** 更新（热更只改后端版本，不改侧栏品牌名）

### 6.1 About / UpdateModal 验收（双轨 UI）

| 界面 | 何时出现 | 通过标准 |
|------|----------|----------|
| **About 静态页** | 打开设置 → 关于 | 两个徽章：`v{__APP_VERSION__}` + `万鼎后端 v{dist/VERSION}` |
| **UpdateModal** | 点「检查更新」且 manifest 有更新 | 两行：**万鼎后端** `1.0.8 → 1.0.9` +「热更新」；或 AionUI 行 |
| **UpdateModal upToDate** | 已是最新 | 仅一行 UI 版本 — **正常**，不是双轨 bug |

**测热更前**：
1. **关闭**「包含预发布/dev 版本」— 否则拉 `manifest-dev.json`（未上传则 404）
2. 从 **AionUiLauncher** 启动，不要裸点 `AionUi.exe`
3. 完全退出再开，About 看 `万鼎后端` 是否变号

---

## 7. 回滚

### 热更回滚（客户端执行）

```powershell
# 列出可回滚的备份
ls "$env:LOCALAPPDATA\CCB-Wanding\backups"

# 回滚到上一个热更前状态
& "$env:LOCALAPPDATA\Programs\CCB-Wanding\scripts\rollback-last-update.ps1" -Verbose
```

### VPS manifest 回滚（ops 执行）

```powershell
# 回退 manifest 到旧版本（让新机器拉不到错误的版本）
# 先 ssh 进 VPS 看历史
ssh -p 39222 root@67.216.206.3

# VPS 上
cp /var/www/html/updates/manifest.json /var/www/html/updates/manifest.json.bak-$(date +%Y%m%d)
# 然后重新上传旧 manifest
```

### 强制全量重装（ops 应急开关）

把 manifest 里的 `requires_full_install` 设为 `true`（重新生成 manifest 上传即可），所有客户端下次检查时会跳过热更，提示员工下载全量包。

```powershell
.\publish-update-bundle.ps1 `
  -Version              "1.0.X" `
  -InstallerPath        "..\CCB-Wanding-1.0.X.exe" `
  -RequiresFullInstall  $true `
  -ReleaseNotes         "紧急回滚，请重新安装" `
  -OutFile              "..\out\manifest.json"
```

---

## 8. 常见问题排查

| 现象 | 可能原因 | 排查方法 |
|------|---------|---------|
| About「检查更新」→ **Manifest fetch failed (404)** | 「包含预发布/dev 版本」**开着**，拉 `manifest-dev.json` 不存在 | 关掉开关；或 `cp manifest.json manifest-dev.json`（§9.1） |
| 外网 manifest 仍是 `"ccb":null`（103 字节） | nginx `alias /var/www/updates/` 指向**旧目录**，与 `/var/www/html/updates/` 不一致 | §9.1 路径对齐；`wc -c` 两路径应相同 |
| VPS `localhost` 正常、外网仍旧 manifest | 同上；或 `ln -s` 在已存在目录里建了**嵌套** `updates/updates` | `ls -la /var/www/updates` 应为 symlink，不是含 `manifest.json` 的普通目录 |
| 客户端不更新 | manifest 无 `ccb` 块 / zip 404 | 外网 `curl` manifest + zip URL |
| 热更后品牌名仍 WanD / 图标未变 | 热 zip **不含** `AionUi/` | 预期行为；发全量 NSIS |
| 热更下载后 sha256 校验失败 | zip 上传不完整 / manifest sha256 填错 | 重新传 zip；`publish-update-bundle.ps1` 重生成 |
| 热更成功但功能不对 | dist/ 里有旧缓存文件 | `rollback-last-update.ps1` 后重试 |
| 员工报「不完整安装」 | 热更中断 / 无全量打底 | 全量 NSIS；`repair-wanding-install-dir.ps1` |
| NSIS **无法写入 ccb.ico** | WanD 未关 / `D:\CCB-Wanding` 旧目录占用 | 结束进程后删目录重装；见 [`vps-create-employee-runbook.md`](../../scripts/org-phase0/vps-create-employee-runbook.md) §6.2 |
| 版本号不变 | 未走 Launcher 启动链 | `AionUiLauncher.exe` → `ccb-update-auto.ps1` |
| state.json `error` 有值 | 网络超时 / 权限 | 看 error + `logs/update-auto.log` |

### 8.1 案例：2026-06-23 1.0.9 热更联调

**症状链**：
1. About → 检查更新 → `Manifest fetch failed (404)` → dev 开关 ON，`manifest-dev.json` 不存在
2. 关掉 dev 后仍无更新 → 外网 manifest `"ccb":null`（103 B，`published_at` 2026-06-21）
3. VPS `curl localhost` 已 1459 B、含 `1.0.9`，外网仍 103 B

**根因**：nginx `location /updates/ { alias /var/www/updates/; }` 读的是 `/var/www/updates/manifest.json`（6/21 空壳）；运维用 scp 传到 `/var/www/html/updates/manifest.json`（6/23 正确）。执行 `ln -s /var/www/html/updates /var/www/updates` 时 **`/var/www/updates` 已存在为目录**，链接变成目录内的 `updates -> ...`，未替换顶层路径。

**修复**：
```bash
mv /var/www/updates /var/www/updates.bak
ln -s /var/www/html/updates /var/www/updates
nginx -t && nginx -s reload
wc -c /var/www/updates/manifest.json   # 应与 html 下一致（如 1459）
curl -s http://localhost/updates/manifest.json | grep 1.0.9
```

**教训**：上传目录 = nginx alias 目录；发版后 **外网 curl** 验收，不能只看 VPS localhost。

---

## 9. VPS 文件结构与 nginx

### 9.1 路径对齐（必读）

nginx（`/etc/nginx/sites-enabled/`）对 `server_name 67.216.206.3`：

```nginx
location /updates/ {
    alias /var/www/updates/;   # ← 客户端 HTTP 实际读这里
    ...
}
```

**上传/运维约定（二选一，推荐 A）**：

| 方案 | 做法 |
|------|------|
| **A（推荐）** | `ln -sf`：`/var/www/updates` → `/var/www/html/updates`；scp 目标用 `/var/www/html/updates/...` |
| **B** | 直接 scp 到 `/var/www/updates/...`（与 alias 一致，不用 html 子路径） |

**禁止**：`/var/www/updates` 已是目录时再 `ln -s`（会在目录内生成嵌套链接，nginx 仍读旧 `manifest.json`）。

**首次对齐检查**：
```bash
ls -la /var/www/updates
# 期望：lrwxrwxrwx ... /var/www/updates -> /var/www/html/updates

wc -c /var/www/updates/manifest.json /var/www/html/updates/manifest.json
# 两个字节数必须相同
```

**dev 通道（可选）**：
```bash
cp /var/www/updates/manifest.json /var/www/updates/manifest-dev.json
```

### 9.2 目录树

```
/var/www/html/updates/          # scp 上传落点（方案 A 时与 /var/www/updates 同 inode）
├── manifest.json               # stable 通道
├── manifest-dev.json           # dev 通道（可选；缺则 About dev 开关 404）
├── ccb/
│   ├── CCB-dist-1.0.X-win-x64.zip
│   ├── CCB-dist-1.0.X-win-x64.zip.sha256   # sidecar（可选）
│   └── CCB-Wanding-1.0.X.exe               # 全量包（热更测试可不传，但 full 路径会 404）
└── aionui/
    └── AionUi-*.exe            # 独立 AionUI 包（当前 manifest aionui:null 可空）
```

---

## 10. 快速命令备忘

```powershell
# 一键热更发版（最常用）
cd D:\Projects\claude-code-best\ccb-installer\scripts
$v = "1.0.X"   # ← 改这里
.\build-wanding-hot.ps1 -Version $v -Components dist,scripts
.\publish-update-bundle.ps1 -Version $v `
  -HotZipPath "..\out\hot\CCB-dist-$v-win-x64.zip" `
  -InstallerPath "..\CCB-Wanding-1.0.8.exe" `
  -MinFromVersion "1.0.8" -ReleaseNotes "xxx" -OutFile "..\out\manifest.json"
scp -P 39222 "..\out\hot\CCB-dist-$v-win-x64.zip" root@67.216.206.3:/var/www/html/updates/ccb/
scp -P 39222 "..\out\manifest.json" root@67.216.206.3:/var/www/html/updates/manifest.json
```

```powershell
# 检查 VPS manifest 当前版本
(Invoke-RestMethod "http://67.216.206.3/updates/manifest.json").ccb.version
```

```powershell
# 客户端触发更新（测试机）
& "$env:LOCALAPPDATA\Programs\CCB-Wanding\scripts\ccb-update-auto.ps1" -Verbose
```

---

## 11. Changelog

| 日期 | 变更 |
|------|------|
| 2026-06-23 | 初稿，整合 internal-update.md + 实战发版流程 |
| 2026-06-23 | §8.1 1.0.9 联调：`manifest-dev` 404、nginx `/var/www/updates` vs `html/updates` 错位、错误 `ln -s`；§5 澄清热更 `dist`≠AionUI；§6.1 About/UpdateModal 验收 |
