# CCB-Wanding 1.1.9 — full NSIS delivery (2026-07-12)

## Artifact

| Item | Value |
|------|-------|
| **Installer** | `ccb-installer\CCB-Wanding-1.1.9.exe` |
| **Size** | 934,716,049 bytes (~891.4 MB) |
| **SHA256** | `94DE17B10220D171829C8B46552853A38D2B6050942FFE336451BDF02C0E6998` |
| **Built** | 2026-07-12 ~22:08 local |
| **dist/VERSION** | `1.1.9` |
| **aioncore** | v0.1.29 embedded (`AionCore\target-1.1.9\release\aioncore.exe` — supplier-directory crate) |
| **BUILD-INFO** | claude-code-B `e3bffd10` (dirty), aionui `be8ff2c` (clean), skip_aionui_build=true (reuse of same-session Full rebuild) |
| **config_generation** | `7` (supplier-directory MCP + agent seeds + WeCom docs fleet-hide) |
| **Log** | `ccb-installer\build-1.1.9-staging-nsis.log` |

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

## Git SHAs

| Repo | Commit |
|------|--------|
| claude-code-best | `891d9be2` (+ prior `cc9e3aa0` release prep) |
| aionui-src | `be8ff2c` |
| AionCore | `750e28d` |
