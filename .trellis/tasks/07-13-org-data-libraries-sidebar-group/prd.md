# 侧栏「数据库」折叠组

> **Task:** `07-13-org-data-libraries-sidebar-group`  
> **Date:** 2026-07-13  
> **Status:** planning → ready to start  
> **Package:** `aionui-src` (renderer Sider)

## One-line

把组织级「库」（知识库 / 价格库 / 供应商）收进侧栏可折叠 **「数据库」** 组；组头与「定时任务 / 工作任务」同款（图标 + 文案 + 折叠箭头）。

## Locked decisions（用户 2026-07-13）

| 项 | 决定 |
|----|------|
| 组头文案 | **数据库**（en: Data libraries） |
| 组头视觉 | 与定时任务/工作任务一致：`h-34px` + `@icon-park` 图标 + 文案 + 右侧 caret |
| 子项顺序 | 知识库 → 价格库 → 供应商 |
| 记忆 | **组外**独立（个人域） |
| 扩展 | registry 驱动，新库只加一行 |

## Acceptance

- [ ] AC-1 org 已配置时出现「数据库」组，含三子项
- [ ] AC-2 组头点击展开/收起；`localStorage` 持久化；子路由 active 时自动展开并高亮子项
- [ ] AC-3 侧栏 collapsed 模式无回归（tooltip / 点击）
- [ ] AC-4 新库只需改 registry + route + i18n
- [ ] AC-5 zh/en 齐全；供应商标题不硬编码

## Out of scope

- 各库页面内部 UI
- 移入 Settings
- AionCore / VPS API

## Primary code

- `aionui-src/.../Sider/index.tsx`
- 新：`SiderDataLibrariesSection.tsx` + `dataLibrariesNavRegistry.ts`
- 仿：`TeamSiderSection.tsx` / `SiderWorkTasksEntry.tsx`
