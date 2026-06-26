# Session: WanD 1.0.8 release runbook + spec sync

**Date:** 2026-06-23

## Done

| Item | Path |
|------|------|
| **1.0.8 发版运维手册** | `ccb-installer/docs/wanding-1.0.8-release-runbook.md` |
| Spec §3.5 / §12.2 → new `publish-update-bundle.ps1` | `.trellis/spec/integration/internal-update.md` |
| wanding-first-ship §5.2 link | `.trellis/spec/integration/wanding-first-ship.md` |
| integration index link | `.trellis/spec/integration/index.md` |
| Deprecation header on legacy publish | `scripts/update/publish-update-bundle.ps1` |
| `publish-update-bundle.ps1` OutFile mkdir fix | `ccb-installer/scripts/publish-update-bundle.ps1` |

## Pending (human ops)

- `build-wanding.ps1 -Version 1.0.8 -SkipBuild` (no `-SkipAionUiBuild`)
- `build-wanding-hot.ps1 -Version 1.0.8`
- `publish-update-bundle.ps1` + VPS scp
- Fleet smoke via `AionUiLauncher`

## Context

Absorbs tasks: update-system-hardening, scripts-self-update-hot-patch, manifest-compat-gates. `MinFromVersion` for hot zip should be **1.0.8** (not 1.0.7).
