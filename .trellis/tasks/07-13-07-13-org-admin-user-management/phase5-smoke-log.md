# Phase 5.1–5.5 — acceptance smoke log

> Date: 2026-07-14  
> Environment: VPS aionorg `http://67.216.206.3:13401` + desktop org UI  
> Verdict: **ACCEPTED** (user)

## Passed (user + API)

| Item | Result |
|------|--------|
| Create user | OK |
| Assign capabilities (price / supplier write) | OK |
| Delete user | OK (after pool.begin txn fix redeploy) |
| Admin still loginable after deletes | OK (`POST /login` 200) |
| Remaining fleet | `admin`, `yjc`, `liankexin`, `zjz`, `qps` |
| Admin visible in Users table | OK (was filtered; UI merge + backend list include) |
| Create form username/password rules in UI | OK (local aionui-src) |

## Optional not re-run at close

- Soft-disable → login reject (C2)
- Non-admin DELETE → 403
- Deleted-user old token → 401

## Deferred (not blocking this slice)

- 5.6+ reset password / promote admin UI / search / encoding / org-chart fidelity
- Formal `smoke-delete-user.ps1` automation
