# Phase 4.1 + 4.3 done — Settings 组织 + 架构图

**Date:** 2026-07-13  
**Repo:** `D:\Projects\aionui-src`

## 交付

| 项 | 说明 |
|----|------|
| 路由 | `/settings/org`（用户 / 架构 Tab）；`/org-users` → 重定向 |
| 设置侧栏 | 仅系统管理员可见「组织」 |
| 主侧栏 | 已去掉「组织用户」入口 |
| 业务权限勾选 | 价格库写入 / 供应商写入（白名单两值） |
| 架构图 | 只读树，按直属上级 |

## 主要文件

- `pages/settings/OrgSettingsPage.tsx`
- `pages/orgUsers/OrgUsersPage`（embedded + capabilities）
- `pages/orgUsers/OrgStructurePanel.tsx`
- `SettingsSider.tsx`、`Router.tsx`、`Sider/index.tsx`
- `orgUsers.json` 中文文案

## 依赖

后端 Phase 4.2（迁移 026 + 写接口鉴权）须已部署到公司服务器后，勾选权限才真正生效。
