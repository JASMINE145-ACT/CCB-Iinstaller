# Phase 2.1 Exploration — Vendor Sync Optimization Backlog

> Task: `06-30-full-system-review` · subtask: Phase 2.1 backlog exploration  
> Date: 2026-07-02 · Method: system-reviewer read-only code + spec audit (post INT-P1-9/INT-P1-10 closures)  
> Prerequisite: [`phase-02-vendor-sync-optimization-review.md`](./phase-02-vendor-sync-optimization-review.md) (7.5/10, 2026-06-30)

---

## Executive summary

- **Phase 2 (Option C) is correctly implemented** — `start-dev-full.ps1` calls `sync-dev-wanding-vendor.ps1` after route-b sync; `VendorUpdateSettings` defaults `$true`; skills/hooks deploy and post-sync `data.Md` preflight are in place (INT-P1-10 closed).
- **INT-P1-7 remains the highest-impact open gap** — dev sync still uses a 6-file hardcoded whitelist while `build-wanding.ps1` ships `data\*.md` (minus 2-name denylist) + all `data\*.xlsx`. At minimum **3 ship-required files** still skip dev sync: `ccb-wanding-accurate.md`, `wanding_price_lib.xlsx`, `空白标准报价单.xlsx`; plus `wanding-matching-architecture.md`.
- **INT-P1-6 (`-Strict`) is unimplemented** — fingerprints print Red/MISSING but script always exits 0 (`sync-dev-wanding-vendor.ps1` L125–136); `start-dev-full` has no `-VendorStrict` passthrough.
- **INT-P1-9 partially overlaps INT-P1-7** — `data.Md` was added to the hardcoded list and post-sync preflight; it does **not** close glob parity or auto-ship new SOP `.md` files.
- **All other Phase 2.1 items (INT-P2-3 through INT-P2-9, INT-P1-8, INT-P2-6) remain open** with evidence unchanged or only partially mitigated by INT-P1-10 additions.

---

## Status table — all Phase 2.1 IDs

| ID | Item | Status | Evidence | Gap vs ship/build | Recommended approach | Risk if deferred | Effort |
|----|------|--------|----------|-------------------|----------------------|------------------|--------|
| **INT-P1-7** | Dev data align build glob (md denylist + all xlsx) | **open** | `sync-dev-wanding-vendor.ps1` L71–89 hardcoded 6 files vs `build-wanding.ps1` L531–544 glob | 4+ files ship but dev skips (see Deep dive A) | Replace hardcoded loop with shared denylist+glob block (or dot-source helper) | accurate-agent / fill-template / legacy price lib drift in dev | **low–medium** |
| **INT-P1-6** | `-Strict` fingerprints + `-VendorStrict` passthrough | **open** | Fingerprints L117–136 print only, no `exit 1`; no `-Strict` param; `start-dev-full.ps1` L137–150 no `-VendorStrict` | Dev can pass sync + HDPE smoke but live vendor stale on non-fingerprinted files | Add `[switch]$Strict`; track Red/MISSING; `exit 1` if any fail; passthrough from `start-dev-full` | Silent stale vendor; false confidence after sync | **low** |
| **INT-P1-8** | Spec closure (outline, dev-test-ship, playbook §4.3/4.5) | **open** (partial) | `outline.md` L39 no `-SkipVendorSync`; `dev-test-ship.md` no vendor-sync symptom row; `dev-sync-playbook.md` §4.3 L182–187 manual list stale; §4.5 L203–207 still mentions work-tasks launcher | Operators miss skip flag / vendor symptoms; manual fallback omits ship-required files | Doc-only: add symptom rows, update §4.3 to reference glob rule, fix §4.5 | Onboarding friction; repeated「synced but wrong」debug | **low** |
| INT-P1-9 | `data.Md` in dev vendor sync whitelist | **closed** | `sync-dev-wanding-vendor.ps1` L60, L75, L121; `start-dev-full.ps1` L152–153 post-sync preflight | — (subsumed by INT-P1-7 for full parity) | N/A | N/A | done |
| INT-P1-10 | `start-dev-full` default VendorUpdateSettings + skills/hooks | **closed** | `start-dev-full.ps1` L39 `$VendorUpdateSettings = $true`; L177–188 skills+hooks; L156–167 deploy-seed-agents | — | N/A | N/A | done |
| **INT-P2-4** | Warn invalid `-SkipVendorSync` + smoke/settings combo | **open** | `start-dev-full.ps1` L137–138 skips vendor block; L145–146 never reached when skip; no warn | User thinks `-VendorSmoke` ran when it did not | After param parse: `if ($SkipVendorSync -and ($VendorSmoke -or $VendorUpdateSettings)) { Write-Warning ... }` | Wasted debugging time on「smoke passed」assumption | **trivial** |
| **INT-P2-3** | Option E: drift-only skip robocopy | **open** | No drift gate; L66–100 always robocopy/copy | Every dev start pays full robocopy cost (~seconds) | Pre-sync fingerprint pass; if all Green skip copies; flag `-SkipRobocopyIfFresh` (opt-in first) | Minor daily latency only | **medium** |
| **INT-P2-7** | Python robocopy `/XD tools` align ship | **open** | `sync-dev-wanding-vendor.ps1` L66–69 no `tools`; `build-wanding.ps1` L523–526 has `/XD tools` | Orphan `python/tools/` files may linger in dev vendor | Add `"/XD", "tools"` to dev python robocopy args | Stale tooling scripts in vendor path | **low** |
| **INT-P2-5** | `ensure-wanding-settings` exit check | **open** | `sync-dev-wanding-vendor.ps1` L109–114 calls `& $ensure` with no `$LASTEXITCODE` check | Settings refresh can fail silently while sync reports success | `if ($LASTEXITCODE -ne 0) { throw ... }` after ensure call | Stale MCP env / wrong `AIONUI_APPDATA_PROFILE` in settings.json | **trivial** |
| **INT-P2-8** | Vendor sync write bootstrap log | **open** | `$logFile` L105 only passed to bootstrap L123; vendor block L140–151 writes to console only | Post-mortem chain gaps when vendor step fails mid-run | `Start-Transcript` append or `Add-Content $logFile` around vendor call | Harder incident triage | **trivial** |
| **INT-P2-9** | Preflight vs sync order | **open** (partial) | Preflight L77–96 before vendor L137–154; checks live vendor paths exist | Fresh/corrupt install fails preflight before sync can heal | Warn-only for optional paths OR move data.Md check post-sync only (already L152–153) | Rare first-run friction | **low** |
| INT-P2-6 | `Invoke-ChildScript` helper | **open** | Four identical `LASTEXITCODE` blocks in `start-dev-full.ps1` | Code duplication only | Extract 5-line helper | None functional | **low** (P3) |

