# scripts 自热更新 — v1.0.8 hot patch

## Goal

让 `scripts/` 目录（`ccb-check-update.ps1`、`ccb-update-auto.ps1`、`internal-upgrade.ps1` 等）进入热更新 zip，员工只需下次启动即可拿到最新脚本，无需重装 NSIS。

**现状**：`$HotPaths` 不含 `scripts/`，改脚本必须打 NSIS 全量包。  
**目标**：1.0.8 NSIS 送最后一次 `internal-upgrade.ps1`（含新 `$HotPaths`），之后脚本永久自更新。

## Requirements

- `internal-upgrade.ps1` 的 `$HotPaths` 加入 `'scripts'`
- `build-wanding-lib.ps1` 的 `Get-WandingHotComponentCatalog` 加入 `scripts` 条目
- `build-wanding-lib.ps1` 的 `Stage-WandingHotComponent` 加入 `scripts` staging 逻辑（从 ccb-installer/scripts 的 `$shipScripts` 白名单复制）
- `Resolve-WandingHotComponentsFromGit` 加入 `ccb-installer/scripts/` → `scripts` 组件的 git diff 映射
- `build-wanding.ps1` 的 drift guard（`$shipScripts`）不需要改（已是白名单）

## Acceptance Criteria

- [ ] `build-wanding-hot.ps1 -Version x -Components scripts` 能生成含 `scripts/` 的 zip
- [ ] `internal-upgrade.ps1` 应用 zip 后，employee 机器 `scripts/` 内容更新
- [ ] Copy 语义（非 Mirror）：scripts 追加，不删除 zip 里没有的文件
- [ ] `AutoFromGitDiff` 检测到 `ccb-installer/scripts/` 改动时自动包含 `scripts` 组件
- [ ] 1.0.8 NSIS 全量包含更新后的 `internal-upgrade.ps1`

## Out of Scope

- 让 `ccb-launch-aionui.cmd` 也热更（launcher 保持极简、基本不改）
- scripts 热更的 rollback 机制（fail-open 已覆盖）
- 加 HTTPS / sha256 对 scripts zip 的额外校验（复用现有 zip sha256）

## Technical Notes

- `$HotPaths` 在 `ccb-installer/scripts/internal-upgrade.ps1:71`
- 组件 catalog 在 `ccb-installer/scripts/build-wanding-lib.ps1:42`
- `Stage-WandingHotComponent` 在 `build-wanding-lib.ps1:~300`
- git diff 自动映射在 `build-wanding-lib.ps1:71`（`Resolve-WandingHotComponentsFromGit`）
- `$shipScripts` 白名单在 `build-wanding.ps1:~510`（已定义 shipped vs dev-only 脚本）
- `dist` 用 Mirror-Tree，其他路径用 Copy-Tree

## Decision (ADR-lite)

**Context**: scripts/ 不在 $HotPaths，改脚本每次都要 NSIS 全量包。  
**Decision**:  
- Copy-Tree（追加）语义：zip 外的脚本不删，更安全  
- scripts 默认加入每次热更 zip（-Components 默认含 scripts）  
**Consequences**: 第一次需要 1.0.8 NSIS 送 `internal-upgrade.ps1` 更新，之后永久自更新；scripts zip 几十 KB 无感。
