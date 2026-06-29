# Delivery status — 侧栏知识库 / 价格库（平级入口）

**Date:** 2026-06-30 (updated)  
**Task:** `06-30-sider-org-database-group`

## Revision (2026-06-30)

折叠「数据库」分组已撤销。知识库、价格库恢复为与「定时任务」「任务」一致的 **图标 + 文字** 平级侧栏行。

| Item | Location |
|------|----------|
| Flat org knowledge entry | `SiderNav/SiderOrgKnowledgeEntry.tsx` |
| Flat price library entry | `SiderNav/SiderPriceLibraryEntry.tsx` |
| Wired in main sider | `Sider/index.tsx` (after `SiderWorkTasksEntry`) |
| Removed | `SiderOrgDatabaseSection.tsx` (collapsible parent + collapsed dropdown) |
| Spec | `.trellis/spec/frontend/file-map.md` |

## Behavior

- Expanded sider: 搜索 → 定时任务 → 任务 → **知识库** → **价格库**（同级、同高、同 padding）
- Collapsed sider: 知识库、价格库各一个独立图标（与任务/定时任务一致）
- `!isOrgServerConfigured()`: both entries hidden (unchanged gate)
- Routes / pages / IPC: unchanged

## Smoke (manual)

```powershell
.\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap
# Login → expand sider → 知识库 / 价格库 与 任务 视觉一致
# Collapse sider → 两个独立图标
```
