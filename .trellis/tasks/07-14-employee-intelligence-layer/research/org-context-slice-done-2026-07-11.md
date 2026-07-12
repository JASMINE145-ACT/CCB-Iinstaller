# EIL Org Context Slice — delivery evidence (2026-07-11)

| Contract | Verification | Result |
|----------|--------------|--------|
| `WANd.EMPLOYEE.ORG_CONTEXT.001` | `cargo test -p aionui-auth t7_4_me_context` | PASS |
| `WANd.EMPLOYEE.ORG_CONTEXT.001` | `bun test employeeOrgContextShared.test.ts` (aionui-src) | PASS 3/3 |
| `WANd.EMPLOYEE.SUBAGENT_INHERIT.001` | CCB `employeeProfile.test.ts` org + legacy override cases | PASS (see deploy build) |
| `WANd.EMPLOYEE.SETTINGS_MERGE.001` | UI read-only Descriptions + save disabled while orgLoading | impl; manual smoke pending |

## Manual smoke (user)

1. Org SSO login (`yjc` / admin)
2. VPS: set `yjc.department = 采购部` (SQL or admin tool)
3. Settings → notes only editable; org section read-only
4. New chat →「我是谁」→ 采购部 (not stale client dept)
5. Delegate quotation-agent → same identity (P9 script)

## Deploy notes

- AionCore migration `021_employee_org_identity.sql` must apply on org VPS before context API returns dept.
- CCB: `sync-claude-code-b-mcp-prefetch.ps1 -Build -Deploy`
- aionui-src changes are external to meta-repo commit.
