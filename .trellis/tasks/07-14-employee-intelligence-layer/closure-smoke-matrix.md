# Closure smoke matrix (MVP)

> Run before claiming Business Closure complete. Authority: `business-closure-contract.md` §0.  
> **Mixing acceptance 2026-07-15:** **PASS** — `mixing-acceptance-done.md` (min-green bundle).

| # | Story | Expect | Evidence |
|---|-------|--------|----------|
| 1 | Admin create user + grant `price_library.write` | 200; audit row | Mixing PASS (bundled) |
| 2 | Non-admin **without** cap: REST price write | **403**; audit denied | Mixing PASS (bundled) |
| 3 | Same via MCP mutating tool | **403**; audit denied | Mixing PASS (bundled) |
| 4 | Same user **with** cap: REST+MCP write | **200**; audit ok | Mixing PASS (bundled) |
| 5 | Suspend user → login | fail | optional |
| 6 | Suspended → MCP mutate | **403** | optional |
| 7 | Manager NL / query → only direct reports | no foreign assignees | Mixing PASS (bundled) |
| 8 | Employee query other user tasks | deny | Mixing PASS (bundled) |
| 9 | Admin reset password | target login new pwd; admin session alive | Mixing PASS (bundled) |
| 10 | Demote last admin / delete self | **400** | optional |

Env `PRICE_ADMIN_USERNAMES` and `WORK_TASKS_AGENT_ROLE` must **not** be required for rows 2–4 / 7–8 to pass.

