# CCB-Wanding 2.0.0 — Full NSIS delivery (2026-07-18)

## Artifact

| Item | Value |
|------|-------|
| **Installer** | `ccb-installer\CCB-Wanding-2.0.0.exe` |
| **Size** | 939,916,550 bytes (~896.4 MB) |
| **SHA256** | `67D427CB76266AA7F4D0D31A239D8A1B520FE5321FC9C3D0C1300AA2E3F02A54` |
| **Built** | 2026-07-18 ~03:17 local |
| **dist/VERSION** | `2.0.0` |
| **aioncore** | v0.1.29 embedded (`AionCore\target\release\aioncore.exe`, Length `77550080`, built 2026-07-18 00:30) |
| **BUILD-INFO** | `skip_aionui_build=false` · `skip_build=false` · Full NSIS |
| **config_generation** | **8** (was 7) |
| **Log** | `ccb-installer\build-2.0.0-full.log` · aioncore `build-2.0.0-aioncore.log` |
| **Task** | `.trellis/tasks/07-18-release-2.0.0` |
| **Feature matrix** | `.trellis/tasks/07-18-release-2.0.0/feature-matrix-2.0.0.md` |

## Headline vs 1.1.9

| Area | 2.0.0 change |
|------|----------------|
| **安装自愈（头等）** | `DirectoryLeave` stale-purge + Start Menu list/purge cmds + desktop InstallDir resolve（Programs + registry）**同包** |
| **config_generation** | **7 → 8** — retire `supplier-directory-agent`/`cowork`/`word-form-creator`; refresh skills/agents |
| **Word DocumentSpec** | `lib/wand-document-spec` + office-word MCP hook shipped |
| **Precipitation / memory / deep-research** | seed skills in `$requiredSeedSkills` + staging |
| **价库 / 报价 / 供应商 / work-tasks** | MCP + aioncore + UI full bundle |
| **aionui** | Full rebuild（含 resolve、workspace-todo、PlanChecklist 等 WIP） |

## Build verification (automated)

| Gate | Result |
|------|--------|
| Phase 0 feature matrix | **DONE** — all F0–F11 IN except F11 eval OUT |
| `test-purge-packaging-wiring.ps1` | **PASS** |
| `test-purge-stale-wanding-installs.ps1` | **PASS** (7 behavioral + pack wiring) |
| aionui vitest (resolve + readiness + workspace + plan) | **19/19 PASS** |
| python (dispatch + learn-by-data + section D + mutate) | **PASS** after fixture/path/isolation fixes |
| aioncore `cargo build --release` | **PASS** |
| aionui-auth `t7_4_me_context_success` | **PASS** (assertion aligned to `self` scope) |
| CCB overlay sync | **PASS** |
| CCB `bun test src/services/acp/__tests__` | **249 pass / 12 fail** — known stale tests vs intentional product (AUQ deny-by-design; `agent.test.ts` not in overlay; env path for registry; dead `sessionGateHooks.ts` not in ship graph). **Non-blocking for ship.** |
| Staging validation (build) | **PASS** — 53 platform+package files + Route B + app.asar |
| NSIS payload coverage | **PASS** (log still says “generation 5” seed block; ship manifest **gen 8** in staging) |
| NSIS `makensis` | **PASS** — 1 warning LegalCopyright zh-CN |
| BUILD_EXIT | **0** |
| code-reviewer (config_gen 7→8) | **PASS** Layer A N/A · Layer B N/A |
| code-reviewer (python test fixes) | **PASS** |
| code-reviewer (auth test assertion) | **PASS** |

## Staging spot-check (four-chain)

| Check | Result |
|-------|--------|
| `staging\seed\config-ship-manifest.json` → gen **8** | ✅ |
| `staging\seed\agents\retired-agent-ids.json` | ✅ cowork / word-form-creator / supplier-directory-agent |
| `$shipScripts` purge/find/repair | ✅ under `staging\scripts\` |
| `ccb-purge-stale-installs.cmd` / `ccb-list-installs.cmd` | ✅ staging root |
| 6 required seed skills SKILL.md | ✅ |
| `lib/wand-document-spec/.../mcp_register.py` | ✅ |
| DocumentSpec tools importable from staging site-packages | ✅ 5 tools |
| `price_library_main.py` (Symptom B path) | ✅ |
| MCP: price/quotation/supplier/work-tasks/office-word/excel | ✅ (`work-tasks-agent` name) |
| aioncore injected | ✅ 77,550,080 bytes |

### Staging `test-mcp-health -Probe` notes (expected)

Against staging (not a live `$INSTALL`), these FAILs are **expected** and not ship blockers:

- `.env.accurate` missing — created by `ensure-wanding-settings` at install/bootstrap（not in package）
- settings MCP paths still pointing at live `D:\CCB-Wanding` when probing from staging
- bare `node` for supplier-directory / work-tasks-agent — known portability risk（accepted, tracked）

## Install notes (other machine)

```powershell
# Prefer official Programs path. Fully quit AionUI (incl. tray) first.
.\CCB-Wanding-2.0.0.exe
# or silent (IT pre-approves stale purge):
.\CCB-Wanding-2.0.0.exe /S

# After install:
$INSTALL = "$env:LOCALAPPDATA\Programs\CCB-Wanding"
.\ccb-check-install.cmd
# or:
powershell -File "$INSTALL\scripts\test-install-health.ps1" -InstallDir $INSTALL
powershell -File "$INSTALL\scripts\test-mcp-health.ps1" -InstallDir $INSTALL -Repair -Probe -Session
```

### Verify install self-heal

1. If dual-tree residue exists: installer `DirectoryLeave` prompt (or `/S` auto-purge).
2. Start Menu → **List Installs** / **Purge Stale Installs**.
3. Update panel should no longer show 「无法读取当前安装版本信息」when only the Programs tree remains.
4. Check Install: `.config-generation.json` should read **8** after first bootstrap reset.

### Symptom B if still failing after clean install

```powershell
& "$INSTALL\scripts\ensure-wanding-settings.ps1" -InstallDir $INSTALL -ConfigDir "$env:LOCALAPPDATA\CCB-Wanding\.claude"
```

If price-library paths still missing → packaging gap（H2）; file a bug with Check Install output.

## Manual acceptance (other PC)

- [ ] Clean cold install → `ccb-check-install` OK · gen 8
- [ ] Upgrade path 1.1.9 → 2.0.0（if available）
- [ ] Update panel smoke（Symptom A）
- [ ] Guid Word 助手 / DocumentSpec smoke（Symptom B related）
- [ ] Dual-tree field evidence → **deferred to IT**（not ship-blocking）

## Git SHAs (at build)

| Repo | Commit | Dirty |
|------|--------|-------|
| claude-code-best | `27661c4e` | yes（release WIP） |
| aionui-src | `878630a` | yes（BUILD-INFO） |
| claude-code-B | `e3bffd10` | yes（overlay synced） |
| AionCore | `750e28d` (+ WIP migrations/auth) | yes |

## §6.9

Any packaging fix after this exe → **must repack** and refresh SHA256. Do not ship a patched staging without a new exe.
