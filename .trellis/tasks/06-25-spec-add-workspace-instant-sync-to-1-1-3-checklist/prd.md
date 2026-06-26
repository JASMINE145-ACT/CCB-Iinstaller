# Spec — Workspace Instant Sync → 1.1.3 Full Package Checklist

## Goal

把 workspace 即时刷新（AionUI + AionCore）纳入 **1.1.3 全量 NSIS** 打包 checklist，并写清与 **1.1.3.1 热更** 的边界；**已落入 spec**（见下方 Delivered）。

## Delivered (spec)

| 文档 | 节 | 内容 |
|------|-----|------|
| `internal-update.md` | **§12.9** | 全量清单 #1–#16；§12.9.1–12.9.3；Pre-flight；build command — **restored 2026-06-26** after git refactor gap |
| `wanding-packaging-whitelist.md` | **§16.6** | 全量 vs 热更合流表；四段版本 ops 注意 — **restored 2026-06-26** |
| `aionui-src` | `internalUpdateManifest.ts` | `compareCcbVersions()`（#15）— **code in repo**; needs NSIS pack |
| `aionui-src` | Workspace hooks | `useWorkspaceWatchLifecycle` + `useWorkspaceInstantRefresh` + `patchDirectoryChildren` — **wired 2026-06-26** |
| `aionui-src` | Org knowledge UI | `/org-knowledge` route + sider entry — **wired 2026-06-26** |

## Scope split — 全量 vs 热更

| 层 | 交付方式 | 规范锚点 | 1.1.3 / 1.1.3.1 内容 |
|----|----------|----------|----------------------|
| **全量专属** | NSIS only | `internal-update.md` **§12.9** | workspace sync #1–#14、`compareCcbVersions` #15–#16 |
| **热更可更** | hot zip 子集 | `wanding-packaging-whitelist.md` **§16.1** | **1.1.3.1**：询价回填、row guard、agent 覆盖 |

## Recommended — 1.1.3 全量打包顺序

见 `internal-update.md` **§12.9.3**（main 含 1.1.3.1 → aionui 测试 → AionCore → win-unpacked → `build-wanding.ps1`）。

## Known bug — About 四段版本（§12.9.2）

`semver.coerce('1.1.3.1')` → `1.1.3`；#15 合入前用 `ccb-check-update.ps1 -AutoApplyHot`。

## Acceptance

- [x] `internal-update.md` §12.9 清单 + §12.9.1–12.9.3
- [x] `wanding-packaging-whitelist.md` §16.6
- [ ] 全量 NSIS 1.1.3 实际构建并发 manifest（ops，非本 spec task）

## Out of scope

- 重打 1.1.3.1 热更 zip（已完成）
- manifest `full_installer` 升级到 1.1.3 NSIS（全量就绪后）
