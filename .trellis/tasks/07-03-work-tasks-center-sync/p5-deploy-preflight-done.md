# P5 deploy preflight — 2026-07-09

**Operator:** agent (local automation)

## Completed locally

| Step | Result |
|------|--------|
| `scripts/build-aioncore-work-tasks.cmd` | **PASS** — release build ~9m30s, exit 0 |
| Binary | `AionCore/target/release/aioncore.exe` (2026-07-09 15:05) |
| Migration 020 | present |
| `cargo test -p aionui-work-tasks` | **20/20 PASS** |
| `vitest workTaskTypes.test.ts` | **10/10 PASS** |
| P5 frontend bridge | `workTaskAttachmentBridge.ts` present |

## Org VPS smoke (before deploy)

| Check | Result |
|-------|--------|
| admin login | **PASS** |
| `work_task_role` | manager |
| `GET /api/work-tasks` JWT | **PASS** |
| migration 020 on VPS | **unknown** — needs post-deploy verify |

## Remaining (user / SSH)

1. `.\scripts\deploy-org-aioncore-vps.ps1 -ExtractOnRemote`
2. VPS: `cargo build --release -p aionui-app && systemctl restart aionorg`
3. Ship AionUI with P5 changes (dev or exe)
4. Manual: employee upload + manager metadata-only

## Verify script

```powershell
.\scripts\org-phase0\verify-work-tasks-p5.ps1 -OrgSmoke
```
