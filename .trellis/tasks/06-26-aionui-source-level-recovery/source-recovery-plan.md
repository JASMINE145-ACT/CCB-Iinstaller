# Source-Level Recovery Plan

## Definition

Runtime recovery means `D:/CCB-Wanding` can run again because files were copied from `ccb-installer/staging`.

Source-level recovery means a developer can change source code, run documented build commands, produce a new staging tree, build a new NSIS installer, install it, and get the same product behavior plus intended changes.

## Source Of Truth Map

| Runtime output | Long-term owner |
| --- | --- |
| `staging/AionUi/` | `D:/Projects/aionui-src` build output plus CCB patch inputs |
| `staging/AionUi/resources/bundled-aioncore/` | repo `AionUi/resources/bundled-aioncore/` or generated bundle input used by packaging |
| route-b ACP patch inside bundled AionCore | `ccb-installer/patches/aionui-ccb-route-b/` |
| `staging/dist/` | repo CLI/runtime build scripts under `ccb-installer/scripts/build-wanding.ps1` and related inputs |
| `staging/vendor/mcp-servers/quotation-server/` | `mcp_servers/quotation-server/` build output and dependencies |
| `staging/vendor/wanding/data/` | repo business data inputs under `data/` and installer staging scripts |
| `staging/seed/agents/` | repo `ccb-installer/seed/agents/` or seed generation scripts |
| launch and repair scripts | `ccb-installer/*.cmd` and `ccb-installer/scripts/*.ps1` |

## Work Plan

1. Freeze the 1.1.2 release baseline.
   - Keep `ccb-installer/staging/AionUi` as a comparison oracle.
   - Record hashes or file inventory for CCB-specific files before rebuilding.

2. Identify the missing AionUi source integration.
   - Compare `staging/AionUi/resources/app.asar` or unpacked renderer/main output against `D:/Projects/aionui-src/out` after a clean source build.
   - Search for the Wanding quotation expert Guid card labels, route registration, agent presets, and bundled AionCore references.
   - Classify each delta as upstream AionUi source, CCB patch, generated config, or vendored runtime.

3. Backport permanent deltas to source or patch inputs.
   - UI/desktop behavior belongs in `D:/Projects/aionui-src`.
   - CCB integration patches belong in `ccb-installer/patches/`.
   - Runtime defaults, seeds, MCP, and data belong in repo source inputs, not `staging/`.

4. Make the build path explicit.
   - Use or repair `ccb-installer/scripts/package-aionui-exe.ps1` for AionUi production build.
   - Use or repair `ccb-installer/scripts/build-wanding.ps1` for full CCB-Wanding staging assembly.
   - Ensure scripts copy rebuilt AionUi into `ccb-installer/staging/AionUi`.

5. Verify before version bump.
   - Launch rebuilt bundled runtime via `D:/CCB-Wanding/ccb-launch-aionui.cmd` or an isolated install directory.
   - Run install health and Wanding smoke checks.
   - Confirm Guid card and quotation workflow are present without manually copying staging files after install.

## Versioning Rule

Only bump to `1.1.3` or later after the rebuilt installer comes from the source pipeline. A runtime repair copied from 1.1.2 staging is not a releasable new-source baseline by itself.

## Immediate Next Checks

```powershell
Test-Path D:\Projects\aionui-src
Test-Path ccb-installer\staging\AionUi\AionUi.exe
Test-Path ccb-installer\patches\aionui-ccb-route-b\index.js
Get-Content ccb-installer\staging\dist\VERSION
```

Then compare source build output against the 1.1.2 staging baseline before making any source edits.