---

## Obsolescence check — INT-P1-9 / INT-P1-10 impact

| Closure | What it fixed | What remains open |
|---------|---------------|-------------------|
| **INT-P1-9** (`data.Md`) | Added `data.Md` to hardcoded copy list + fingerprint + post-sync preflight | **INT-P1-7 still open** — glob parity, `ccb-wanding-accurate.md`, xlsx templates, new `.md` auto-sync |
| **INT-P1-10** (defaults + deploy) | `VendorUpdateSettings=$true`; deploy-seed-agents; deploy-ccb-skills; patch-subagent-gate-hooks | Does not obsolete any other Phase 2.1 ID; supersedes original exploration note「don't default UpdateSettings」 |

**No Phase 2.1 item is fully obsolete.** INT-P1-9 is a subset fix inside INT-P1-7's scope.

---

## Deep dive A — INT-P1-7 data glob parity

### Ship staging logic (authoritative)

```531:544:ccb-installer/scripts/build-wanding.ps1
# Ship ALL data\*.md except the spec §5.4 "Exclude data" denylist, so a newly added
# SOP / knowledge md auto-ships instead of being silently dropped by a stale hardcoded list.
$dataMdDenylist = @(
    'ccb-wanding-update-server.md',
    'ccb-wanding-pricing-system.md'
)
Get-ChildItem -LiteralPath $dataRoot -Filter '*.md' -ErrorAction SilentlyContinue | ForEach-Object {
    if ($dataMdDenylist -notcontains $_.Name) {
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $dataDest $_.Name) -Force
    }
}
Get-ChildItem -LiteralPath $dataRoot -Filter '*.xlsx' | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $dataDest $_.Name) -Force
}
```

Build also **requires** these at validation time (L326–341): `price_library_cleaned_2026_05_15.xlsx`, `wanding_price_lib.xlsx`, `ccb-wanding-accurate.md`, `data.Md`, plus a third xlsx blank template.

### Dev sync logic (current)

