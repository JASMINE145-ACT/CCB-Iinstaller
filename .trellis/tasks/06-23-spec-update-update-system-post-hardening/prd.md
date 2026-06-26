# Spec Update — Update System Post-Hardening (v1.0.8)

## Goal

将 `06-23-scripts-self-update-hot-patch-v1-0-8` 和 `06-23-update-system-hardening-v1-0-8` 两个任务的实现结果同步到 Trellis spec 文档，消除文档与代码之间的漂移。

## Requirements

### wanding-packaging-whitelist.md
- §16.1 Hot-update zip IN 列表加 `scripts/**`
- §17.5 shipped scripts 列表加 `ccb-update-auto.ps1`、`rollback-last-update.ps1`，备注 `ccb-update-notify.ps1` 为 legacy/fallback
- Changelog 条目记录 2026-06-23 变更

### internal-update.md
- 新增 §3.x（或合并进 §3.2）：`updates/state.json` 字段说明
- 新增 rollback 脚本说明（`rollback-last-update.ps1`）
- 新增日志/backup 保留规则（最多 5 个 backup，log 截断到 400 KB）
- `internal-upgrade.ps1` §16.1 HotPaths 已含 `scripts` — 补注释
- Changelog 条目记录 2026-06-23 变更

## Acceptance Criteria

- [ ] §16.1 hot-update zip IN 含 `scripts/**`
- [ ] shipped scripts 列表含 `ccb-update-auto.ps1` 和 `rollback-last-update.ps1`
- [ ] `ccb-update-notify.ps1` 标注 legacy/fallback
- [ ] state.json 字段有文档
- [ ] rollback 脚本有文档
- [ ] 两个 spec 文件 changelog 有 2026-06-23 条目

## Out of Scope

- manifest 兼容性元数据（min/max_from_version）的 spec 更新（P1 延后）
- 其他 spec 文件（aionui-update-mechanism.md、build-deploy-verify.md）

## Technical Notes

- `wanding-packaging-whitelist.md` §16.1 在第 705-718 行
- `wanding-packaging-whitelist.md` §17.5 shipped list 在第 856 行
- `wanding-packaging-whitelist.md` changelog 在第 896 行附近
- `internal-update.md` §3.2 在第 198-216 行
- `internal-update.md` changelog 在第 547-629 行附近
