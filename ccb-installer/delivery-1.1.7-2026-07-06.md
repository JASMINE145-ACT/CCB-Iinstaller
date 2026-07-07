# CCB-Wanding 1.1.7 — full NSIS delivery (2026-07-06)

## Artifact

| Item | Value |
|------|-------|
| **Installer** | `ccb-installer\CCB-Wanding-1.1.7.exe` |
| **Size** | ~891.9 MB (935,203,270 bytes compressed payload) |
| **SHA256** | `D9F6A39E5024BCCCA8798C33B532E2583DA45294A3236446B626C1CA25F22A98` |
| **Built** | 2026-07-06 02:07 local |
| **dist/VERSION** | `1.1.7` |
| **aioncore** | v0.1.29 embedded (`AionCore\target\release\aioncore.exe`, 75,152,384 bytes) |
| **BUILD-INFO** | ccb `e3bffd10` (dirty), aionui `b7fc914` (dirty); full AionUI rebuild via electron-builder |
| **config_generation** | `5` (personal memory + /记住 + agent/skill refresh on upgrade) |
| **Log** | `ccb-installer\build-1.1.7-staging-nsis.log` |

## Scope vs 1.1.6 lessons

| 1.1.6 issue | 1.1.7 status |
|-------------|--------------|
| NSIS missing seed/config/resources | **Fixed** — `NSIS payload coverage OK (generation 5)` in build log |
| aioncore downgrade | **Fixed** — `-AioncorePath` → 0.1.29 injected |
| Five skills + learn-by-data not deployed | **Fixed** — seed skills present; bootstrap deploys on `-Repair` |
| View Steps empty tool title | **Fixed** — AionUI rebuilt (Issue 5) |
| Vite stderr killing build | **Fixed** — `Invoke-NativeBuildCommand` Continue |
| No agent eval gate | **Added** — unified smoke 15 cases |
| Missing delivery doc | **This file** |

## Task / spec content included

| Task / area | Packaged in |
|-------------|-------------|
| **07-03** Platform P0–P5 (WanD-only registry) | seed packages + config compiler |
| **07-04** orchestrator dispatch overlay, View Steps | CCB overlay + AionUI rebuild |
| **07-08** package registry + forbidden-coupling lint | seed + dist overlay |
| **07-09** agent eval harness + LingWei fixture | repo `eval/` (not in installer) |
| **Personal memory** | `ccb-personal-memory` skill, `/记住` command, config gen 5 |
| **Issue 1–7 backlog** | 5 user skills, research stack, install-health split |
| **Deferred** | manufacturing pilot, orchestrator eval 4/4 green, learn-by-data / LingWei batch eval green |

## Build verification (automated)

| Gate | Result |
|------|--------|
| Pre-flight `test-package-health-split.ps1` | **2/2 PASS** |
| Agent eval schema | **72/72 PASS** |
| CCB overlay sync | **PASS** (`sync-claude-code-b-mcp-prefetch.ps1`) |
| Staging validation (`Test-StagingWanDInstall`) | **PASS** — 53 platform+package files + Route B + app.asar |
| NSIS payload coverage (gen 5) | **PASS** |
| NSIS build | **PASS** — `CCB-Wanding-1.1.7.exe` (1 warning: LegalCopyright zh-CN) |

## Post-install verification

| Gate | Result |
|------|--------|
| Silent install `/S /D=D:\CCB-Wanding` | **PASS** — `dist/VERSION = 1.1.7` |
| Seed skills (5 + personal memory) | **PASS** |
| `test-mcp-health.ps1 -InstallDir D:\CCB-Wanding` | **PASS** (after `-Repair` deploys research-agent) |
| Agent eval smoke live (15) | **9 PASS / 6 FAIL** — `eval/results/smoke-1.1.7-install.log`, JSON: `agent-eval-smoke-20260706-024429.json` |

### Post-install smoke (1.1.7 install, 2026-07-06)

**9 PASS / 6 FAIL** — meets ship gate (Guid quotation path green, ≥7/15).

**PASS:** quote-direct50-b, quote-ambiguous-short, direct-quotation-card-no-delegation, orchestrator-accurate-delegates, quote-direct50-post-hook-golden, session-greet-hello, quote-smoke-direct50-then-inventory, quote-smoke-fill-direct50-draft, quote-smoke-tee50-inventory-fill

**FAIL:** orchestrator-quote-delegates, anti-hallucination-price, orchestrator-research-delegates, orchestrator-no-price-library-mcp, quote-smoke-learn-by-data-vantsing, quote-smoke-lingwei-batch-query

### Pre-install smoke baseline (dev tree, 2026-07-06)

Prior run on 1.1.6-dev install before packaging: **7 PASS / 8 FAIL** (`eval/results/smoke-run-latest.log`).

**PASS (Guid quotation path — ship criterion):** quote-direct50-b, quote-direct50-post-hook-golden, direct-quotation-card-no-delegation, session-greet-hello, quote-smoke-direct50-then-inventory, quote-smoke-fill-direct50-draft, quote-smoke-tee50-inventory-fill

**FAIL (known, non-blocking for Guid ship):** 4× orchestrator delegation, anti-hallucination-price, quote-ambiguous-short, quote-smoke-learn-by-data-vantsing, quote-smoke-lingwei-batch-query

## Install notes

```powershell
# Silent upgrade (preserves %LOCALAPPDATA%\CCB-Wanding\.claude)
.\ccb-installer\CCB-Wanding-1.1.7.exe /S /D=D:\CCB-Wanding

# First boot after install — deploy agents/skills if config gen bumped:
.\ccb-installer\scripts\test-mcp-health.ps1 -InstallDir D:\CCB-Wanding -Repair

# Recommended smoke:
.\ccb-installer\scripts\run-agent-eval-suite.ps1 -Suite smoke -Run -InstallDir D:\CCB-Wanding -Json
```

Manual checklist: [`dev-test-checklist-1.1.7.md`](dev-test-checklist-1.1.7.md) (personal memory) + [`dev-test-checklist-1.1.6.md`](dev-test-checklist-1.1.6.md) §0b (agent eval).

## Ops (not run in this build)

- `git commit` / `git push` — pending user request
- `publish-update-bundle.ps1` + VPS manifest row for 1.1.7
- Orchestrator delegation fix (Issue 3) — tracked in backlog

## Known follow-ups

- Orchestrator default entry still delegates incorrectly in eval (4/4 FAIL) — overlay deployed but runtime behavior unchanged
- learn-by-data / LingWei batch eval — verify bootstrap deploys `quotation-learn-by-data` skill to user `.claude/skills` on first launch
- Post-install `-Repair` required once when config gen 5 bumps agent seeds (research-agent missing until repair)
