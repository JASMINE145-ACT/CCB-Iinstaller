# Research: MCP Registration Path in CCB-Wanding ACP Session

- **Query**: How does the CCB-Wanding ACP session create and register MCP servers, specifically how `mcpServers` from `settings.json` are wired into the live ACP session.
- **Scope**: internal
- **Date**: 2026-06-12

---

## Key Finding: There Are Two Separate ACP Runtimes

`D:\CCB-Wanding\dist\cli.js` branches on `process.argv[2]`:

| argv[2]           | Chunk loaded                           | Runtime type          |
|-------------------|----------------------------------------|-----------------------|
| `--ccb-native-acp`| `chunks/ccb-native-acp-agent.js`       | CCB-Wanding native ACP (custom, no MCP tool plumbing) |
| `--acp`           | `chunks/entry-WG7IeDEv.js`             | Upstream Claude Code ACP (standard SDK ACP) |

`route-b/index.js` spawns `bun cli.js --acp` → it runs the **upstream ACP runtime**, NOT the CCB-native one.

---

## Findings

### 1. `--acp` Runtime (`entry-WG7IeDEv.js`): MCP Servers Are Never Loaded

**File**: `D:\CCB-Wanding\dist\chunks\entry-WG7IeDEv.js`

#### `session/new` schema (line ~8049)

```js
fr = E({
  _meta: v(_(), b()).nullish(),
  additionalDirectories: y(_()).optional(),
  cwd: _(),
  mcpServers: y(zn)  // accepts mcpServers array from AionUI
})
```

The `session/new` request accepts a `mcpServers` array in its schema.

#### `createSession()` function (line ~63642)

```js
async createSession(e, t = {}) {
  // ...
  let h = new lo({
    cwd: r,
    tools: a,
    commands: m,
    mcpClients: [],   // ← HARDCODED EMPTY ARRAY — MCP clients never populated
    agents: [],
    // ...
  })
  // ...
  let x = {
    // ...
    sessionFingerprint: mo({ cwd: r, mcpServers: e.mcpServers })  // mcpServers only used for fingerprint
  }
  return this.sessions.set(n, x), { sessionId: n, ... }
}
```

**`e.mcpServers` from `session/new` is used ONLY to compute a session fingerprint (`mo()`). It is NEVER passed to `mcpClients`. The `lo` query engine is constructed with `mcpClients: []` always.**

#### `mo()` fingerprint function (line ~43715)

```js
function mo(e) {
  let t = [...e.mcpServers ?? []].sort((e, t) => e.name.localeCompare(t.name))
  return JSON.stringify({ cwd: e.cwd, mcpServers: t })
}
```

Only used for session deduplication / fingerprint comparison in `getOrCreateSession()`. Not used for MCP initialization.

#### `getOrCreateSession()` (line ~65802)

```js
if (mo({ cwd: e.cwd, mcpServers: e.mcpServers }) === t.sessionFingerprint)
  return k(e.sessionId), { ... }   // reuse existing session
await this.teardownSession(e.sessionId)
// ... then calls createSession again (still with mcpClients:[])
```

#### Summary for `--acp` mode

The `--acp` runtime **completely ignores `settings.json` `mcpServers`** during session creation. There is no code path in `entry-WG7IeDEv.js` that reads `settings.json`, calls out to external MCP processes, or populates `mcpClients` from config. The `mcpClients:[]` is a structural gap: the upstream ACP SDK version did not wire settings-based MCP loading.

---

### 2. How the Interactive `main()` Loop Loads MCP Servers (for contrast)

**File**: `D:\CCB-Wanding\dist\chunks\main-Dj9buWt1.js`

In the interactive `main()` function, `hn` starts as `[]` (line ~213259) and **stays empty**. Instead, MCP servers are loaded via `dynamicMcpConfig: T`, which is built from:
- `--mcp-config` CLI flags (parsed from file or inline JSON)
- Chrome extension configs
- Computer Use MCP

The actual settings-based `mcpServers` (from `settings.json`) are loaded separately inside the React UI loop as `mcp: { clients: [] }` state, populated by the `loadAgentsDir-BMosMfSG.js` module's `R1e` / `L1e` / `A1e` chain that reads `.mcp.json`, `pluginConfigs.mcpServers`, and user settings. This path is **not reachable from the ACP code path** because ACP doesn't run the React REPL loop.

---

### 3. `--ccb-native-acp` Runtime (`ccb-native-acp-agent.js`): Has MCP But No `tool_call` Emission

**File**: `D:\CCB-Wanding\dist\chunks\ccb-native-acp-agent.js`

This is a custom lightweight ACP agent (21 KB, not minified). Key properties:

- Reads `settings.json` directly via `getSettings()` on every call
- Has `callMcpTool(serverName, toolName, args)` which spawns MCP server processes on-demand by reading `settings.json.mcpServers[serverName]`
- Has `answerQuotation()` which calls `callMcpTool('quotation', 'match_quotation', {...})`
- Does **NOT** emit `tool_call` events to AionUI — it calls MCP internally and streams plain text back
- Uses `maybeQuotationKeywords()` to detect quotation queries locally
- Falls back to `callMiniMax()` for non-quotation queries

**The ccb-native-acp runtime is the one that has working quotation/MCP integration**, but it is NOT what `route-b/index.js` spawns.

---

### 4. Route B Current Scope (`ccb-installer/patches/aionui-ccb-route-b/index.js`)

**File**: `D:\Projects\claude-code-best\ccb-installer\patches\aionui-ccb-route-b\index.js`

