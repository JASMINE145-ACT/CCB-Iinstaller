# CCB-Wanding 发布更新标准（WanD Release Standard）

> **Status:** **Draft** (2026-07-02 rev.2) — operator checklist; **executable** for verify/build/log/publish **wording**; packaging **code** gaps in §13 remain open.  
> **Audience:** 发版负责人（打包机 / IT / 开发自测后发货）。  
> **Not a substitute for:** file-level IN/OUT lists — those stay in [`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md).

> **Related:**
> - **WHAT to ship** → [`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md)
> - **WHICH path** (full NSIS vs hot zip) → [`../guides/wanding-build-path-decision.md`](../guides/wanding-build-path-decision.md)
> - **VPS publish runbook** → [`../guides/wanding-update-runbook.md`](../guides/wanding-update-runbook.md) §3–§4
> - **First-ship contract** → [`wanding-first-ship.md`](./wanding-first-ship.md) §5.2
> - **Ops / manifest schema** → [`internal-update.md`](./internal-update.md) §12

---

## 0. Golden rule

**`build-wanding.ps1` PASS ≠ release PASS.**

A feature is **shipped** only when **all four chains** below are verified for that feature (paths differ for Full NSIS vs Hot zip — §3.3).

```text
源码 → 构建产物 → $INSTALL → $CONFIG
                              ↘ $RUNTIME (ACP route-b slot)
```

Miss any hop (classic example: learn-by-data skill in staging but not in NSIS `File` lines) → employees do **not** have the feature.

**ACP / 权限 / session 类修复** 还必须验证 **④ $INSTALL → $RUNTIME**：bundled 补丁已进安装树，但员工进程可能仍读旧的 `%APPDATA%\AionUi\aionui\runtime\managed-tools\...`。

---

## 1. Three layers (where things live)

| Layer | Path | Upgrade behavior |
|-------|------|------------------|
| **$INSTALL** | `%LOCALAPPDATA%\Programs\CCB-Wanding\` | NSIS overwrites program tree; hot zip patches **whitelist** subdirs only |
| **$CONFIG** | `%LOCALAPPDATA%\CCB-Wanding\.claude\` | **Preserved** — needs explicit deploy / `config_generation` reset |
| **$RUNTIME** | `%APPDATA%\AionUi\aionui\runtime\managed-tools\acp\...` | Copied from bundled route-b by `sync-aionui-ccb-route-b.ps1`; stale until sync + **full quit** relaunch |

```text
┌─────────────────────────────────────────────────────────────┐
│  $INSTALL   dist/, vendor/, AionUi/, scripts/, seed/         │
├─────────────────────────────────────────────────────────────┤
│  $CONFIG    agents/, skills/, commands/, settings.json      │
├─────────────────────────────────────────────────────────────┤
│  $RUNTIME   managed-tools/acp/... (live ACP slot)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Four chains (how things reach users)

| Chain | Question | Typical failure |
|-------|----------|-----------------|
| **① Source → build artifact** | In staging (NSIS) or hot zip component? | New file not in robocopy / `$shipScripts` / hot catalog |
| **② Artifact → $INSTALL** | NSIS `File` line **or** hot zip path in §16.1? | `seed/skills/*` not one recursive NSIS copy — per-skill blocks |
| **③ $INSTALL → $CONFIG** | Bootstrap deploy on cold install **and** upgrade? | Skill only in `install-ppt-master` → **SKIP** when ppt-master exists |
| **④ $INSTALL → $RUNTIME** | After install/upgrade: route-b + acp-agent markers in runtime slot? | Employee Ctrl+R or old session; sync skipped |

### 2.1 Chain ④ — $RUNTIME verification (mandatory when ACP / permissions / session code changed)

`sync-aionui-ccb-route-b.ps1` copies bundled patches into:

```text
%APPDATA%\AionUi\aionui\runtime\managed-tools\acp\claude-agent-acp\0.39.0\win32-x64\...\dist\
```

**After Full NSIS or hot upgrade:**

```powershell
$INSTALL = "$env:LOCALAPPDATA\Programs\CCB-Wanding"
& "$INSTALL\scripts\sync-aionui-ccb-route-b.ps1" -InstallDir $INSTALL   # idempotent; also runs in bootstrap
# Full quit AionUI (tray too), relaunch via AionUiLauncher — not Electron Ctrl+R

$INSTALL\ccb-check-install.cmd    # checks bundled + runtime route-b marker + runtime acp-agent patch
```

