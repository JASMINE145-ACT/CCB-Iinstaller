# route-b Sync

> Read this when changing `ccb-installer/patches/aionui-ccb-route-b/index.js` or after rebuilding `D:\CCB-Wanding\dist\`. The sync script writes the route-b patch to **four locations** — skipping any one causes mixed-state bugs.

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

## 2. The four sync targets

| # | Label | Path (verified 2026-06-12, version `0.39.0`) |
|---|-------|------|
| 1 | repo AionUi bundle | `D:\Projects\claude-code-best\AionUi\resources\bundled-aioncore\win32-x64\managed-resources\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\index.js` |
| 2 | AionUI Web runtime cache | `%USERPROFILE%\.aionui-web\runtime\managed-tools\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\index.js` |
| 3 | AionUI Web install (D:) | `D:\aionui-web\aionui-web\bundled-aioncore\win32-x64\managed-resources\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\index.js` |
| 4 | AionUi exe runtime (AppData\Roaming) | `%APPDATA%\AionUi\aionui\runtime\managed-tools\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\index.js` |

> ⚠️ **Mutable paths.** The version, the install prefix (`D:\aionui-web\`), and the bundle layout all change with new AionUI / aioncore / CCB-Wanding releases. Always re-verify paths before assuming.

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
| Two windows appear, one is vanilla Claude Code | Mixed sync state — some locations patched, others not | Run §1 to all 4 targets; verify version `0.39.0` (or current) |

---

## 4. Why "only consume" is wrong

The old mental model — "ccb-installer is only consumed by dev mode" — caused repeated "I patched route-b but nothing changed" reports. The sync script is part of the dev loop:

```
modify route-b patch  →  run sync-aionui-ccb-route-b.ps1  →  restart aioncore  →  retest
```

If you skip step 2 or 3, you will hit one of the symptoms in §3.
