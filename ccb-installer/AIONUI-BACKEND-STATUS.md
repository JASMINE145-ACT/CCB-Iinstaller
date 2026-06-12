# CCB-Wanding AionUI Backend Status

Date: 2026-06-12

## Current Primary Goal

The current primary goal is:

```text
Use original CCB-Wanding ACP loop runtime in AionUI,
with quotation/accurate MCP wired in as first-class tools.
```

**Status**: MCP registration is COMPLETE. Quotation tool calls work end-to-end
through the native `--acp` runtime.

## Current Main Route

```text
AionUI native backend / aioncore
  -> Claude Code ACP slot
  -> route-b index.js
  -> D:\CCB-Wanding\dist\cli.js --acp
  -> original CCB-Wanding ACP loop runtime (entry-WG7IeDEv.js)
  -> $buildMcp() reads %LOCALAPPDATA%\CCB-Wanding\.claude\settings.json
  -> MiniMax + MCP tools: excel-mcp, quotation, accurate (41 tools total)
```

## Preserved Fallback Route

Do not delete the earlier shim path. It remains a useful fallback and reference:

```text
AionUI native backend / aioncore
  -> Claude Code ACP slot
  -> route-b index.js
  -> D:\CCB-Wanding\dist\chunks\ccb-native-acp-agent.js
  -> MiniMax + quotation shortcut (keyword detection, internal MCP dispatch)
```

That path already proved AionUI streaming, turn completion, history persistence,
and MiniMax config isolation. It is kept for rollback and comparison, but the
final target is the original `D:\CCB-Wanding\dist\cli.js --acp` runtime with
model-driven tool calls.

## Global Config Boundary

Official Claude Code must not be affected:

```text
Official Claude Code:
  C:\Users\m1774\.claude

CCB-Wanding / AionUI:
  C:\Users\m1774\AppData\Local\CCB-Wanding\.claude
```

Do not set Windows user-level `ANTHROPIC_*` or `CLAUDE_CONFIG_DIR`. The route
entry only injects CCB config into the current AionUI agent child process.

## MCP Registration Patch

### What Changed

**File patched**: `D:\CCB-Wanding\dist\chunks\entry-WG7IeDEv.js` (live runtime)

Three changes to make `createSession()` load MCP servers from `settings.json`:

1. Imports `z2` as `$mi` (MCP connect) and `V2` as `$ml` (tool list) from
   `loadAgentsDir-BMosMfSG.js`
2. Adds `async function $buildMcp()` at module level — reads `settings.json`,
   connects each `mcpServers` entry, lists tools
3. `createSession()` calls `await $buildMcp()` and includes MCP tools via
   `tools:[...a,..._mcpTools]` — making them first-class callable tools

### Critical: tools array not mcpClients

MCP tools MUST be in the `tools` array passed to `lo({..., tools:[...a,..._mcpTools], ...})`.
Putting them only in `mcpClients` or `p.mcp.tools` is insufficient — the model
will see them as "extra tools" and use `ExecuteExtraTool`, which fails.

## Route-B Patch (unchanged)

Source:
```text
ccb-installer/patches/aionui-ccb-route-b/index.js
```

Spawns:
```text
D:\CCB-Wanding\vendor\bun\bun.exe D:\CCB-Wanding\dist\cli.js --acp
```

Process-local env includes:
```text
CLAUDE_CONFIG_DIR=%LOCALAPPDATA%\CCB-Wanding\.claude
CLAUDE_CODE_ACP_ALLOW_BYPASS_PERMISSIONS=true
NODE_TLS_REJECT_UNAUTHORIZED=0
CLAUDE_CODE_DISABLE_FAST_MODE=1
CLAUDE_CODE_ENABLE_TELEMETRY=0
```

Also injects `settings.json.env` vars (e.g., `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`).

## Verified

Native direct ACP smoke:
```text
node ccb-installer/test-native-acp-agent.mjs
```
Result:
```text
initialize OK, session/new OK
model minimax-m3
[ccb-acp-mcp] loaded 3 servers, 41 tools: excel-mcp,quotation,accurate
agent_message_chunk received, stopReason=end_turn
```

Route-b entry point smoke:
```text
CCB_TEST_ROUTE_ENTRY=1 node ccb-installer/test-native-acp-agent.mjs
```
Result:
```text
route starts D:\CCB-Wanding, config=%LOCALAPPDATA%\CCB-Wanding\.claude
[ccb-acp-mcp] loaded 3 servers, 41 tools: excel-mcp,quotation,accurate
agent_message_chunk received, stopReason=end_turn
```

Quotation MCP tool call via native ACP:
```text
CCB_TEST_ROUTE_ENTRY=1 CCB_TEST_BYPASS=1 CCB_TEST_PROMPT="查询直接50价格"
```
Result:
```text
[ccb-acp-mcp] loaded 3 servers, 41 tools: excel-mcp,quotation,accurate
tool_call: mcp__quotation__match_quotation (DIRECT, not through ExecuteExtraTool)
tool returns 14 candidates -> model filters to 4 DN50 direct connections
model: calls AskUserQuestion for user clarification
```

## Current Issues

- Test mock (`test-native-acp-agent.mjs`) does not handle `AskUserQuestion` for
  multi-match clarification → test times out with multi-match queries.
- `accurate` tool loaded but not yet end-to-end tested with a specific query.
- AionUI UI-level integration test still needed.

## Next Steps

1. Test in AionUI UI with `查询直接50价格` prompt.
2. Verify `AskUserQuestion` clarification flow works in AionUI (user selects from
   candidates).
3. Test `accurate` tool (precise pricing).
4. Optionally add auto-response to `requestPermission` for `AskUserQuestion` in
   the smoke test.
