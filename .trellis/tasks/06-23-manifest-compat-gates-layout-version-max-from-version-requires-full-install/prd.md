# Manifest Compat Gates: max_from_version + layout_version + requires_full_install

## Goal

实现热更新兼容门控三字段，让 ops 能在 manifest 里声明"此包不适合热更"，客户端自动降级到全量 NSIS 安装。

## What I already know

- `ccb-check-update.ps1` `Test-HotUpdateEligible` 现在只检查 `min_from_version` 下界
- `publish-update-bundle.ps1` 文件不存在（spec 里标 P0 done，但实际没创建）
- `max_from_version` 已在 spec §2.5 `HotUpdate` schema 定义；`layout_version`、`requires_full_install` 只在 PRD 里
- manifest schema example（§2.6）已有字段占位但没有这三个字段
- `ccb-update-auto.ps1` 调 `ccb-check-update.ps1 -AutoApplyHot` → 最终走到 `Test-HotUpdateEligible`
- UpdateModal.tsx `resolveCcbUpdateMode` 还没实现 `max_from_version`（spec 标注 deferred）

## Requirements

### `ccb-check-update.ps1` — `Test-HotUpdateEligible` 扩展

- `max_from_version`：若存在且 installed_version > max_from_version → 返回 `$false`（降级全量）
- `requires_full_install`：若 `$true` → 返回 `$false`（降级全量）
- `layout_version`：客户端硬编码 `$SupportedLayoutVersion = 1`；若 manifest 值 > 1 → 返回 `$false`（降级全量）

### `publish-update-bundle.ps1` — 创建此脚本

Path: `ccb-installer/scripts/publish-update-bundle.ps1`（不建子目录 `update/`，与其他 scripts 平级）

功能：
- 从参数接收 `-Version`, `-HotZipPath`, `-InstallerPath`, `-BaseUrl`, `-MinFromVersion`, `-MaxFromVersion`, `-LayoutVersion`, `-RequiresFullInstall`
- 计算 sha256（`Get-FileHash`）
- 输出 manifest JSON（unified schema §2.1-2.5）到 `-OutFile`（默认 `.\staging-manifest.json`）
- 可选 `-Upload`：用 WinSCP / scp 或调 mcp deploy 工具上传（本次留 stub + TODO 注释，不实现上传）

### manifest schema spec 补齐

- `internal-update.md` §2.5 加 `layout_version`、`requires_full_install` 两行
- §2.6 example JSON 加这两字段
- §6.2 status table 把这三个字段从 Defer → Done

## Acceptance Criteria

- [ ] `Test-HotUpdateEligible` 当 installed > max_from_version 返回 false
- [ ] `Test-HotUpdateEligible` 当 `requires_full_install = true` 返回 false
- [ ] `Test-HotUpdateEligible` 当 `layout_version > 1` 返回 false
- [ ] `publish-update-bundle.ps1` 存在，运行 `-WhatIf` 输出正确 JSON（不上传）
- [ ] spec §2.5 包含三字段

## Out of Scope

- `publish-update-bundle.ps1` 实际 VPS 上传（留 stub）
- UpdateModal.tsx `resolveCcbUpdateMode` 的 max_from_version 检查（前端 deferred）
- `layout_version` 文件写入 dist/（当前所有安装视为 layout_version=1）

## Technical Notes

- `ccb-check-update.ps1` `Test-HotUpdateEligible` 位于第 136-144 行
- manifest compat fields 位于 `$hotUpdate` 对象：同 `min_from_version` 读法一致
- `publish-update-bundle.ps1` 不加进 `$shipScripts`（ops 工具，非员工端脚本）
- spec 位置：`internal-update.md` §2.5 在第 107-114 行附近；§6.2 status 在第 612-617 行

## Technical Approach

1. `ccb-check-update.ps1` — 在 `Test-HotUpdateEligible` 内在现有 min 检查后追加 3 个 if 块
2. `publish-update-bundle.ps1` — 新建脚本，ConvertTo-Json 输出完整 manifest，sha256 计算，WhatIf 支持
3. `internal-update.md` — §2.5 补两行，§2.6 example 补字段，§6.2 改状态
