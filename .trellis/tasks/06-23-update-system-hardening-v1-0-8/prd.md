# Update system hardening v1.0.8

## Goal

Harden the CCB-Wanding internal update system so small script/update fixes no longer require a full NSIS reinstall, failed updates are observable and recoverable, and incompatible changes automatically fall back to full install.

Current launch chain:

```text
Desktop shortcut
-> AionUiLauncher.exe
-> ccb-launch-aionui.cmd
-> scripts/ccb-update-auto.ps1
-> AionUi/AionUi.exe
```

`AionUiLauncher.exe` stays a minimal no-window wrapper. `ccb-launch-aionui.cmd` stays a minimal business launcher. Update implementation belongs in PowerShell scripts under `scripts/`.

## Problems To Solve

1. Script fixes still require full NSIS reinstall because hot update does not update `scripts/`.
2. Some specs still describe the old notify-only launcher flow, conflicting with current `ccb-update-auto.ps1`.
3. Hot update lacks a clear compatibility gate for layout/runtime-breaking changes.
4. Operators need a simple way to inspect last update state without reading multiple logs.
5. Rollback exists internally through health-check behavior, but there is no explicit manual rollback command.
6. VPS release flow needs stronger atomic publish and verification guidance.
7. Logs and backups need retention rules to avoid long-term disk growth.

## P0 Requirements

- Add a controlled `scripts` hot-update component.
  - Include only shipped runtime scripts, not every development script in the repo.
  - Use Copy-Tree/additive semantics for `scripts/`; do not delete employee-side files that are absent from a given hot zip.
  - Map `ccb-installer/scripts/**` git changes to the `scripts` hot component.
- Add `scripts` to `internal-upgrade.ps1` hot paths.
- Keep `AionUiLauncher.exe` and `ccb-launch-aionui.cmd` out of regular hot update unless a full NSIS package is intentionally shipped.
- Update specs so the authoritative flow is auto hot apply, not notify-only.
  - `ccb-launch-aionui.cmd` invokes `ccb-update-auto.ps1` unless `CCB_NO_UPDATE=1`.
  - `ccb-update-notify.ps1` is legacy/fallback only.
- Update packaging whitelist shipped-script docs to include `ccb-update-auto.ps1`.

## P1 Requirements

- Add hot-update compatibility metadata to the manifest contract.

  ```json
  {
    "hot_update": {
      "min_from_version": "1.0.8",
      "max_from_version": "1.0.12",
      "layout_version": 2,
      "requires_full_install": false
    }
  }
  ```

- If current install version is outside the supported range, do not apply hot update.
- If `requires_full_install` is true, surface the full installer path instead of applying hot update.
- Persist update state to a small JSON file, for example:

  ```text
  %LOCALAPPDATA%\CCB-Wanding\updates\state.json
  ```

  Include current version, last check time, last apply time, last error, last backup path, and available version.
- Add a manual rollback command, for example `scripts/rollback-last-update.ps1`, that restores the latest hot-update backup and logs the result.
- Harden publish/verify runbook:
  - Upload artifact first.
  - Verify artifact exists and hash matches.
  - Publish manifest last.
  - Keep previous manifest/artifact available for rollback.
- Add retention rules for logs and hot-update backups.
  - Keep only the most recent N backups or backups newer than N days.
  - Keep update logs for a bounded retention window.

## P2 Requirements

- Add optional launch/update diagnostics surface in Check Install output.
- Add optional canary/stable channel guidance for employee rollout.
- Defer "update all" UI until CCB hot update and AionUI/full NSIS flows are stable.
  - If implemented later, order must be CCB hot update first, then full AionUI/NSIS update last because NSIS may close Electron.
- Plan HTTPS/AuthentiCode adoption separately; current hash validation remains mandatory.

## Out Of Scope

- Replacing `AionUiLauncher.exe` with direct `AionUi.exe` shortcut.
- Moving update logic into the Rust launcher.
- Hot-updating `AionUiLauncher.exe` as part of normal script fixes.
- Large UI redesign of the About update modal.

## Acceptance Criteria

- `build-wanding-hot.ps1 -Components scripts` produces a hot zip containing only approved runtime scripts.
- `internal-upgrade.ps1` can apply the scripts component to an installed tree.
- Startup still follows `AionUiLauncher.exe -> ccb-launch-aionui.cmd -> ccb-update-auto.ps1 -> AionUi.exe`.
- Spec files no longer contain contradictory notify-only statements for the authoritative WanD flow.
- Manifest compatibility metadata is documented and enforced before hot apply.
- Update state JSON is written on check/apply/failure.
- Manual rollback can restore the most recent hot backup in a test install root.
- Publish verification fails on missing artifact or hash mismatch before manifest cutover.

## Relevant Files

- `ccb-installer/launcher-src/src/main.rs`
- `ccb-installer/ccb-launch-aionui.cmd`
- `ccb-installer/scripts/ccb-update-auto.ps1`
- `ccb-installer/scripts/ccb-check-update.ps1`
- `ccb-installer/scripts/internal-upgrade.ps1`
- `ccb-installer/scripts/build-wanding-hot.ps1`
- `ccb-installer/scripts/build-wanding-lib.ps1`
- `ccb-installer/scripts/build-wanding.ps1`
- `ccb-installer/scripts/publish-update-bundle.ps1`
- `ccb-installer/scripts/verify-update-server.ps1`
- `.trellis/spec/integration/internal-update.md`
- `.trellis/spec/integration/wanding-packaging-whitelist.md`
- `.trellis/spec/frontend/aionui-update-mechanism.md`
- `.trellis/spec/guides/wanding-build-path-decision.md`

## Notes

There is an older narrow task, `06-23-scripts-self-update-hot-patch-v1-0-8`, that covers only the `scripts` hot-update slice. This task is the broader hardening plan and can absorb or supersede that work.
