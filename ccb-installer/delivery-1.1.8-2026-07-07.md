# CCB-Wanding 1.1.8 — full NSIS delivery (2026-07-07)

## Artifact

| Item | Value |
|------|-------|
| **Installer** | `ccb-installer\CCB-Wanding-1.1.8.exe` |
| **Size** | 936,173,982 bytes (~892.9 MB) |
| **SHA256** | `E0FF6B97C8E402A0AAAD1B3BFC50805B1AE20A2CD80482E47C449237F164FA37` |
| **Built** | 2026-07-07 ~16:41 local (build ~50 min) |
| **dist/VERSION** | `1.1.8` |
| **aioncore** | v0.1.29 embedded (`AionCore\target\release\aioncore.exe`) |
| **BUILD-INFO** | ccb `3fca9093` (clean), claude-code-B `e3bffd10` (dirty), aionui `6c65cce` (dirty) |
| **config_generation** | `6` (org mapping SKILL §D + skill refresh on upgrade) |
| **Log** | `ccb-installer\build-1.1.8-staging-nsis.log` |

## Scope vs 1.1.7

| Area | 1.1.8 change |
|------|----------------|
| **Org 历史报价** | Python `org_mapping_client` + MCP mapping tools; fleet reads VPS `/api/quotation-mapping/active` (803 rows on VPS) |
| **drat 螺纹弯头** | `wanding_fuzzy_matcher.py` synonym + thread-gender fix |
| **learn-by-data §D** | SKILL org path; `append_quotation_mapping_pending` org-aware |
| **AionUI** | Rebuilt `6c65cce` (delegation / work-tasks parity) |
| **VPS** | Not modified by installer; runtime requires org login + new Guid session |

## Build verification (automated)

| Gate | Result |
|------|--------|
| Pre-flight `test-package-health-split.ps1` | **2/2 PASS** |
| Agent eval schema | **80/80 PASS** |
| CCB overlay sync | **PASS** |
| Staging validation (`Test-StagingWanDInstall`) | **PASS** — 53 files + Route B + app.asar |
| NSIS payload coverage | **PASS** (log: generation 5 seed block message; ship manifest **gen 6** in staging) |
| Staging spot-check | `org_mapping_client.py` ✅; `lookup_quotation_mapping` in MCP dist ✅ |
| NSIS build | **PASS** — 1 warning LegalCopyright zh-CN |

## Install notes

```powershell
# Silent upgrade (preserves %LOCALAPPDATA%\CCB-Wanding\.claude)
.\ccb-installer\CCB-Wanding-1.1.8.exe /S /D=D:\CCB-Wanding

# After install — deploy agents/skills if config gen bumped:
.\ccb-installer\scripts\test-mcp-health.ps1 -InstallDir D:\CCB-Wanding -Repair

# Recommended smoke:
.\ccb-installer\scripts\run-agent-eval-suite.ps1 -Suite smoke -Run -InstallDir D:\CCB-Wanding -Json
```

## Manual acceptance (post-install)

- [ ] Org SSO login → **新建 Guid 会话**
- [ ] `match_quotation` → source 含 **历史报价**（VPS org 803 rows）
- [ ] Optional: `Elbow drat ½" AW` → 内螺纹弯头推荐
- [ ] `quotation-learn-by-data` SKILL 含 org 路径表

## Ops (not run in this build)

- `publish-update-bundle.ps1` + VPS manifest row for 1.1.8
- VPS DB changes (none required — mapping already bootstrap)

## Git

- Release code commit: `3fca9093 feat(wanding): org-primary historical mapping, drat matcher, and 1.1.8 release prep`