```71:89:ccb-installer/scripts/sync-dev-wanding-vendor.ps1
$dataFiles = @(
    "price_library_cleaned_2026_05_15.xlsx",
    "mapping_table.xlsx",
    "wanding_business_knowledge.md",
    $dataMdBasename,
    "ccb-wanding-quotation.md",
    "ccb-wanding-claude-index.md"
)
foreach ($name in $dataFiles) {
    $srcFile = Join-Path $RepoRoot "data\$name"
    if (Test-Path -LiteralPath $srcFile) {
        ...
        Copy-Item -LiteralPath $srcFile -Destination (Join-Path $dataDst $name) -Force
```

### File-by-file parity matrix

| Repo `data/` artifact | Ships (`build-wanding`) | Dev sync | Impact if missing in dev |
|----------------------|-------------------------|----------|--------------------------|
| `price_library_cleaned_2026_05_15.xlsx` | ✓ required + glob | ✓ | — |
| `mapping_table.xlsx` | ✓ optional + glob | ✓ | mapping-based fuzzy degraded |
| `wanding_business_knowledge.md` | ✓ + glob | ✓ | — |
| `data.Md` | ✓ required + glob | ✓ (INT-P1-9) | — |
| `ccb-wanding-quotation.md` | ✓ + glob | ✓ | — |
| `ccb-wanding-claude-index.md` | ✓ + glob | ✓ | — |
| **`ccb-wanding-accurate.md`** | ✓ required + glob | **✗** | **accurate-agent** SOP missing |
| **`wanding_price_lib.xlsx`** | ✓ required + glob | **✗** | legacy price fallback broken |
| **`空白标准报价单.xlsx`** | ✓ required (3rd xlsx) + glob | **✗** | **`fill_quotation_sheet` / VANTSING template** missing |
| `wanding-matching-architecture.md` | ✓ glob | **✗** | architecture doc drift (lower runtime risk) |
| `ccb-wanding-pricing-system.md` | denylist | correctly skipped | — |
| `ccb-wanding-update-server.md` | denylist | correctly skipped | — |
| `*.json` (`_supplier_example_tmp.json`, etc.) | neither | neither | intentional |

> **Note:** `data/*.xlsx` are gitignored (`.gitignore` L57–61) but whitelisted; presence depends on build machine. Dev parity must still glob-copy when present.

### `build-wanding-lib.ps1` divergence

`Stage-WandingHotData` (L219–238) uses a **hardcoded md list** + xlsx glob — closer to dev than `build-wanding.ps1` but **not** the denylist pattern. Hot-update path would also miss new SOP `.md` files. INT-P1-7 fix should target **both** `sync-dev-wanding-vendor.ps1` and eventually `Stage-WandingHotData` for consistency.

### Proposed minimal PowerShell pattern

**Option 1 (recommended):** New shared helper `ccb-installer/scripts/lib/sync-wanding-data.ps1`:

```powershell
function Copy-WandingDataFromRepo {
    param([string]$RepoRoot, [string]$DataDest)
    $dataRoot = Join-Path $RepoRoot 'data'
    $dataMdDenylist = @('ccb-wanding-update-server.md', 'ccb-wanding-pricing-system.md')
    New-Item -ItemType Directory -Force -Path $DataDest | Out-Null
    Get-ChildItem -LiteralPath $dataRoot -Filter '*.md' -ErrorAction SilentlyContinue | ForEach-Object {
        if ($dataMdDenylist -notcontains $_.Name) {
            Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $DataDest $_.Name) -Force
            Write-Host "[copy] data\$($_.Name)"
        }
    }
    Get-ChildItem -LiteralPath $dataRoot -Filter '*.xlsx' -ErrorAction SilentlyContinue | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $DataDest $_.Name) -Force
        Write-Host "[copy] data\$($_.Name)"
    }
}
```

Dot-source from `sync-dev-wanding-vendor.ps1` and `build-wanding.ps1` (replace L531–544 inline block).

**Option 2 (minimal diff):** Inline-copy the L531–544 block into `sync-dev-wanding-vendor.ps1` replacing L71–89 — fastest, but duplicates logic.

