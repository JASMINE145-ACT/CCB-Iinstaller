# Build, Deploy, Verify

> How to rebuild CCB-Wanding from source, deploy to the install slot, and smoke-test. **Read this after every `claude-code-B` change.**

---

## 1. Build (`D:\claude-code-B`)

Verified from `package.json` + `build.ts` (2026-06-12):

```powershell
cd D:\claude-code-B
$env:BUN_JSC_forceRAMSize = '3500000000'   # if build OOM on Windows (2026-06-13)
bun run build
# equivalent: bun run build.ts
# entry: src/entrypoints/cli.tsx → dist/ with code splitting
```

**Windows OOM (2026-06-13):** `bun run build` may panic with `Failed to allocate memory for output file with inline source map` (~1.4GB RSS). Mitigations:

1. Stop heavy `electron` / `bun` processes first
2. Set `$env:BUN_JSC_forceRAMSize = '3500000000'` (or higher) for the build shell only
3. Retry — verified success 2026-06-13 after stopping electron/aioncore

Output:

```text
D:\claude-code-B\dist\
  cli.js              # main bundle entry (chunk names vary per build)
  cli-bun.js
  cli-node.js
  chunks\entry-*.js   # ACP path loads from here when --acp
  vendor\ripgrep\     # copied from src/utils/vendor/ripgrep
```

Optional checks before deploy:

```powershell
bun run typecheck
bun test src/services/acp/__tests__
# 4 test files as of 2026-06-12 (bridge, permissions, promptConversion, agent) — none cover MCP wiring yet
```

---

## 2. Deploy to `D:\CCB-Wanding\dist\`

**Checked-in script (recommended):**

```powershell
cd D:\claude-code-B
bun run build

cd D:\Projects\claude-code-best
.\ccb-installer\scripts\deploy-claude-code-b-to-wanding.ps1 -Backup
# Dry run: add -WhatIf
# Non-interactive (CI): $env:CCB_DEPLOY_ACK_NO_MCP = "1"
```

The script mirrors `claude-code-B\dist` → `D:\CCB-Wanding\dist` and **warns** if the live `$buildMcp` patch would be lost (source build without MCP wiring). See [`acp-session-flow.md`](./acp-session-flow.md) § Source vs live dist.

**Manual deploy (fallback):**

```powershell
# /MIR deletes dest-only files under dist\ — use -Backup on the script instead
robocopy D:\claude-code-B\dist D:\CCB-Wanding\dist /MIR /XD node_modules
```

**After deploy**, if AionUI uses route-b:

```powershell
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\sync-aionui-ccb-route-b.ps1 -RestartAionUiWeb
```

See [`../integration/route-b-sync.md`](../integration/route-b-sync.md).

**Post-deploy spot-check (AskUserQuestion / permissions patch):**

```powershell
# Live dist should contain permissions.ts bundle markers (chunk name varies per build):
Select-String -Path D:\CCB-Wanding\dist\chunk-*.js -Pattern 'safeDecodeURIComponent|toolCall\.rawInput' -List
# Expect at least one hit in e.g. chunk-sy8hpwgd.js (2026-06-13)
```

---

## 3. Smoke tests

### 3.1 Native ACP + MCP (recommended — Route B backend)

```powershell
cd D:\Projects\claude-code-best
node ccb-installer/test-native-acp-agent.mjs
# Expect: [init] claude-code, [session] <id> minimax-m3, stopReason=end_turn

# Quotation tool loop (verified prompt — see route-b-status.md):
$env:CCB_TEST_PROMPT = "查询直接50价格"
node ccb-installer/test-native-acp-agent.mjs

# Full route-b spawn path (Node launches route-b/index.js):
$env:CCB_TEST_ROUTE_ENTRY = "1"
node ccb-installer/test-native-acp-agent.mjs
```

