# Merged CCB-Wanding + AionUI Installer v2 — PRD

> Task: `06-19-merged-wanding-installer-v2` | Priority: P1 | Package: ccb-installer + aionui | **Status: pending**

## Problem

Today shipping requires **two artifacts**:

| Artifact | Contains | Gap |
|----------|----------|-----|
| AionUI green zip / NSIS | Frontend + bundled `aioncore` + route-b patch | No CCB `dist/`, MCP, Python, price xlsx |
| `CCB-Wanding-*.exe` (legacy NSIS) | Backend + vendor + post-install hooks | No `AionUi.exe`; terminal-first shortcuts |

Employees cannot「装一次就用」. Org knowledge center URL (`org-server.json`) is seeded by CCB install only — AionUI zip alone never writes it.

## Goal

**One NSIS installer** produces a self-contained tree:

```text
%LOCALAPPDATA%\Programs\CCB-Wanding\
├── AionUi\AionUi.exe
├── dist\
├── vendor\
├── scripts\
├── seed\
└── ...
```

After install:

- Desktop shortcut → `AionUi.exe` (not `launch-ccb-wanding.ps1`)
- route-b resolves `$INSTALL` automatically (`dist\cli.js` + `vendor\bun\bun.exe`)
- `ensure-wanding-settings.ps1` runs (MCP, agents, **org-server.json** if missing)
- Employee only needs **org login once** for center knowledge (VPS `67.216.206.3:13401`)

## Non-goals (this task)

- Merged **hot-update zip** subset (see whitelist §16) — follow-up task
- `manifest.installMode: bundled` in update server — follow-up
- Linux / macOS merged installer
- Bundling center `aioncore` (org stays on VPS)

## Spec authority

Primary: [`.trellis/spec/integration/wanding-packaging-whitelist.md`](../../spec/integration/wanding-packaging-whitelist.md)

Cross-ref: [`aionui-ccb-boundary.md`](../../spec/integration/aionui-ccb-boundary.md) · [`org-knowledge.md`](../../spec/integration/org-knowledge.md) · [`dev-test-ship.md`](../../spec/frontend/dev-test-ship.md) §7

## Deliverables

| # | Artifact | Notes |
|---|----------|-------|
| 1 | `ccb-installer/scripts/build-wanding.ps1` | 4-step staging driver (dist → AionUi → vendor → NSIS) |
| 2 | `ccb-installer/installer-wanding-v2.nsi` | Reads **only** `staging/`; supersedes ad-hoc file list in v1 |
| 3 | Staging layout docs in whitelist §2 | Verify paths match implementation |
| 4 | Post-install block | Reuse v1 hooks: `install-*-mcp`, `ensure-wanding-settings`, `deploy-seed-agents` |
| 5 | Desktop / Start Menu shortcuts | Point to `$INSTDIR\AionUi\AionUi.exe` |
| 6 | Smoke doc / script | Fresh VM: install → AionUI chat → quotation → org-knowledge visible |

## Build pipeline (MVP)

| Step | Input | Output |
|------|-------|--------|
| 1 | `claude-code-B` → `bun run build` | `staging/dist/` + `dist/VERSION` |
| 2 | `aionui-src` → `build-with-builder.js --pack-only` | `staging/AionUi/` from `out/win-unpacked/` |
| 2b | `sync-aionui-ccb-route-b.ps1` | Patch route-b into `staging/AionUi/.../dist/index.js` |
| 3 | Repo `vendor/`, `python/`, `data/`, `mcp_servers/`, `seed/`, `config/` | `staging/vendor`, etc. |
| 4 | `makensis installer-wanding-v2.nsi` | `CCB-Wanding-x.y.z.exe` |

**Reuse:** Logic from `package-aionui-exe.ps1` (steps 1–5) and `installer-wanding.nsi` (sections + post-install).

**Do not:** Ship `staging/AionUi` NSIS zip as employee artifact — merged exe only for WanD rollout.

## Post-install contract

Must run (same order as v1 where applicable):

1. `install-office-word-mcp.ps1`
2. `install-excel-mcp-server.ps1`
3. `install-ppt-master.ps1`
4. **`ensure-wanding-settings.ps1`** — includes `Ensure-OrgServerDesktopConfig` (template `vendor/wanding/config/org-server.json`)
5. `deploy-seed-agents.ps1` (or equivalent from v1 NSIS)

Registry (optional): `HKCU\Software\CCB-Wanding\CCB-Wanding` → `InstallDir` for diagnostics.

## Acceptance

| # | Scenario | Expected |
|---|----------|----------|
| A1 | Fresh Windows VM, run merged exe | `%LOCALAPPDATA%\Programs\CCB-Wanding\AionUi\AionUi.exe` exists |
| A2 | Launch desktop shortcut | AionUI opens; new chat sends message (no route-b / MCP missing errors) |
| A3 | Quotation smoke | `match_quotation` or MCP health probe PASS |
| A4 | Org knowledge | `%APPDATA%\AionUi\aionui\org-server.json` has `http://67.216.206.3:13401`; sidebar shows「组织知识库」after restart |
| A5 | Upgrade over v1 CCB-only install | User `%LOCALAPPDATA%\CCB-Wanding\.claude` preserved; `$INSTALL` gains `AionUi\` |
| A6 | route-b | `resolveInstallDir()` returns `$INSTALL` without `D:\CCB-Wanding` fallback |

## Verification commands

```powershell
cd D:\Projects\claude-code-best\ccb-installer\scripts
.\build-wanding.ps1
# Install CCB-Wanding-x.y.z.exe on clean VM or test user

cd D:\Projects\claude-code-best
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
```

## Risks

| Risk | Mitigation |
|------|------------|
| Staging size / NSIS timeout | Whitelist §3–§5 explicit excludes; no `node_modules` in dist |
| Duplicate aioncore paths | Single bundled copy under `AionUi\resources\bundled-aioncore` only |
| AionUI user data vs CCB config | Keep `%APPDATA%\AionUi\` separate (whitelist §1) |
| Old shortcuts (`launch-ccb-wanding.ps1`) | NSIS delete obsolete desktop links on upgrade |

## Phased rollout

| Phase | Scope |
|-------|-------|
| **MVP (this task)** | Merged NSIS + build script + smoke |
| **Phase 2** | `internal-update.md` hot-update zip paths for bundled layout |
| **Phase 3** | Update manifest `installMode: bundled` |

## Related completed work

- `06-11-org-knowledge-aioncore` — center API + dual JWT
- `06-19-org-knowledge-vps-deploy` — VPS `67.216.206.3:13401` live
- `ensure-wanding-settings.ps1` + `resources/org-server.json` — employee URL auto-seed on CCB install
