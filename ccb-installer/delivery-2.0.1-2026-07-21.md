# CCB-Wanding 2.0.1 — Full NSIS delivery (2026-07-21)

## Artifact

| Item | Value |
|------|-------|
| **Installer** | `ccb-installer\CCB-Wanding-2.0.1.exe` |
| **Size** | 939,954,018 bytes (~896.4 MB) |
| **SHA256** | `C1AAF61640AA36F00C68ACB91E82532EE860F7566A7FED0C546AC8146115AAF2` |
| **Built** | 2026-07-21 ~16:16 local |
| **dist/VERSION** | `2.0.1` |
| **aioncore** | v0.1.29 embedded (injected from `AionCore\target\release\aioncore.exe`, Length `77550080`, mtime 2026-07-18) |
| **AionUi** | `-SkipAionUiBuild` — reused pre-existing win-unpacked (includes 2.0.0 InstallDir resolve) |
| **config_generation** | **9** (was 8) |
| **Log** | `ccb-installer\build-2.0.1-full.log` |
| **Task** | `.trellis/tasks/07-21-release-2.0.1` |
| **Feature matrix** | `.trellis/tasks/07-21-release-2.0.1/feature-matrix-2.0.1.md` |
| **BUILD_EXIT** | **0** |

## Headline vs 2.0.0

| Area | 2.0.1 change |
|------|----------------|
| **安装兼容（保留）** | `WANd.INSTALL.STALE_PURGE.001` + `WANd.INSTALL.RESOLVE.001` **同包保留** — DirectoryLeave / silent Call / Start Menu list+purge / `$shipScripts` |
| **config_generation** | **8 → 9** — refresh agents/skills (quotation L1, learn-by-data select-first, accurate ROE, …) |
| **报价** | learn-by-data select-first；多码库存 batch；field-rule `/` 短语解析（Elbow 3"） |
| **Accurate** | readonly / ROE profile 收敛 |
| **Registry** | `quotation-agent` package `skills: []` 与 frontmatter 对齐（on-demand Skill；sidecar 仍 enable learn-by-data） |

## Preflight / build gates

| Gate | Result |
|------|--------|
| `test-purge-packaging-wiring.ps1` | **PASS** |
| `build-package-registry.mjs` | **0 errors** after skills drift fix |
| Staging validation | **PASS** (58 platform+package + Route B + app.asar) |
| NSIS payload coverage | **PASS** |
| makensis | **PASS** (1 warning LegalCopyright zh-CN — same as 2.0.0) |

## Staging spot-check (install compat + delta)

| Check | Result |
|-------|--------|
| `staging\dist\VERSION` = 2.0.1 | ✅ |
| `staging\seed\config-ship-manifest.json` gen **9** | ✅ |
| `purge-stale` / `find` / `repair` under `staging\scripts\` | ✅ |
| `ccb-purge-stale-installs.cmd` / `ccb-list-installs.cmd` | ✅ |
| `quotation-learn-by-data\SKILL.md` | ✅ |

## Install notes

```powershell
# Fully quit AionUI (tray) first.
.\CCB-Wanding-2.0.1.exe
# silent (IT pre-approves stale purge):
.\CCB-Wanding-2.0.1.exe /S

$INSTALL = "$env:LOCALAPPDATA\Programs\CCB-Wanding"
.\ccb-check-install.cmd
# Expect VERSION 2.0.1 and .config-generation.json → 9 after bootstrap reset
```

### Verify install self-heal (unchanged from 2.0.0)

1. Dual-tree residue → DirectoryLeave prompt (or `/S` auto-purge)
2. Start Menu → List Installs / Purge Stale Installs
3. Update panel should resolve Programs tree InstallDir

## Manual acceptance (other PC)

- [ ] Cold or upgrade install → check-install OK · gen 9 · VERSION 2.0.1
- [ ] Stale-purge still behaves as 2.0.0
- [ ] Guid：按数据学习 / 多码查库存 smoke（optional）

## Build flags used

```text
build-wanding.ps1 -Version 2.0.1
  -AioncorePath ...\aioncore.exe
  -SkipAionUiBuild
```