Verifies: `D:\CCB-Wanding\dist\cli.js --acp`, `$buildMcp` patch, MiniMax auth, streamed `agent_message_chunk`. See [`route-b-status.md`](./route-b-status.md).

**MiniMax model switch (2026-06-14):** After deploy, dist must contain `buildMiniMaxM3SessionModels` (e.g. `rg buildMiniMaxM3SessionModels D:\CCB-Wanding\dist\*.js`). AionUI conversation → switch to **MiniMax M3 (Thinking)** → no「模型切换失败」. See [`acp-session-flow.md`](./acp-session-flow.md) § MiniMax variant model list.

### 3.2 ACP process (manual stdio)

```powershell
$env:CLAUDE_CONFIG_DIR = "$env:LOCALAPPDATA\CCB-Wanding\.claude"
D:\CCB-Wanding\vendor\bun\bun.exe D:\CCB-Wanding\dist\cli.js --acp
# Expect: JSON-RPC on stdin/stdout; session/new handshake
```

### 3.3 Quotation MCP (ccb-runtime smoke — deprecated path)

```powershell
cd D:\Projects\claude-code-best\ccb-installer
# Requires ANTHROPIC_AUTH_TOKEN + Wanding settings in env (see lib/load-smoke-env.mjs)
node test-runtime-mcp.mjs
```

Expect: `quotation` server connected, `tools.length > 0`.

### 3.4 AionUI + Route B (integration)

Manual in AionUI desktop or API:

```text
User: 查询 直接50 价格
→ multiple candidates or single match (quotation MCP)
```

Task log with captured transcripts: [`../../../spec/aionui-ccb-wanding-acp-mcp-fix.md`](../../../spec/aionui-ccb-wanding-acp-mcp-fix.md).

### 3.5 Wanding install E2E

```powershell
cd D:\Projects\claude-code-best\ccb-installer\scripts
.\smoke-wanding-e2e.ps1 -InstallDir D:\CCB-Wanding
```

---

## 4. Symptom → Diagnosis

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `bun run build` OOM / Bun crash on source map | Low RAM + linked sourcemaps on large bundle | Stop electron/bun; `$env:BUN_JSC_forceRAMSize='3500000000'`; retry §1 |
| Source fix has no effect in CCB | Forgot to `bun run build` + deploy to `D:\CCB-Wanding\dist\` | §1–§2 |
| AionUI still old behavior after deploy | route-b / AppData slot stale | `sync-aionui-ccb-route-b.ps1` + restart aioncore |
| MCP tools empty in `--acp` session | Rebuilt from source without `$buildMcp` patch; or `CLAUDE_CONFIG_DIR` wrong | Run `test-native-acp-agent.mjs`; see [`route-b-status.md`](./route-b-status.md) |
| Model uses `ExecuteExtraTool` instead of `mcp__*` | MCP not in `tools` array | [`acp-session-flow.md`](./acp-session-flow.md) § Source vs live dist |
| quotation works standalone, not in AionUI | Integration slot / env | [`../integration/aionui-ccb-boundary.md`](../integration/aionui-ccb-boundary.md) |
| Official Claude shows MiniMax | User-level `ANTHROPIC_*` leaked into shell | Clear env; use CCB launcher only |
| Patched `entry-*.js` lost after rebuild | Hand-patch in dist | Move fix to `claude-code-B\src\` |

---

## 5. Minimal backend change loop

```text
1. Edit D:\claude-code-B\src\...   (or mcp_servers / settings — see file-map.md)
2. cd D:\claude-code-B && bun run build
3. .\ccb-installer\scripts\deploy-claude-code-b-to-wanding.ps1 -Backup
4. Optional: sync-aionui-ccb-route-b.ps1
5. Smoke: test-native-acp-agent.mjs (Route B) OR test-runtime-mcp.mjs OR AionUI prompt
6. Update spec/aionui-ccb-wanding-acp-mcp-fix.md if integration behavior changed
```
