# Backend Coding Rules

> Hard rules for CCB-Wanding backend work. Pair with [`build-deploy-verify.md`](./build-deploy-verify.md) checklist.

---

## Hard rules

1. **Fix ACP/MCP in `claude-code-B` source**, then `bun run build` → deploy `dist\` to `D:\CCB-Wanding\dist\`. Do not treat minified `entry-*.js` as the long-term edit surface.

2. **Never write CCB-Wanding config into `C:\Users\m1774\.claude`.** CCB uses `%LOCALAPPDATA%\CCB-Wanding\.claude\`.

3. **Do not extend deprecated paths** (`ccb-runtime`, `serve-wanding`, `ccb-native-acp-agent`) for new AionUI features. Route B + `--acp` is primary.

4. **MCP business logic stays in `mcp_servers/` + `python/`**, not in AionUI renderer or route-b unless env/policy only.

5. **route-b patches are glue**, not a second QueryEngine. Launcher + env + spawn policy only — see [`../integration/aionui-ccb-boundary.md`](../integration/aionui-ccb-boundary.md).

6. **Emergency dist hotfix** is allowed only with: (a) ticket in task log, (b) same fix ported to `claude-code-B\src\` before next release.

7. **Chunk hashes change on every build.** Docs cite stable source paths; verify live chunk with `rg` in `D:\CCB-Wanding\dist\chunks\`.

---

## Isolation checklist (before testing)

```powershell
# CCB session should use:
$env:CLAUDE_CONFIG_DIR = "$env:LOCALAPPDATA\CCB-Wanding\.claude"

# Should NOT be required for CCB (clear if debugging official Claude):
# ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN at user profile level
```

---

## Verification checklist (after backend change)

- [ ] `bun run build` succeeds in `D:\claude-code-B`
- [ ] Deployed to `D:\CCB-Wanding\dist\` (not only `claude-code-B\dist\`)
- [ ] If AionUI involved: `sync-aionui-ccb-route-b.ps1` + restart aioncore
- [ ] Smoke: `ccb-installer\test-native-acp-agent.mjs` (Route B) **or** `test-runtime-mcp.mjs` **or** AionUI prompt
- [ ] No edits under `C:\Users\m1774\.claude`
- [ ] Task log updated if integration behavior changed

---

## Task templates

### Fix MCP not registering in ACP session

```text
1. Read route-b-status.md — live dist uses tools:[...a,..._mcpTools], not mcpClients alone
2. Read src/services/acp/agent.ts createSession() — currently mcpClients: []
3. Compare with src/utils/queryContext.ts (non-ACP path) + live $buildMcp patch behavior
4. Wire settings.json mcpServers → mcpClients AND tools array in source
5. bun run build → deploy → test-native-acp-agent.mjs
```

### Add / change quotation tool behavior

See [`mcp-business.md`](./mcp-business.md) (tool semantics + smoke).

```text
1. mcp_servers/quotation-server/ (rebuild dist if needed) — paths: file-map.md §3
2. settings.json mcpServers.quotation args/env
3. python/inventory/ if stock query logic changes
4. smoke-wanding-e2e.ps1 or test-runtime-mcp.mjs
```

### Change MiniMax / model env for CCB only

```text
1. %LOCALAPPDATA%\CCB-Wanding\.claude\settings.json (env block)
2. ensure-wanding-settings.ps1 if installer default should change
3. Do NOT touch official Claude settings.json
```

---

## Forbidden patterns

| Pattern | Why |
|---------|-----|
| Permanent edit to `D:\CCB-Wanding\dist\chunks\entry-*.js` | Lost on rebuild; untraceable |
| Duplicate MCP spawn logic in route-b | Two sources of truth |
| Frontend `chatLib` dedup for backend event bugs | Fixes symptom, not producer |
| `ccb-runtime` for new AionUI work | Deprecated integration path |
| Global `setx ANTHROPIC_*` for CCB testing | Breaks official Claude isolation |
