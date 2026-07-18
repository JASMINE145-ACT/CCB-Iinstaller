# Phase 0.5 done — Stale purge + NSIS DirectoryLeave + smoke

**Date:** 2026-07-16  
**Contract:** `WANd.INSTALL.STALE_PURGE.001`

## Delivered

| Item | Path |
|------|------|
| Purge engine | `ccb-installer/scripts/purge-stale-wanding-installs.ps1` |
| Employee cmd (fallback) | `ccb-installer/ccb-purge-stale-installs.cmd` |
| NSIS one-step flow | `installer-wanding-v2.nsi` → `DirectoryLeave` after directory page |
| Behavioral smoke | `scripts/test-purge-stale-wanding-installs.ps1` |
| Pack wiring smoke | `scripts/test-purge-packaging-wiring.ps1` |

## Install UX (2.0.0 full NSIS)

```text
Select $INSTDIR
  → DirectoryLeave dry-run (Keep=$INSTDIR)
  → if other trees: MessageBox confirm → Apply -Force
  → silent /S: auto Apply
  → then existing orphan/$INSTDIR checks + file copy
```

## GREEN evidence

```text
PASS test-purge-packaging-wiring
PASS test-purge-stale-wanding-installs (6 behavioral + pack wiring)
```

Includes case **5b**: explicit `-KeepInstallDir` (NSIS) must purge former registry/old tree (RegistryKeep shield disabled under ExplicitKeep).

code-reviewer: PASS (Important RegistryKeep follow-up fixed same session).

Commands:

```powershell
powershell -File .\ccb-installer\scripts\test-purge-packaging-wiring.ps1
powershell -File .\ccb-installer\scripts\test-purge-stale-wanding-installs.ps1
```

## Packaging conflict checks

- `purge-stale-wanding-installs.ps1` ∈ `$shipScripts` / `Get-WandingShipScripts`
- Test scripts ∈ `$devOnlyScripts` (not shipped; no unclassified WARN)
- NSI `File "staging\scripts\purge-stale-wanding-installs.ps1"` matches post-build staging layout
- Staging copy of `.cmd` still in `build-wanding.ps1`
- Does **not** remove full `build-wanding` / makensis from this phase (string + fake-staging sim only)

## Remaining (not this phase)

- AionUI `resolveCcbWandingCliPath` Programs + registry (Phase 1)
- Real employee VM: install 2.0.0 exe with dual trees
