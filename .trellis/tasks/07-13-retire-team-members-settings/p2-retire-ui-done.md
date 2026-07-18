# Phase 2–3 done — retire Team Members settings

**Date:** 2026-07-13  
**Task:** `07-13-retire-team-members-settings`

## Changes (aionui-src)

| File | Change |
|------|--------|
| `common/config/settingsNavContract.ts` | **added** — `SETTINGS_TEAM_MEMBERS_ENABLED=false`, redirect map |
| `tests/unit/settings/teamMembersRetired.test.ts` | **added** — 3 GREEN |
| `SettingsSider.tsx` | removed team-members nav insert |
| `Router.tsx` | `/settings/team-members` → Navigate `/settings/org` |
| `TeamMembersPage.tsx` | **deleted** |
| `ipcBridge.ts` `auth` | only `currentUser`; removed createUser/listUsers/updateWorkTaskRole |
| `workTaskTypes.ts` | removed CreateTeamUserParams / UpdateTeamUserRoleParams |

**Preserved:** `workTask.listMembers` → `GET /api/users`; `/api/auth/internal/users/system*`; Settings → 组织.

## Evidence

| Gate | Result |
|------|--------|
| GREEN | `bun test tests/unit/settings/teamMembersRetired.test.ts` — 3 pass |
| code-reviewer | **PASS** — Layer A PASS, Layer B PASS ([review](cb741bad-b4a7-4d7c-9202-facc6f4d4ea0)) |
| test-agent | **PASS** ([verify](ea02708a-bdc6-42ce-bc14-07cfe9395dc3)) |

## Manual smoke (human)

- [x] manager：设置无「团队成员」；任务仍可指派
- [x] admin：设置 → 组织可建号
- [x] `#/settings/team-members` → 组织页（无建号表单）

**Confirmed:** 2026-07-14 用户「没问题」
