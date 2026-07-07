# CCB-Wanding 1.1.7 打包清单（基于 1.1.6 教训）

> **基线：** 1.1.6 backlog 全部脚本修复 + 未出正式 exe 的 task 更新一并纳入。  
> **Trellis task:** [`.trellis/tasks/07-10-release-1.1.7/`](../.trellis/tasks/07-10-release-1.1.7/)  
> **Dev 测试：** [`dev-test-checklist-1.1.7.md`](dev-test-checklist-1.1.7.md)

---

## 1.1.6 教训 → 1.1.7 必做门禁

| # | 1.1.6 问题 | 1.1.7 对策 |
|---|-----------|-----------|
| L1 | NSIS 未拷 seed/config/resources → bootstrap exit 1 | `Test-NsisPayloadCoverage` 在 build 内（gen 5） |
| L2 | aioncore 0.1.28 降级 → migration 冲突 | **强制** `-AioncorePath` → 0.1.29+ |
| L3 | 五 skill / learn-by-data 未部署 | config gen **5** + bootstrap deploy-ccb-skills/commands |
| L4 | orchestrator 顶层直连 MCP | CCB overlay + deploy-seed-agents；**已知风险**：eval 4/4 orchestrator FAIL 待后续 fix |
| L5 | View Steps 工具名空白 | **必须重打 AionUI**（Issue 5） |
| L6 | build Vite stderr + `$ErrorActionPreference Stop` | `Invoke-NativeBuildCommand` Continue on stderr |
| L7 | 无 agent eval 门禁 | smoke 15 条；Guid 报价路径 7/7 绿再发版 |
| L8 | delivery 文档缺失 | 本版必须 `delivery-1.1.7-*.md` |

---

## 纳入 scope（task / spec）

| 区域 | 内容 |
|------|------|
| Issue 1–7 | skill/command 部署、config gen 5、research stack、install-health |
| Issue 8 | agent eval harness + unified smoke 15 |
| 07-03 | Platform P0–P5 ship（WanD-only registry） |
| 07-04 | orchestrator dispatch overlay、View Steps |
| 07-08 | package registry + forbidden-coupling lint |
| 07-09 | eval suites + LingWei fixture |
| Personal memory | ccb-personal-memory skill + /记住 + gen 5 reset |

**Explicit defer：** manufacturing 包、P0 凭据轮换、orchestrator eval 全绿（不阻塞 Guid 发版）

---

## 打包命令（normative）

```powershell
cd D:\Projects\claude-code-best

# 0. Pre-flight
.\ccb-installer\scripts\test-package-health-split.ps1
node eval\run-agent-eval.mjs

# 1. Sync CCB overlay → claude-code-B
.\ccb-installer\scripts\sync-claude-code-b-mcp-prefetch.ps1

# 2. Full NSIS（~30–60 min）
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.1.7 `
  -AioncorePath D:\Projects\claude-code-best\AionCore\target\release\aioncore.exe `
  2>&1 | Tee-Object -FilePath ccb-installer\build-1.1.7-staging-nsis.log

# 3. Post-install smoke
.\ccb-installer\scripts\run-agent-eval-suite.ps1 -Suite smoke -Run -InstallDir D:\CCB-Wanding -Json
```

---

## 1.1.7 打包检查项

- [x] `Test-NsisPayloadCoverage` PASS（build log）
- [x] `Test-StagingWanDInstall` PASS
- [x] `CCB-Wanding-1.1.7.exe` 存在 + sha256 记录
- [x] config_generation **5** in seed
- [x] aioncore 0.1.29+ in staging
- [x] agent eval smoke ≥7/15（Guid 报价全绿）— **9/15** post-install
- [x] delivery-1.1.7-*.md 完成
