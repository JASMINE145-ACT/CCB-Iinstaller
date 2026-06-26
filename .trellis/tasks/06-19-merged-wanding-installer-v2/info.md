# 2026-06-20 Strict Packaging Audit

## Root Cause

The desktop shortcut directly opening `AionUi.exe` can bypass WanD bootstrap. On a fresh user machine that leaves agents, MCP settings, `settings.json`, and org server config absent or stale, so the app behaves like default AionUI.

Post-install scripts also must not require system `py -3`; machines without Python break Word/Excel MCP pip setup and the rest of the config chain.

## Hardening Recorded

- Desktop and Start Menu CCB-Wanding shortcuts must point to `$INSTALL\ccb-launch-aionui.cmd`.
- `ccb-launch-aionui.cmd` must set `CCB_INSTALL_DIR`, `CCB_WANDING_HOME`, and `CCB_WANDING_CONFIG_DIR` before launching AionUI.
- route-b must prefer launcher env and bundled install discovery from the patched AionUI ACP slot before stale fallback slots such as `D:\CCB-Wanding`.
- Build staging must pre-install MCP/ppt dependencies into bundled `vendor\python-wanding`; target machines should not need system Python.
- Launch bootstrap should be idempotent and avoid repeated pip work in Quick mode.
- Start Menu must include `Check Install`; log path is `%LOCALAPPDATA%\CCB-Wanding\logs\check-install.log`.

## Verification Done

- PowerShell parser OK for build/bootstrap/MCP install dependency scripts.
- route-b `index.js` passes `node --check`.
- launcher/check `.cmd` files are ASCII.
- seeded `resources\settings\settings.json` parses as JSON.
- search found no `py -3` or v2 shortcut to direct `AionUi.exe`.
- local light `test-mcp-health.ps1` PASS.

## Build Record: 2026-06-20

Full package build completed.

Artifact:

- `D:\Projects\claude-code-best\ccb-installer\CCB-Wanding-1.0.1.exe`
- Size: `948,254,306` bytes (about 904 MB)
- SHA256: `999E1FDA65EC355C5423958C66924ACCFBFD7D0CA69B6B0C5842C5730DA10D22`
- Timestamp: `2026-06-20 15:53:53`

Build notes:

- First run failed during AionUI renderer build with Node heap OOM.
- Retry succeeded with `NODE_OPTIONS=--max-old-space-size=8192` and `-SkipBuild` to reuse the already completed CCB backend dist build.
- Final rebuild after Check Install hardening completed with `-SkipBuild -SkipAionUiBuild`.
- Successful retry command:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.1 -SkipBuild
```

Final rebuild command:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.0.1 -SkipBuild -SkipAionUiBuild
```

Post-build checks:

- `staging\dist\VERSION` is `1.0.1`.
- `staging\ccb-launch-aionui.cmd` includes `CCB_INSTALL_DIR`, `CCB_WANDING_HOME`, and `CCB_WANDING_CONFIG_DIR`.
- Staged route-b includes bundled install discovery before fallback paths.
- Staged AionUI, CCB dist, bun, python-wanding, org-server template, seed agents, office-word MCP site-packages, and excel MCP site-packages all exist.
- Staging bootstrap against temp config passed.
- Light `test-mcp-health.ps1` against staging + temp config passed.
- Staging `test-mcp-health.ps1 -Probe` passed for all 4 non-lazy stdio MCP servers:
  quotation tools=9, accurate tools=8, office-word tools=54, excel tools=25.
