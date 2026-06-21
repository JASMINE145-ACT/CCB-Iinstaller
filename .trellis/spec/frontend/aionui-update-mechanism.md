# AionUI Software Update Mechanism

> How packaged AionUI checks, downloads, and installs updates. Use this when replacing the upstream GitHub/CDN flow with a **custom update server** or bundling AionUI + CCB-Wanding in one manifest.

**Source of truth:** `D:\Projects\aionui-src\packages\desktop\src\` (main + renderer + `electron-builder.yml`).

**Related:** [`dev-test-ship.md`](./dev-test-ship.md) §7 (package exe), [`electron-architecture.md`](./electron-architecture.md) (process layer).

---

## 1. Architecture — dual path

AionUI uses **two independent update paths**. The UI merges them in one modal.

| Path | Check | Download | Install | Typical UI button |
|------|-------|----------|---------|-------------------|
| **Manual** | GitHub Releases API + semver | HTTPS fetch → user `Downloads` folder | User runs installer manually | 「下载」→「打开文件 / 在文件夹中显示」 |
| **Auto** (`electron-updater`) | `latest*.yml` on GitHub Releases | `autoUpdater.downloadUpdate()` | `quitAndInstall()` replaces app + restarts | 「**下载并安装**」 |

```text
Trigger (startup / About / menu)
        │
        ▼
  UpdateModal.tsx
        │
        ├─ ipcBridge.autoUpdate.check ──► autoUpdaterService.ts ──► electron-updater ──► latest.yml
        │
        └─ ipcBridge.update.check ──────► updateBridge.ts ──► GitHub API + CDN URL rewrite
                    │
                    └─ ipcBridge.update.download ──► fetch (CDN primary, GitHub fallback)
