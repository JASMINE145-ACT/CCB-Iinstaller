# Risk follow-ups (Top 10 audit) — 2026-07-16

| Risk | Action taken |
|------|----------------|
| P1 resolve 「未核验」 | Confirmed prior work in aionui-src; no code change. Ops draft notes both ship pieces. |
| P1 Symptom B deferred | `ccb-installer/release-notes-ops-draft-2.0.0-stale-purge.md` + ensure-wanding-settings IT snippet |
| P2 post-check narrow | `Get-RemainingProgramFootprints` + residual WARN in purge script; smoke case 6 (locked exe) |
| P2 STALE_REPORT UX | Report → `%LOCALAPPDATA%\CCB-Wanding\logs\...`; IfFileExists branch; quit AionUI text |
| P2 process kill | Documented in NSI MessageBox + `ccb-purge-stale-installs.cmd` |
| P2 shortcut COM | No change (NSIS uses `-SkipShortcuts`) |
| P2 ship↔NSI auto校验 | Existing packing smoke extended (assertions); no new build gate |
| P2 silent `/S` | Preserve `IfSilent` → `Call DirectoryLeave`; fail-closed Abort；§17.7 + ops draft |
| P3 AV silent fail | WARN on residual delete + expanded post-check |
| P3 kill under AionUI | Same quit tips |

Review: code-reviewer **PASS** (A6 silent+uninstall planes); smokes PASS.

Smokes: `test-purge-stale-wanding-installs.ps1` · `test-purge-packaging-wiring.ps1`
