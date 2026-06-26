# WanD Build Path Decision — Thinking Checklist

> **Before packaging:** pick full NSIS vs hot zip vs incremental NSIS. **Executable contract:** [`../integration/wanding-first-ship.md`](../integration/wanding-first-ship.md) §5.2.1

---

## 30-second checklist

- [ ] **Target machines already have complete v2 install?** (`AionUi\AionUi.exe` + `vendor\bun` + `scripts\run-wanding-bootstrap.ps1`)
- [ ] **CLI-era machines?** Ship **≥1.1.1** with `config_generation: 2` — employees only need desktop `AionUiLauncher` (see whitelist §17.4.1)
  - **No** → full `build-wanding.ps1 -Version x.y.z` (**no Skip flags**)
  - **Yes** → continue below
- [ ] **Did you change `aionui-src`?** (renderer, main, preload, update bridge)
  - **Yes** → full NSIS; delete `aionui-src\out\.build-hash` + `out\win-unpacked` first
  - **No** → hot zip is OK if changes are only in §16.1 paths
- [ ] **What changed?**
  - `claude-code-B` / python / seed / MCP only → `build-wanding-hot.ps1`
  - Scripts / config / resources only (e.g. `build-wanding.ps1`, `sso.env.example`, `electron.vite.config.ts`) → `-SkipBuild -SkipAionUiBuild` (**verify AionUi.exe first** — see §SKIP_GUARD below)
  - Packaging machine staging already complete, only need new exe → `-SkipBuild -SkipAionUiBuild -SkipStagingClear -SkipPipMcp`

---

## Quick commands

| Goal | Command |
|------|---------|
| First ship / broken half-install | `.\ccb-installer\scripts\build-wanding.ps1 -Version x.y.z` |
| Daily CCB hotfix | `.\ccb-installer\scripts\build-wanding-hot.ps1 -Version x.y.z -Components dist,python,seed` |
| Auto-pick components from git | `.\ccb-installer\scripts\build-wanding-hot.ps1 -Version x.y.z -AutoFromGitDiff` |
| Scripts / config only, AionUI unchanged¹ | `build-wanding.ps1 -Version x.y.z -SkipBuild -SkipAionUiBuild` |
| Re-pack NSIS only (staging intact) | `build-wanding.ps1 … -SkipBuild -SkipAionUiBuild -SkipStagingClear -SkipPipMcp` |

¹ Saves ~22 min (skips electron-builder bun traversal). **Requires `out\win-unpacked\AionUi.exe` to exist and be complete** — see §SKIP_GUARD.

---

## §SKIP_GUARD — pre-flight before `-SkipAionUiBuild`

```powershell
# Must return True before using -SkipAionUiBuild:
Test-Path "D:\Projects\aionui-src\out\win-unpacked\AionUi.exe"
```

If `False`: **do NOT use `-SkipAionUiBuild`**; run without it (electron-builder --dir will rebuild, ~22 min).

**Why win-unpacked can be missing / partial:**
- A previous build was killed during `electron-builder --dir` → AionUi.exe absent even though the directory exists
- `out\win-unpacked` was manually deleted
- First-ever build on this machine

**Lesson (v1.0.6 2026-06-22):** Killing `electron-builder --dir` mid-run to "save time" corrupted `out\win-unpacked`, forcing a full 22-min rebuild. Net result: ~40 min instead of the ~22 min we were trying to save. **Never kill electron-builder --dir.** Let it finish once; then `-SkipAionUiBuild` is available for all future script-only builds.

---

## Red flags (stop — do not hot-update)

- `%LOCALAPPDATA%\Programs\CCB-Wanding` missing `AionUi\` or `vendor\bun`
- Only `dist\cli.js` exists (hot zip applied to empty shell)
- `Test-StagingWanDInstall` fails on `isInternalUpdateEnabled` in `app.asar`
- Shipping with `-SkipAionUiBuild` as a "release" build

---

## After hot zip (minimal verify)

```powershell
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
```

Full acceptance before first ship to colleagues: §5.2 in [`wanding-first-ship.md`](../integration/wanding-first-ship.md).

---

## Related specs

| Doc | Section |
|-----|---------|
| [`wanding-first-ship.md`](../integration/wanding-first-ship.md) | §5.2.1 full decision tree + workflows |
| [`internal-update.md`](../integration/internal-update.md) | §3.6 hot zip signatures + apply chain |
| [`wanding-packaging-whitelist.md`](../integration/wanding-packaging-whitelist.md) | §16.1 hot IN/OUT paths · §17 OOTB gate |
