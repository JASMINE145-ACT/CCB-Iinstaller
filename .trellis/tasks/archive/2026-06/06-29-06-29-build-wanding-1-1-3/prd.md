# 打包 1.1.3 安装包 — 重构后全量 NSIS

## Goal

从当前源码（含所有重构改动）生成 `CCB-Wanding-1.1.3.exe`，可直接覆盖员工 1.1.2 安装：
- `%LOCALAPPDATA%\Programs\CCB-Wanding\` 全量替换
- `%LOCALAPPDATA%\CCB-Wanding\.claude\` 保留（会话 + 个人设置）
- `%APPDATA%\AionUi\` 保留（AionUI 会话）

## 关键变更（自 1.1.2 以来）

### CCB dist（`claude-code-B` — 13 个未提交文件）
- `agent.ts` — tryRehydrateStaleSession 不传旧 ccbAgentId（profile drift 修复）
- `assistantProfiles.ts` — MAX_PENDING_PROFILE_AGE_MS 300s
- `agentSessionProfile.ts` — 专家会话恢复
- `mcpSessionPrefetch.ts`, `mcpToolRepeatGuard.ts`, `permissions.ts`, `promptConversion.ts`
- `wanDEnvBootstrap.ts`, `wanDMcpWarmup.ts`, `workspacePointer.ts`

### AionUI（`aionui-src` — 66 个未提交文件）
- `ccbAssistantProfileSession.ts` — 300s TTL（drift 修复）
- `ccbPresetConversationExtra.ts` — 专家 resume 解析（drift 修复）
- `ccbStartupReadiness.ts` / `useCcbStartupReadiness.ts` — 启动 MCP warm (#23)
- `priceLibrary/` — 价格库 UI（全新页面）
- `BrandIcon.tsx`, `app.ico` — Mixing 品牌图标 (#21)
- `OrgKnowledgePage`, `GuidPage`, `AcpSendBox`, `CcbWandingAgentsPanel` 等多处 UI 调整
- `i18n-config.json` + locales 国际化更新

### ACP 补丁
- `acp-agent.js` — drainObservedClean 修复（2026-06-29，已同步到 patches/）
- `index.js` — Route B（已有，无需改动）

### Seed agents（config/agents/）
- `wande-orchestrator.md` — 2026-06-29 更新
- `quotation-agent.md` — 2026-06-29 更新（ROE:off 等）
- `accurate-agent.md` — 2026-06-28 更新
- `ppt-creator.md` — 2026-06-27 更新
- **已退役**：cowork + word-form-creator（目录内已删除）

### ccb-subagent-gate skill
- 含 universal ROE slim (#22) — `roe-judge-profiles/`, generic-roe-judge.sh

## 构建计划

| 步骤 | 命令 | 备注 |
|------|------|------|
| 1 | `cd D:\claude-code-B; bun run build` | CCB dist 重建；含 profile drift 修复 |
| 2 | AionUI rebuild（build-wanding 内部触发）| `build-with-builder.js --pack-only` + `electron-builder --dir` |
| 3 | `build-wanding.ps1 -Version 1.1.3` | 完整 staging + NSIS |
| 4 | 验收：`Test-StagingWanDInstall` | 含 app.asar `isInternalUpdateEnabled` 检查 |

**命令（一行）：**
```powershell
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.1.3
```

## Acceptance Criteria

- [ ] `staging validation OK` — manifest 所有 required_files 存在 + Route B + acp-agent
- [ ] `app.asar` 含 `isInternalUpdateEnabled` 和 `ccbAssistantProfileSession` 新逻辑
- [ ] `dist/VERSION` = `1.1.3`
- [ ] `seed/agents/` 含 6 个 agent（无 cowork / word-form-creator）
- [ ] `acp-agent.js` 含 `drainObservedClean`
- [ ] NSIS 生成 `CCB-Wanding-1.1.3.exe`
- [ ] 安装覆盖 1.1.2 后 `%LOCALAPPDATA%\CCB-Wanding\.claude\` 保留原有内容

## Definition of Done

- 构建全程无 error
- `Test-StagingWanDInstall` PASS
- .exe 可以静默安装（`/S`）
- 安装后 `ccb-launch-aionui.cmd` 启动 AionUI 可正常使用

## Out of Scope

- 上传 VPS 热更 manifest（单独 ops 步骤）
- 发布热更 zip 1.1.3.1
- Phase A repro capture（drift 可选验证）

## Technical Notes

- makensis 位于 `D:\NSIS\makensis.exe` ✓
- 所有 xlsx（price_library、wanding_price_lib、空白报价单）✓
- AionUI `out\win-unpacked` 已有（2026-06-24）但含未提交改动需重建
- CCB dist 今日有构建（10:33）但含未提交改动需重建
- `build-wanding.ps1` 不带 -SkipBuild -SkipAionUiBuild → 完整重建
