# Phase 2 done — AionUI `#/org-users`

**Date:** 2026-07-13  
**Contract:** `WANd.ORG.USER_ADMIN.001`

## Delivered

| Item | Path |
|------|------|
| Types | `aionui-src/.../orgUsers/orgUserTypes.ts` |
| Bridge | `ipcBridge.orgUsers` → `/api/org-users` |
| Page | `#/org-users` create/edit (password create-only) |
| Sider | `SiderOrgUsersEntry` — visible iff `orgUser.is_admin` |
| Auth | `AuthUser.is_admin` |
| i18n | `zh-CN` / `en-US` `orgUsers.json` |

## Gates

- code-reviewer: **PASS** (Layer A PASS, Layer B PASS)
- Layer B smoke: `smoke-renderer-imports.mjs` PASS (icons-only)

## Manual smoke (needs running app + VPS with Phase 1 aioncore)

```text
admin login → sider「组织用户」→ create with 采购部 → list shows dept
manager login → no sider entry; #/org-users shows admin-only alert
```

## Next

Phase 3: deploy aioncore to VPS + `vps-smoke-log.md`

## UI 文案（中文少英文）— 2026-07-13

`zh-CN/orgUsers.json` 已去掉面向用户的英文词：

| 原 | 现 |
|----|----|
| `is_admin` | 系统管理员 |
| `HTTP {{status}}` | 状态 {{status}} |
| 任务角色 | 角色 |
| 组织中心 / 组织服务器 | 公司服务器（告警） |
| 组织用户管理（长标题） | 组织用户 |
