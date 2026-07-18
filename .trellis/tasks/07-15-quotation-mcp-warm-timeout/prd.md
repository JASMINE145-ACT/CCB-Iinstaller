# PRD — 报价 MCP 预热压线 90s 超时

> **Task:** `07-15-quotation-mcp-warm-timeout`  
> **Status:** planning  
> **Priority:** P1  
> **Date:** 2026-07-15  
> **Parent:** `06-28-app-startup-readiness-gate`

## One-line

消除 Guid「MCP 预热未完成 / quotation: MCP warm exceeded 90s」：外层预算与冷启动实测对齐，并保留诊断能力（非假装 OK）。

## Problem

| 今天 | 痛点 |
|------|------|
| 本机 `warm --servers=quotation` ≈ **90.7s PASS** | AionUI `CORE_WARM_TIMEOUT_MS=90s` 先杀 → soft_ready |
| 用户看到黄条 +「重试预热」 | 以为 MCP 坏了；实际是**压线超时** |
| 07-14 已修 accurate/pywin32 + soft UX | **本症不同**：detail 明确是 **quotation** |

## Goal

1. 冷启动下 quotation warm **稳定标绿**（soft_ready=false），或失败时 detail 诚实可区分。  
2. 预算常量可配置/对齐 warm-script 内 120s / probe_timeout。  
3. 文档说明：非「纯 CPU 坏了」为主因；冷启动结构成本 + 预算竞态。  
4. （可选）减轻 quotation 首次 match 成本，不阻塞 P0 预算修复。

## Non-goals

- 启动预热全部 MCP（office-word/excel）  
- Layer 3 ACP anchor  
- 改报价匹配算法业务行为  

## Acceptance criteria

### AC1 — Budget race closed
- [ ] 本机再现：暖脚本 PASS 时，AionUI 外层不再因 90.0s 墙杀死已接近完成的 quotation  
- [ ] 单元/合同测：超时合并仍保留已 PASS 行（既有 `mergeWarmResultsOnTimeout`）+ 新预算常量断言  

### AC2 — Soft_ready honesty
- [ ] quotation 真实 FAIL → soft_ready + detail 非空  
- [ ] quotation PASS → `mcp_ok=true`，黄条不常驻  

### AC3 — Docs
- [ ] `mcp-health.md` § startup：记录 90s vs ~91s 竞态与推荐预算  
- [ ] research 落盘本机 ms 证据  

### AC4 — Manual smoke
- [ ] 冷启 App → Guid：预热完成或可关闭；detail 若出现须可解释  

## Related contracts

- `WANd.STARTUP.MCP_WARM.001`（provisional — app L2 warm）  
- Prior: soft_ready / ACCURATE_PY from `07-14-startup-mcp-soft-ready-banner`
