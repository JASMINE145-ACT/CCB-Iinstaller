# AionUi Source-Level Recovery PRD

## Goal

Restore the CCB-Wanding AionUi integration to a maintainable source-level workflow:

source changes -> AionUi build -> CCB-Wanding staging -> NSIS installer -> installed runtime.

The existing 1.1.2 staging tree is a release baseline and recovery oracle, not the long-term source of truth.

## Current Facts

- `CCB-Wanding-1.1.2.exe` is an NSIS installer built from `ccb-installer/staging/`.
- `ccb-installer/staging/dist/VERSION` is `1.1.2`.
- `ccb-installer/staging/AionUi/` contains the complete bundled AionUi runtime, including the Wanding quotation expert Guid card behavior.
- A partial install under `D:/CCB-Wanding` was repaired by copying runtime payloads from staging.
- `ccb-installer/scripts/start-aionui-dev.ps1` points at `D:/Projects/aionui-src`, whose restored dev state may not contain the full 1.1.2 CCB Guid integration.

## Non-Goals

- Do not use `ccb-installer/staging/AionUi` as a place for permanent hand edits.
- Do not rely on running the 892 MB installer for source analysis when the unpacked staging tree already exists.
- Do not publish a new version until a rebuilt staging tree has been verified against the 1.1.2 behavior baseline.

## Required Outcome

1. Every 1.1.2 CCB-specific AionUi behavior has an owning source or patch input.
2. Build scripts can regenerate AionUi runtime output from those inputs.
3. `ccb-installer/staging/` can be rebuilt from source outputs plus intended vendor/runtime payloads.
4. A new NSIS installer can be produced from rebuilt staging.
5. Installed runtime smoke tests pass against quotation, inventory, seed agents, launch scripts, and Guid card entry points.
6. `ccb-installer/scripts/start-aionui-dev.ps1` starts a dev AionUi with at least the same CCB/WanD behavior as the 1.1.2 bundled runtime.

## Acceptance Checks

- `D:/Projects/aionui-src` source build succeeds.
- Rebuilt AionUi output contains the CCB bundled AionCore route-b patch.
- Rebuilt staging contains `AionUi/`, `dist/`, `vendor/`, `seed/agents/`, launch scripts, and `dist/VERSION` for the target release.
- `ccb-launch-aionui.cmd` starts the rebuilt bundled runtime.
- `ccb-installer/scripts/start-aionui-dev.ps1` bootstraps against the 1.1.2 CCB-Wanding baseline before `bun run dev`.
- AionUi-Dev runtime receives both route-b `index.js` and WanD `acp-agent.js` patches.
- The Wanding quotation expert Guid card exists in the rebuilt AionUi runtime.
- `scripts/test-install-health.ps1` and `scripts/smoke-wanding-e2e.ps1` pass or any failures are documented with blocking cause.

## Cleanup Rule

After the source pipeline is proven, stale generated outputs can be cleaned or archived. Until then, `ccb-installer/staging/AionUi` should be retained as the 1.1.2 comparison baseline.
