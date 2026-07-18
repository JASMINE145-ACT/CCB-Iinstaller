# PRD — 1.1.9 员工安装残留：版本快照空 + CCB config check 缺文件

| Field | Value |
|-------|--------|
| **Task ID** | `07-15-install-1-1-9-residue-continuity` |
| **Created** | 2026-07-15 |
| **Status** | planning |
| **Priority** | P0 |
| **Scenario** | C（现场 bug）+ J（安装/释放门） |
| **Repos** | aionui-src（install resolve / continuity / MCP health）· ccb-installer（bootstrap / repair / whitelist） |

## Symptoms（员工机 1.1.9）

| ID | Surface | Evidence |
|----|---------|----------|
| **A** | 应用内更新失败 | `AIONUI_INTERNAL_ERROR` ·「无法读取当前安装版本信息，请完全退出并重新打开 AionUI 后再试。」 |
| **B** | Guid「Word 文档助手」顶栏 | `CCB 启动检查未通过：config check failed: quotation/vendor/wanding/.env.accurate, price-library/vendor/mcp-servers/price-library-server/dist/index.js, price-library/vendor/wanding/python/price_library_main.py` |

用户假设：**旧安装残留**。

## Goal

1. 证明/否定残留与 **InstallDir 解析错位**（`$CONFIG` 在、`$INSTALL` 指到旧/空树）是否是主因  
2. 给出员工机 **诊断+自愈 runbook**（完全退出 / Check Install / repair / 重装）  
3. 产品硬化：InstallDir 解析必须覆盖 **`%LOCALAPPDATA%\Programs\CCB-Wanding`** + 注册表 `InstallDir`；continuity / health 错误信息可读  
4. 若缺文件落在正确树 → 查 1.1.9 打包白名单 / bootstrap（`.env.accurate` 由 ensure-settings 生成）

## Non-goals

- 修 Word 公文排版能力本身  
- 全盘 redesign 更新 UI  
- 无现场证据时直接宣称「包装漏文件」并改 NSIS（需先钉 InstallDir）

## Acceptance criteria

- [ ] Research：根因假设分级 + 员工机诊断命令清单落盘  
- [ ] Symptom A：settings 存在但 CLI 不在候选路径 → **不**再抛糊訊息；或能解析 Programs 安装树后 snapshot 非 null  
- [ ] Symptom B：健康检查所报 `missing:` 路径指向的 InstallDir 与「开始菜单实际安装根」一致；缺失项有明确修复动作（ensure-settings / bootstrap / 重装）  
- [ ] Runbook：员工侧 完全退出 → `ccb-list-installs` / `ccb-check-install` / repair → 重试  
- [ ] 若确认包装漏：whitelist + staging gate；若确认残留：repair + installer refuse orphan  
- [ ] code-reviewer + 回归：install resolve unit + health fail ids  

## Related

- Spec：`wanding-release-standard.md` §1 三层 · `wanding-packaging-whitelist.md` §17  
- Scripts：`repair-wanding-install-dir.ps1` · `find-wanding-installs.ps1` · `ensure-wanding-settings.ps1` · `ccb-check-install.cmd`  
- Code：`ccbWandingRuntimeNode.ts` · `ccbContinuitySnapshot.ts` · `conversationContinuity.ts` · `ccbStartupReadiness.ts` · `ccbMcpHealthManifest.ts`