Route B:
1. Resolves CCB-Wanding install dir
2. Sets `CLAUDE_CONFIG_DIR` to CCB-Wanding config dir
3. Reads `settings.json` and injects `settings.env` vars into `process.env`
4. Sets `CLAUDE_CODE_ACP_ALLOW_BYPASS_PERMISSIONS=true`
5. Spawns: `bun dist/cli.js --acp` → **this lands in the upstream ACP runtime, not ccb-native-acp**

The route-b patch correctly sets the environment so `settings.json` is findable, but the upstream `--acp` runtime never reads `settings.json.mcpServers` to create MCP clients.

---

## Why `mcp__quotation__match_quotation` Is Not Callable

The `--acp` session's `lo` query engine has `mcpClients: []`. When the Claude model emits a `tool_call` for `mcp__quotation__match_quotation`, the ACP runtime's tool dispatch loop finds no registered MCP clients, and the tool is unknown. The runtime then falls back to filesystem searches / timeouts.

The MCPServers object in `session/new` (sent by AionUI) is accepted by the schema but discarded — it only affects the session fingerprint hash.

---

## Hook Points and Recommended Fix Approaches

### Option A: Switch route-b to spawn `--ccb-native-acp` (RECOMMENDED — minimal change)

Change `route-b/index.js` line 111 from:
```js
const child = spawn(bun, [cli, '--acp'], { ... })
```
to:
```js
const child = spawn(bun, [cli, '--ccb-native-acp'], { ... })
```

The `ccb-native-acp-agent.js` already:
- Reads `settings.json` directly
- Calls `callMcpTool('quotation', 'match_quotation', ...)` when it detects quotation keywords
- Has `callMcpTool('accurate', ...)` capability (via `getSettings().mcpServers?.accurate`)
- Streams text responses back to AionUI without needing `tool_call` registration

**Caveats**: The ccb-native agent uses `maybeQuotationKeywords()` for intent detection, not the model. Non-quotation queries fall back to `callMiniMax()`. It does not support arbitrary tool use by the model — only hard-coded internal MCP dispatch.

### Option B: Patch `entry-WG7IeDEv.js` to load MCP from settings at `createSession()` time

At line ~64280 in `entry-WG7IeDEv.js`, change:
```js
mcpClients: [],
```
to something that reads `settings.mcpServers` and creates MCP client objects.

**Problem**: The `lo` class expects fully initialized MCP client objects (with `.type === 'connected'` state and tool listings). The MCP initialization is async and not trivially injectable without reverse-engineering more of the `loadAgentsDir-BMosMfSG.js` MCP init chain. This is a high-risk patch to a 70KB minified file.

### Option C: Inject `mcpServers` into the `session/new` request (from route-b, pre-spawn)

Route-b could intercept the ACP stdio stream, parse `session/new` requests, and inject the `mcpServers` from `settings.json` into the params before forwarding to the upstream ACP process.

**Problem**: Even if `session/new` sends `mcpServers`, the upstream `createSession()` ignores them for client initialization (finding #1). This would have no effect.

### Option D: Pass `--mcp-config` CLI flag to upstream ACP process

The `main()` interactive loop builds `T` (dynamicMcpConfig) from `--mcp-config` flags. The `--acp` path in `entry-WG7IeDEv.js` does not read `--mcp-config` (it only imports `runAcpAgent` which calls `$o()` directly). So this won't work either without patching.

---

## Recommended Approach

**Change one line in `route-b/index.js`**: spawn `--ccb-native-acp` instead of `--acp`.

This uses the already-working ccb-native ACP agent that:
- Calls `settings.json.mcpServers.quotation` via `callMcpTool()` 
- Calls `settings.json.mcpServers.accurate` similarly
- Handles quotation queries with MCP-backed results
- Does not require any changes to the dist bundles

The `CLAUDE_CONFIG_DIR` is already set correctly by route-b to `%LOCALAPPDATA%\CCB-Wanding\.claude`, so `getSettings()` inside `ccb-native-acp-agent.js` will find the correct `settings.json` with `mcpServers.quotation` and `mcpServers.accurate` configured.

---

## Files Referenced

| File | Role |
|------|------|
| `D:\CCB-Wanding\dist\cli.js` | Entry: routes `--acp` vs `--ccb-native-acp` |
| `D:\CCB-Wanding\dist\chunks\entry-WG7IeDEv.js` | Upstream ACP runtime: `mcpClients:[]` bug, line ~64280 |
| `D:\CCB-Wanding\dist\chunks\ccb-native-acp-agent.js` | CCB-native ACP: working MCP dispatch via `callMcpTool()` |
| `D:\CCB-Wanding\dist\chunks\main-Dj9buWt1.js` | Interactive main: shows how dynamicMcpConfig works (not ACP path) |
| `D:\CCB-Wanding\dist\chunks\loadAgentsDir-BMosMfSG.js` | Settings/plugin MCP init chain (React REPL path only) |
| `ccb-installer/patches/aionui-ccb-route-b/index.js` | Current route-b: spawns `--acp`, line 111 is the fix point |

## Caveats

- The upstream `--acp` runtime's `mcpClients:[]` gap is architectural — it was designed for SDK clients that pass tool listings via `session/new`, not for settings-based MCP server processes. Fixing it requires either patching the minified bundle or using the native agent.
- `ccb-native-acp-agent.js` does keyword-based intent detection, not model-driven tool use. It will not emit `tool_call` events to AionUI; instead it resolves internally and streams text. If AionUI depends on seeing `tool_call` events in the stream, Option A will change that behavior.
- The ccb-native agent calls `callMiniMax()` for non-quotation queries, which hits `ANTHROPIC_BASE_URL` (MiniMax endpoint). This env var must be set in `settings.json.env` or inherited — route-b already injects `settings.env` vars, so this should work.