Markers (from `install-health-manifest.json` → `route_b`):

- `index.js` contains `ccb-native-acp-route`
- `acp-agent.js` contains `CCB_WANDING_QUERY_NEXT_TIMEOUT_DEFAULT_MS`

### 2.2 Worked example — `quotation-learn-by-data` (1.1.4 gap)

| Chain | Expected | 1.1.4 actual |
|-------|----------|--------------|
| ① | `staging/seed/skills/quotation-learn-by-data/` | ✅ |
| ② | NSIS → `$INSTALL/seed/skills/quotation-learn-by-data/` | ❌ only `ccb-subagent-gate` copied |
| ③ | `deploy-quotation-learn-by-data-skill.ps1` → `$CONFIG/skills/` | ❌ no seed on install dir → skip |
| ④ | N/A for skill file | — |

Slash command `learn-by-data.md` → NSIS §Preserve writes `resources/commands/**` to `$CONFIG/commands/` directly.

**Packaging fix tracked in §13** (not closed in this doc revision).

---

## 3. Pre-release: scope and path (≈5 min)

### 3.1 Pick build path

Use [`wanding-build-path-decision.md`](../guides/wanding-build-path-decision.md):

| You changed… | Ship with |
|--------------|-----------|
| `aionui-src` (renderer / main / preload) | **Full NSIS** — do not treat `-SkipAionUiBuild` as a release build |
| CCB `dist`, python, MCP, seed only | Hot zip **or** full NSIS |
| scripts / config / resources only | `-SkipBuild -SkipAionUiBuild` after SKIP_GUARD |
| Broken / empty install tree | Full NSIS only |

### 3.2 Feature matrix (mandatory per release)

Pick **one template** (§8.1 Full NSIS or §8.2 Hot zip). Do not mix columns.

**Universal columns:**

| Feature | Source | Build artifact | Delivery path | Lands in $INSTALL | Lands in $CONFIG / $RUNTIME | Acceptance |
|---------|--------|----------------|---------------|-------------------|-----------------------------|------------|

- **Lands in $CONFIG / $RUNTIME** — mark `CONFIG`, `RUNTIME`, `both`, or `—`.
- Any cell marked “needed” but unchecked → **block release**.

### 3.3 Delivery path reference

| Path | Build artifact | How it reaches $INSTALL |
|------|----------------|-------------------------|
| **Full NSIS** | `ccb-installer/staging/**` | `installer-wanding-v2.nsi` → `$INSTDIR` |
| **Hot zip** | `ccb-installer/out/hot/CCB-dist-{v}-win-x64.zip` | `internal-upgrade.ps1` robocopy whitelist (§16.1) — **no** full staging |

Hot zip does **not** use NSIS `File` lines. Chain ② for hot release = zip path listed in whitelist + present in zip.

---

## 4. Pre-build: registration checklist (≈15 min)

For **every new** skill, slash command, agent, or runtime script, answer:

1. **Build artifact** — staging (NSIS) or hot component name?
2. **Delivery** — NSIS `File` **or** hot zip §16.1 path?
3. **$CONFIG deploy** — bootstrap step? Not gated behind unrelated SKIP?
4. **$RUNTIME** — if ACP-related, does `sync-aionui-ccb-route-b` source include the fix?
5. **Manifest** — `install-health-manifest.json` where applicable?
6. **Hot zip** — if hot-updatable, in whitelist §16.1 IN list?

### 4.1 `config_generation` decision

File: `ccb-installer/seed/config-ship-manifest.json`

| Change | Bump `config_generation`? | Also |
|--------|---------------------------|------|
| `$INSTALL` only (dist, vendor python, MCP) | No | Hot zip may suffice |
| Agent `.md` / hooks / `.aionui.json` behavior | **Yes** | Triggers `apply-ship-config-reset` + runtime cache clear |
| New skill must appear under `$CONFIG/skills/` | **Yes** + independent deploy step | Ship reset alone does **not** copy skills |
| New slash command under `resources/commands/` | No (NSIS) | NSIS overwrites `$CONFIG/commands/` each install |

### 4.2 Manifest registration map

