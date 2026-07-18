# Phase 1 done — Audit + admin ops + lifecycle MCP gate

**Date:** 2026-07-14  
**Parent:** `07-14-employee-intelligence-layer`  
**Contract:** `business-closure-contract.md` (Phases 1.1–1.5)

## Delivered

| Workstream | Evidence |
|------------|----------|
| 1.1 `employee_audit_log` | Migration `027_employee_audit_log.sql`; `SqliteEmployeeAuditRepository`; `insert_audit_event_round_trips` PASS |
| 1.2 Reset password + target-only invalidate | `POST /api/org-users/{id}/reset-password`; bumps target `users.jwt_secret` only; `reset_password_bumps_only_target_session_version` PASS |
| 1.3 `is_admin` API + UI | `OrgUserUpdateRequest.is_admin` + last-admin / system_default guards; OrgUsersPage checkbox + reset-password modal (`aionui-src`) |
| 1.4 MCP lifecycle gate | Auth middleware employment allowlist; work-tasks MCP fail-closed on missing/forbidden status; REST 401 |
| 1.5 Audit hooks | Admin org_user.* → ledger; middleware `auth.lifecycle_denied` on mutate + `/api/auth/user` + `/me/context`; `suspended_user_get_auth_user_writes_lifecycle_audit` PASS |

## Verification (agents)

| Gate | Verdict | Agent / command |
|------|---------|-----------------|
| Code-reviewer | **PASS** | Layer A PASS; Layer B N/A; Runtime Crash OK |
| Security-review | **PASS** | No Critical/High on Phase 1 controls |
| Tests | **PASS** | `aionui-db` audit insert; `aionui-work-tasks` service_integration 29 ok; `aionui-auth` middleware lifecycle audit |

## Remaining (not Phase 1)

- Phase 2: price write shared gate (REST + MCP) + close `PRICE_ADMIN_USERNAMES` hole for non-admin closure smoke  
- Phase 3: scope `direct_reports`; deprecate `WORK_TASKS_AGENT_ROLE`  
- VPS redeploy aioncore for live org paths