**Acceptance:** After sync, `Get-ChildItem repo\data\*.md` (minus denylist) + `*.xlsx` basename set equals live `vendor\wanding\data\` set.

---

## Deep dive B — INT-P1-6 `-Strict` fingerprints

### Current behavior

```117:136:ccb-installer/scripts/sync-dev-wanding-vendor.ps1
Write-Host "`n=== fingerprints ===" -ForegroundColor Cyan
$checks = @(
    (New-SyncFingerprintCheck 'wanding_fuzzy_matcher.py' ...),
    (New-SyncFingerprintCheck 'price_library_cleaned' ...),
    (New-SyncFingerprintCheck $dataMdBasename ...),
    (New-SyncFingerprintCheck 'org_knowledge_client.py' ...),
    (New-SyncFingerprintCheck 'org_http_csrf.py' ...)
)
foreach ($c in $checks) {
    ...
    $match = ($r.Length -eq $l.Length) -and ($r.LastWriteTime -ge $l.LastWriteTime.AddSeconds(-2))
    ...
    else { Write-Host ("[{0}] MISSING ...") -ForegroundColor Red }
}
# script ends exit 0 regardless
```

### Proposed design

| Concern | Design choice |
|---------|---------------|
| **When to fail** | After all copy/robocopy steps, re-run fingerprint loop; any Red or MISSING → `exit 1` **only if `-Strict`** |
| **Default behavior** | Unchanged — print colors, exit 0 (backward compatible) |
| **`-VendorStrict` on launcher** | `start-dev-full.ps1` new `[switch]$VendorStrict`; pass `-Strict` into `sync-dev-wanding-vendor.ps1` |
| **Interaction with `-Smoke`** | Smoke already throws on failure; `-Strict` is orthogonal (catches files smoke doesn't touch, e.g. `org_http_csrf.py`) |
| **Interaction with Option E** | If robocopy skipped because fresh, fingerprints should already be Green; if Green→skip→no copy, re-check still Green. If repo changed between check and skip (race), `-Strict` final pass catches drift |
| **Missing repo file** | MISSING on required fingerprint → Red under `-Strict`; optional repo files (e.g. mapping_table) should not be in strict set |

### Implementation sketch

```powershell
# sync-dev-wanding-vendor.ps1
param(..., [switch]$Strict)
$strictFailures = @()
# in fingerprint loop:
if (-not $match -or -not (Test-Path ...)) { $strictFailures += $c.Label }
if ($Strict -and $strictFailures.Count -gt 0) {
    Write-Host "[strict] fingerprint failures: $($strictFailures -join ', ')" -ForegroundColor Red
    exit 1
}
```

```powershell
# start-dev-full.ps1
[switch]$VendorStrict
if ($VendorStrict) { $vendorArgs.Strict = $true }
```

**CI / daily recommendation:** Document `-VendorStrict` for release-candidate dev sessions; keep default permissive for fast UI iteration **with** `-SkipVendorSync`.

---

## Deep dive C — INT-P2-3 Option E drift gate

### Goal

Skip expensive robocopy when repo↔live already aligned on key fingerprints — save ~3–15s per `start-dev-full` invocation.

### Proposed lightweight design

```text
┌─────────────────────────────────────┐
│ Test-FingerprintDrift (pre-sync)    │
│  5 checks: same as current set      │
└──────────────┬──────────────────────┘
               │
     all Green?├──Yes──► [-SkipRobocopyIfFresh] skip L66–100 copies
               │          still run UpdateSettings/Smoke if requested
               └──No───► full robocopy (current path)
               │
               ▼
     post-sync fingerprints (existing)
               │
     [-Strict] └── any Red/MISSING → exit 1