| Registry | Governs |
|----------|---------|
| `ccb-installer/resources/install-health-manifest.json` → `required_files` | Build gate: must exist under staging / `$INSTALL` |
| same → `config_files` | Post-install Check Install: must exist under `$CONFIG` |
| same → `route_b` | Post-install: bundled + **runtime** route-b / acp-agent markers |
| [`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md) §16.1 | Hot-update zip IN paths |
| `build-wanding.ps1` → `$shipScripts` | Runtime scripts shipped inside `$INSTALL/scripts/` |

---

## 5. Build (standard commands)

### 5.1 Full NSIS — with guaranteed build log

`build-wanding.ps1` does **not** auto-write a log file. Use explicit capture:

```powershell
$ver = 'x.y.z'
$log = "D:\Projects\claude-code-best\ccb-installer\build-$ver-staging-nsis.log"
$err = "D:\Projects\claude-code-best\ccb-installer\build-$ver-staging-nsis.err.log"

Push-Location D:\Projects\claude-code-best\ccb-installer\scripts
try {
  & .\build-wanding.ps1 -Version $ver `
    -AioncorePath D:\Projects\claude-code-best\AionCore\target\release\aioncore.exe `
    2>&1 | Tee-Object -FilePath $log
  if ($LASTEXITCODE -ne 0) { throw "build-wanding exit $LASTEXITCODE" }
}
finally { Pop-Location }

# Record exit code in delivery note; stderr merged into $log via 2>&1
```

### 5.2 Hot zip

```powershell
.\ccb-installer\scripts\build-wanding-hot.ps1 -Version x.y.z -Components dist,python,seed
# Optional log: same Tee-Object pattern; artifact under ccb-installer\out\hot\
```

### 5.3 Pre-ship provenance

Before fleet push, record from `staging/dist/BUILD-INFO.json` (or install tree copy):

- `claude-code-B` / `aionui-src` git commit + **`dirty` flag**
- If `dirty: true` → document in `delivery-*.md` or rebuild from clean tree

### 5.4 Automated build gates (must PASS)

- `Test-StagingWanDInstall` (reads `install-health-manifest.json`)
- No unexplained `unclassified` script WARN from `$shipScripts` / `$devOnlyScripts` drift guard

---

## 6. Post-build verification (≈20 min) — **critical**

### 6.1 Chain A — build artifact

**Full NSIS:**

```powershell
$st = "D:\Projects\claude-code-best\ccb-installer\staging"
Test-Path "$st\seed\skills\quotation-learn-by-data\SKILL.md"   # per feature matrix
(Get-Content "$st\dist\VERSION").Trim() -eq 'x.y.z'
```

**Hot zip:**

```powershell
$zip = "D:\Projects\claude-code-best\ccb-installer\out\hot\CCB-dist-x.y.z-win-x64.zip"
# Expand-Archive to temp; verify whitelist paths inside zip
```

### 6.2 Chain B — delivery mechanism vs artifact

**Full NSIS:** reconcile `staging\seed\skills\*` with `installer-wanding-v2.nsi` `File` directives (per-subdir, not glob).

**Hot zip:** reconcile components with [`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md) §16.1 IN list.

### 6.3 Chain C — $CONFIG (two scenarios)

| Scenario | Safe procedure |
|----------|----------------|
| **Cold install** | **Only:** clean VM · dedicated Windows test account · temporary `LOCALAPPDATA` redirect · or full `$CONFIG` backup with documented restore. **Never** delete production `$CONFIG` on a packager or employee daily machine as a routine step. |
| **Upgrade** | Install over previous fleet version (e.g. 1.1.3 → x.y.z) on a **test** machine that mirrors fleet state |

```powershell
$cfg = "$env:LOCALAPPDATA\CCB-Wanding\.claude"
Test-Path "$cfg\skills\quotation-learn-by-data\SKILL.md"
Test-Path "$cfg\commands\learn-by-data.md"
Select-String "quotation-learn-by-data" "$cfg\agents\quotation-agent.md"
Get-Content "$cfg\.config-generation.json" -ErrorAction SilentlyContinue
```

### 6.4 Chain D — $RUNTIME

After install/upgrade + **full quit** relaunch:

```powershell
$INSTALL = "$env:LOCALAPPDATA\Programs\CCB-Wanding"
& "$INSTALL\ccb-check-install.cmd"
# Expect OK: runtime route-b, runtime acp-agent patch
```

### 6.5 Automated smoke (every release)

