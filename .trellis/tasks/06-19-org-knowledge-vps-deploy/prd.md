# Org knowledge — VPS production deploy (2026-06-19)

## Goal

Run **center org aioncore** on public VPS so employee AionUI + quotation MCP read shared `wanding_business_knowledge` via API.

## Target

| Item | Value |
|------|-------|
| Host | `67.216.206.3` (`hot-snap-1`) |
| SSH | `39222` |
| HTTP | `13401` |
| Remote root | `/opt/aionorg` |
| Service | `aionorg.service` |

## What we did

1. **Scope confirmed** — Phase 1 center only hosts org knowledge (+ org users). Chat/tasks/MCP stay local.
2. **Upload fix** — Do **not** `scp -r AionCore` (includes ~9GB `target/`). Pack source ~50MB: `tar --exclude=target --exclude=data-org`.
3. **Scripts** — `scripts/deploy-org-aioncore-vps.ps1`, `scripts/vps-org-aioncore-bootstrap.sh`.
4. **VPS build** — `cargo build --release -p aionui-app` (~17m).
5. **Bootstrap** — `--local` once; seed from `/opt/aionorg/data` (8 md slugs present on server).
6. **Production** — `systemd` `aionorg`, `--host 0.0.0.0 --cors-any`.
7. **Employee config** — `%APPDATA%\AionUi\aionui\org-server.json` → `http://67.216.206.3:13401`.

## Verification

- External: `GET http://67.216.206.3:13401/api/auth/status` → `needs_setup: false`
- SSH: `POST /login` with bootstrap admin → JWT token
- `systemctl status aionorg` → active (running)

## Ops notes

- **`POST /api/webui/reset-password` fails in production** — endpoint is `--local` only; CSRF required on POST. Password set during bootstrap only.
- **Admin password** stored in operator notes / bootstrap log — **never commit**.
- **Pending:** `ufw allow from <office-ip>/32 to 13401`; AionUI org-login UI smoke; MCP `[KNOWLEDGE_SOURCE] Org API` smoke.

## Runbook

```powershell
cd D:\Projects\claude-code-best\scripts
.\deploy-org-aioncore-vps.ps1 -MvpSeedOnly -ExtractOnRemote
# SSH: /opt/aionorg/bootstrap.sh  (if not -ExtractOnRemote)
```

Docs: [`docs/org-knowledge-deploy.md`](../../../docs/org-knowledge-deploy.md) §4.

---

## Phase 0 follow-up (2026-06-19 员工机)

| Item | Status |
|------|--------|
| Admin → manager (VPS) | ✅ Python/SQLite |
| Employee `yjc` on VPS | ✅ |
| `org-server.json` + no-BOM fix | ✅ |
| Local dev user `yjc` | ✅ |
| `start-aionui-dev-org-test.ps1` | ✅ |
| Login linkage code (aionui-src) | ✅ |
| UI stuck / runtime reconcile | ✅ aionui-src |
| MCP `[KNOWLEDGE_SOURCE] Org API` smoke | ⏳ |

Session journal: [`.trellis/workspace/JASMINE145-ACT/journal-1.md`](../../workspace/JASMINE145-ACT/journal-1.md) § 2026-06-19 Phase 0 员工机联调.
