# CCB-Wanding 2.0.0 — Ops release notes

> Merges `release-notes-ops-draft-2.0.0-stale-purge.md` + full-bundle ship facts.

## Artifact

| Item | Value |
|------|-------|
| Exe | `ccb-installer\CCB-Wanding-2.0.0.exe` |
| SHA256 | `67D427CB76266AA7F4D0D31A239D8A1B520FE5321FC9C3D0C1300AA2E3F02A54` |
| Size | 939,916,550 bytes |
| config_generation | **8** |
| Delivery | `delivery-2.0.0-2026-07-18.md` |

## Must-land pair (install self-heal)

1. NSIS `DirectoryLeave` stale purge + Start Menu list/purge.
2. AionUI desktop with `ccbWandingRuntimeNode` resolve（Programs + HKCU）— **this Full NSIS rebuild includes both**.

## Symptom matrix

| Symptom | Expectation after 2.0.0 |
|---------|-------------------------|
| **A** 无法读取当前安装版本信息 | Purge + resolve; update panel should read Programs tree |
| Multi-root leftover | Prompt on GUI install; `/S` = auto-Apply（IT pre-approval） |
| **B** `.env.accurate` / price-library paths | Not fixed by purge alone — bootstrap `ensure-wanding-settings`; staging spot-check confirms `price_library_main.py` shipped |

## Silent `/S`

Treat as **IT pre-approval** of stale purge. Abort on detect/purge failure. Do not use `/S` if a second intentional install tree must be kept.

## Post-install commands

```powershell
$INSTALL = "$env:LOCALAPPDATA\Programs\CCB-Wanding"
& "$INSTALL\scripts\test-install-health.ps1" -InstallDir $INSTALL
& "$INSTALL\scripts\test-mcp-health.ps1" -InstallDir $INSTALL -Repair -Probe -Session
# Expect .config-generation.json = 8 after first bootstrap reset
```

## Deferred

- Field dual-tree employee VM evidence → IT post-ship
- VPS org API deploy → ops after ship

## §6.9

Any fix after this exe → repack + new SHA256. Do not hot-patch staging alone for release.