```powershell
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
.\ccb-installer\scripts\smoke-wanding-e2e.ps1 -InstallDir "<InstallDir>"
```

### 6.6 Manual smoke (from feature matrix)

| # | Check | Pass |
|---|-------|------|
| Quotation MCP | Guid session, `match_quotation` | probe PASS |
| Full-auto permission | 全自动 + screenshot Read | no spurious prompt on first message |
| Org knowledge **auth** | logged-in GET `wanding_business_knowledge` + CSRF bootstrap | 200 / expected 401 without token — **not** append |
| Org knowledge **write** (optional, non-fleet) | `append_business_rule` on **test org / test slug only** | see §6.7 |
| learn-by-data | `/learn-by-data` + filled VANTSING xlsx | Skill readable; `match_quotation_batch` + `show_candidates=true` |

### 6.7 Org knowledge — release smoke policy

`append_business_rule` is **append-only** ([`org-knowledge.md`](./org-knowledge.md) — do not use for cleanup).

| Release tier | Org smoke |
|--------------|-----------|
| **Routine fleet release** | Auth GET + CSRF path; MCP `get_doc` / shadow read; **no** production append |
| **Write-path regression** | Dedicated test tenant or UI-deleteable smoke marker; document cleanup |
| **Never** | Repeated append to production `wanding_business_knowledge` each release |

---

## 7. Release artifacts (ship with the exe)

| Artifact | Contents |
|----------|----------|
| `ccb-installer/CCB-Wanding-x.y.z.exe` | NSIS installer (full path) and/or hot zip |
| `ccb-installer/delivery-x.y.z-YYYY-MM-DD.md` | version, size, git SHAs, **dirty**, feature matrix sign-off |
| `ccb-installer/build-x.y.z-staging-nsis.log` | from §5.1 `Tee-Object` (required for full NSIS) |
| `ccb-installer/release-notes-员工.md` | plain-language changes + post-install steps |
| `ccb-installer/release-notes-ops.md` | manifest sha256, `config_generation`, hot vs full |

Record artifact sha256 in `release-notes-ops.md` (same values `publish-update-bundle.ps1` will embed).

### 7.1 Employee notice structure

```markdown
## Mixing x.y.z

**安装：** 完全退出 → 覆盖安装 → 重新登录 → 万鼎报价专家 **新建会话**

**本版变化：**（用户可见，不写路径/文件名）
1. …

**仍异常：** 先新建会话；不行联系 IT 并附版本号
```

Do not claim “fixed” until **Chain C + D** pass on **upgrade**, not only dev `start-dev-full.ps1`.

---

## 8. Feature matrix templates

### 8.1 Full NSIS

```markdown
# Release x.y.z — Full NSIS

| Feature | Source | Build artifact (staging) | Delivery (NSIS File) | $INSTALL | $CONFIG / $RUNTIME | Verified |
|---------|--------|------------------------|----------------------|----------|---------------------|----------|
| | | | | | | ☐ cold ☐ upgrade |

config_generation: _ → _
AionUI rebuilt: yes / no
BUILD-INFO dirty: yes / no
```

### 8.2 Hot zip

```markdown
# Release x.y.z — Hot zip

| Feature | Source | Build artifact (zip path) | Delivery (internal-upgrade) | $INSTALL | $CONFIG / $RUNTIME | Verified |
|---------|--------|---------------------------|-----------------------------|----------|---------------------|----------|
| | | e.g. seed/agents/... | §16.1 whitelist | | | ☐ upgrade |

Requires existing full NSIS base on target machines.
MinFromVersion / MaxFromVersion: _
```

---

## 9. Post-publish ops (VPS manifest)

**`publish-update-bundle.ps1 -Upload` does not upload** — it prints example `scp` commands only (script header + L151–160). Publishing is a **two-step** process: generate manifest locally, then **manual scp** per [`wanding-update-runbook.md`](../guides/wanding-update-runbook.md).

### 9.1 Generate manifest (local)

