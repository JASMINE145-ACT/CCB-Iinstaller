# Single VPS deploy — Phase 2 + Phase 3

**When:** after Phase 0–3 code is ready (2026-07-14)  
**Goal:** one `aionorg` rebuild/restart covers price CAP_GATE + work-task scope

## Bundle

| Area | Artifact |
|------|----------|
| AionCore | migrations 025–027 (if not applied), price rbac, work-tasks `scope.rs`, audit writers |
| MCP (desktop / install sync) | `mcp_servers/price-library-server/dist/index.js` |
| MCP | `mcp_servers/work-tasks-query-server/index.mjs` |

## Steps

1. Pack/upload AionCore → extract under `/opt/aionorg` (or `deploy-org-aioncore-vps.ps1 -ExtractOnRemote`; if scp stalls on `data/`, manual tar extract is OK)
2. `cargo build --release -p aionui-app`
3. Backup SQLite → `systemctl restart aionorg`
4. **Do not** run `bootstrap.sh` on live fleet
5. Sync the two MCP paths above into the client install / vendor MCP tree when shipping CCB

## Smoke after restart

- `GET /api/org-users` → 401 without cookie (service up) — **PASS 2026-07-14** (`vps-deploy-p2-p3-done.md`)
- Price write without `price_library.write` / non-admin → 403 *(auth follow-up)*
- Manager `GET /api/work-tasks/query` → only self + direct_reports tasks *(auth follow-up)*
- Manager `?scope=company` → 403; admin `scope=company` → OK *(auth follow-up)*

## Not in this deploy

- Phase 4 UI polish / supplier write widen
- Phase 3.3 full AI orchestrator smoke (manual later)
