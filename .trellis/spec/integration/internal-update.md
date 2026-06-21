# Internal Update — Unified Manifest (Center Feed)

> **Status:** **Formal scheme** (2026-06-19). Replaces employee access to GitHub API, GitHub Releases, and `static.aionui.com` for production updates.
>
> **Scope:** Packaged employee desktops (~10 staff). Dev (`bun run dev`) is **out of scope** — see [`../frontend/aionui-update-mechanism.md`](../frontend/aionui-update-mechanism.md) §7.1.
>
> **First merged exe:** Not blocked on this doc — ship checklist [`wanding-first-ship.md`](./wanding-first-ship.md). Ops rollout (VPS/manifest) **Defer** until first installer exists.
>
> **Related:** [`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md) §16 (hot-update zip paths) · [`aionui-update-mechanism.md`](../frontend/aionui-update-mechanism.md) §8 (client extension) · [`org-knowledge-phase0-rollout.md`](./org-knowledge-phase0-rollout.md) (business knowledge **not** in this manifest) · **Go live:** §12 P0 ops runbook

---

## 0. Decision summary

| Module | Update path | Why |
|--------|-------------|-----|
| **AionUI** | Download standalone `.exe` → silent or manual install | Electron shell; full installer is safest |
| **CCB-Wanding (frequent)** | Hot-update zip → `dist/` + selected `vendor/` | Agents, MCP, Python, scripts change often |
| **CCB-Wanding (major)** | Full NSIS `.exe` `/S` | Python runtime, Bun, Git, layout changes |
| **Org business knowledge** | **Not** software update | Org API + login shadow sync — immediate, not release-gated |

**Center feed (single URL):**

```text
https://67.216.206.3/updates/manifest.json
```

Employees fetch **only** this host (HTTPS required in production). No VPN required if VPS is reachable on 443.

---

## 1. Architecture

```text
Employee PC
  ├─ AionUI About →「检查更新」→ updateBridge   (manifest.aionui)
  │                            └─ ccbUpdateBridge (manifest.ccb) → spawn internal-upgrade.ps1   [P5 §3.7]
  └─ ccb-wanding-versions.cmd / tray / scheduled → ccb-check-update.ps1 (manifest.ccb)
              │
              ▼
Center update origin (VPS static or Nginx)
  /updates/manifest.json
  /updates/aionui/AionUi-{version}-win-x64.exe
  /updates/ccb/CCB-dist-{version}-win-x64.zip
  /updates/ccb/CCB-Wanding-{version}.exe
  /updates/ccb/CCB-dist-{version}-win-x64.zip.sha256   (optional sidecar)
              │
              ▼
Ops (publish)
  scripts/update/publish-update-bundle.ps1
```

**Do not confuse:**

| Concern | Doc |
|---------|-----|
| AionUI exe update | This doc + `aionui-update-mechanism.md` |
| CCB route-b ACP slot sync | [`route-b-sync.md`](./route-b-sync.md) |
| Org knowledge content | [`org-knowledge.md`](./org-knowledge.md) |

---

## 2. Manifest — canonical schema

**URL:** `GET /updates/manifest.json`  
**Content-Type:** `application/json; charset=utf-8`  
**Cache:** Short `Cache-Control` (e.g. `max-age=60`) on manifest; long cache on versioned artifacts.

### 2.1 Top-level fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | `integer` | yes | Manifest format version; **current: `1`** |
| `channel` | `"stable"` \| `"dev"` | yes | `dev` includes prerelease entries when client requests dev channel |
| `published_at` | ISO 8601 string | yes | When this manifest was published |
| `aionui` | `AionUiBlock` \| `null` | yes | Latest AionUI offer for this channel |
| `ccb` | `CcbBlock` \| `null` | yes | Latest CCB offer for this channel |

### 2.2 `Artifact` (shared)

| Field | Type | Required |
|-------|------|----------|
| `url` | `string` (https) | yes |
| `sha256` | lowercase hex, 64 chars | yes |
| `size` | integer bytes | yes |
| `release_notes` | string (markdown ok) | no |

### 2.3 `AionUiBlock`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | semver string | yes | e.g. `2.1.18-wanding.1` |
| `install_mode` | `"standalone"` \| `"bundled"` | yes | `standalone` = AionUi-only exe; `bundled` = merged NSIS (future §16.4) |
| `artifact` | `Artifact` | yes | Installer download |
| `min_ccb_version` | semver string | no | Warn if local CCB older before AionUI upgrade |

### 2.4 `CcbBlock`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | semver string | yes | Matches `dist/VERSION` after hot update |
| `hot_update` | `HotUpdate` \| `null` | no | Preferred when eligible |
| `full_installer` | `Artifact` | yes | NSIS fallback |
| `release_notes` | string | no | Shown in CCB update UI |

### 2.5 `HotUpdate`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `artifact` | `Artifact` | yes | Zip layout per whitelist §16.1 |
| `min_from_version` | semver string | yes | Minimum installed CCB version allowed to hot-update |
| `max_from_version` | semver string | no | Force full install above this (breaking layout) |

### 2.6 Example (stable)

```json
{
  "schema_version": 1,
  "channel": "stable",
  "published_at": "2026-06-19T12:00:00+08:00",
  "aionui": {
    "version": "2.1.18-wanding.1",
    "install_mode": "standalone",
    "min_ccb_version": "1.0.3",
    "artifact": {
      "url": "https://67.216.206.3/updates/aionui/AionUi-2.1.18-wanding.1-win-x64.exe",
      "sha256": "abc123…64hex",
      "size": 123456789,
      "release_notes": "修复组织知识库 shadow sync；内网更新源。"
    }
  },
  "ccb": {
    "version": "1.0.4",
    "release_notes": "append_business_rule；报价 MCP 修复。",
    "hot_update": {
      "min_from_version": "1.0.0",
      "artifact": {
        "url": "https://67.216.206.3/updates/ccb/CCB-dist-1.0.4-win-x64.zip",
        "sha256": "def456…64hex",
        "size": 4567890
      }
    },
    "full_installer": {
      "url": "https://67.216.206.3/updates/ccb/CCB-Wanding-1.0.4.exe",
      "sha256": "789abc…64hex",
      "size": 987654321,
      "release_notes": "完整安装：含 Python/Bun 运行时变更时使用。"
    }
  }
}
```

### 2.7 Channel / prerelease

| Client setting | Request |
|----------------|---------|
| About「包含预发布/dev 版本」**off** | Use manifest where `channel === "stable"` (default feed URL) |
| About「包含预发布/dev 版本」**on** | `GET …/manifest-dev.json` **or** same host `?channel=dev` (pick one in implementation; prefer separate file `manifest-dev.json`) |

Prerelease AionUI versions must be valid semver (e.g. `2.1.18-wanding.1-dev.2`) for `semver.gt` comparison.

### 2.8 Legacy compatibility

`ccb-check-update.ps1` today reads legacy `version.json` (`latest`, `versions[]`). **Migration:**

1. Point `CCB_UPDATE_MANIFEST_URL` / built-in default → unified `manifest.json`
2. Adapter in script: map `manifest.ccb` → internal `{ latest, url, notes }` shape
3. Deprecate `http://67.216.206.3/ccb-wanding/version.json` after first unified publish

---

## 3. Client contracts

### 3.1 AionUI (`updateBridge.ts` — **to implement**)

| Step | Behavior |
|------|----------|
| Check | `GET` manifest URL (env `AIONUI_UPDATE_MANIFEST_URL`, default `https://67.216.206.3/updates/manifest.json`) |
| Compare | `semver.gt(manifest.aionui.version, app.getVersion())` |
| Download | Main process only; URL host ∈ `ALLOWED_DOWNLOAD_HOSTS` |
| Verify | SHA-256 of file === `artifact.sha256` before exposing path to user |
| Install | User runs exe or silent `/S` per `install_mode` |
| Disable | Set `AIONUI_DISABLE_AUTO_UPDATE=1`; remove GitHub / electron-updater feed in WanD builds |

**IPC:** Reuse `update.check` / `update.download`; replace `fetchGitHubReleases()` body. See [`aionui-update-mechanism.md`](../frontend/aionui-update-mechanism.md) §8.2.

**Env:**

| Variable | Default |
|----------|---------|
| `AIONUI_UPDATE_MANIFEST_URL` | `https://67.216.206.3/updates/manifest.json` |
| `AIONUI_UPDATE_MANIFEST_DEV_URL` | `https://67.216.206.3/updates/manifest-dev.json` |
| `AIONUI_DISABLE_AUTO_UPDATE` | `1` in WanD packaged builds (GitHub path off) |

### 3.2 CCB (`ccb-check-update.ps1` — **to adapt**)

| Mode | Behavior |
|------|----------|
| `-BackgroundCheck` | Fetch manifest → if `ccb.version` newer than registry → write `available.json` |
| `-Select` / install | Choose hot vs full per §3.3 → download → verify sha256 → invoke upgrade |

**Env:**

| Variable | Default |
|----------|---------|
| `CCB_UPDATE_MANIFEST_URL` | `https://67.216.206.3/updates/manifest.json` |

**Installed version:** Registry `HKCU:\Software\CCB-Wanding\CCB-Wanding\Version` or `dist/VERSION` file.

### 3.3 CCB upgrade decision matrix

| Condition | Action |
|-----------|--------|
| No install dir / no `dist/` | `full_installer` NSIS silent `/S` |
| Installed `< hot_update.min_from_version` | `full_installer` |
| `hot_update` present and version in range | `internal-upgrade.ps1 -ZipPath … -ExpectedVersion …` |
| Hot update fails health check | Rollback from `backup-before-{version}-{timestamp}/` → offer full installer |
| `install_mode: bundled` (future) | AionUI update via merged NSIS only |

### 3.4 `internal-upgrade.ps1`

**Path:** `ccb-installer/scripts/internal-upgrade.ps1`

| Phase | Action |
|-------|--------|
| Pre | Resolve install dir (§16.2); read `dist/VERSION` |
| Backup | Copy hot-update target dirs to `%LOCALAPPDATA%\CCB-Wanding\backup-before-{version}-{ts}\` |
| Apply | Extract zip; robocopy per §16.1 IN list only |
| Post | `ensure-wanding-settings.ps1`; `deploy-seed-agents.ps1`; `sync-aionui-ccb-route-b.ps1` if AionUi under `$INSTALL`; `test-mcp-health.ps1 -Probe` |
| Fail | Restore backup; exit non-zero |

### 3.5 `publish-update-bundle.ps1`

**Path:** `scripts/update/publish-update-bundle.ps1`

| Input | Output |
|-------|--------|
| Built AionUi exe, CCB dist zip, optional NSIS | Upload to VPS `/updates/…`; regenerate `manifest.json` + sha256; bump `published_at` |

Ops must not hand-edit sha256 — script computes from files on disk.

**Acceptance smoke — `verify-update-server.ps1`:** ops runs `ccb-installer/scripts/verify-update-server.ps1 [-ManifestUrl …] [-InstallDir …]` to confirm the feed: fetches manifest (HTTP 2xx + JSON parse), prints `aionui` + `ccb.{version, full_installer.url, hot_update.url}`, runs `ccb-check-update.ps1 -BackgroundCheck`, and probes the bundled AionUI `app.asar` for `isInternalUpdateEnabled` + launcher env (`AIONUI_DISABLE_AUTO_UPDATE=1` + manifest URL). **Scope:** reachability / visibility smoke (exit 2 if manifest unreachable) — it does **not** fail-closed on a missing `hot_update` block or a bad sha256. Strict sha256 enforcement lives in the clients (`updateBridge` / `ccbUpdate.apply`) and `internal-upgrade.ps1`.

### 3.6 `build-wanding-hot.ps1` (partial hot zip — **2026-06-20**)

**Path:** `ccb-installer/scripts/build-wanding-hot.ps1` · shared lib `build-wanding-lib.ps1`

| When | Use |
|------|-----|
| Daily CCB hotfix (dist / python / seed / MCP) on **already-installed** PCs | `build-wanding-hot.ps1` → `internal-upgrade.ps1` |
| New machine or Python/Bun/AionUi runtime change | Full `build-wanding.ps1` NSIS |

#### 1. Scope / Trigger

- Trigger: developer changed only whitelist §16.1 paths; must not wipe staging or re-run office-word/excel pip.
- **Not** a replacement for first install.

#### 2. Signatures

```powershell
.\ccb-installer\scripts\build-wanding-hot.ps1 `
  -Version <semver> `
  [-Components dist,python,seed,...] `
  [-AutoFromGitDiff] `
  [-BuildDist] `
  [-ReferenceInstallDir <path>] `
  [-RebuildMcpPip] `
  [-OutputDir <path>]
```

Components (canonical): `dist` · `python` · `data` · `seed` · `quotation-mcp` · `accurate-mcp` · `office-word` · `excel` · `all` · `mcp-pip` (alias expands to office-word + excel).

Full NSIS incremental staging (same session, different artifact):

```powershell
.\ccb-installer\scripts\build-wanding.ps1 -Version <semver> `
  -SkipBuild -SkipAionUiBuild -SkipStagingClear -SkipPipMcp
```

#### 3. Contracts

| Output | Layout |
|--------|--------|
| `CCB-dist-{version}-win-x64.zip` | Install-root mirror: §16.1 IN paths only |
| `CCB-dist-{version}-win-x64.zip.sha256` | 64-char hex sidecar (required by `internal-upgrade.ps1`) |

| Component | Source |
|-----------|--------|
| `dist` | `D:\claude-code-B\dist` (+ writes `dist/VERSION`) |
| `python` | repo `python/` → `vendor/wanding/python` |
| `seed` | `ccb-installer/config/agents` + `ccb-subagent-gate` skill |
| `office-word` / `excel` | Default: copy from `-ReferenceInstallDir` (auto `D:\CCB-Wanding`); `-RebuildMcpPip` runs pip (slow) |

#### 4. Validation & Error Matrix

| Condition | Result |
|-----------|--------|
| Unknown component name | throw |
| `office-word`/`excel` without reference install and without `-RebuildMcpPip` | throw |
| Staged path missing after component stage | throw (fail-closed before zip) |
| `quotation-mcp` without `node_modules` | throw |
| `internal-upgrade` sha256 mismatch | throw before extract |

#### 5. Good / Base / Bad

| Case | Command |
|------|---------|
| **Good** repeat-guard hotfix | `sync-claude-code-b-mcp-prefetch -Build -Deploy` → `build-wanding-hot -Version 1.0.2 -Components dist,python,seed` |
| **Base** auto from git | `build-wanding-hot -Version 1.0.2 -AutoFromGitDiff` |
| **Bad** `-SkipBuild` full NSIS expecting only dist changed | Still wipes staging + pip — use hot script instead |
| **Bad** hot zip for brand-new PC | Missing bun/python-wanding/AionUi — use full NSIS |

#### 6. Tests Required

| Test | Assertion |
|------|-----------|
| `build-wanding-hot -Components seed` | zip + sha256; size ≪ full NSIS |
| `build-wanding-hot -Components dist,python,seed` | contains `dist/VERSION`, `vendor/wanding/python/main.py`, `seed/agents/quotation-agent.md` |
| `internal-upgrade.ps1` on install dir | agents under `%LOCALAPPDATA%\CCB-Wanding\.claude\agents`; `dist` mirrored with `/MIR` |
| `bun test mcpToolRepeatGuard.test.ts` | 13 pass when dist component includes guard |

#### 7. Wrong vs Correct

| Wrong | Correct |
|-------|---------|
| `-SkipBuild -SkipAionUiBuild` full `build-wanding` for daily dist fix | `build-wanding-hot -Components dist` |
| Hand-zip `dist` without sha256 sidecar | Use script output `.sha256`; pass to `internal-upgrade` |
| `internal-upgrade` config at `%LOCALAPPDATA%\CCB-Wanding` (no `.claude`) | Fixed 2026-06-20: `$config = …\.claude` |

**Apply chain (post hot zip):** `internal-upgrade.ps1` → install `scripts\deploy-seed-agents.ps1` → `patch-subagent-gate-hooks.ps1` when seed in zip → health probe.

---

### 3.7 CCB update via AionUI About (`ccbUpdateBridge.ts` — **to implement**, P5)

> **Design decision (2026-06-21):** Employees see "one WanD app", so About manages **both** tracks. AionUI keeps its existing `update.check` / `update.download` path (§3.1); CCB gets a **new** `ccbUpdate.*` IPC that **spawns the existing `internal-upgrade.ps1`** (§3.4) — the main process never re-implements zip extract / robocopy / rollback. PowerShell stays the single apply engine; About is just a second trigger surface alongside the `ccb-wanding-versions.cmd` shortcut (§3.2, whitelist §6). Formalizes the cursor plan `unified_wand_update_path` Phase 2.

#### 1. Scope / Trigger
- Trigger: About →「检查更新」must list AionUI **and** CCB, and let the user apply a CCB hot update without leaving the app.
- **Not** a rewrite of apply logic: download zip in main process, then `spawn internal-upgrade.ps1`. Renderer never fetches artifact URLs.

#### 2. Signatures (IPC — main process)
New file `packages/desktop/src/process/bridge/ccbUpdateBridge.ts`; register in `process/bridge/index.ts` + `common/adapter/ipcBridge.ts`; types in `common/update/updateTypes.ts`.

| IPC | Args | Returns |
|-----|------|---------|
| `ccbUpdate.check` | `{ channel?: 'stable' \| 'dev' }` | `{ installed, latest, updateAvailable, hotUpdate?: Artifact, fullInstaller: Artifact, mode: 'hot' \| 'full' \| 'none' }` |
| `ccbUpdate.apply` | `{ }` (uses last check result) | `{ success, backupPath?, version?, error? }` |
| `ccbUpdate.getInstalledVersion` | `{ }` | `{ version: string \| null }` |

#### 3. Contracts
- **Manifest parse:** extend `internalUpdateManifest.ts` with `parseCcbBlock()` → typed `CcbBlock` (today `ccb?: unknown` is passed through raw, line ~41). Reuse the same fetch + `schema_version` + host checks as the aionui path — **do not** re-implement the manifest fetch (P4 done).
- **Installed version resolve (main process):** `CCB_WANDING_HOME` → `%LOCALAPPDATA%/Programs/CCB-Wanding` → walk up from `process.resourcesPath`; read `{install}/dist/VERSION` (corroborated by `dist/BUILD-INFO.json` provenance). Matches §3.2 "Registry or dist/VERSION".
- **Decision (`mode`):** reuse §3.3 matrix — `< hot_update.min_from_version` or no `dist/` → `full`; in-range `hot_update` → `hot`; else `none`.
- **apply (hot):** download `hot_update.artifact` (host ∈ `ALLOWED_DOWNLOAD_HOSTS`) → verify sha256 → `spawn $INSTALL/scripts/internal-upgrade.ps1 -ZipPath <tmp> -ExpectedVersion <ccb.version>` → surface success + backup path → message「请完全退出并重新打开 WanD」. **apply (full):** download `full_installer` → reuse AionUI's existing installer-launch (or NSIS `/S`).
- **Env:** reuses `CCB_UPDATE_MANIFEST_URL` (§3.2). No new env.

#### 4. Validation & Error Matrix
| Condition | Result |
|-----------|--------|
| Artifact host ∉ allowlist | reject, `{ success:false, error:'host' }` — no download |
| sha256 mismatch | reject before spawn |
| `internal-upgrade.ps1` exits non-zero | `{ success:false }`; PS1 already restored backup (§3.4 Fail) |
| No `$INSTALL/dist/` resolvable | `mode:'full'` only; hot disabled |
| `install_mode: 'bundled'` (§2.3) | AionUI track points to `ccb.full_installer` (merged NSIS), not standalone exe |

#### 5. Good / Base / Bad
- **Good:** in-range hot → download + sha256 + spawn → restart prompt.
- **Base:** out-of-range / no `dist/` → offer `full_installer`.
- **Bad:** renderer fetches `hotUpdate.url` directly → forbidden (must go through main-process `ccbUpdate.apply`).

#### 6. Tests Required
- Unit `internalUpdateManifest.test.ts`: `parseCcbBlock()` → typed block; reject malformed; `buildCcbUpdateCheckResult()` semver compare + `mode`.
- Unit: `ccbUpdate.apply` rejects host not in allowlist; rejects sha256 mismatch (asserts **no spawn**).
- Integration: `ccbUpdate.apply` on temp install → spawns `internal-upgrade.ps1`; only §16.1 paths touched; rollback on health fail.
- Manual: About shows two rows; CCB hot button applies; `install_mode:bundled` → AionUI button targets merged NSIS.

#### 7. Wrong vs Correct
| Wrong | Correct |
|-------|---------|
| Re-implement zip extract / robocopy in TS | `spawn internal-upgrade.ps1` (single apply engine) |
| Renderer `fetch(hotUpdate.url)` | main-process `ccbUpdate.apply` + allowlist + sha256 |
| About manages only AionUI; CCB silent | About lists both; CCB via `ccbUpdate.*` (this section) |
| WanD build still runs electron-updater / GitHub `autoUpdate.check` | Skip GitHub; internal manifest only (avoid dual-source) |

---

## 4. VPS layout

```text
/var/www/updates/          # or /opt/aionorg/updates/
  manifest.json
  manifest-dev.json          # optional
  aionui/
    AionUi-2.1.18-wanding.1-win-x64.exe
  ccb/
    CCB-dist-1.0.4-win-x64.zip
    CCB-Wanding-1.0.4.exe
```

**Nginx (recommended):** see **§4.2** for copy-paste config.

**HTTP redirect:** `80` → `301` → `https` for `/updates/*` only.

### 4.1 One-time VPS setup

```bash
# On VPS (67.216.206.3) — SSH port 39222 per org VPS convention
sudo mkdir -p /var/www/updates/{aionui,ccb}
sudo chown -R www-data:www-data /var/www/updates   # or nginx:nginx
sudo chmod -R a+rX /var/www/updates
```

**Do not** mix org API (`:13401`) with static updates — separate `location` / firewall rules.

### 4.2 Nginx — `/updates/` static feed

Save as e.g. `/etc/nginx/sites-available/wand-updates.conf`, then `ln -s` + `nginx -t` + reload.

```nginx
# WanD unified update origin — manifest + versioned artifacts only.
# Org API (aionorg) stays on :13401 — NOT served here.

map $uri $updates_cache {
    default                    "public, max-age=31536000, immutable";
    ~^/updates/manifest.*\.json$ "public, max-age=60";
}

server {
    listen 80;
    listen [::]:80;
    server_name 67.216.206.3 updates.yourcompany.com;

    # Pre-TLS dev: serve HTTP for /updates/ only (clients allow http for 67.216.206.3).
    # Production: uncomment redirect block below and use §4.2 HTTPS server.
    location /updates/ {
        alias /var/www/updates/;
        autoindex off;
        add_header Cache-Control $updates_cache always;
        add_header X-Content-Type-Options nosniff always;
        types { application/json json; }
        default_type application/octet-stream;
    }
}

# --- Production HTTPS (enable after cert) ---
# server {
#     listen 443 ssl http2;
#     listen [::]:443 ssl http2;
#     server_name 67.216.206.3 updates.yourcompany.com;
#
#     ssl_certificate     /etc/letsencrypt/live/updates.yourcompany.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/updates.yourcompany.com/privkey.pem;
#
#     location /updates/ {
#         alias /var/www/updates/;
#         autoindex off;
#         add_header Cache-Control $updates_cache always;
#         add_header X-Content-Type-Options nosniff always;
#         types { application/json json; }
#         default_type application/octet-stream;
#     }
# }
#
# server {
#     listen 80;
#     listen [::]:80;
#     server_name 67.216.206.3 updates.yourcompany.com;
#     return 301 https://$host$request_uri;
# }
```

**After HTTPS go-live:** set employee `BaseUrl` / env to `https://67.216.206.3/updates` (or DNS alias) and re-run `publish-update-bundle.ps1` so manifest artifact URLs use `https://`.

### 4.3 Firewall

| Port | Service | Audience |
|------|---------|----------|
| 443 (or 80 pre-TLS) | `/updates/*` static | Employee PCs (~10) |
| 39222 | SSH / scp upload | Ops only |
| 13401 | Org API (`aionorg`) | AionUI org login + MCP — **separate** from updates |

---

## 5. Security

| Rule | Rationale |
|------|-----------|
| HTTPS in production | Prevent MITM despite sha256 |
| Main-process download + host allowlist | Renderer must not fetch arbitrary URLs |
| Verify sha256 before install | Mandatory (not in upstream GitHub path) |
| No secrets in manifest | Public read OK |
| Signed installers (future) | Authenticode on exe — optional hardening |

**Allowed download hosts (initial):**

```text
67.216.206.3
updates.yourcompany.com   # if DNS alias added later
```

> **Pre-TLS (2026-06-21):** until §4.2 HTTPS go-live, **both** `updateBridge` and `ccbUpdate.apply` (§3.7) must allow `http://67.216.206.3` for this host (allowlist is host-based; the manifest serves `http://` URLs pre-TLS — §12.3). Flip env + re-run `publish-update-bundle.ps1` to `https://` before fleet-wide rollout, and tighten the allowlist to https-only then.

---

## 6. Implementation order

| Phase | Deliverable | Blocks |
|-------|-------------|--------|
| **P0** | VPS `/updates/` + first `manifest.json` + artifacts | Ops |
| **P1** | `publish-update-bundle.ps1` | P0 — **script done**; ops upload pending |
| **P2** | `internal-upgrade.ps1` + hot zip from §16.1 | P1 — **script done** |
| **P3** | `ccb-check-update.ps1` → unified manifest | P0 schema frozen — **done** |
| **P4** | `updateBridge.ts` manifest fetch (disable GitHub) | P0 schema frozen — **done** |
| **P5** | About 双轨: `ccbUpdateBridge.ts` (`ccbUpdate.*`) + `parseCcbBlock()` + UpdateModal AionUI+CCB 两行 + bundled `install_mode` 分支 + WanD 构建跳过 GitHub `autoUpdate` (§3.7) | P3–P4 |
| **P6** | `manifest-dev.json` + prerelease toggle wiring | P4 |

**Can ship independently:** P3 (CCB) before P4 (AionUI) once schema is frozen.

### 6.1 Rollout phases (Unified WanD Update Path — 2026-06-21)

Formalizes cursor plan `unified_wand_update_path`. Phase 1 is installer/ops only (no aionui-src dependency); Phase 2 = P5 (§3.7).

| Plan phase | Maps to | Deliverable |
|------------|---------|-------------|
| **Phase 1** (≤ 2026-07-15) | P0 + installer/ops | VPS manifest live (`publish-update-bundle.ps1 -Upload`, smoke `verify-update-server.ps1`); ship `ccb-wanding-versions.cmd` + 开始菜单「检查更新 / 版本选择」(whitelist §6); new `ccb-update-notify.ps1` 启动后台检查 → MessageBox 提示（**不**自动装）; `ccb-launch-aionui.cmd` 调 notify + 设 `AIONUI_DISABLE_AUTO_UPDATE=1` + `*_MANIFEST_URL`；`CCB_NO_UPDATE=1` 可跳过 |
| **Phase 2** | P5 (§3.7) | `ccbUpdateBridge.ts` 双轨 IPC + `parseCcbBlock()` + UpdateModal 两行 + bundled 分支；重打 AionUI（**不得** `-SkipAionUiBuild`，app.asar 须含 `isInternalUpdateEnabled`）并入 v2 包 |

**Acceptance — Phase 1:** 4 名试用员工在未改代码的机器上仅靠 manifest + 快捷方式完成 CCB zip 热更新，`dist/VERSION` 递增，`test-mcp-health -Probe` PASS。**Phase 2:** About → 检查更新 显示两行；CCB 热更新按钮可用；bundled 模式 AionUI 按钮指向合并 NSIS。

---

## 7. Validation & error matrix

| Symptom | Cause | Fix |
|---------|--------|-----|
| About still hits GitHub | `updateBridge` not migrated | P4; set `AIONUI_DISABLE_AUTO_UPDATE=1` |
| Check update always up-to-date | Wrong manifest URL or channel | Verify `AIONUI_UPDATE_MANIFEST_URL`; dev toggle |
| Download fails TLS | Self-signed cert | Install CA on employee PCs or use public LE |
| sha256 mismatch | Manifest stale or corrupt download | Re-run `publish-update-bundle.ps1` |
| Hot update broke MCP | Zip included OUT paths (§16.1) | Fix zip whitelist; rollback |
| Version compare fails | Non-semver tag | Use `x.y.z` or `x.y.z-wanding.n` |
| CCB legacy `version.json` | Old built-in URL | Set `CCB_UPDATE_MANIFEST_URL` to unified manifest |

---

## 8. Tests required

| Layer | Test | Assert |
|-------|------|--------|
| Manifest | JSON schema validation script | Required fields; sha256 hex; https URLs |
| `updateBridge` | Unit: parse manifest → `UpdateCheckResult` | semver compare; `updateAvailable` |
| `updateBridge` | Unit: reject host not in allowlist | throws / `{ success: false }` |
| `updateBridge` | Unit: sha256 mismatch | download rejected |
| `ccb-check-update` | Integration with fixture manifest | maps `ccb.version` → `available.json` |
| `internal-upgrade` | Dry-run on temp dir | only §16.1 paths touched; VERSION bumped |
| Manual | Packaged exe About → check | No request to `api.github.com` |

---

## 9. Wrong vs correct

| Wrong | Correct |
|-------|---------|
| Employee clients fetch `api.github.com` / `static.aionui.com` | Single manifest on company VPS |
| Put `wanding_business_knowledge` in manifest | Org knowledge via org API + shadow sync |
| Hot-update zip entire `$INSTALL` or `vendor/bun` | Only §16.1 IN paths |
| Renderer `fetch(manifest.aionui.artifact.url)` without allowlist | `ipcBridge.update.download` in main process |
| Hand-maintain sha256 in manifest | `publish-update-bundle.ps1` computes hashes |
| HTTP-only feed on public internet | HTTPS + optional IP allowlist |

---

## 10. Session changelog

| Date | Item |
|------|------|
| 2026-06-19 | Formal scheme: unified manifest v1; replaces GitHub/CDN for employees |
| 2026-06-19 | Linked from `wanding-packaging-whitelist.md` §16; `integration/index.md` |
| 2026-06-19 | **Implemented:** `publish-update-bundle.ps1`, `internal-upgrade.ps1`, `updateBridge.ts` internal manifest path, `ccb-check-update.ps1` unified adapter; sha256 mandatory (parse + download fail-closed) |
| 2026-06-20 | **Implemented:** `build-wanding-hot.ps1`, `build-wanding-lib.ps1`; `build-wanding.ps1` `-SkipPipMcp`/`-SkipStagingClear`; `internal-upgrade` seed paths + `.claude` config + dist `/MIR` — see §3.6 |
| 2026-06-19 | **P0 ops runbook:** §4.1–4.3 Nginx + firewall; §12 publish / NSIS env / smoke / rollout |
| 2026-06-21 | **Plan formalized (Unified WanD Update Path):** §3.7 `ccbUpdateBridge`（About 双轨, spawn `internal-upgrade.ps1`）; §6.1 rollout phases; P5 升级为正式（was optional, §12.6）; installer 更新入口 `ccb-wanding-versions.cmd` OUT→IN（whitelist §6）; §3.5 `verify-update-server` 范围澄清（smoke 非 strict）; §5 pre-TLS http allowlist |
| Pending | **Human ops:** VPS 首包 upload + §12.4 单机冒烟 |

---

## 12. P0 ops runbook (next steps)

> **Status:** Code P1–P4 **done** (2026-06-19). This section is the ops checklist to go live.

### 12.1 Recommended order

```text
1. VPS /updates/ + Nginx (§4.1–4.2)
2. publish-update-bundle.ps1 → first manifest + artifacts
3. One employee PC smoke (§12.4)
4. WanD NSIS env vars (§12.3)
5. Fleet rollout (~10 staff) (§12.5)
6. (Parallel) JWT_SECRET rotation — phase1-jwt-secret-runbook.md
7. (Later) unified-org-sso Phase 2 — openspec/changes/unified-org-sso/
```

### 12.2 First publish — `publish-update-bundle.ps1`

**Script:** `scripts/update/publish-update-bundle.ps1`

**Stage locally (no upload):**

```powershell
cd D:\Projects\claude-code-best

.\scripts\update\publish-update-bundle.ps1 `
  -AionUiExe 'D:\out\AionUi-2.1.18-wanding.1-win-x64.exe' `
  -CcbDistZip 'D:\out\CCB-dist-1.0.4-win-x64.zip' `
  -CcbNsisExe 'D:\out\CCB-Wanding-1.0.4.exe' `
  -CcbVersion '1.0.4' `
  -AionUiVersion '2.1.18-wanding.1' `
  -StagingDir 'D:\publish\updates' `
  -BaseUrl 'http://67.216.206.3/updates'   # switch to https:// after §4.2 TLS
```

**Upload to VPS (scp port 39222):**

```powershell
.\scripts\update\publish-update-bundle.ps1 `
  -AionUiExe '...' -CcbDistZip '...' -CcbNsisExe '...' `
  -CcbVersion '1.0.4' -AionUiVersion '2.1.18-wanding.1' `
  -StagingDir 'D:\publish\updates' `
  -Upload -VpsHost '67.216.206.3' -VpsPath '/var/www/updates' -SshPort 39222
```

**Verify on VPS:**

```bash
curl -s http://67.216.206.3/updates/manifest.json | head -c 400
ls -la /var/www/updates/aionui/ /var/www/updates/ccb/
```

**Wrong vs correct:**

| Wrong | Correct |
|-------|---------|
| Hand-edit `sha256` in manifest | Re-run script — hashes from disk |
| Upload only exe, forget manifest | Always upload full `StagingDir` including `manifest.json` |
| Put org knowledge md in `/updates/` | Org API + shadow sync — [`org-knowledge-phase0-rollout.md`](./org-knowledge-phase0-rollout.md) §4.4 |

### 12.3 WanD packaged build — env vars

Bake into NSIS / installer post-step (or machine-wide env for pilot):

| Variable | Value | Purpose |
|----------|-------|---------|
| `AIONUI_DISABLE_AUTO_UPDATE` | `1` | Block electron-updater → GitHub |
| `AIONUI_UPDATE_MANIFEST_URL` | `https://67.216.206.3/updates/manifest.json` | About → check update (use `http://` only pre-TLS) |
| `CCB_UPDATE_MANIFEST_URL` | same | `ccb-check-update.ps1` unified feed |

**Dev / upstream revert:** `AIONUI_USE_GITHUB_UPDATE=1` on dev machines only.

### 12.4 Smoke test — one employee PC

| # | Step | Pass criteria |
|---|------|----------------|
| 1 | AionUI About →「检查更新」 | Fetches `…/updates/manifest.json`; **no** `api.github.com` |
| 2 | `ccb-installer\scripts\ccb-check-update.ps1 -BackgroundCheck` | `%LOCALAPPDATA%\CCB-Wanding\updates\available.json` written |
| 3 | Temporarily corrupt manifest `sha256` on staging | Download/install **rejected** (fail-closed) |
| 4 | Optional hot path | `internal-upgrade.ps1` on test zip; MCP probe passes |

**Network capture (optional):** Fiddler / DevTools — manifest host only.

### 12.5 Employee rollout checklist (~10 staff)

Per machine (after pilot smoke passes):

| Step | Action |
|------|--------|
| 1 | Install WanD build with §12.3 env (or verify defaults in built-in URLs) |
| 2 | `org-server.json` UTF-8 **no BOM** + full restart — see [`org-knowledge-phase0-rollout.md`](./org-knowledge-phase0-rollout.md) §4.5 |
| 3 | Real org login (`yjc` etc.) → shadow sync + sidebar「组织知识库」 |
| 4 | About check update → sees center version when newer |
| 5 | Tray / scheduled `ccb-check-update -BackgroundCheck` (if enabled in installer) |

**Center knowledge edits:** re-login or `scripts/org-phase0/sync-org-knowledge-shadow.ps1` — **not** gated on software manifest.

### 12.6 Deferred (non-blocking for first ship)

| Item | Notes |
|------|-------|
| `hot_update.max_from_version` | Force full NSIS when installed too new for hot zip |
| `manifest-dev.json` + prerelease toggle | P6 |
| About 双轨 CCB 更新（show + apply via `ccbUpdate.*`） | **Promoted to formal P5 §3.7 (2026-06-21)** — no longer deferred |
| Authenticode signing | Optional hardening |
| Default `isInternalUpdateEnabled()` on non-WanD builds | Use `AIONUI_USE_GITHUB_UPDATE=1` on upstream dev |

---

## 13. Cross-references

- Hot-update file whitelist: [`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md) §16.1
- AionUI client mechanics: [`../frontend/aionui-update-mechanism.md`](../frontend/aionui-update-mechanism.md)
- Org knowledge (separate): [`org-knowledge-phase0-rollout.md`](./org-knowledge-phase0-rollout.md) §4.4
