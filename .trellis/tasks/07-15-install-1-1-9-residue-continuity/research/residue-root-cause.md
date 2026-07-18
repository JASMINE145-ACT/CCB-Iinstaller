# Research — 1.1.9 员工现场 A+B（残留假设）(2026-07-15)

## User hypothesis

旧安装有残留。

## Verdict

**高度可信，而且比「单纯漏打包」更贴 Symptom A。**  
两症状可以同属一类：**`$CONFIG`（权威开关）已亮，但 `$INSTALL` 解析指向空/旧/不完整树** —— 或权威路径与「Programs 真安装根」分裂。

不一定是文件被杀软删；更常见是 **多根 / 旧树 / InstallDir 候选表缺官方路径**。

---

## Symptom A — 无法读取安装版本

| Step | Code |
|------|------|
| UI 文案 | `conversationContinuity.ts` ~L181 — snapshot null → throw |
| Snapshot | `readCcbContinuitySnapshot` — null if install/config resolve 失败 |
| Authority 先为真 | `isCcbMcpAuthorityActive` = `settings.json` **存在**（仅 `$CONFIG`） |
| Install resolve | `resolveCcbWandingCliPath` 候选：**无** `%LOCALAPPDATA%\Programs\CCB-Wanding\dist\cli.js` |

`ccbWandingRuntimeNode.ts` 候选（节选）：

```text
%LOCALAPPDATA%\CCB-Wanding\dist\cli.js     ← 非官方 Programs 根
D:\CCB-Wanding\dist\cli.js                  ← 开发机常见残留
~\CCB-Wanding\dist\cli.js
```

官方 `$INSTALL`（release-standard）：`%LOCALAPPDATA%\Programs\CCB-Wanding\`。

**可复现链条：**

```text
员工装过旧版 / 开发路径留下 settings.json
  → isAuthorityActive = true
  → Programs 1.1.9 已装，但 resolveCli 找不到候选（或先撞上空的 LOCALAPPDATA\CCB-Wanding）
  → installDir = null 或指向残缺树
  → getContinuitySnapshot = null
  → 更新面板 / continuity：AIONUI_INTERNAL_ERROR「无法读取当前安装版本」
```

完全退出重开有时能缓解（旧进程 cwd / 锁），但**不修复候选表缺 Programs**。

---

## Symptom B — config check failed（三路径）

Banner：`ccbStartupReadiness.ts` L188 ← `runCcbMcpHealthCheck({ probe:false })` 失败项 id。

失败 id（manifest `required_paths`）：

| id | 真实文件（相对 InstallDir） | 性质 |
|----|------------------------------|------|
| `quotation/vendor/wanding/.env.accurate` | `vendor/wanding/.env.accurate` | **装后 bootstrap**（`ensure-wanding-settings`），通常不进 NSIS 静态 File |
| `price-library/.../dist/index.js` | `vendor/mcp-servers/price-library-server/dist/index.js` | **应在 $INSTALL vendor** |
| `price-library/.../price_library_main.py` | `vendor/wanding/python/price_library_main.py` | **应在 $INSTALL vendor** |

⇒ 健康检查的 InstallDir 上：价库 vendor **缺**，且 Accurate env **未生成/未落到该根**。

与 A 同源时：authority 开在正确 config，但 health 扫到的是 **错/残 InstallDir**（或缺 bootstrap）。

备用假说（需现场 `missing:` 绝对路径否证）：

| 假说 | 何时成立 |
|------|----------|
| H1 **错 InstallDir / 残树**（主） | `missing:` 前缀 ≠ Programs\CCB-Wanding |
| H2 **正确树但热更/NSIS 漏价库** | 前缀正确且 staging 对比无文件 |
| H3 **bootstrap 未跑完** | 仅缺 `.env.accurate`，价库文件在 |
| H4 **$RUNTIME 旧 + 未全退** | Check Install route-b 红；与这三项弱相关 |

当前截图只给相对 id → **必须先在员工机打出绝对 `missing:` / resolve 到的 InstallDir**。

---

## 三层模型（为何「残留」能同时打中 A+B）

| Layer | Path | 残留方式 |
|-------|------|----------|
| `$INSTALL` | `Programs\CCB-Wanding` 或错误根 | 半截解压、旧 D:\CCB-Wanding、无 marker orphan |
| `$CONFIG` | `%LOCALAPPDATA%\CCB-Wanding\.claude` | **升级保留**；旧 settings 仍开 authority |
| `$RUNTIME` | `%APPDATA%\AionUi\...\managed-tools` | 未全退 / sync 跳过 |

已有工具：`repair-wanding-install-dir.ps1` · `find-wanding-installs.ps1` · `ccb-check-install.cmd` · NSIS「无 marker 非空拒装」。

---

## Employee diagnostic（执行前先跑）

```powershell
# 1) 多根探测
& "$env:LOCALAPPDATA\Programs\CCB-Wanding\ccb-list-installs.cmd"