```

**Priority at download time:** Manual CDN path first; electron-updater only when GitHub API failed but yml check succeeded (edge case).

---

## 2. File map (aionui-src)

| Concern | Path |
|---------|------|
| Update modal UI | `packages/desktop/src/renderer/components/settings/UpdateModal.tsx` |
| About → Check updates | `packages/desktop/src/renderer/components/settings/SettingsModal/contents/AboutModalContent.tsx` |
| App menu entry | `packages/desktop/src/process/utils/appMenu.ts` → `ipcBridge.update.open.emit` |
| IPC types | `packages/desktop/src/common/update/updateTypes.ts` |
| IPC channels | `packages/desktop/src/common/adapter/ipcBridge.ts` → `update.*`, `autoUpdate.*` |
| **Manual check + download** | `packages/desktop/src/process/bridge/updateBridge.ts` |
| **Internal manifest parse** | `packages/desktop/src/process/bridge/internalUpdateManifest.ts` (add `parseCcbBlock()` — §8.3.1) |
| **CCB dual-track (WanD)** | `packages/desktop/src/process/bridge/ccbUpdateBridge.ts` (**new** — `ccbUpdate.*`; internal-update §3.7) |
| **electron-updater wrapper** | `packages/desktop/src/process/services/autoUpdaterService.ts` |
| Startup init | `packages/desktop/src/index.ts` (~L399–414) |
| Bridge registration | `packages/desktop/src/process/bridge/index.ts` → `initUpdateBridge()` |
| Diagnostics (Sentry) | `packages/desktop/src/process/services/autoUpdateDiagnostics.ts` |
| i18n | `packages/desktop/src/renderer/services/i18n/locales/*/update.json` |
| Packaging / publish | `packages/desktop/electron-builder.yml` → `publish:` |
| Tests | `tests/unit/updateBridgeCdnRewrite.test.ts` |

---

## 3. IPC contracts

### 3.1 Manual update (`update.*`)

| Channel | Direction | Request | Response |
|---------|-----------|---------|----------|
| `update.open` | main → renderer (emitter) | `{ source?: 'menu' \| 'about' }` | opens `UpdateModal` |
| `update.check` | renderer → main | `{ includePrerelease?: boolean; repo?: string }` | `{ success; data?: UpdateCheckResult; msg? }` |
| `update.download` | renderer → main | `{ url; fallbackUrl?; file_name? }` | `{ success; data?: { downloadId; file_path }; msg? }` |
| `update.download.progress` | main → renderer (emitter) | `UpdateDownloadProgressEvent` | throttled progress |

**`UpdateCheckResult`:**

```typescript
{
  currentVersion: string;      // app.getVersion()
  updateAvailable: boolean;    // semver.gt(latest, current)
  latest?: UpdateReleaseInfo;  // tag, body, assets, recommendedAsset
}
```

### 3.2 Auto update (`autoUpdate.*`)

| Channel | Request | Response |
|---------|---------|----------|
| `autoUpdate.check` | `{ includePrerelease?: boolean }` | `{ success; data?: { updateInfo?: { version; releaseDate?; releaseNotes? } }; msg? }` |
| `autoUpdate.download` | `void` | `{ success; msg? }` |
| `autoUpdate.quitAndInstall` | `void` | `void` |
| `autoUpdate.status` | emitter | `AutoUpdateStatus` (`checking` … `downloaded` / `error`) |

---

## 4. Version discovery

### 4.1 Manual path (`updateBridge.ts`)

1. Resolve repo: `params.repo` → env `AIONUI_GITHUB_REPO` → default **`iOfficeAI/AionUi`**
2. `GET https://api.github.com/repos/{repo}/releases` (30s timeout)
3. Filter: not `draft`; optional exclude `prerelease` unless `includePrerelease`
4. Normalize tag → semver (`v2.1.18` → `2.1.18`)
5. Pick highest semver; compare with `app.getVersion()` via `semver.gt`

**Prerelease note:** Dev builds need a prerelease semver in `package.json#version` (e.g. `2.1.18-dev.1234`) for ordering to work — no tag-string heuristics.

### 4.2 Auto path (`electron-updater`)

- Reads **`latest.yml`** (and platform suffixes) from GitHub Releases
- `electron-builder.yml`:

```yaml
publish:
  provider: github
  owner: iOfficeAI
  repo: AionUi
  publishAutoUpdate: true
  releaseType: release
```

- **Channel overrides** (`getUpdateChannel()` in `autoUpdaterService.ts`):

| Platform / arch | `autoUpdater.channel` | Resolved yml |
|-----------------|----------------------|--------------|
| Windows x64 | (default) | `latest.yml` |
| Windows arm64 | `latest-win-arm64` | `latest-win-arm64.yml` |
| macOS arm64 | `latest-arm64` | `latest-arm64-mac.yml` |
| macOS x64 | (default) | `latest-mac.yml` |
| Linux x64 / arm64 | (default) | `latest-linux.yml` / `latest-linux-arm64.yml` |

- `autoDownload = false` (user triggers download); `autoInstallOnAppQuit = true`

---

## 5. Download URLs and CDN

### 5.1 CDN rewrite (manual path)

GitHub asset URLs are rewritten for primary download:

```text
https://static.aionui.com/releases/{version}/{originalAssetName}
```

Example: release `2.1.18`, asset `AionUi-2.1.18-win-x64.exe` →

```text
https://static.aionui.com/releases/2.1.18/AionUi-2.1.18-win-x64.exe
```

Must match `electron-builder.yml`:

```yaml
artifactName: ${productName}-${version}-${os}-${arch}.${ext}
```

Each asset keeps `fallbackUrl` = original `browser_download_url` (GitHub).

### 5.2 Recommended asset selection

`pickRecommendedAsset()` scores assets by platform hints (`win`, `mac`, `linux`) + arch (`x64`, `arm64`) + extension preference:

| OS | Preferred ext |
|----|----------------|
| Windows | `.exe` > `.msi` > `.zip` |
| macOS | `.dmg` > `.zip` |
| Linux | `.deb` > `.rpm` > `.zip` |

Allowed extensions: `.exe`, `.msi`, `.dmg`, `.zip`, `.deb`, `.rpm`

### 5.3 Download security (manual path)

**Allowlisted hosts only** (`ALLOWED_DOWNLOAD_HOSTS`):

- `static.aionui.com`
- `github.com`, `objects.githubusercontent.com`, `github-releases.githubusercontent.com`, `release-assets.githubusercontent.com`

- HTTPS only; redirects followed manually (max 8 hops); each hop re-validated
- File saved under `app.getPath('downloads')` with sanitized name
- Progress via `update.download.progress` (~250ms throttle)

---

## 6. UI flow (`UpdateModal.tsx`)

| Status | Meaning |
|--------|---------|
| `checking` | Both checks in flight |
| `upToDate` | No newer semver |
| `available` | New version; shows release notes (Markdown) |
| `downloading` | Manual or auto download progress |
| `downloaded` | Auto path ready → 「立即安装」→ `quitAndInstall` |
| `success` | Manual path finished → open file / show in folder |
| `error` | Check or download failed |

**Startup:** Packaged app waits **3s**, then `checkForUpdatesAndNotify()`. If update available, `autoUpdate.status` → modal opens automatically.

**Prerelease toggle:** `localStorage['update.includePrerelease'] === 'true'` (manual GitHub filter; auto path uses `setAllowPrerelease` before check).

---

## 7. Lifecycle and guards

### 7.1 When updates run

| Condition | Behavior |
|-----------|----------|
| `app.isPackaged === true` | Auto-updater enabled (unless env guard) |
| Dev (`bun run dev`) | Log: `Skip checkForUpdates because application is not packed` |
| `AIONUI_DISABLE_AUTO_UPDATE=1` | Skip auto-updater init entirely |
| `AIONUI_E2E_TEST=1` or `CI=true` | Skip auto-updater init |

### 7.2 Install (auto)

`autoUpdaterService.quitAndInstall(true, true)` then `app.exit(0)` after 1s on macOS (Squirrel stall workaround).

Diagnostics appended to `{userData}/auto-update-diagnostics.json` (last 20 events); Sentry reads on startup.

---

## 8. Custom update mechanism — extension points

Use this section when replacing upstream GitHub/CDN with your own distribution.

### 8.1 Minimal change (new CDN / repo, same code)

| Change | Where |
|--------|-------|
| GitHub repo | env `AIONUI_GITHUB_REPO` or `DEFAULT_REPO` in `updateBridge.ts` |
| CDN base | `CDN_HOST` / `CDN_BASE_URL` in `updateBridge.ts` |
| Allowlist | `ALLOWED_DOWNLOAD_HOSTS` |
| Publish target | `electron-builder.yml` `publish` + CI release upload |
| Artifact naming | Keep `artifactName` aligned with CDN path convention |

### 8.2 Custom API (drop GitHub API, keep manual download UI)

1. Replace `fetchGitHubReleases()` in `updateBridge.ts` with your manifest endpoint
2. Map response → `UpdateReleaseInfo` / `GitHubReleaseAsset` shape
3. Set `AIONUI_DISABLE_AUTO_UPDATE=1` (or remove startup init) if you do not ship `latest.yml`
4. Reuse `attemptDownload`, progress IPC, and `UpdateModal` manual branch

**Suggested manifest shape:**

```json
{
  "version": "2.1.18",
  "releaseNotes": "## Highlights\n...",
  "publishedAt": "2026-06-14T00:00:00Z",
  "assets": [
    {
      "name": "AionUi-2.1.18-win-x64.exe",
      "url": "https://your-cdn.example.com/aionui/2.1.18/AionUi-2.1.18-win-x64.exe",
      "sha256": "…",
      "size": 123456789
    }
  ]
}
```

Add sha256 verification in `attemptDownload` before marking `completed` (not present upstream — **your addition**).

### 8.3 Full custom (private feed + silent install)

| Option | Approach |
|--------|----------|
| Keep electron-updater | `autoUpdater.setFeedURL({ provider: 'generic', url: 'https://your-server/updates/' })` + host your own `latest.yml` + binaries |
| Fork IPC | New `customUpdate.*` bridge; clone `UpdateModal` state machine |
| CCB bundled | Manifest lists `{ aionuiVersion, ccbDistVersion, urls[] }`; shell update separate from `route-b-sync` (see [`../integration/route-b-sync.md`](../integration/route-b-sync.md)) |

**WanD internal network:** [`../integration/internal-update.md`](../integration/internal-update.md) — unified `manifest.json`, VPS feed, CCB hot-update + AionUI exe; whitelist §16.

**Do not confuse:**

- **AionUI exe update** — this document
- **CCB-Wanding dist / route-b** — `ccb-installer/scripts/sync-aionui-ccb-route-b.ps1`; hot-swappable without reinstalling AionUI if only ACP slot changed

### 8.3.1 WanD About 双轨 — AionUI + CCB (`ccbUpdate.*`) — 2026-06-21

> Spec of record: [`../integration/internal-update.md`](../integration/internal-update.md) **§3.7** (full contract). This section is the frontend touch-list.

WanD packaged build manages **both** tracks from one About panel:

| Track | Path | Notes |
|-------|------|-------|
| AionUI | existing `update.*` → `updateBridge.ts` | In WanD build, **skip** GitHub/electron-updater `autoUpdate.check`; fetch internal `manifest.aionui` only (`isInternalUpdateEnabled`). Avoid dual-source. |
| CCB | **new** `ccbUpdate.*` → `ccbUpdateBridge.ts` | Parse `manifest.ccb` (`parseCcbBlock()` in `internalUpdateManifest.ts`); main-process download + sha256 → `spawn internal-upgrade.ps1`. Renderer never fetches the zip URL. |

**Frontend files to touch (Phase 2 / P5):**

- `process/bridge/ccbUpdateBridge.ts` (**new**) — `ccbUpdate.check` / `apply` / `getInstalledVersion`; register in `process/bridge/index.ts`.
- `process/bridge/internalUpdateManifest.ts` — add `parseCcbBlock()` (today `ccb?: unknown` is raw passthrough).
- `common/adapter/ipcBridge.ts` + `common/update/updateTypes.ts` — `ccbUpdate.*` channel + result types.
- `renderer/components/settings/UpdateModal.tsx` — two rows (AionUI / 万鼎后端) + 「全部更新」; CCB success → 「请完全退出并重新打开 WanD」.
- `renderer/.../AboutModalContent.tsx` — read-only **万鼎后端版本** (`ccbUpdate.getInstalledVersion` → `dist/VERSION`).
- `install_mode: 'bundled'` (manifest §2.3) → AionUI download target becomes `manifest.ccb.full_installer` (merged NSIS), not standalone `AionUi-*.exe`.

Security/contract: reuse `ALLOWED_DOWNLOAD_HOSTS` + sha256 verify (same as §8.4); pre-TLS must allow `http://67.216.206.3` (internal-update §5).

### 8.4 Wrong vs correct

#### Wrong — arbitrary download URL from renderer

```typescript
// Never bypass allowlist in renderer
await fetch(userSuppliedUrl);
```

#### Correct — main-process bridge with host allowlist

```typescript
// updateBridge.ts — assertAllowedUrl before fetch
await ipcBridge.update.download.invoke({ url: manifestAsset.url, file_name: manifestAsset.name });
```

---

## 9. Validation & error matrix

| Condition | Symptom | Notes |
|-----------|---------|-------|
| Dev mode | No update prompt | Expected — not packaged |
| GitHub API 403/timeout | Manual check fails; may still have auto path | Check network / rate limit |
| No compatible asset | Warning + link to release page | `pickRecommendedAsset` returned undefined |
| CDN 404 | Fallback to GitHub `browser_download_url` | Log: `[updateBridge] Primary download failed … Retrying with fallback` |
| Auto check OK, manual failed | 「下载并安装」uses electron-updater | By design in `UpdateModal.startDownload` |
| Wrong arch installer | Should not happen if asset scoring works | Verify `artifactName` includes `${arch}` |
| macOS install stuck | Process survives after quitAndInstall | Upstream uses forced `app.exit(0)` |

---

## 10. Tests

| Test | Command | Asserts |
|------|---------|---------|
| CDN rewrite + asset pick | `bun run test -- tests/unit/updateBridgeCdnRewrite.test.ts` | URL rewrite, platform scoring |
| Bridge init | Covered indirectly via unit tests on exported helpers | `pickRecommendedAsset`, `rewriteAssetUrlToCDN` |

Manual smoke (packaged exe):

1. Lower `package.json` version locally **or** use a machine on an old release
2. About → 检查更新 → modal shows newer version + release notes
3. 「下载并安装」→ progress → restart on new version **or** manual path → file in Downloads

---

## 11. Environment variables

| Variable | Effect |
|----------|--------|
| `AIONUI_GITHUB_REPO` | Override `owner/repo` for manual check |
| `AIONUI_DISABLE_AUTO_UPDATE=1` | Disable electron-updater startup + init |
| `AIONUI_UPDATE_MANIFEST_URL` | WanD: unified manifest (see [`../integration/internal-update.md`](../integration/internal-update.md)) |
| `AIONUI_UPDATE_MANIFEST_DEV_URL` | WanD: dev channel manifest |
| `AIONUI_E2E_TEST=1` | Same as disable (E2E) |
| `CI` / `GITHUB_ACTIONS` | Disable auto-updater in CI |

---

## 12. Refresh policy

Update this doc when:

- Changing CDN host, repo default, or allowlist (`updateBridge.ts`)
- Changing `publish` / channel strategy (`electron-builder.yml`, `getUpdateChannel`)
- Adding new IPC channels or altering `UpdateModal` flow
- Shipping a custom update server for CCB-Wanding deployments → [`../integration/internal-update.md`](../integration/internal-update.md)

**Recorded:** 2026-06-14 — exploration for custom update mechanism (upstream dual-path documented from `aionui-src`).  
**Recorded:** 2026-06-19 — WanD formal scheme: center manifest v1; GitHub/CDN disabled for employees.
