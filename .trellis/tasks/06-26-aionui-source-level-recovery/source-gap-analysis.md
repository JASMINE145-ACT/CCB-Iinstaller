# Source Gap Analysis

Date: 2026-06-26

## Current Answer

The missing piece is not the 1.1.2 runtime payload. The missing piece is source control and a verified rebuild.

`D:/Projects/aionui-src` already contains CCB/WanD integration source files for Guid cards, specialist agents, MCP authority, update UI, org knowledge, work tasks, and runtime bridges. However, many of those files are currently untracked in that external repo.

## Confirmed Source Owners

| Behavior / payload | Source owner |
| --- | --- |
| Guid card agent catalog and hidden default orchestrator | `D:/Projects/aionui-src/packages/desktop/src/common/config/ccbAgentCatalog.ts` |
| Quotation and accurate specialist model defaults | `D:/Projects/aionui-src/packages/desktop/src/common/config/ccbAcpModelInfo.ts` |
| CCB agent profile migration and Guid card repair | `D:/Projects/aionui-src/packages/desktop/src/common/config/ccbAgentMigration.ts` |
| Renderer Guid page behavior | `D:/Projects/aionui-src/packages/desktop/src/renderer/pages/guid/` |
| CCB MCP authority and health panels | `D:/Projects/aionui-src/packages/desktop/src/common/config/ccbMcp*.ts`, `packages/desktop/src/renderer/hooks/mcp/`, `packages/desktop/src/renderer/pages/settings/ToolsSettings/` |
| AionUi process IPC bridge providers | `D:/Projects/aionui-src/packages/desktop/src/process/bridge/ccb*Bridge.ts` |
| Internal CCB update track | `D:/Projects/aionui-src/packages/desktop/src/process/bridge/internalUpdateManifest.ts`, `ccbUpdateBridge.ts`, `silentNsisInstall.ts` |
| CCB runtime packaged agents and skills | `ccb-installer/config/agents/`, `ccb-installer/config/skills/` |
| Quotation MCP and business data | repo `python/`, `mcp_servers/quotation-server/`, `ccb-installer/resources/wanding/` |
| Route-b ACP patch | `ccb-installer/patches/aionui-ccb-route-b/index.js` |

## Build Chain

`ccb-installer/scripts/build-wanding.ps1` already encodes the intended source-level chain:

```powershell
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.1.3
```

Relevant behavior:

- default `-AionUiSrc` is `D:\Projects\aionui-src`;
- without `-SkipAionUiBuild`, the script builds AionUi from source;
- it runs `sync-aionui-ccb-route-b.ps1`;
- it copies `D:/Projects/aionui-src/out/win-unpacked` into `ccb-installer/staging/AionUi`;
- it writes `staging/dist/VERSION`;
- it runs NSIS unless `-SkipNsis` is passed.

## Dev Parity Requirement

The dev launcher must not be a half-integrated AionUi. `ccb-installer/scripts/start-aionui-dev.ps1` now treats `D:/CCB-Wanding` as the default 1.1.2 CCB baseline, runs `run-wanding-bootstrap.ps1`, sets `CCB_WANDING_HOME`, `CCB_WANDING_CONFIG_DIR`, and update-track environment variables, syncs route-b, and then starts `bun run dev`.

`ccb-installer/scripts/sync-aionui-ccb-route-b.ps1` has also been aligned with the 1.1.2 installed script behavior: it patches both route-b `index.js` and WanD `acp-agent.js`, including the `AionUi-Dev` runtime slot.

## Release Blocker

Do not claim future source releases are guaranteed until one of these is true:

1. The CCB/WanD `aionui-src` changes are committed or otherwise captured as a patch set.
2. A fresh build from `D:/Projects/aionui-src` reproduces the required Guid quotation expert behavior.
3. `build-wanding.ps1 -Version <next>` can rebuild staging and pass install health/smoke checks.
4. `start-aionui-dev.ps1` can launch dev with the 1.1.2 CCB baseline instead of a half-integrated AionUi.

## Next Action

The next practical action is to snapshot or commit the external `aionui-src` CCB changes, then run a non-publishing rebuild:

```powershell
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.1.3-dev -SkipNsis
```

Only after that should stale generated outputs be cleaned.
