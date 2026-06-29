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
| `aionui-src` | Org knowledge UI | `/org-knowledge` route + sider entry — **wired 2026-06-26**; i18n `orgKnowledge` module registered **2026-06-26** |
| `aionui-src` | Dev shell / SSO | Desktop auth, `/tasks`, Mixing brand, `start-dev-full.ps1` — **wired 2026-06-26** |
| `aionui-src` | Dev Settings Layer 2 | Settings 模型/助手/Agents CCB branches + `runBackendMigrations` prune — **wired 2026-06-26** (uncommitted); task `06-26-aionui-source-level-recovery` |
| **Fill tool 1.1.3.1** | `python/` + pack gate | `fill_items` / `fill_row_guard` / `inquiry_backfill` in repo; **vendor sync 2026-06-27**; `install-health-manifest.json` + `Test-StagingWanDInstall` pack gate — task `06-25-architecture-business-system-boundaries` |
| **MCP permission #17–#18** | `aionui-src` + CCB dist | `MessageAcpPermission` radio layout fix (NSIS); `permissions.ts` auto-allow `mcp__excel__*` (dist hot or NSIS) — **2026-06-27** |
| **Guid「+」menu (CCB profile)** | `aionui-src` | `fetchGuidAssistantDetail` — session skills/MCP from `ccbAssistantProfilesService` / `ccbAgentsService`, not stale `ipcBridge.assistants.get`; `resolveCcbMcpAllowlistIds` fallback — **2026-06-27** (`bd97fb5`) |
| **GuidActionRow dev blocker** | `aionui-src` | Missing `: null` on ternary → Vite compile error / Guid white screen — **2026-06-27** (same aionui branch) |
| **Agent retire (5 Guid cards)** | `ccb-installer` seeds + `aionui-src` | Remove `cowork`, `word-form-creator` from keep set + seeds; `migration.ccbWandingPrunePresets_v2`; Guid shows 5 preset cards — **2026-06-27** (`b6eb59ef` + `bd97fb5`); spec `agents-unified-model.md` §538, §633 |
| **ROE Stop gate (#19)** | `ccb-installer` gate skill + seed | `quotation-agent:roe` block; `quotation-roe.sh` + `parse_transcript_roe.py`; `quotation-agent.md` Stop hooks + ROE SOP; dev deploy + `smoke-roe-deploy.ps1` 8/8 PASS — **2026-06-27**; task `06-27-result-oriented-execution`; spec `agents-unified-model.md` § ROE |
| **Quotation MCP health (#20)** | `quotation-server` + MCP health + **`.env.accurate`** | Python path fallback; AOL inventory; probe `match_quotation` + `get_inventory_by_code`; **2026-06-27/28**; task `06-27-quotation-mcp-health`; snapshot `progress-2026-06-28.md` |
| **Mixing brand icons (#21)** | `aionui-src` renderer + main | `BrandIcon.tsx` + sidebar `Layout.tsx` use `assets/logos/brand/app.png`; `devResourcesPath.ts` fixes dev taskbar/tray reading stale `resources/app.ico`; `build-wanding.ps1` `Sync-AionUiBrandAssets` — **2026-06-28** (uncommitted aionui-src); code-review PASS; `npm run package` exit 0 |
| **Gate-J universal ROE (#22)** | `ccb-subagent-gate` skill | `generic-roe-judge.sh` + `parse_transcript_roe_judge.py`; all 5 Stop-hook agents `:roe-judge:block`; in-process rules (no external API); gaps-first action `reject_prompt`; `roe-judge-profiles/`; `smoke-roe-judge-deploy.ps1` 12/12 — **2026-06-28**; task `archive/2026-06/06-28-roe-semantic-judge-l2-mvp`; spec `agents-unified-model.md` § Gate-J |

## Scope split — 全量 vs 热更

| 层 | 交付方式 | 规范锚点 | 1.1.3 / 1.1.3.1 内容 |
|----|----------|----------|----------------------|
| **全量专属** | NSIS only | `internal-update.md` **§12.9** | workspace sync #1–#14、`compareCcbVersions` #15–#16、`MessageAcpPermission` #17、Guid CCB「+」menu + `GuidActionRow`、**Mixing brand #21** |
| **热更可更** | hot zip 子集 | `wanding-packaging-whitelist.md` **§16.1** | **1.1.3.1**：询价回填、row guard、agent 覆盖（#12 seed 现为 6 agents / 5 Guid cards）；**#18** `permissions.ts` excel auto-allow via `dist`；**#19** ROE gate skill + `quotation-agent` hooks；**#20** quotation MCP config fallback + health `tools/call` probe；**#22** Gate-J universal `:roe-judge:block` + gaps-first `reject_prompt` |

## Recommended — 1.1.3 全量打包顺序

见 `internal-update.md` **§12.9.3**（main 含 1.1.3.1 → aionui 测试 → AionCore → win-unpacked → `build-wanding.ps1`）。

## Known bug — About 四段版本（§12.9.2）

`semver.coerce('1.1.3.1')` → `1.1.3`；#15 合入前用 `ccb-check-update.ps1 -AutoApplyHot`。

## Acceptance

- [x] `internal-update.md` §12.9 清单 + §12.9.1–12.9.3（含 #17–#18 MCP permission）
- [x] `wanding-packaging-whitelist.md` §16.6
- [x] Guid「+」menu CCB profile path + agent retire 5 cards — `agents-unified-model.md` + aionui `bd97fb5` + seeds `b6eb59ef`
- [x] ROE Stop gate #19 — `internal-update.md` §12.9 + whitelist §8.2 / §16.6 + task `06-27-result-oriented-execution`
- [x] Quotation MCP health #20 — incl. `.env.accurate` + inventory probe (2026-06-28); `mcp-health.md` + §12.9 #20 + `progress-2026-06-28.md`
- [x] Mixing brand icons #21 — `internal-update.md` §12.9 + whitelist §16.6 + `file-map.md` §2; aionui `BrandIcon` + `devResourcesPath` (**2026-06-28**, uncommitted)
- [x] Gate-J universal ROE #22 — `internal-update.md` §12.9 + whitelist §16.6 + `agents-unified-model.md` § Gate-J; `:roe-judge:block` + gaps-first prompt (**2026-06-28**); task `archive/2026-06/06-28-roe-semantic-judge-l2-mvp`
- [ ] 全量 NSIS 1.1.3 实际构建并发 manifest（ops，非本 spec task）
- [ ] Manual Guid 万鼎报价专家 edit-order ROE smoke（post-deploy，task `06-27-result-oriented-execution`）

## Out of scope

- 重打 1.1.3.1 热更 zip（已完成）
- manifest `full_installer` 升级到 1.1.3 NSIS（全量就绪后）
