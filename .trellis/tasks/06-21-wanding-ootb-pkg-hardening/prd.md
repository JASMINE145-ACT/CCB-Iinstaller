# wanding-ootb-pkg-hardening

## Background
分发给客户的 `CCB-Wanding-x.y.z.exe` OOTB 完整性审计（2026-06-20）后发现 4 个需修复点。
审计依据已成事实，本任务直接落地修复 + 更新 spec，无需 brainstorm。

## Scope (fixes)

### F2 — build gate 校验 site-packages（防未来构建回归）
`Test-StagingWanDInstall`（`ccb-installer/scripts/build-wanding.ps1`）未断言 office-word / excel(haris)
site-packages。若将来 `-SkipPipMcp` 且未预置 → gate PASS 但内网装机 pip 失败。
**Fix:** `$required` 增加：
- `vendor\mcp-servers\office-word-mcp\site-packages\word_document_server\main.py`
- `vendor\mcp-servers\excel-mcp-server\site-packages\excel_mcp\server.py`

### F3 — staging\scripts 自清洁（防 build-only 脚本入包）
build 已用白名单 `$shipScripts`，但 `$scriptsDest` 拷贝前不清目录 → 陈旧 build-only 脚本
（`build-wanding.ps1` / `test-mcp-health.ps1` / `deploy-ppt-master-skill.ps1` /
`ensure-ppt-master-deps.ps1` / `sync-ppt-master-agents.ps1`）残留并被 NSIS `File /r` 打进 exe。
**Fix:** 拷白名单前先清 `$scriptsDest`；并清理当前 staging 残留。

### F4 — seed skill 排除 __pycache__/*.pyc
`Invoke-RobocopyMirror $seedSkillSrc $seedSkillDest @('/XD','tests')` 把源里的 `__pycache__`/`*.pyc`
镜像进 staging（§5.3 要求排除）。
**Fix:** 该 mirror 调用追加 `/XD __pycache__ /XF *.pyc`；清理当前 staging 残留。

### F5 — org-server URL 支持免重打包覆盖
默认硬编码公网 IP `http://67.216.206.3:13401`（`ensure-wanding-settings.ps1`）。收件人网络不通则
org 会话/知识降级（核心聊天+报价不受影响）。
**Fix:** `Ensure-OrgServerDesktopConfig` 在 fallback 到默认前，先读环境变量 `ORG_SERVER_URL`
（与 `Get-OrgServerUrlFromDesktopConfig` 既有约定一致），给现场一个升级安全、免重打包的覆盖点。保留默认 IP。

## Out of scope
- 凭证明文内嵌（审计 #1）：产品决策，本任务不动。
- NSIS `File /r` 加 `/x` 防御：build 白名单为权威来源，暂不增 NSIS 改动。

## Acceptance
```powershell
# 重建 staging（dry，不跑 NSIS）后 gate 必须仍 PASS，且：
.\ccb-installer\scripts\test-install-health.ps1 -InstallDir .\ccb-installer\staging -SkipBootstrap
# staging\scripts 仅含白名单脚本；seed 下无 __pycache__/*.pyc
```

## Spec updates
- `.trellis/spec/integration/wanding-packaging-whitelist.md` §17.9 changelog + 相关条目
