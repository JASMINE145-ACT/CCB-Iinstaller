# Runtime Architecture

> How CCB-Wanding runs under AionUI Route B, and which paths are deprecated.

---

## Primary chain (Route B — current)

```text
AionUI.exe
  → aioncore.exe
  → route-b (claude-agent-acp slot)
      patches/aionui-ccb-route-b/index.js
  → D:\CCB-Wanding\vendor\bun\bun.exe
  → D:\CCB-Wanding\dist\cli.js --acp
  → src/services/acp/entry.ts (built into dist/chunks/entry-*.js)
  → dist/chunks/entry-*.js (AcpAgent + QueryEngine)
  → $buildMcp() [live dist patch] reads settings.json
  → MCP tools: excel-mcp, quotation, accurate (41 tools as of 2026-06-12 smoke)
```

**Config root:** `%LOCALAPPDATA%\CCB-Wanding\.claude\` (set by route-b / launcher, not global profile).

**Source of truth for ACP behavior (long-term):** `D:\claude-code-B\src\services\acp\`.

**Live behavior snapshot:** [`route-b-status.md`](./route-b-status.md) — dist patch may differ from source until migration completes.

---

## CLI routing (`--acp`)

Verified in `src/entrypoints/cli.tsx`:

```text
feature('ACP') && argv[2] === '--acp'  →  import('../services/acp/entry.js')  →  runAcpAgent()
# feature('ACP') is always true in default build (DEFAULT_BUILD_FEATURES)
```

`runAcpAgent()` (`entry.ts`):

1. `enableConfigs()`
2. `applySafeConfigEnvironmentVariables()` — loads `ANTHROPIC_*` / model overrides from settings
3. NDJSON stream on stdin/stdout via `@agentclientprotocol/sdk`
4. `AcpAgent` handles `session/new`, prompts, tool permissions

Non-ACP paths (REPL, print mode) use QueryEngine directly — different entry, same underlying MCP concepts in `queryContext.ts`.

---

## MCP lifecycle (intended)

```text
settings.json mcpServers
  → parse / spawn MCP processes (stdio or HTTP)
  → register tools on QueryEngine mcpClients
  → ACP tool calls bridge to same clients
```

**Source vs live dist (MCP):** Source `agent.ts` L571 has `mcpClients: []`; live dist uses `$buildMcp()` patch. Details: [`acp-session-flow.md`](./acp-session-flow.md) § Source vs live dist.

---

## Integration layer (this repo)

| Component | Role |
|-----------|------|
| `patches/aionui-ccb-route-b/index.js` | Spawn CCB `--acp`, set `CLAUDE_CONFIG_DIR`, Wanding env |
| `patches/aionui-acp/acp-agent.js` | SDK-side adapt when not using route-b slot |
| `scripts/sync-aionui-ccb-route-b.ps1` | Copy route-b into AionUI `node_modules` slots (v0.39.0) |

Details: [`../integration/route-b-sync.md`](../integration/route-b-sync.md).

---

## Deprecated / do not extend

| Path | Status |
|------|--------|
| `ccb-installer/src/ccb-runtime/` | Legacy AgentLoop smoke; not AionUI primary |
| `ccb-installer/src/serve-wanding/` | HTTP adapter experiment |
| `ccb-installer/src/ccb-acp-agent/` | Pre–route-B ACP agent; superseded |
| `ccb-installer/src/ccb-api-server/` | HTTP API layer; not used in Route B |
| `patches/native-ccb-wanding-acp/ccb-native-acp-agent.js` | `--ccb-native-acp` shim; superseded by route-b + `--acp` |
| Hand-patched `entry-WG7IeDEv.js` | Emergency only — migrate to source |

---

## Related docs

- Producer events: [`acp-session-flow.md`](./acp-session-flow.md)
- File lookup: [`file-map.md`](./file-map.md)
- Desktop consumer: [`../frontend/chat-acp-flow.md`](../frontend/chat-acp-flow.md)
- Boundary: [`../integration/aionui-ccb-boundary.md`](../integration/aionui-ccb-boundary.md)