```powershell
cd D:\Projects\claude-code-best\ccb-installer\scripts

# Preview first
.\publish-update-bundle.ps1 -Version x.y.z `
  -InstallerPath "..\CCB-Wanding-x.y.z.exe" `
  -HotZipPath    "..\out\hot\CCB-dist-x.y.z-win-x64.zip" `   # omit if full-only
  -MinFromVersion "1.1.3" `
  -ReleaseNotes  "..." `
  -OutFile       "..\out\manifest.json" `
  -WhatIf

# Write manifest
.\publish-update-bundle.ps1 -Version x.y.z `
  -InstallerPath "..\CCB-Wanding-x.y.z.exe" `
  -HotZipPath    "..\out\hot\CCB-dist-x.y.z-win-x64.zip" `
  -MinFromVersion "1.1.3" `
  -ReleaseNotes  "..." `
  -OutFile       "..\out\manifest.json"
```

`-InstallerPath` is **required** even for hot-only fleets (manifest schema requires `full_installer` block).

### 9.2 Upload artifacts (manual)

```powershell
# Order: binaries first, manifest last
scp -P 39222 "..\CCB-Wanding-x.y.z.exe" root@67.216.206.3:/var/www/html/updates/ccb/
scp -P 39222 "..\out\hot\CCB-dist-x.y.z-win-x64.zip" root@67.216.206.3:/var/www/html/updates/ccb/   # if any
scp -P 39222 "..\out\manifest.json" root@67.216.206.3:/var/www/html/updates/manifest.json
```

### 9.3 Verify feed

```powershell
.\ccb-installer\scripts\verify-update-server.ps1
# Plus curl manifest + zip HTTP 200; compare published sha256 to local Get-FileHash
```

Align `manifest.json` `ccb.version`, `release_notes`, and artifact hashes with employee notes. Schema: [`internal-update.md`](./internal-update.md) §2.

---

## 10. Pre-ship checklist (wallet card)

```text
Before "ready to ship":
────────────────────────────────────────
 1. Feature matrix filled (correct NSIS or Hot template)?
 2. Build artifact contains every feature (Chain A)?
 3. NSIS File / hot zip path registered (Chain B)?
 4. Bootstrap → $CONFIG verified cold + upgrade (Chain C)?
 5. ccb-check-install: runtime route-b + acp-agent OK (Chain D)?
 6. Full quit relaunch — not Ctrl+R?
 7. install-health-manifest updated?
 8. BUILD-INFO commits recorded; dirty documented?
 9. exe + zip sha256 in release-notes-ops?
10. manifest generated with -InstallerPath; scp done; verify-update-server PASS?
────────────────────────────────────────
build PASS ≠ release PASS
publish-update-bundle -Upload ≠ uploaded
```

---

## 11. Known packaging code gaps (not fixed by this doc revision)

Tracked for **1.1.4.1+** implementation — see Trellis / packaging tasks:

| Gap | Symptom | Code fix owner |
|-----|---------|----------------|
| NSIS missing `quotation-learn-by-data` seed | Skill missing on fleet | `installer-wanding-v2.nsi` |
| Bootstrap ties learn skill to `install-ppt-master` SKIP | Upgrade keeps old skills | `run-wanding-bootstrap.ps1` |
| `install-health-manifest` omits skill + command paths | Build gate cannot catch | `install-health-manifest.json` |
| Hot zip §16.1 omits `quotation-learn-by-data` | Hot path cannot refresh skill | whitelist + `build-wanding-hot.ps1` |
| `publish-update-bundle.ps1 -Upload` stub | No automated upload | script or CI (optional) |
| `build-wanding.ps1` native log flag | Relies on Tee-Object wrapper | optional `-LogFile` param |

---

## 12. Document map

| Doc | Role |
|-----|------|
| **This doc** | **VERIFY** — four chains, dual matrix, safe cold-install, publish truth |
| [`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md) | **WHAT** — file IN/OUT |
| [`wanding-build-path-decision.md`](../guides/wanding-build-path-decision.md) | **WHICH** — full vs hot |
| [`wanding-update-runbook.md`](../guides/wanding-update-runbook.md) | **OPS** — scp + nginx pitfalls |
| [`wanding-first-ship.md`](./wanding-first-ship.md) | **CONTRACT** — first merged exe |
| [`internal-update.md`](./internal-update.md) | **SCHEMA** — manifest fields |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-02 | Initial standard; 1.1.4 learn-by-data three-chain gap |
| 2026-07-02 rev.2 | Audit fix: Draft status; fourth chain $RUNTIME; dual matrix; safe cold-install; Tee-Object build log; publish/runbook alignment; org append policy; expanded wallet card; §11 code gaps explicit |
