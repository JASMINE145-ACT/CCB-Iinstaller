# CCB-Wanding 1.1.9 — full NSIS delivery (2026-07-12)

## Artifact

| Item | Value |
|------|-------|
| **Installer** | `ccb-installer\CCB-Wanding-1.1.9.exe` |
| **Size** | 934,738,779 bytes (~891.4 MB) |
| **SHA256** | `5D9645062717805740A56A33FE26B3C86C799083AAD00719866E7F4F3CEA947B` |
| **Built** | 2026-07-12 ~23:58 local (**repack** — packaging/bootstrap fixes) |
| **Prior exe (backup)** | `CCB-Wanding-1.1.9-pre-packfix.exe` (SHA256 `94DE17B1…`, 22:08 build) |
| **dist/VERSION** | `1.1.9` |
| **aioncore** | v0.1.29 embedded (`AionCore\target-1.1.9\release\aioncore.exe` — Length `77224960`) |
| **BUILD-INFO** | skip_aionui_build=true (reuse win-unpacked); packaging fixes in ship scripts/seed |
| **config_generation** | `7` |
| **Log** | `ccb-installer\build-1.1.9-repack-nsis.log` |

## Scope vs 1.1.8

| Area | 1.1.9 change |
|------|----------------|
| **供应商名录** | migration 022/023; REST/MCP/agent; NL normalize; `#/suppliers` UI |
| **Work tasks v2** | RBAC, roster MCP, dashboard/detail, admin envelope |
| **Price / knowledge** | L2 row edit UI; routing increments |
| **Employee / WeCom** | profile staging; WeCom docs link **fleet-hidden** (`CCB_WANDING_WECOM_DEV_DOCS=1` on main → preload) |
| **ACP** | supplier 委派 guards; direct `mcp__` policy |
| **config_generation** | **6 → 7** |

## Build verification (automated)

| Gate | Result |
|------|--------|
| Pre-flight `test-package-health-split.ps1` | **2/2 PASS** |
| Agent eval schema | **80/80 PASS** |
| `cargo test -p aionui-supplier-directory` | **9/9 PASS** |
| `bun test preview.test.mjs` (supplier MCP) | **4/4 PASS** |
| CCB overlay sync | **PASS** |
| Staging validation | **PASS** — supplier MCP + agent present |
| NSIS payload coverage | **PASS** (log message still says “generation 5” seed block; ship manifest **gen 7** in staging) |
| NSIS build | **PASS** — 1 warning LegalCopyright zh-CN |
| code-reviewer (WeCom docs gate) | **PASS** Layer A/B after preload bridge fix |

## Staging spot-check

- `staging\vendor\mcp-servers\supplier-directory\index.mjs` ✅
- `staging\seed\agents\supplier-directory-agent.md` ✅
- `staging\seed\config-ship-manifest.json` → `config_generation: 7` ✅

## Install notes

```powershell
.\ccb-installer\CCB-Wanding-1.1.9.exe /S /D=D:\CCB-Wanding

.\ccb-installer\scripts\test-mcp-health.ps1 -InstallDir D:\CCB-Wanding -Repair -Probe
```

## Manual acceptance

See `ccb-installer/dev-test-checklist-1.1.9.md` (P0–P6).

## Ops

- VPS org aioncore / supplier seed：按需另做（非本包）
- Manifest / VPS 上传：**用户确认跳过**（2026-07-12）— 本地已生成 `ccb-installer/out/manifest-1.1.9.json` 备查，未 scp

## Live install repair (2026-07-12 night) → **repack closed**

Force-synced staging → `D:\CCB-Wanding` after incomplete upgrade. Root causes of **bootstrap exit 1** fixed in source and **rebuilt into** `CCB-Wanding-1.1.9.exe` (23:58):

| Fix | Detail |
|-----|--------|
| Ship scripts | `build-wanding-lib.ps1`, `deploy-session-precipitation-skill.ps1` + seed `ccb-session-precipitation` (NSIS `File` + `scripts\*.*`) |
| Bootstrap false-fail | `Invoke-BootstrapStep` clears `$global:LASTEXITCODE`; sync ends `exit 0` |
| Quick gate | `$requiredSeedSkills` includes `ccb-session-precipitation` |

**Verified:**

| Check | Result |
|-------|--------|
| NSIS rebuild | **EXIT=0** — `build-1.1.9-repack-nsis.log`; SHA256 `5D964506…947B` |
| Staging payload | VERSION/aioncore/lib/precip/LASTEXITCODE markers **0 fails** |
| Full bootstrap (live) | **EXIT=0** — `install-bootstrap-1.1.9-repair4.log` |
| code-reviewer | **PASS** Layer A PASS / Layer B N/A |
| test-agent | **PASS** package-health 2/2 + install-health Platform |

Clean `/S` install of **this** exe should not recur the known bootstrap exit-1 class.

## Git SHAs

| Repo | Commit |
|------|--------|
| claude-code-best | `891d9be2` (+ prior `cc9e3aa0` release prep; packaging repair uncommitted as of repair) |
| aionui-src | `be8ff2c` |
| AionCore | `750e28d` |
