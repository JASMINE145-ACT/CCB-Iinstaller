# Phase 1 done — quotation dual-call + supplier Guid hide

**Date:** 2026-07-13  
**Contracts:** `WANd.TRADE.SOURCING.DUAL.001`, `WANd.ROUTING.SUPPLIER_DIR.001`

## Changes

| File | Change |
|------|--------|
| `quotation-agent.md` | `mcpServers` + `supplier-directory`；查价同轮 hybrid；双调用合成形态；地址/车型专路径 |
| `quotation-agent.aionui.json` | `mcp_allowlist` + supplier-directory；推荐语「土工布什么价，谁有货？」 |
| `supplier-directory-agent.aionui.json` | `guid_primary: false` |
| `supplier-directory-agent.md` | 产品日常 Guid 优先报价卡 |
| `wande-orchestrator.md` | 产品找厂→quotation；地址/车→supplier |
| `agent-runtime-registry.yml` | DUAL / SUPPLIER_DIR / LEARN.PRECIPITATE |
| `work-routing-execution-contracts.md` | 合同表补行 |

## Deploy

```powershell
.\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd
```

然后**新开**万鼎报价专家 Guid 会话做 `smoke.md` §DUAL。
