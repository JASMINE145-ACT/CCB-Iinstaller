# CCB-Wanding 1.1.9 打包清单（基于 1.1.8 + dev 验收）

> **Trellis task:** [`.trellis/tasks/07-12-release-1.1.9/`](../.trellis/tasks/07-12-release-1.1.9/)  
> **Baseline:** [`delivery-1.1.8-2026-07-07.md`](delivery-1.1.8-2026-07-07.md)  
> **Feature task:** [`07-12-supplier-directory-vs-price-library`](../.trellis/tasks/07-12-supplier-directory-vs-price-library/)

## 1.1.9 scope（dev 已验 / 待打包前再验）

| 区域 | 内容 |
|------|------|
| **07-12 供应商名录** | migration 022+023；REST/MCP/agent；NL normalize (7c)；`#/suppliers` UI |
| **07-11 work-tasks v2** | roster MCP、RBAC、dashboard/detail、admin envelope 修复 |
| **07-11 price/knowledge** | L2 row edit UI；orchestrator 路由 |
| **07-14 employee** | profile staging、org context slice（aionui） |
| **07-05 WeCom** | channel/extension 增量 |
| **ACP overlay** | supplier 委派 guard、direct `mcp__` 策略 |
| **build-wanding** | vendor `supplier-directory` copy + junction + seed agents sync |
| **VPS（运维，非安装包）** | migration 022/023 + supplier seed on org VPS |
| **aionui-src** | Full NSIS 重打（**禁止** `-SkipAionUiBuild`） |
| **aioncore** | **必须** `cargo build --release`（含 `aionui-supplier-directory` crate） |
| **config_generation** | **6 → 7** |

## 打包前门禁

```powershell
cd D:\Projects\claude-code-best

# 1) AionCore release（1.1.9 阻塞 — 不可复用 1.1.8 无 supplier API 的二进制）
Push-Location AionCore
cargo build --release -p aionui-app
cargo test -p aionui-supplier-directory
Pop-Location

# 2) MCP unit tests
Push-Location ccb-installer\mcp_servers\supplier-directory-server
bun test preview.test.mjs
Pop-Location

# 3) Package health + eval schema
.\ccb-installer\scripts\test-package-health-split.ps1
node eval\run-agent-eval.mjs

# 4) CCB overlay sync
.\ccb-installer\scripts\sync-claude-code-b-mcp-prefetch.ps1

# 5) Full NSIS
Push-Location ccb-installer\scripts
try {
  .\build-wanding.ps1 -Version 1.1.9 `
    -AioncorePath D:\Projects\claude-code-best\AionCore\target\release\aioncore.exe `
    2>&1 | Tee-Object -FilePath ..\build-1.1.9-staging-nsis.log
  if ($LASTEXITCODE -ne 0) { throw "build-wanding exit $LASTEXITCODE" }
} finally { Pop-Location }
```

## 检查项

- [ ] `git commit` 两仓（claude-code-best + aionui-src）或 delivery 标注 `dirty: true`
- [ ] `config_generation` = **7** in `seed/config-ship-manifest.json`
- [ ] `Test-NsisPayloadCoverage` PASS (gen 7)
- [ ] `Test-StagingWanDInstall` PASS
- [ ] staging 含 `vendor/mcp-servers/supplier-directory/` + `staging/seed/agents/supplier-directory-agent.md`
- [ ] `ensure-wanding-settings.ps1` 写入 `supplier-directory` MCP
- [ ] `CCB-Wanding-1.1.9.exe` + sha256
- [ ] `test-mcp-health.ps1 -Probe` PASS（supplier-directory-agent）
- [ ] agent eval smoke ≥7/15
- [ ] `delivery-1.1.9-*.md` + `dev-test-checklist-1.1.9.md`

## Post-ship repair backlog（2026-07-12）— **closed by repack**

| Item | Status |
|------|--------|
| live Full bootstrap EXIT=0（repair4） | [x] |
| 重打 1.1.9：ship lib + precip deploy/seed + NSIS | [x] SHA256 `5D964506…947B` |
| LASTEXITCODE clear + Quick `$requiredSeedSkills` precip | [x] in staging + exe |
| （可选）`记住.md` command source missing 警告 | [ ] 非阻塞 |

## VPS 运维（发版后，非阻塞安装包）

```powershell
# 本地或 CI：上传含 migration 022/023 的 aioncore 到 VPS
.\scripts\org-phase0\deploy-org-aioncore-vps.ps1 -ExtractOnRemote
python .\scripts\org-phase0\bootstrap-supplier-directory.py
```
