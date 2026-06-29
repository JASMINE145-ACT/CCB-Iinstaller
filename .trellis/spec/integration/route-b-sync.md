# route-b Sync

> Read this when changing `ccb-installer/patches/aionui-ccb-route-b/index.js` or after rebuilding `D:\CCB-Wanding\dist\`. The canonical sync script writes route-b **`index.js` + `acp-agent.js`** to **three locations** — skipping any one causes mixed-state bugs. (Legacy web-only paths: §2b.)

**Related:** Rebuilding CCB-Wanding from source → [`../backend/build-deploy-verify.md`](../backend/build-deploy-verify.md) (`deploy-claude-code-b-to-wanding.ps1`). Live MCP status → [`../backend/route-b-status.md`](../backend/route-b-status.md).

---

## 1. The sync script

```powershell
# After editing ccb-installer/patches/aionui-ccb-route-b/index.js
# OR after rebuilding D:\CCB-Wanding\dist\:
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\sync-aionui-ccb-route-b.ps1
# Add -RestartAionUiWeb to also stop running aionui-web / aioncore processes.
```

> **Current verified version of `claude-agent-acp`: `0.39.0` as of 2026-06-12.** This is mutable — do not hardcode in new scripts. Detect installed version when possible.

---

## 2. The three sync targets (canonical — `sync-aionui-ccb-route-b.ps1`)

Source of truth: `ccb-installer/scripts/sync-aionui-ccb-route-b.ps1` `$targets` array (verified 2026-06-30).

| # | Label | Path (version `0.39.0` in script) |
|---|-------|------|
| 1 | **installed AionUi bundle** | `{InstallDir}\AionUi\resources\bundled-aioncore\win32-x64\managed-resources\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\` |
| 2 | **AionUi exe runtime (AppData\Roaming)** | `%APPDATA%\AionUi\aionui\runtime\managed-tools\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\` |
| 3 | **AionUi-Dev electron dev runtime** | `%APPDATA%\AionUi-Dev\aionui\runtime\managed-tools\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\` |

- **`InstallDir`** defaults to `ccb-installer\` parent when omitted; **dev/smoke use `-InstallDir D:\CCB-Wanding`** (or your live install root).
- Each target receives **both** `index.js` (route-b) and `acp-agent.js` (WanD patch).
- Target 2 (`%APPDATA%\AionUi`) may be **created** if missing (`CreateMissing = $true`); targets 1 and 3 require existing dirs.

> ⚠️ **Mutable paths.** The `0.39.0` segment and bundled layout change with AionUI / aioncore releases. Re-verify via `rg "relativeDist\s*=" ccb-installer\scripts\sync-aionui-ccb-route-b.ps1`.

### 2b. Legacy — `sync-aionui-ccb-patch.ps1` (acp-agent.js only)

**Do not use for route-b `index.js`.** This script syncs **only** `acp-agent.js` to up to four paths (skips missing dirs):

| Label | Path |
|-------|------|
| repo AionUi bundle | `{repoRoot}\AionUi\resources\bundled-aioncore\win32-x64\…\dist\` |
| AionUI Web runtime cache | `%USERPROFILE%\.aionui-web\runtime\managed-tools\acp\…\dist\` |
| AionUi exe runtime | `%APPDATA%\AionUi\aionui\runtime\managed-tools\acp\…\dist\` |
| AionUi-Dev dev runtime | `%APPDATA%\AionUi-Dev\aionui\runtime\managed-tools\acp\…\dist\` |

For WanD desktop dev + bundled Mixing install, prefer **`sync-aionui-ccb-route-b.ps1`** (§1). Use `sync-aionui-ccb-patch.ps1` only when you need legacy **web** cache paths or acp-agent-only hotfix without touching route-b index.

### How to find the current version when in doubt

```powershell
# The sync script has the version baked into $relativeDist
rg "relativeDist\s*=" ccb-installer\scripts\sync-aionui-ccb-route-b.ps1

# Or check what's actually installed
ls D:\Projects\claude-code-best\AionUi\resources\bundled-aioncore\win32-x64\managed-resources\acp\claude-agent-acp\

# Or check the AppData runtime
ls $env:APPDATA\AionUi\aionui\runtime\managed-tools\acp\claude-agent-acp\
```

---

## 3. Symptom → Diagnosis (when "I changed it but nothing happens")

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| I changed route-b, dev still shows old behavior | Forgot to run `sync-aionui-ccb-route-b.ps1` | Run §1 |
| Dev mode shows "Claude Code" not "CCB-Wanding" | The `index.js` at the active ACP slot is not route-b-patched | Run §1, then restart aioncore |
| I see MCP tools but quotation/accurate missing | CCB-Wanding rebuild not synced, or MCP env stale | Rebuild `D:\CCB-Wanding\dist\` then run §1 |
| Two windows appear, one is vanilla Claude Code | Mixed sync state — some locations patched, others not | Run §1 to all **3** targets; verify version `0.39.0` (or current) |
| Dev Electron still vanilla; bundled exe OK | `%APPDATA%\AionUi-Dev\…` not synced | Run §1; confirm target 3; restart via `start-dev-full.ps1` |

---

## 4. Why "only consume" is wrong

The old mental model — "ccb-installer is only consumed by dev mode" — caused repeated "I patched route-b but nothing changed" reports. The sync script is part of the dev loop:

```
modify route-b patch  →  run sync-aionui-ccb-route-b.ps1  →  restart aioncore  →  retest
```

If you skip step 2 or 3, you will hit one of the symptoms in §3.
