# Session: Unified WanD Update Path (Phase 1 + 2 source)

**Date:** 2026-06-21  
**Scope:** `unified_wand_update_path` plan — installer/ops + aionui-src dual-track About

---

## Delivered (code)

### Phase 1 — claude-code-best

| Artifact | Path |
|----------|------|
| Launch notify | `ccb-installer/scripts/ccb-update-notify.ps1` |
| Launcher env + notify | `ccb-installer/ccb-launch-aionui.cmd` (+ `update-server.env` overlay) |
| Update entry IN | `ccb-wanding-versions.cmd` in `build-wanding.ps1` + NSIS「检查更新 / 版本选择」 |
| Publish | `scripts/update/publish-update-bundle.ps1` (`-AionUiInstallMode bundled`) |
| VPS upload helper | `scripts/update/upload-staged-manifest.ps1` |
| Trial smoke helper | `ccb-installer/scripts/smoke-hot-update-trial.ps1` (dev-only in `$devOnlyScripts`) |

### Phase 2 — aionui-src

| Artifact | Path |
|----------|------|
| CCB manifest parse | `internalUpdateManifest.ts` — `parseCcbBlock`, `buildCcbUpdateCheckResult`, registry fallback |
| CCB IPC | `ccbUpdateBridge.ts` — spawn `internal-upgrade.ps1` |
| UI | `UpdateModal.tsx` dual rows; `AboutModalContent.tsx` 万鼎版本 |
| Tests | `tests/unit/internalUpdateManifest.test.ts` extended |

---

## Verified locally

- `smoke-hot-update-trial.ps1 -SkipHealthProbe` → `dist/VERSION` 1.0.2 on partial install
- `verify-update-server.ps1` → launcher `disable_github=True manifest_url=True`
- Staging contains `ccb-wanding-versions.cmd`, `ccb-update-notify.ps1`

---

## Still ops-blocked (§6.2 gap table)

1. **VPS real manifest + artifacts** — placeholder JSON live; full `publish-update-bundle` + `upload-staged-manifest.ps1` pending
2. **Fresh app.asar** — `build-wanding.ps1` without `-SkipAionUiBuild` / `-SkipPipMcp`
3. **Fleet acceptance** — 4 trial users, `test-mcp-health -Probe` on full NSIS install
4. **Tests** — `ccbUpdateBridge` unit/integration pending

---

## 2026-06-21 — VPS P0 ops progress (§12.1 step 1)

**Host:** `67.216.206.3` (`hot-snap-1`), SSH port **39222**

| Step | Status | Notes |
|------|--------|-------|
| `/var/www/updates/{aionui,ccb}` | ✅ | `www-data:www-data`, `a+rX` |
| Nginx `wand-updates.conf` | ✅ | `sites-enabled` symlink; `nginx -t` OK; reload OK |
| Placeholder `manifest.json` | ✅ | Temp JSON on disk |
| Public manifest GET | ✅ | Windows probe `http://67.216.206.3/updates/manifest.json` → **HTTP 200** |
| Localhost curl on VPS | ⚠️ false fail | `curl http://127.0.0.1/updates/...` → 404 — **Host header** is `127.0.0.1`, not `server_name 67.216.206.3`; use public IP or `-H 'Host: 67.216.206.3'` |
| Real artifacts (exe/zip) | ❌ | Not uploaded yet |
| `verify-update-server.ps1` exit 0 | ❌ | Blocked on real manifest + fresh `app.asar` |

**VPS verify (correct):**

```bash
curl -s http://67.216.206.3/updates/manifest.json | head -c 200
# or on-box:
curl -s -H 'Host: 67.216.206.3' http://127.0.0.1/updates/manifest.json | head -c 200
```

**Next (Windows):** `build-wanding.ps1 -Version 1.0.2` (no `-SkipAionUiBuild`) → `publish-update-bundle.ps1` → `upload-staged-manifest.ps1` → `verify-update-server.ps1` → install + §12.4 About smoke.

---

## Spec updates (same session)

- `integration/internal-update.md` — §3.7 implemented, §6.2 gap table, §10 changelog
- `integration/wanding-packaging-whitelist.md` — §6 notify, §16.4 bundled, §17.5 IN list
- `frontend/aionui-update-mechanism.md` — §8.3.1 ship status
- `frontend/dev-test-ship.md` — §1.1 dev update smoke
- `integration/wanding-first-ship.md` — §2.5 priority refresh
- `spec/index.md` — WanD update rating 8.5/10

---

## Wrong vs correct (capture)

| Wrong | Correct |
|-------|---------|
| Dev validates Phase 1 notify/NSIS | Installed tree + `ccb-wanding-versions.cmd` |
| `-SkipHealthProbe` smoke = fleet sign-off | Full vendor + `-Probe` on trial PC |
| Claim Phase 2 done without new `app.asar` | Probe staging `app.asar` for `ccbUpdateBridge` |