- `patch-subagent-gate-hooks.ps1` printed nonfatal `No YAML frontmatter found` messages for some already-hooked agents, returned OK, and gate hooks were confirmed present for quotation/accurate/word/excel/ppt/cowork agents.
- Real installer validation used silent install into `D:\tmp\CCB-Wanding-install-verify3` from the final exe.
- Desktop and Start Menu `CCB-Wanding.lnk` target `D:\tmp\CCB-Wanding-install-verify3\ccb-launch-aionui.cmd`; working directory is the install root.
- Start Menu `Check Install.lnk` targets `D:\tmp\CCB-Wanding-install-verify3\ccb-check-install.cmd`; working directory is the install root.
- Installed config at `%LOCALAPPDATA%\CCB-Wanding\.claude` was rewritten to the new install root.
- Installed `test-mcp-health.ps1 -Probe` passed for all 4 non-lazy stdio MCP servers:
  quotation tools=9, accurate tools=8, office-word tools=54, excel tools=25.
- Installed `ccb-check-install.cmd` returned OK for AionUI, launcher, CCB dist, bundled bun, settings.json, quotation agent, bootstrap marker, and org-server.json.

## Route-B Cache Fix: 2026-06-20

User field test on another PC reported:

- `Check Install` had no `MISSING`.
- AionUI still looked like upstream/default.
- AionUI showed: "undetected Claude Code; confirm CCB-Wanding installed and route-b configured."

Root cause:

- The packaged bundled ACP slot was Route-B, but AionUI can keep using an existing `%APPDATA%\AionUi\aionui\runtime\managed-tools\...` Claude ACP runtime cache from a prior upstream/default launch.
- The old `Check Install` checked file presence but did not verify the active runtime cache contained `ccb-native-acp-route`.
- The shipped script set did not include a target-machine route-b sync step, so a target PC could not self-heal this cache.

Fix:

- `sync-aionui-ccb-route-b.ps1` now supports installed-package mode via `-InstallDir`.
- The patch source is the installed bundled AionUI Route-B `index.js` when present, falling back to the repo patch in dev.
- The script force-syncs `%APPDATA%\AionUi\aionui\runtime\managed-tools\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\index.js`.
- It avoids relying on system Node on target PCs.
- `run-wanding-bootstrap.ps1` now runs `sync-aionui-ccb-route-b` on every bootstrap, including Quick launch mode.
- `build-wanding.ps1` now ships `sync-aionui-ccb-route-b.ps1`.
- `ccb-check-install.cmd` now runs Quick bootstrap before checks and reports both `OK bundled route-b` and `OK runtime route-b`.

Rebuilt artifact:

- `D:\Projects\claude-code-best\ccb-installer\CCB-Wanding-1.0.1.exe`
- Size: `948,246,404` bytes
- SHA256: `0566D3439A84D0DD1167F82689E279DA6CC7828289E9575A106E08046EF4B15E`
- Timestamp: `2026-06-20 18:25:19`

Validation:

- PowerShell parser passed for `sync-aionui-ccb-route-b.ps1` and `run-wanding-bootstrap.ps1`.
- `ccb-check-install.cmd` remains ASCII.
- Route-B sync tested with temp `APPDATA` and wrote runtime `index.js` containing `ccb-native-acp-route`.
- Staged Quick bootstrap wrote `%APPDATA%\AionUi\aionui\runtime\managed-tools\...dist\index.js` containing `ccb-native-acp-route`.
- Staged `Check Install` returned `OK bundled route-b` and `OK runtime route-b`.
- Staged `test-mcp-health.ps1 -Probe` still passed all 4 non-lazy stdio MCP servers:
  quotation tools=9, accurate tools=8, office-word tools=54, excel tools=25.

## Hot-Update Baseline Decision: 2026-06-20

Conclusion:

- This route-b cache fix still requires shipping a new full NSIS exe once, because older target installs did not contain the target-machine `sync-aionui-ccb-route-b.ps1` script and `Check Install` could not detect stale AionUI runtime ACP cache.
- After users install the rebuilt full package with route-b runtime sync support, future backend-only changes can use a small hot-update zip instead of a full installer.

Hot-update suitable components:

- `dist`
- `python`
- `data`
- `seed`
- `quotation-mcp`
- `accurate-mcp`
- `office-word`
- `excel`
- `mcp-pip`

