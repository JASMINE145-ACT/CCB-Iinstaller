# Source Migration: `$buildMcp` → `claude-code-B`

> **STATUS: ✅ COMPLETED 2026-06-12/13** — task `06-12-buildmcp-source-migration` done. See [`route-b-status.md`](./route-b-status.md) for current live state. This doc is kept for historical context + regression reference.

> Original plan: move MCP registration from the live dist patch (`entry-*.js`) into `src/services/acp/agent.ts`. See [`acp-session-flow.md`](./acp-session-flow.md) for session flow.

---

## Completion summary (2026-06-12/13)

Two changes were required (not one):

### 1. `agent.ts` — MCP loading (planned)

`createSession()` now reads `CLAUDE_CONFIG_DIR/settings.json` and calls `prefetchAllMcpResources()`. Tools added to `tools: [...baseTools, ...mcpTools]`. No `appState.mcp` update needed — QueryEngine uses the `tools[]` array directly.

Key detail: `McpServerConfigSchema().safeParse()` requires explicit `type` field. Settings.json entries often omit it, so we infer: `type = raw.type ?? (command present → 'stdio') ?? (url present → 'http')`.

### 2. `route-b/index.js` — `ENABLE_SEARCH_EXTRA_TOOLS=false` (discovered during testing)

**Root cause of regression (unplanned):** Newer claude-code-B defaults `getSearchExtraToolsMode()` to `'tst'` (always defer non-core tools via `ExecuteExtraTool`). In ACP context this fails — the ACP client has no handler for `ExecuteExtraTool` and reports "tool not available".

Fix: added to `ccb-installer/patches/aionui-ccb-route-b/index.js`:
```javascript
process.env.ENABLE_SEARCH_EXTRA_TOOLS = process.env.ENABLE_SEARCH_EXTRA_TOOLS ?? 'false'
```

Source: `D:\claude-code-B\src\utils\searchExtraTools.ts` `getSearchExtraToolsMode()` — `'false'` → `'standard'` mode → MCP tools passed directly in `tools[]`.

Synced to all 5 route-b targets via `sync-aionui-ccb-route-b.ps1`.

### 3. `agent.ts` — settings + AionUI `guide_mcp` merge (2026-06-12, user-confirmed)

**Symptom in AionUI dev only:** Native smoke (`params.mcpServers` empty) loaded quotation MCP fine. AionUI injects `guide_mcp` on `session/new` → earlier code took params-only branch → `settings.json` MCP skipped → `mcp__quotation__*` Tool not found.

**Fix:** `resolveSessionMcpConfigs()` — `{ ...loadMcpConfigsFromSettings(), ...loadMcpConfigsFromParams() }`. Deploy: `bun run build` → `deploy-claude-code-b-to-wanding.ps1` → `sync-aionui-ccb-route-b.ps1`. Restart: kill all `aioncore`/`electron`, **new conversation**.

Details: [`acp-session-flow.md`](./acp-session-flow.md) § Scenario: AionUI `guide_mcp` merge.

---

## Why migrate

| Dist patch (today) | Source fix (target) |
|------------------|---------------------|
| Lost on `deploy-claude-code-b-to-wanding.ps1` unless re-patched | Survives normal build + deploy |
| Minified, hard to review | TypeScript, typed, testable |
| Duplicates logic outside repo source tree | Single source of truth in `D:\claude-code-B` |

---

## What the dist patch does (verified in `entry-WG7IeDEv.js` L16–51)

```text
$buildMcp():
  1. Read %CLAUDE_CONFIG_DIR%/settings.json → mcpServers
  2. For each entry: $mi(name, { type:'stdio', ...conf })  // connect
  3. For each connected client: $ml(client) → tool list
  4. createSession():
       tools: [...builtinTools, ..._mcpTools]   ← required for model tool_use
       mcpClients: _mcpClients
       appState.mcp.clients / .tools updated
```

**Regression test:** Model must call `mcp__quotation__match_quotation`, not `ExecuteExtraTool`.

---

## Source anchors (where to wire)

| Concern | File | Symbol |
|---------|------|--------|
| ACP session wiring (gap) | `src/services/acp/agent.ts` | `createSession()` L473; `mcpClients: []` at L571; `tools` = builtin only (~L507–569) |
| MCP connect + list tools | `src/services/mcp/client.ts` | `getMcpToolsCommandsAndResources`, `connectToServer` |
| Print-mode precedent | `src/main.tsx` | `connectMcpBatch` ~L3226 — loads settings MCP into tools |
| Settings schema | `src/utils/settings/types.ts` | `mcpServers` |
| QueryEngine config | `src/QueryEngine.ts` (`QueryEngineConfig`) | `tools`, `mcpClients` both used in loop |

---

## Migration steps (ordered)

### 1. Extract shared helper (avoid duplicating main.tsx)

Add something like `buildMcpFromSettings(cwd)` under `src/services/acp/` or reuse `getMcpToolsCommandsAndResources` with settings-derived configs (same pattern as `main.tsx` `connectMcpBatch`).

Input: `process.env.CLAUDE_CONFIG_DIR` or project settings via existing config utils.

Output: `{ clients: MCPServerConnection[], tools: Tool[] }`.

### 2. Wire `createSession()` in `agent.ts`

Replace:

```typescript
mcpClients: [],
tools,  // builtin only
```

With:

```typescript
const { clients: mcpClients, tools: mcpTools } = await buildMcpFromSettings(cwd)
// ...
tools: [...tools, ...mcpTools],
mcpClients,
```

Also merge into `appState.mcp` if QueryEngine reads it (match dist patch `p.mcp.clients` / `p.mcp.tools`).

### 3. Build, deploy, smoke

```powershell
cd D:\claude-code-B
bun run build
cd D:\Projects\claude-code-best
$env:CCB_DEPLOY_ACK_NO_MCP = "1"   # only if you intentionally deploy before source fix is complete
.\ccb-installer\scripts\deploy-claude-code-b-to-wanding.ps1 -Backup
node ccb-installer/test-native-acp-agent.mjs
$env:CCB_TEST_PROMPT = "查询直接50价格"
node ccb-installer/test-native-acp-agent.mjs
```

Expect stderr: `[ccb-acp-mcp] loaded N servers, M tools: ...` **from source**, not from minified `$buildMcp` patch.

### 4. Remove dist patch

After smoke passes on a clean source build (no hand-edited `entry-*.js`):

1. Confirm `rg "buildMcp" D:\CCB-Wanding\dist\chunks\` returns nothing
2. Update [`route-b-status.md`](./route-b-status.md) § Open — mark migration done
3. Update [`acp-session-flow.md`](./acp-session-flow.md) — collapse "Source vs live dist" to source-only

---

## Verification checklist

- [x] `test-native-acp-agent.mjs` exits 0 with default prompt
- [x] Quotation prompt triggers `[update] tool_call` directly (not `[permission] ExecuteExtraTool` first)
- [x] `deploy-claude-code-b-to-wanding.ps1` does **not** warn about losing `$buildMcp`
- [ ] `bun test src/services/acp/__tests__` still passes (add test if none covers MCP wiring)
- [ ] AionUI UI end-to-end: `查询直接50价格` → AskUserQuestion → real price returned

---

## Related

- Deploy: [`build-deploy-verify.md`](./build-deploy-verify.md) §2
- Live snapshot: [`route-b-status.md`](./route-b-status.md)
- Task log: [`../../../spec/aionui-ccb-wanding-acp-mcp-fix.md`](../../../spec/aionui-ccb-wanding-acp-mcp-fix.md)
