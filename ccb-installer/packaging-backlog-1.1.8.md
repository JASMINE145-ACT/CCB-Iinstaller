# CCB-Wanding 1.1.8 打包清单（基于 1.1.7 + dev 验收）

> **Trellis task:** [`.trellis/tasks/07-08-release-1.1.8/`](../.trellis/tasks/07-08-release-1.1.8/)  
> **Baseline:** [`delivery-1.1.7-2026-07-06.md`](delivery-1.1.7-2026-07-06.md)

## 1.1.8 scope（dev 已验）

| 区域 | 内容 |
|------|------|
| **07-07** | drat 螺纹弯头 matcher；org 历史报价 org-primary read；MCP mapping tools；SKILL §D org |
| **VPS** | migration 019 + 803 active rows（运行时依赖，非安装包） |
| **aionui** | `6c65cce` delegation / work-tasks（Full NSIS 重打 AionUI） |
| **config_generation** | **5 → 6** |

## 打包命令

```powershell
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\test-package-health-split.ps1
node eval\run-agent-eval.mjs
.\ccb-installer\scripts\sync-claude-code-b-mcp-prefetch.ps1
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.1.8 `
  -AioncorePath D:\Projects\claude-code-best\AionCore\target\release\aioncore.exe `
  2>&1 | Tee-Object -FilePath ccb-installer\build-1.1.8-staging-nsis.log
```

## 检查项

- [ ] `Test-NsisPayloadCoverage` PASS (gen 6)
- [ ] `Test-StagingWanDInstall` PASS
- [ ] `CCB-Wanding-1.1.8.exe` + sha256
- [ ] staging 含 `org_mapping_client.py` + mapping MCP tools
- [ ] agent eval smoke ≥7/15
- [ ] `delivery-1.1.8-*.md`