Still use full NSIS when:

- AionUI frontend exe/renderer changes.
- NSIS installer, desktop/start-menu shortcuts, or root launchers change.
- Route-B entry changes and the installed baseline does not already include the route-b sync/self-heal script.
- Foundational vendor runtimes change materially: bundled Bun, Python, Git, ripgrep, or AionUI bundled aioncore.
- It is a new machine first install.

Planned hot-update command shape:

```powershell
.\ccb-installer\scripts\build-wanding-hot.ps1 -Version 1.0.1 -Components dist,python,seed
.\ccb-installer\scripts\build-wanding-hot.ps1 -Version 1.0.1 -AutoFromGitDiff
```

Target-machine apply shape:

```powershell
$zip = 'D:\...\ccb-installer\out\hot\CCB-dist-1.0.1-win-x64.zip'
$sha = (Get-Content "$zip.sha256" -Raw).Trim()
.\ccb-installer\scripts\internal-upgrade.ps1 -ZipPath $zip -ExpectedVersion 1.0.1 -ExpectedSha256 $sha
```

Observed warnings:

- pip printed dependency conflict warnings while staging Python dependencies, but the build exited 0 and the staged health check passed.
- No clean-VM GUI click-through was performed in this session. The verified boundary is installer layout, shortcut routing, bootstrap/config generation, and MCP stdio startup/tool enumeration.

## Remaining

Optional highest-confidence validation on a clean Windows VM:

```powershell
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
.\ccb-installer\scripts\smoke-wanding-e2e.ps1 -InstallDir "$env:LOCALAPPDATA\Programs\CCB-Wanding"
```

## Installer System Hardening Pause: 2026-06-20

Additional strict-audit changes implemented in source, but intentionally not repackaged yet:

- Added `resources/install-health-manifest.json` and `scripts/test-install-health.ps1` as an install-level health manifest/checker.
- Changed `ccb-check-install.cmd` to run the manifest health check instead of relying only on ad hoc missing-file checks.
- Changed `ccb-launch-aionui.cmd` to fail closed when bootstrap or runtime Route-B sync fails, instead of opening stock AionUI with missing assistants.
- Hardened `build-wanding.ps1` staging so `-SkipPipMcp -SkipStagingClear` preserves staged office-word/excel pip outputs instead of deleting them with mirror copy.
- Made office-word and excel MCP pip install scripts idempotent when `site-packages` already exists.
- Added install-root protection to `installer-wanding-v2.nsi`: install into an existing non-empty directory is blocked unless it already has `.ccb-wanding-install-root`.
- Added limited retry in `test-mcp-health.ps1 -Probe` for transient Windows `spawn EPERM` when launching bundled Bun during MCP probing.

Validation already performed before pausing:

- Staging health check passed with temp `APPDATA`/`LOCALAPPDATA`.
- Staging `ccb-check-install.cmd` reported `PASS install health complete`.
- Staging `test-mcp-health.ps1 -Probe` passed quotation/accurate/office-word/excel.
- A real silent install to `D:\tmp\CCB-Wanding-system-verify` passed `ccb-check-install.cmd`, Route-B bundled/runtime checks, shortcut target inspection, and direct MCP probe layer.
- The final repack command was started then interrupted by user request to pause; residual `makensis.exe` processes were stopped.

Important artifact state:

- Current existing artifact remains `D:\Projects\claude-code-best\ccb-installer\CCB-Wanding-1.0.1.exe`.
- Size: `947,994,576` bytes.
- Timestamp: `2026-06-20 21:21:37`.
- SHA256 from the last completed build before these final two source-only changes: `42D94BD2B83843D5EF5D78305A5D27FA66B41E13E07CE0BFC8C86CAF3038A15F`.
- This existing exe does **not** include the later NSIS install-root guard or `test-mcp-health.ps1` EPERM retry. Next packaging run must rebuild full NSIS before sending to users.