```

### Fingerprints to gate on

Use **existing 5 checks** (L118–124) — proven stable, already maintained:

1. `wanding_fuzzy_matcher.py` (python drift proxy)
2. `price_library_cleaned_2026_05_15.xlsx`
3. `data.Md`
4. `org_knowledge_client.py`
5. `org_http_csrf.py`

**Do not gate on MCP dist** in v1 — not fingerprinted today; skipping MCP robocopy without check risks quotation MCP drift.

### Steps skippable when fresh

| Step | Skip when fresh? | Rationale |
|------|------------------|-----------|
| Python robocopy L66–69 | ✓ | fingerprinted via fuzzy_matcher + org_* |
| Data copy L71–89 | ✓ | fingerprinted via price_lib + data.Md |
| Quotation MCP dist L91–94 | **✗ v1** | no fingerprint |
| Price-library MCP dist L96–100 | **✗ v1** | no fingerprint |
| node_modules junction L102–107 | ✓ if dest exists | idempotent |
| UpdateSettings / Smoke | Never skip | side effects required |

### CLI flag

- **`-SkipRobocopyIfFresh`** on `sync-dev-wanding-vendor.ps1` (opt-in)
- Optional passthrough `-VendorFast` on `start-dev-full` (future default candidate)

### False positive / negative risks

| Risk | Type | Mitigation |
|------|------|------------|
| mtime skew >2s across machines | false **positive** (unnecessary copy) | Widen tolerance or add optional hash mode later |
| Same size+mtime, different content (rare) | false **negative** (skip when stale) | `-Strict` final pass; document「touch file → force sync」 |
| New data file not in fingerprint set (accurate.md) | false **negative** | **Blocked until INT-P1-7** — glob copy must run when data set changes; Option E should compare **file count** or include accurate.md fingerprint after P1-7 |
| First install / MISSING live | false skip attempt | If any check MISSING → never skip |
| User deleted live file manually | MISSING → full sync | correct |

**Dependency:** Ship Option E **after INT-P1-7** (or add cheap `data/` file-count hash) to avoid skipping when only non-fingerprinted data files drift.

---

## Recommended implementation order

1. **INT-P1-7** — Shared `Copy-WandingDataFromRepo` (denylist + glob); update `dev-sync-playbook.md` §4.3
2. **INT-P1-6** — `-Strict` + `-VendorStrict` passthrough
3. **INT-P2-4** — Invalid flag combo warn (5 minutes, independent)
4. **INT-P2-5** + **INT-P2-7** — ensure exit check + `/XD tools` (trivial/low, bundle together)
5. **INT-P2-3** — Option E with `-SkipRobocopyIfFresh` (after P1-7)
6. **INT-P1-8** — Spec closure (can parallelize with 1–2)
7. **INT-P2-8**, **INT-P2-9**, **INT-P2-6** — polish (log, preflight order, helper)

---

## Open questions / decisions for user

1. **Shared helper location:** New `scripts/lib/sync-wanding-data.ps1` vs inline duplicate in sync script only?
2. **`-Strict` default:** Stay opt-in (`-VendorStrict`) or flip to default strict with `-VendorPermissive`?
3. **Option E default:** Opt-in `-SkipRobocopyIfFresh` first, or make default after 1 week dogfood?
4. **MCP dist fingerprints:** Add quotation `dist/index.js` to fingerprint set before allowing MCP robocopy skip?
5. **Preflight chicken-and-egg (INT-P2-9):** Warn-only for `vendor\wanding\data\*` pre-sync, or reorder bootstrap?

---

## Suggested acceptance tests (no implementation)

| # | Scenario | Command / action | Expected |
|---|----------|------------------|----------|
| 1 | Data glob parity | Add dummy `data/test-sop.md` (not denylisted); run sync | File appears in `vendor\wanding\data\` |
| 2 | Denylist respected | Confirm `ccb-wanding-pricing-system.md` not copied | Absent from vendor data |
| 3 | Required xlsx trio | After sync, `Test-Path` accurate.md + wanding_price_lib.xlsx + 空白标准报价单.xlsx | All `$true` when present in repo |
| 4 | Strict pass | Touch `wanding_fuzzy_matcher.py`; sync without `-Strict` | Exit 0, Red printed |
| 5 | Strict fail | Same as 4 with `-Strict` | Exit 1; `start-dev-full -VendorStrict` throws |
| 6 | Skip combo warn | `start-dev-full -SkipVendorSync -VendorSmoke` | Yellow warn; smoke not executed |
| 7 | Option E fresh skip | No repo changes; sync `-SkipRobocopyIfFresh` | Log「skip robocopy (fresh)」; fingerprints Green |
| 8 | Option E stale run | Change python; sync `-SkipRobocopyIfFresh` | Full robocopy; fingerprints Green after |
| 9 | ensure-wanding failure | Simulate ensure script exit 1 | sync throws with clear message |
| 10 | Python tools exclusion | Delete file from repo `python/tools/`; sync | File removed from vendor (after INT-P2-7) |
| 11 | accurate-agent smoke | New Guid session with accurate-agent after sync | Agent can Read `ccb-wanding-accurate.md` from vendor path |
| 12 | Fill template | `fill_quotation_sheet` without explicit template_path | Resolves `空白标准报价单.xlsx` in vendor data |

---

## Post-Phase-2 improvements not in Phase 2.1 backlog

`sync-dev-wanding-vendor.ps1` now also syncs **price-library-server dist** (L96–100) and node_modules junction (L102–107) — added since the 2026-06-30 optimization review. Not tracked as a separate backlog ID; no action required unless spec update desired.

---

## Next steps (A/B/C)

- **A.** Save this report (done)
- **B.** Generate Phase 2.1 implementation plan (task PRD + file-level diffs) from this report
- **C.** Execute Phase 1 items (INT-P1-7 + INT-P1-6) in Agent mode
