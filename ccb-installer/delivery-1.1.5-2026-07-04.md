# CCB-Wanding 1.1.5 — full NSIS delivery (2026-07-04)

## Artifact

| Item | Value |
|------|-------|
| **Installer** | `ccb-installer\CCB-Wanding-1.1.5.exe` |
| **Size** | ~850.7 MB (892,006,014 bytes) |
| **SHA256** | `60081980FD74950A5BCB93A6A809EBC5C96E5F0F1AD9BB200096746FB42A8341` |
| **Built** | 2026-07-04 01:19 local |
| **dist/VERSION** | `1.1.5` |
| **aioncore** | v0.1.29 embedded (`AionCore\target\release\aioncore.exe`) |
| **BUILD-INFO** | ccb `e3bffd10` (dirty), aionui `b7fc914` (dirty); `skip_aionui_build: true` (AionUI rebuilt manually via `build-with-builder --pack-only` + `electron-builder --dir` before staging) |
| **config_generation** | `3` (agent seeds + hooks refresh on upgrade) |
| **Log** | `ccb-installer\build-1.1.5-staging-nsis.log` |

## Scope decisions (1.1.5)

| Decision | Choice |
|----------|--------|
| P5 manufacturing pilot | **Deferred** — registry snapshot regenerated with `--include-packages com.wanding.trade` only |
| AionUI | **Rebuilt** (MCP health UI + price-library types in aionui-src); staged with `-SkipAionUiBuild` after manual electron-builder due to PowerShell stderr / `$ErrorActionPreference Stop` on Vite warnings |

## Task content included

| Task / area | Packaged in |
|-------------|-------------|
| **07-01 P2-Edit** | `list_price_library_versions`; price-library MCP dist; `price-library-edit` skill; subagent gate hooks (`pre-price-library-data-md-gate`, `post-price-library-confirm-nudge`, `price-library-unpublished`); `price-library-agent` hooks + SOP |
| **07-02** org_session / MCP health UI | aionui `b7fc914` + python admin clients |
| **Platform P2–P4** (local commits, not pushed) | config compiler, control-plane, WanD vertical extract |
| **Excluded** | `com.example.manufacturing-scheduling` package, `scheduling-agent`, `finite-capacity-scheduling` skill |

## Build verification (automated)

| Gate | Result |
|------|--------|
| Staging validation (`Test-StagingWanDInstall`) | **PASS** — 40 platform+package files + Route B + app.asar |
| Staged artifacts | `seed/skills/price-library-edit/SKILL.md`, `vendor/mcp-servers/price-library-server/dist/index.js`, `deploy-price-library-edit-skill.ps1` — present |
| Registry snapshot | WanD-only; `price-library-agent.skills` includes `price-library-edit`; no manufacturing entries |
| Code-review (packaging) | **PASS** ([review](373717a8-c606-4cef-b653-2d993b981c53)) |
| Unit tests (P2-Edit) | **26/26 pass** (prior run in session) |

## Post-install smoke (recommended)

```powershell
# After install to default or D:\CCB-Wanding
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
.\ccb-installer\scripts\smoke-wanding-e2e.ps1 -InstallDir "$env:LOCALAPPDATA\Programs\CCB-Wanding"
```

Manual (P3 still pending): org SSO → **价格库管理** → draft edit with data.Md gate → confirm nudge → publish flow.

## Git commits (this release slice)

- `6b8113e3` — feat(price-library): P2-Edit hooks, list versions, and edit skill
- `fc5c1f7c` — chore(release): 1.1.5 packaging for price-library P2-Edit

## Ops (not run in this build)

- `git push origin main` — 14 commits ahead of last push at build time
- `publish-update-bundle.ps1` + VPS manifest row for 1.1.5
- P3 Guid E2E smoke (`p3-e2e-pending.md`)

## Known follow-ups

- Fix `build-wanding.ps1` AionUI step: wrap `node scripts/build-with-builder.js` in `Invoke-NativeBuildCommand` (Vite stderr currently aborts under `$ErrorActionPreference Stop`)
- Hot-update lib parity: `build-wanding-lib.ps1` missing `price-library-edit` seed + `price-library-server` hot component
