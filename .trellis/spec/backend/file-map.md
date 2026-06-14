# Backend Feature → File Map

> **First lookup** for CCB-Wanding backend work. Paths verified against repo layout 2026-06-12. Use `rg` if a chunk hash changes after rebuild.

---

## 1. ACP / runtime (`D:\claude-code-B`)

| Want to change | File | Anchor (verify with `rg`) |
|----------------|------|---------------------------|
| CLI `--acp` entry | `src/entrypoints/cli.tsx` | `feature('ACP') && argv[2] === '--acp'` → `runAcpAgent` |
| Live dist MCP patch (deprecated) | `D:\CCB-Wanding\dist\chunks\entry-*.js` | `rg "buildMcp"` should be empty — use source `agent.ts` instead |
| ACP stdio bootstrap | `src/services/acp/entry.ts` | `runAcpAgent`, `applySafeConfigEnvironmentVariables` |
| ACP agent / sessions / MCP merge | `src/services/acp/agent.ts` | `resolveSessionMcpConfigs`, `createSession` → `prefetchAllMcpResources`; MiniMax: `buildMiniMaxM3SessionModels`, `applyMiniMaxM3SessionModels` |
| Permission bridge | `src/services/acp/permissions.ts` | `createAcpCanUseTool` |
| Prompt / message conversion | `src/services/acp/promptConversion.ts` | |
| ACP tests | `src/services/acp/__tests__/` | |
| Query engine (non-ACP) | `src/utils/queryContext.ts` | `mcpClients` wiring |
| Settings schema (`mcpServers`) | `src/utils/settings/types.ts` | `mcpServers` |
| Build output | `D:\claude-code-B\dist\` | `cli.js`, `chunks/entry-*.js` after `bun run build` |

**Do not edit** `D:\CCB-Wanding\dist\chunks\entry-*.js` by hand for permanent fixes. Patch source, rebuild, deploy. See [`coding-rules.md`](./coding-rules.md).

---

## 2. Integration patches (`D:\Projects\claude-code-best\ccb-installer`)

| Want to change | File | See |
|----------------|------|-----|
| route-b ACP slot entry (spawn `--acp`) | `patches/aionui-ccb-route-b/index.js` | [`../integration/route-b-sync.md`](../integration/route-b-sync.md) |
| AionUI SDK adapt / MCP policy | `patches/aionui-acp/acp-agent.js` | `patches/aionui-acp/README.md` |
| Native ACP shim (deprecated path) | `patches/native-ccb-wanding-acp/ccb-native-acp-agent.js` | [`runtime-architecture.md`](./runtime-architecture.md) § Deprecated |
| Deploy claude-code-B build → CCB-Wanding | `scripts/deploy-claude-code-b-to-wanding.ps1` | [`build-deploy-verify.md`](./build-deploy-verify.md) §2 |
| Sync route-b to AionUI bundles | `scripts/sync-aionui-ccb-route-b.ps1` | |
| Wanding settings template | `scripts/ensure-wanding-settings.ps1` | [`config-layer.md`](./config-layer.md) |
| Installer default settings | `resources/settings/settings.json` | CCB generic install template |
| Native ACP smoke (Route B) | `test-native-acp-agent.mjs` | Primary backend smoke — [`route-b-status.md`](./route-b-status.md) |
| E2E smoke (install + MCP) | `scripts/smoke-wanding-e2e.ps1` | [`build-deploy-verify.md`](./build-deploy-verify.md) |
| Live status snapshot | `AIONUI-BACKEND-STATUS.md` | Source for [`route-b-status.md`](./route-b-status.md) |

---

## 3. MCP business servers (`D:\Projects\claude-code-best`)

| Want to change | File | Notes |
|----------------|------|-------|
| Quotation MCP entry (built) | `mcp_servers/quotation-server/dist/index.js` | Spawned by `settings.json` `mcpServers.quotation` |
| Quotation config | `mcp_servers/quotation-server/dist/config.js` | `CCB_PROJECT_ROOT`, `DATA_DIR` |
| Match / fill tools | `mcp_servers/quotation-server/dist/tools/` | |
| Python inventory backend | `python/inventory/` | Stock query logic for quotation MCP |
| Python quotation logic | `python/quotation/` | Quote assembly, inquiry parsing, flow orchestration |
| Excel MCP (installed with CCB-Wanding) | `D:\CCB-Wanding\vendor\mcp-servers\excel-mcp\mcp-excel.exe` | `settings.json` `mcpServers.excel-mcp` |
| Accurate MCP (installed with CCB-Wanding) | `D:\CCB-Wanding\vendor\mcp-servers\accurate-mcp\server.py` | `settings.json` `mcpServers.accurate` |
| Legacy ccb-runtime (deprecated) | `ccb-installer/src/ccb-runtime/` | Do not extend for AionUI Route B |
| Legacy serve-wanding (deprecated) | `ccb-installer/src/serve-wanding/` | HTTP adapter; not primary path |
| Legacy ccb-acp-agent (deprecated) | `ccb-installer/src/ccb-acp-agent/` | Pre–route-B ACP agent |
| Legacy ccb-api-server (deprecated) | `ccb-installer/src/ccb-api-server/` | HTTP API; not Route B |

---

## 4. Config layer (runtime, not TypeScript)

| Want to change | Path |
|----------------|------|
| CCB-Wanding user config (MCP + MiniMax env) | `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json` |
| Project CLAUDE instructions | `%LOCALAPPDATA%\CCB-Wanding\.claude\CLAUDE.md` |
| Wanding business markdown | `D:\CCB-Wanding\vendor\wanding\data\` (`ccb-wanding-quotation.md`, `wanding_business_knowledge.md`, etc.) |
| Price / mapping data | `D:\CCB-Wanding\vendor\wanding\data\*.xlsx` |

See [`config-layer.md`](./config-layer.md).

---

## 5. Do not touch (backend work)

| Path | Reason |
|------|--------|
| `C:\Users\m1774\.claude` | Official Claude Code — isolated from CCB-Wanding |
| Windows user-level `ANTHROPIC_*` / `CLAUDE_CONFIG_DIR` | route-b sets process-local env only |
| `D:\CCB-Wanding\dist\` by hand | Consume via build deploy only |
| `packages/desktop` in `aionui-src` | Frontend — [`../frontend/file-map.md`](../frontend/file-map.md) |
