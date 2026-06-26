# AionUI ACP patch for CCB-Wanding

Canonical patched files for `@agentclientprotocol/claude-agent-acp@0.39.0`.

Upstream target inside AionUI bundle:

```text
managed-resources/acp/claude-agent-acp/0.39.0/win32-x64/node_modules/@agentclientprotocol/claude-agent-acp/dist/
```

## What this fixes

- Default `CLAUDE_CONFIG_DIR` → `%LOCALAPPDATA%\CCB-Wanding\.claude`
- Prefer CCB-Wanding `dist/cli.js` + bundled Bun as SDK executable
- Inject only `quotation` and `accurate` MCP servers from CCB-Wanding settings
- Merge CCB-Wanding env (MiniMax base URL / auth) into SDK options
- Avoid SDK control-plane calls that hang against CCB-Wanding (`setModel`, `setPermissionMode`, `applyFlagSettings`)
- 5s timeout + fallback on `initializationResult()` for `session/new`
- `query.next` wait default **120s** (was 60s) so quotation MCP cold start (~90s) does not false-interrupt; override with env `CCB_WANDING_QUERY_NEXT_TIMEOUT_MS` (30s–300s). Hot path latency unchanged — only extends the ceiling before abort.

## Apply

From repo root:

```powershell
.\ccb-installer\scripts\sync-aionui-ccb-patch.ps1
```

Restart AionUI Web / Desktop after sync.
