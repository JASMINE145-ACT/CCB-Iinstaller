# 同步 route-b 到 exe 版 AionUI runtime

## Goal

桌面 exe 版 AionUI（`AionUi.exe`）使用 `AppData\Roaming\AionUi\aionui\runtime\...` 下的
ACP index.js，但该路径未包含在 `sync-aionui-ccb-route-b.ps1` 的同步目标中，
导致 exe 版走原版路由而非 CCB-Wanding route-b，quotation MCP 工具不可用。

## Requirements

* 在 `sync-aionui-ccb-route-b.ps1` 的 `$targets` 数组中添加第四个路径：
  `C:\Users\<user>\AppData\Roaming\AionUi\aionui\runtime\managed-tools\acp\...`
* 运行同步脚本，将 route-b 复制到该路径
* 更新 `ccb-installer/AIONUI-BACKEND-STATUS.md`（补全 AionUI runtime 路径列表）

## Acceptance Criteria

* [ ] `sync-aionui-ccb-route-b.ps1` 输出 `[ok] AionUi exe runtime -> ...`
* [ ] 同步后三个目标的 MD5 均与 source 一致
* [ ] exe 版重启后 quotation 工具可调用

## Out of Scope

* 修改 entry-WG7IeDEv.js
* 修改 route-b index.js 本身

## Technical Notes

* 源文件: `ccb-installer/patches/aionui-ccb-route-b/index.js`
* 缺失路径: `C:\Users\m1774\AppData\Roaming\AionUi\aionui\runtime\managed-tools\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist`
* 路径结构与 `.aionui-web\runtime` 相同，只是根目录不同
* AionUi.exe 运行时 Windows 通常允许覆盖 .js 文件（非独占锁）
