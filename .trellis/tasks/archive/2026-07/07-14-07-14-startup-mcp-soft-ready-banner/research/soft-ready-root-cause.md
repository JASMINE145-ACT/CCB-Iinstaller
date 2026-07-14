# soft_ready banner — root cause (2026-07-14)

## Symptom

Guid shows permanent warning:「MCP 预热未完成，首条查询可能较慢。」

## Code path

```
ccbMcpBridge startCcbStartupReadinessPipeline
  → ccbStartupReadiness.runPipeline
      Layer1 runCcbMcpHealthCheck({probe:false})
      Layer2 spawnWarmScript(['quotation','accurate'])  outer kill @ 120s
  → status { phase:'ready', mcp_ok:false, soft_ready:true }
  → CcbStartupReadinessBanner: soft_ready && !mcp_ok → warning (no dismiss)
  → ensureCcbStartupReadiness: phase ready → never re-run
```

## Repro evidence

```text
$ node D:\CCB-Wanding\lib\warm-wanding-mcp.mjs --servers=quotation,accurate
[warm-wanding-mcp] PASS quotation 24993ms warmed
[warm-wanding-mcp] FAIL accurate 120039ms timeout 120s
exit 2  (~149s wall)
```

**Accurate deeper root cause** → [`accurate-pywintypes-break.md`](./accurate-pywintypes-break.md)  
（缺 pywintypes / `mcp package not found` 早退；warm 假 timeout — **不是** AOL 慢。）

## Why it feels "always on"

1. One failed warm → `soft_ready=true` for process lifetime.
2. Banner has no dismiss / retry CTA.
3. Accurate never starts → warm always fails → soft_ready every cold launch.

## Fix directions (plan — absorbed)

| Priority | Change |
|----------|--------|
| P0 | **F1** real pywin32 under `python-wanding`（`WANd.STARTUP.ACCURATE_PY.001`） |
| P0 | **F2** warm listen `close` → instant FAIL |
| P1 | quotation-gated mcp_ok + dismiss/retry UX |

## Follow-up 2026-07-14 evening — still `MCP warm exceeded 120s`

UI detail was outer AionUI `spawnWarmScript` kill: replaced **all** results with `{server:timeout}` even when stdout already had `PASS quotation`. Quotation-gate then saw **no** quotation row → soft_ready again.

Mitigation shipped: `mergeWarmResultsOnTimeout`; warm quotation→accurate **separately**; publish ready as soon as quotation PASS; accurate best-effort. **Main-process change → full Electron restart required** (HMR may only refresh renderer banner).
