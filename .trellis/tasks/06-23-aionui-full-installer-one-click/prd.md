# About 页面一键全量安装 CCB-Wanding.exe

## Goal

在 About 页面的"检查更新"弹窗里，当 manifest 判定为 `mode=full` 时，让用户可以一键下载并静默安装 CCB-Wanding-x.x.x.exe，无需手动下载、手动运行安装包。

## What I already know

- `ccbUpdate.check` bridge 已完整：从 VPS manifest 解析 `mode`（hot/full/none），返回 `CcbUpdateCheckResult`
- `ccbUpdate.apply` bridge 在 full 模式下已有实现：`downloadArtifact()` 下载 .exe 到 tmpdir → `applySilentNsisInstall()` 启动 NSIS /S + `app.quit()`
- 但当前 full 模式有三个问题：
  1. **下载无进度**：`downloadArtifact()` 是内部阻塞下载，不向 renderer 发任何进度事件，890MB 下载期间 UI 完全冻结
  2. **120s 超时太短**：慢速网络下 890MB 可能需要 3-5 分钟，当前 timeout 会导致下载失败
  3. **不显示 installing 状态**：`app.quit()` 在 800ms 后触发，用户看不到"WanD 将自动关闭"提示

- `ipcBridge.update.download` 已有完整的下载基础设施：
  - 流式下载 + 250ms 节流进度事件（`downloadProgress` channel）
  - SHA-256 校验
  - fallback URL 支持
  - allowlist 已包含 `67.216.206.3`（我们的 VPS）
  
- `ipcBridge.update.silentInstall` 已实现：路径安全校验（必须在 Downloads 目录，必须来自 tracked 下载）→ `applySilentNsisInstall()`

- `UpdateModal.tsx` 中的 `status='downloading'` 状态已有完整进度 UI，`status='success'` 已有"立即安装"按钮调用 `silentInstall`

- `internalFeedDownloadRef` 控制 success 状态是否显示"立即安装"按钮（internal feed URL 才显示）

## Requirements

1. 当 `ccbCheck.mode === 'full'` 且用户点击"下载安装包"按钮时：
   - 调用 `ipcBridge.update.download.invoke({ url: ccbCheck.fullInstaller.url, expected_sha256: ccbCheck.fullInstaller.sha256, file_name: 'CCB-Wanding-<version>.exe' })`
   - 设置 `downloadId` / `downloadPath`
   - 设置 `internalFeedDownloadRef.current = true`（确保 success 状态显示"立即安装"）
   - `setStatus('downloading')` — 已有的下载进度 UI 自动接管

2. 下载完成后（现有 `downloadProgress` 事件 `status=completed`）：
   - 自动进入 `status='success'` — 已有的"立即安装"按钮出现
   
3. 用户点击"立即安装"：
   - 调用 `ipcBridge.update.silentInstall.invoke({ installer_path: downloadPath })`
   - 进入 `status='installing'` — 已有的"WanD 将自动关闭，安装完成后请重新打开应用"提示
   - app.quit() 在 800ms 后触发

4. 不需要修改任何 bridge 层代码

## Acceptance Criteria

- [ ] `ccbCheck.mode === 'full'` 时"下载安装包"按钮触发下载，进度条可见
- [ ] 下载完成后出现"立即安装"按钮
- [ ] 点击"立即安装"后显示"WanD 将自动关闭"提示，然后应用退出并静默安装
- [ ] 下载过程中取消或网络错误时显示错误状态
- [ ] `ccbCheck.mode === 'hot'` 路径不受影响（保持原 `applyCcbUpdate()` 流程）

## Definition of Done

- TypeScript 编译通过（无新类型错误）
- 手动测试：全量安装完整走通（下载进度 → 立即安装 → app 退出 → 重新打开已升级）

## Technical Approach

**最小改动方案：只改 `UpdateModal.tsx`，约 25-35 行。**

在 `applyCcbUpdate()` 内（或替换其 full 分支）：

