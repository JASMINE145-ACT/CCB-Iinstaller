# Research — quotation MCP warm exceeded 90s (2026-07-15)

## Symptom

Guid banner:「MCP 预热未完成，首条查询可能较慢。」  
Detail: `quotation: MCP warm exceeded 90s`

## Related tasks / specs

| Artifact | Role |
|----------|------|
| Spec | `.trellis/spec/integration/mcp-health.md` § App startup readiness gate |
| Spec | `agents-unified-model.md` § Quotation MCP cold start |
| Parent | `06-28-app-startup-readiness-gate` |
| Prior close | archive `07-14-startup-mcp-soft-ready-banner`（accurate/pywin32 + soft UX） |
| Code | `aionui-src/.../ccbStartupReadiness.ts` `CORE_WARM_TIMEOUT_MS = 90_000` |
| Warm | `ccb-installer/lib/warm-wanding-mcp.mjs`（内超时 120s） |
| Registry | `mcp-health-manifest.json` + vertical `com.wanding.trade/health/...` |

## Live repro (this machine, 2026-07-15)

```text
node D:\CCB-Wanding\lib\warm-wanding-mcp.mjs --servers=quotation
[warm-wanding-mcp] PASS quotation 90696ms warmed
wall ~91.1s  exit 0
```

Vs AionUI outer kill at **90_000 ms** → `mergeWarmResultsOnTimeout` → soft_ready with detail `MCP warm exceeded 90s`.

**Conclusion:** quotation **eventually succeeds**; banner is a **budget race** (~700ms over). Not the 07-14 accurate/pywin32 fake-timeout class.

## Root-cause hypotheses

| ID | Hypothesis | Status |
|----|------------|--------|
| H1 | Outer `CORE_WARM_TIMEOUT_MS=90s` < observed cold warm (~91s) | **confirmed primary** |
| H2 | Warm script internal timeout 120s OK; outer AionUI tighter | **confirmed** |
| H3 | accurate/pywin32 still broken | **ruled out for this detail string**（报错明确是 quotation） |
| H4 | Pure CPU insufficiency | **contributing, not sole** — cold spawn cost is structural (bun + python-wanding + match_quotation) |
| H5 | Double warm (app + session/new) amplifies load | contributing if both run |

## Why warm is expensive (architecture)

```
warm-wanding-mcp.mjs
  → spawn settings.json mcpServers.quotation (bun → quotation-server)
  → initialize + tools/list + tools/call match_quotation
  → waits for stdout "id":2
```

Quotation stack loads vendor python / mapping data on first call. Spec historically cites ~90s first `match_quotation`; warm ~4–5s when hot.

## MCP system completeness (assessment)

**Structure is largely complete and migratable:**

## P0 verification evidence (2026-07-15)

- Source and installed `warm-wanding-mcp.mjs` SHA-256 matched before the live probe.
- Five isolated quotation warm runs all PASSed: 23,352ms, 14,174ms, 13,267ms, 18,431ms, and 11,780ms. Median: 14,174ms; observed range: 11,780-23,352ms.
- `node ccb-installer/scripts/test-mcp-probe-layer.mjs --server=quotation` PASSed in 25,832ms, including `match_quotation+get_inventory_by_code`.
- These are isolated repeat runs, not a claim that operating-system file caches were cleared between samples. A fully exited AionUI Guid smoke remains required for the user-visible P0 gate.

P0 contract after the fix: warm-script work budget = 120,000ms; AionUI wrapper deadline = 130,000ms (10,000ms output/scheduling grace); quotation deep probe timeout = 120,000ms.

| Layer | State |
|-------|-------|
| Platform registry | `ccb-installer/config/mcp-health-manifest.json` |
| Vertical compose | `packages/vertical/com.wanding.trade/health/mcp-health-manifest.json` |
| CLI verify | `test-mcp-health.ps1` config / -Probe / -Session |
| UI mirror | `ccbMcpHealthManifest.ts` |
| Packaging whitelist | `wanding-packaging-whitelist.md` §8 / shipScripts |
| Startup gate | L1 config + L2 warm + soft_ready UX |
| Session allowlist warm | `wanDMcpWarmup.ts` (profile-selective) |

**Gaps / debt (not blockers for migrate, but for polish):**

1. App warm budget (90s) ≠ warm-script (120s) ≠ probe_timeout alignment  
2. Duplicate warm at app open + `session/new` still open in mcp-health.md  
3. Layer 3 ACP anchor deferred  
4. Lazy optional MCPs (exa/tavily) ≠ core warm path — by design  

**Adding a new MCP (migrate checklist):** required_paths + probe_tool_call in vertical/platform manifest → settings.json → agent_profiles → whitelist ship → test-mcp-health -Probe. Structure supports it.
