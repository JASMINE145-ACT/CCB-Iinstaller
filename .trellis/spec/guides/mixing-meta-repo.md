# Mixing Meta-Repo & Source Recovery Guide

> **Purpose**: One place to understand how the WanD / CCB-Wanding **complete product** is version-controlled, recovered, built, and pushed.  
> **Task origin**: [`.trellis/tasks/06-26-aionui-source-level-recovery/`](../../tasks/06-26-aionui-source-level-recovery/)  
> **GitHub product entry**: [JASMINE145-ACT/Mixing](https://github.com/JASMINE145-ACT/Mixing)

---

## 1. Why three repos (not one monorepo)

The product spans desktop shell + backend + installer. Upstream **AionUi** is a large fork (`iOfficeAI/AionUi`). Hard-merging everything into one repo makes upstream sync painful.

| Repo | GitHub | Local path | Role |
|------|--------|------------|------|
| **Mixing** (meta) | `JASMINE145-ACT/Mixing` | `D:\Projects\Mixing` | Product entry: README, submodule pins, tags |
| **backend** | `JASMINE145-ACT/CCB-Iinstaller` | `D:\Projects\claude-code-best` | CCB CLI, MCP, Python, `ccb-installer/`, Trellis |
| **desktop** | `JASMINE145-ACT/AionUi` (fork) | `D:\Projects\aionui-src` | Electron Mixing UI, CCB Guid, org SSO, work tasks |

**Do not push** desktop CCB changes to `iOfficeAI/AionUi` (`origin`). Use remote `wanding` → your fork.

```
Mixing (meta-repo)
├── backend/   → submodule: CCB-Iinstaller
└── desktop/   → submodule: AionUi @ ccb-wanding-1.1.2-recovered
```

Templates for Mixing live in repo: `meta-repo/README.md`, `meta-repo/.gitmodules`, `meta-repo/scripts/init-local-mixing-repo.ps1`.

---

## 2. Two recovery levels (do not confuse)

| Level | Question | Status (2026-06-26) |
|-------|----------|---------------------|
| **Runtime recovery (Phase 0)** | Can I run Mixing + 万鼎 Guid today? | **Done** — `D:\CCB-Wanding` + `ccb-launch-aionui.cmd` |
| **Source pipeline (Phase 3)** | Can staging be assembled from git (manifest check)? | **Done** — `build-wanding.ps1 -Version 1.1.3-dev` with partial skips; staging validation OK |
| **Full cold build (Phase 4)** | Rebuild CCB + AionUi + pip MCP from git, behave like 1.1.2? | **Open** — no `-SkipBuild`/`-SkipAionUiBuild`/`-SkipPipMcp`; then install smoke |

**Runtime ≠ source.** Copying `ccb-installer/staging/` to `D:\CCB-Wanding` fixes the install; it does not replace committing `aionui-src` CCB integration.

---

## 3. Pinned commits (`v1.1.2-recovered`)

| Submodule | Branch | Commit | Notes |
|-----------|--------|--------|-------|
| `backend/` | `main` | `f8ab39ae` | Installer + python/system refactor + Trellis |
| `desktop/` | `ccb-wanding-1.1.2-recovered` | `109aa15` | 158 files — full CCB/Mixing desktop integration on `f77c697` |
| CLI core | `ccb-wanding-1.1.2-recovered` | `238f4635` | `JASMINE145-ACT/claude-code` — ACP/MCP rebuild source |
| Mixing meta | `master` | `5513401` | Real submodules + tag `v1.1.2-recovered` |
| Trellis docs | `main` | `6f2e4963` | Latest backend commit with Phase 3 status (optional pin) |

Update this table when you bump submodules and re-tag.

---

## 4. Daily use (bundled Mixing UI)

**Use bundled runtime** for WanD Guid cards (万鼎报价专家), not raw dev unless bootstrapped.

```powershell
# One-click recovery
.\ccb-installer\scripts\recover-aionui-new-ui.ps1

# Or after install to D:\CCB-Wanding
D:\CCB-Wanding\ccb-launch-aionui.cmd
```

| Expect | Bundled (`ccb-launch`) | Dev (`start-aionui-dev.ps1`) |
|--------|------------------------|------------------------------|
| Window title | **Mixing** | Often **AionUi** |
| Guid cards | WanD presets when CCB authority on | Needs bootstrap + correct source |
| Login | Org SSO (`yjc` etc.) | Often `AIONUI_BYPASS_AUTH=1` |

Org login password: `scripts/org-phase0/env.local` → `EMPLOYEE_PASSWORD`.

### Install layout

| What | Path |
|------|------|
| Dev install slot | `D:\CCB-Wanding` |
| User Claude config | `%LOCALAPPDATA%\CCB-Wanding\.claude` |
| Org server URL file | `%APPDATA%\AionUi\aionui\org-server.json` |
| Release oracle (do not edit as source) | `ccb-installer/staging/` |

---

## 5. Known pitfall: `org-server.json` UTF-8 BOM

**Symptom**: Mixing login shows「连接失败，请稍后重试」while VPS `/login` works from PowerShell.

**Cause**: `org-server.json` saved with UTF-8 BOM → main process `JSON.parse` fails → `__orgServerUrl` empty.

**Fix**:

1. Rewrite file **without BOM** (UTF-8 no BOM).
2. `ccb-launch-aionui.cmd` sets `ORG_SERVER_URL=http://67.216.206.3:13401` as env fallback.
3. `orgServerConfig.ts` strips BOM on read (desktop source).

When creating `org-server.json` in PowerShell, use:

```powershell
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, '{"url":"http://67.216.206.3:13401"}', $utf8NoBom)
```

---

## 6. `aionui-src` — what to commit vs ignore

Full file list: [task `aionui-src-commit-audit.md`](../../tasks/06-26-aionui-source-level-recovery/aionui-src-commit-audit.md).

| Commit | Ignore |
|--------|--------|
| All `packages/desktop/src/**` CCB/org/workTasks/ACP | `out/`, `node_modules/`, `.env` |
| `packages/desktop/resources/app.ico`, `app.png` | `resources/bundled-aioncore/`, `bundled-bun/`, `hub/` |
| All added `tests/unit/**`, `tests/e2e/**` for CCB | `packages/desktop/out/` |

**Never** `git restore` / `git clean` on `aionui-src` before CCB branch is pushed to your fork.

---

## 7. Push to GitHub (first time)

Prerequisites: fork [iOfficeAI/AionUi](https://github.com/iOfficeAI/AionUi) → `JASMINE145-ACT/AionUi`; `gh auth login` optional.

### 7.1 Push desktop

```powershell
cd D:\Projects\aionui-src
git push -u wanding ccb-wanding-1.1.2-recovered
```

### 7.2 Push backend

```powershell
cd D:\Projects\claude-code-best
git push origin main
```

### 7.3 Wire Mixing submodules (replace local junctions)

Local dev may use **directory junctions** (`backend` → `claude-code-best`). **Do not commit junctions.** Before push:

```powershell
cd D:\Projects\Mixing
rmdir backend desktop 2>$null   # removes link only, not target dirs

git submodule add https://github.com/JASMINE145-ACT/CCB-Iinstaller.git backend
git submodule add -b ccb-wanding-1.1.2-recovered https://github.com/JASMINE145-ACT/AionUi.git desktop

cd backend; git checkout f8ab39ae; cd ..
cd desktop; git checkout 109aa15; cd ..

git add .gitmodules backend desktop
git commit -m "Pin submodules at v1.1.2-recovered SHAs."
```

### 7.4 Push Mixing

```powershell
cd D:\Projects\Mixing
git remote add origin https://github.com/JASMINE145-ACT/Mixing.git 2>$null
git branch -M main
git push -u origin main
git push origin v1.1.2-recovered
```

### 7.5 Verify clone

```powershell
git clone --recurse-submodules https://github.com/JASMINE145-ACT/Mixing.git Mixing-test
```

---

## 8. Build from source

### Phase 3 (done — staging manifest)

Partial rebuild; proves git → staging assembly without hand-copying `AionUi.exe`:

```powershell
cd backend
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.1.3-dev -SkipNsis -SkipBuild -SkipAionUiBuild -SkipPipMcp -SkipStagingClear
```

Evidence: `staging validation OK`; `vendor/wanding/python/system/tool_dispatch.py` present. See task `check.jsonl` phase `source-build-partial`.

### Phase 4 (open — full cold build)

**Not** “repackage installer version 1.1.2 again.” Goal: from pinned Git SHAs, **fully rebuild** dist + AionUi + pip MCP, install on a test machine, and verify behavior matches the **1.1.2 runtime oracle** (`D:\CCB-Wanding`). Ship version should be **`1.1.3-dev`** or **`1.1.3`** to avoid colliding with the already-released 1.1.2.

```powershell
cd backend
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.1.3-dev -SkipNsis
# Do NOT pass -SkipBuild -SkipAionUiBuild -SkipPipMcp
```

Acceptance: rebuilt install shows 万鼎报价专家 Guid cards, org SSO login, quotation MCP — without manual copy from old staging. Optional: drop `-SkipNsis` for `CCB-Wanding-1.1.3-dev.exe`.

See [task status](../../tasks/06-26-aionui-source-level-recovery/status.md) and [PRD](../../tasks/06-26-aionui-source-level-recovery/prd.md).

---

## 9. What never belongs in git

| Path | Why |
|------|-----|
| `ccb-installer/staging/` | Generated release tree — comparison oracle only |
| `D:\CCB-Wanding` | Installed runtime |
| `sso.env`, `env.local`, API keys | Secrets |
| Junction folders in Mixing | Use submodules for remote |

---

## 10. Related docs

| Doc | Topic |
|-----|-------|
| [wanding-build-path-decision.md](./wanding-build-path-decision.md) | Full NSIS vs hot zip |
| [wanding-update-runbook.md](./wanding-update-runbook.md) | Employee updates |
| [aionui-ccb-boundary.md](../integration/aionui-ccb-boundary.md) | 4-layer chain |
| [wanding-packaging-whitelist.md](../integration/wanding-packaging-whitelist.md) | Staging assembly |
| [task status.md](../../tasks/06-26-aionui-source-level-recovery/status.md) | Recovery session log |

---

**Rule of thumb**: **Mixing** = where to clone; **backend** + **desktop** = where to code; **D:\CCB-Wanding** = where to run; **staging/** = what 1.1.2 should look like after a correct build.