```typescript
// full mode: route through existing download pipeline with progress
const startCcbFullDownload = async () => {
  if (!ccbCheck || ccbCheck.mode !== 'full') return;
  setStatus('downloading');
  try {
    const fileName = `CCB-Wanding-${ccbCheck.latest}.exe`;
    const res = await ipcBridge.update.download.invoke({
      url: ccbCheck.fullInstaller.url,
      expected_sha256: ccbCheck.fullInstaller.sha256,
      file_name: fileName,
    });
    if (!res?.success || !res.data) {
      throw new Error(res?.msg || t('update.downloadStartFailed'));
    }
    internalFeedDownloadRef.current = true;  // 确保 success 状态显示"立即安装"
    setDownloadId(res.data.downloadId);
    setDownloadPath(res.data.file_path);
    // status stays 'downloading', progress events drive transitions
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setErrorMsg(msg);
    setStatus('error');
  }
};
```

然后把"下载安装包"按钮的 `onClick` 从 `applyCcbUpdate` 改为 `startCcbFullDownload`。

Hot 模式继续走 `applyCcbUpdate()`（不变）。

## Decision (ADR-lite)

**Context**: full 模式当前用 `ccbUpdate.apply` 内部阻塞下载，无进度，超时风险高。

**Decision**: 复用 `ipcBridge.update.download` + `ipcBridge.update.silentInstall` 管道，而不是扩展 ccbUpdate.apply。

**Consequences**: 
- 零 backend 改动
- 下载文件落在用户 Downloads 目录（不是 tmpdir）— 用户可找到但不影响安装流程
- 进度 UI 与 AionUI 自身更新 UI 共享，success 状态文案可能略显 generic，可接受

## Post-ship: Pending in 1.1.2 Build

已在 `main` 提交，等下次全量打包生效（见 `spec/integration/internal-update.md §12.8`）：

1. **NSIS 静默安装后自动重启** (`installer-wanding-v2.nsi`) — About 页一键安装完后 AionUI 自动重开
2. **热更新 Toast 通知** (`ccb-update-auto.ps1`) — 热更新成功弹系统通知（当前 manifest 无 `hot_update`，暂未触发）

## Out of Scope

- full 模式下载进度事件从 ccbUpdate bridge 发出（改动更大，不必要）
- 增加 120s timeout（绕过了，用 update.download 就没有这个问题）
- CCB-specific 进度 UI（共享现有 UI 足够）
- 自动触发（无需用户点击"立即安装"）

## Technical Notes

### Key files

- `D:\Projects\aionui-src\packages\desktop\src\renderer\components\settings\UpdateModal.tsx` (588 lines)
  - `applyCcbUpdate()`: lines 136-157 — hot 模式处理，full 模式当前是 no-op
  - `startDownload()`: lines 159-200 — 现有下载函数（AionUI 自身更新用）
  - `internalFeedDownloadRef`: ref 控制 success 状态是否显示"立即安装"
  - `status='downloading'` UI: 已有进度条
  - `status='success'` UI: lines 502-544 — "立即安装"按钮
  - `status='installing'` UI: lines 488-500 — "WanD 将自动关闭"

- `D:\Projects\aionui-src\packages\desktop\src\process\bridge\ccbUpdateBridge.ts` (289 lines)
  - full 模式 apply: lines 267-276 — 已实现但下载无进度
  - **不需要修改**

- `D:\Projects\aionui-src\packages\desktop\src\process\bridge\updateBridge.ts`
  - `ALLOWED_DOWNLOAD_HOSTS` line 73-81: 已含 `67.216.206.3` ✓
  - `ipcBridge.update.download.provider`: 流式下载 + 进度 ✓
  - `ipcBridge.update.silentInstall.provider`: 路径校验 + NSIS /S ✓

- `D:\Projects\aionui-src\packages\desktop\src\process\bridge\silentNsisInstall.ts`
  - `applySilentNsisInstall`: 800ms 后 app.quit() ✓

### isInternalFeedUrl

需要确认 `67.216.206.3` 被 `isInternalFeedUrl()` 或等效逻辑识别为 internal，以便 success 状态显示"立即安装"。如果不识别，手动设 `internalFeedDownloadRef.current = true` 即可。
