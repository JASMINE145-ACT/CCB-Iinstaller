# Mixing

**Mixing** is the product meta-repository for WanD / CCB-Wanding: desktop shell (AionUi) + backend + installer pipeline.

This repo does **not** duplicate source code. It pins two submodules at known commits and documents how to build and run.

## Repositories

| Path | Submodule | Role |
|------|-----------|------|
| `backend/` | [CCB-Iinstaller](https://github.com/JASMINE145-ACT/CCB-Iinstaller) | CCB-Wanding CLI, MCP, Python, `ccb-installer/`, Trellis |
| `desktop/` | [AionUi fork](https://github.com/JASMINE145-ACT/AionUi) | Electron Mixing UI, CCB Guid, org SSO, work tasks |

> **First-time setup:** Fork [iOfficeAI/AionUi](https://github.com/iOfficeAI/AionUi) to `JASMINE145-ACT/AionUi` and push branch `ccb-wanding-1.1.2-recovered` before cloning submodules.

## Clone

```powershell
git clone --recurse-submodules https://github.com/JASMINE145-ACT/Mixing.git
cd Mixing
```

If you already cloned without submodules:

```powershell
git submodule update --init --recursive
```

## Build (full staging)

```powershell
cd backend
.\ccb-installer\scripts\build-wanding.ps1 -Version 1.1.3-dev -SkipNsis
```

## Daily dev / recovered runtime

```powershell
# Bundled Mixing UI (recommended for WanD Guid cards)
.\backend\ccb-installer\scripts\recover-aionui-new-ui.ps1

# Or after install to D:\CCB-Wanding
D:\CCB-Wanding\ccb-launch-aionui.cmd
```

```powershell
# Source dev (requires CCB bootstrap — shows upstream shell if misconfigured)
.\backend\ccb-installer\scripts\start-aionui-dev.ps1 -BootstrapMode Quick
```

## Install layout

| What | Where |
|------|--------|
| Dev install slot | `D:\CCB-Wanding` |
| User Claude config | `%LOCALAPPDATA%\CCB-Wanding\.claude` |
| Org server config | `%APPDATA%\AionUi\aionui\org-server.json` |
| Release baseline (oracle) | `backend/ccb-installer/staging/` |

## Tags

| Tag | Meaning |
|-----|---------|
| `v1.1.2-recovered` | Runtime recovery complete; submodule SHAs pinned |

### Pinned commits (2026-06-26)

| Submodule | Branch | Commit |
|-----------|--------|--------|
| `backend/` | `main` | `4432998e` (CCB-Iinstaller) |
| `desktop/` | `ccb-wanding-1.1.2-recovered` | `109aa15` (AionUi fork) |

## What not to commit here

- `backend/ccb-installer/staging/` (generated)
- `D:\CCB-Wanding` (installed runtime)
- Secrets (`sso.env`, `env.local`, API keys)

## Docs

- Recovery status: `backend/.trellis/tasks/06-26-aionui-source-level-recovery/status.md`
- Boundary: `backend/.trellis/spec/integration/aionui-ccb-boundary.md`
