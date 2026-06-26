# One-Click Silent Update: Hot Auto-Apply + Full NSIS /S

## Goal

员工只需等待（或点一次按钮），WanD 所有层（CCB + AionUI）自动安装更新，全程零额外操作，完成后提示重启。

---

## Current State (from code inspection)

### Already working
- `ccbUpdateBridge.ts` `apply(mode='hot')`: download zip → sha256 → spawn `internal-upgrade.ps1` → backup/rollback — **完整一键流程**
- `UpdateModal.tsx` CCB 行：`applyCcbUpdate()` → IPC → 成功后显示「请完全退出并重新打开 WanD」
- `ccb-update-notify.ps1`: 启动时 `-BackgroundCheck` → 若有更新弹 MessageBox（Phase 1 通知）
- NSIS: `RequestExecutionLevel user`，安装到 `%LOCALAPPDATA%\Programs\CCB-Wanding` — **`/S` 无 UAC，可静默**

### Gaps (断点)

| Gap | 文件 | 当前行为 | 目标行为 |
|-----|------|----------|----------|
| P0-A | `ccbUpdateBridge.ts` L269 | `shell.openPath(installerPath)` | `spawn(exe, ['/S'])` + `app.quit()` |
| P0-B | `updateBridge.ts` / `UpdateModal.tsx` | 下载完 AionUI exe → 显示在 Downloads，用户手动双击 | 内网 feed 时：spawn exe /S + quit |
| P1 | `ccb-update-notify.ps1` | 弹 MessageBox 通知 | 启动时自动 hot-apply，fail-open；全量仍弹窗 |

---

## Requirements

### P0 — Full NSIS silent install (两处 `shell.openPath` → `/S`)

1. **CCB full installer** (`ccbUpdateBridge.ts` apply mode='full'):
   - 下载 full_installer artifact → sha256 验证
   - `spawn(installerPath, ['/S'], { windowsHide: false })` — 等待退出码 (可选，因安装完成后 WanD 会关闭)
   - 返回 `{ success: true }` 后调用 `app.quit()`（或由 renderer 收到结果后弹提示再 quit）
   - 失败时返回 `{ success: false, error: 'install_failed' }`

2. **AionUI standalone installer** (`updateBridge.ts` / UpdateModal):
   - 仅当 `isInternalFeedUrl(asset.url)` 时走静默路径（不改动 GitHub/CDN 下载路径）
   - 下载完成 → 新增 IPC `update.silentInstall` → main process spawn exe `/S` → `app.quit()`
   - 或直接在 `update.download` 完成后，`UpdateModal` 对内网 feed 显示「正在安装...」按钮触发 silent install

### P1 — Startup auto-apply hot update (fail-open)

3. **新脚本 `ccb-update-auto.ps1`**（从 `ccb-update-notify.ps1` 演进）:
   - 从 manifest 检查 CCB 版本
   - 若有 `hot_update` 且版本在范围内：**自动下载 → sha256 → `internal-upgrade.ps1`**
   - 超时上限：**30 秒**（下载 + 解压）；超时或失败：**fail-open**（写日志，继续启动）
   - 若需 full installer：仅弹窗提示（不自动装）
   - `CCB_NO_UPDATE=1` 可完全跳过

4. **`ccb-launch-aionui.cmd` 更新**:
   - 将 `ccb-update-notify.ps1` 调用改为 `ccb-update-auto.ps1`
   - **改为阻塞调用**（去掉 `start /b`），确保 hot update 在 AionUI 启动前完成

---

## Acceptance Criteria

- [ ] CCB full installer：About 点「更新」→ 静默安装 → AionUI 自动关闭，员工重开即是新版
- [ ] AionUI 内网 feed：About 下载 AionUI exe → 静默安装 → AionUI 自动关闭
- [ ] 启动 hot-apply：`ccb-update-auto.ps1` 在 30s 内完成热更，AionUI 无感启动新版
- [ ] 启动超时 / 失败：fail-open，AionUI 正常启动，`%LOCALAPPDATA%\CCB-Wanding\logs\` 有错误记录
- [ ] `CCB_NO_UPDATE=1` 完全跳过启动更新
- [ ] 无 UAC 弹窗（NSIS per-user）
- [ ] hot-apply 路径已有 backup/rollback — 不改动（保持 `internal-upgrade.ps1` 现有逻辑）

---

## Out of Scope

- `UpdateModal「全部更新」` 串行按钮（延后）
- `hot_update.max_from_version`（延后）
- P6 `manifest-dev.json` prerelease wiring
- HTTPS fleet flip（延后，pre-TLS http 已有 allowlist）
- Authenticode signing
- 自动重启 AionUI（安装完成后由员工手动重开，简单可靠）

---

## Technical Notes

- NSIS: `RequestExecutionLevel user` — 安装到 `%LOCALAPPDATA%`，`/S` 无 UAC ✅
- `ccb-launch-aionui.cmd` 当前用 `start /b` 调 notify（非阻塞）→ P1 需改为阻塞
- `ccbUpdateBridge.ts` apply full 在 L269: `shell.openPath(installerPath)` 是唯一改动点
- AionUI 内网 feed 判断：`isInternalFeedUrl(url)` 已有（UpdateModal L37-38）
- 相关 spec: `internal-update.md §3.3, §3.7` — full mode: "download full_installer → NSIS /S"
- 测试：NSIS `/S` 在员工机上验证已通过（per-user，无 UAC）

---

## Decisions

| # | 问题 | 决定 |
|---|------|------|
| 1 | 启动 hot-apply 成功提示 | Launcher 窗口打印 `[CCB-Wanding] 已更新至 x.x.x，正在启动...`，无需改 AionUI |
| 2 | AionUI 静默安装触发 | 下载完成后 UpdateModal 把「在文件夹中显示」换为「立即安装」按钮，点击后 spawn `/S` + quit |

## Open Questions

_（无，进入 expansion sweep）_