# 2) 权威安装健康
& "$env:LOCALAPPDATA\Programs\CCB-Wanding\ccb-check-install.cmd"

# 3) 手工核对（对照 Symptom B）
$I = "$env:LOCALAPPDATA\Programs\CCB-Wanding"
@(
  "$I\dist\VERSION",
  "$I\dist\cli.js",
  "$I\vendor\wanding\.env.accurate",
  "$I\vendor\mcp-servers\price-library-server\dist\index.js",
  "$I\vendor\wanding\python\price_library_main.py"
) | ForEach-Object { "$((Test-Path $_)) $_" }

# 4) 对照「错误根」是否也有 settings / 半截 dist
Test-Path "$env:LOCALAPPDATA\CCB-Wanding\.claude\settings.json"
Test-Path "$env:LOCALAPPDATA\CCB-Wanding\dist\cli.js"
Test-Path "D:\CCB-Wanding\dist\cli.js"

# 5) 完全退出（含托盘）后重开 AionUiLauncher — 非 Ctrl+R
```

Ops 临时：`ensure-wanding-settings.ps1 -InstallDir $I`；残根 `repair-wanding-install-dir.ps1`；仍红则卸载+清 orphan 后重装 1.1.9。

---

## Product fix direction

1. **P0** `resolveCcbWandingCliPath`：加 `Programs\CCB-Wanding` + HKCU `InstallDir`；候选排序：env → 注册表 → Programs → 其它  
2. **P0** Snapshot null：区分「无安装」vs「config 有但 CLI 丢」→ 可读诊断（列出尝试路径）  
3. **Shipped — stale purge** (`WANd.INSTALL.STALE_PURGE.001`):  
   - **NSIS 安装路径（理想）**：选完 `$INSTDIR` → `DirectoryLeave` 检测其它树 → 弹窗确认 → 清理 → 再装  
   - 员工兜底：`ccb-purge-stale-installs.cmd` / 开始菜单  
   - GREEN: `scripts/test-purge-stale-wanding-installs.ps1` PASS  
4. **P1** Health banner：展开绝对 `missing:` + InstallDir  
5. **P1** 若 H2：whitelist/staging 价库闭包；若 H3：bootstrap 强制 ensure `.env.accurate`  
6. **P2** Runbook / employee FAQ  
7. **P0 still** `resolveCcbWandingCliPath` 补 Programs + 注册表（AionUI 侧）

---

## Contracts（provisional / existing）

| ID | Behavior |
|----|----------|
| `WANd.INSTALL.RESOLVE.001` *(provisional)* | InstallDir 解析覆盖官方 Programs + 注册表；拒绝静默指到空残树 |
| `WANd.INSTALL.CONTINUITY.001` *(provisional)* | Authority 开时 continuity snapshot 必须可读或给出可操作恢复 |
| `WANd.MCP.HEALTH.CONFIG.001` *(existing pattern)* | Layer1 required_paths 相对 **同一** InstallDir |
| Release three-layer | `wanding-release-standard.md` §1 |

---

## Sources

- Screenshots（用户 2026-07-15）  
- `ccbWandingRuntimeNode.ts` · `ccbContinuitySnapshot.ts` · `conversationContinuity.ts` · `ccbStartupReadiness.ts` · `ccbMcpHealthManifest.ts`  
- `wanding-release-standard.md` · `wanding-packaging-whitelist.md` §17 · `repair-wanding-install-dir.ps1`
