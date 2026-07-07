# 消息提醒 — 任务栏未读角标（Cursor 式补全）

## Goal

在已有 **OS Toast + 侧边栏蓝点**（task `07-01-agent-attention-notifications`）基础上，补全 **任务栏 / Dock 数字角标**（1、2、3…），使用户在不看侧边栏时也能感知后台 Agent 未读注意力。

## Background

用户期望体验对齐 Cursor：
1. 任务完成后出现系统通知，点击跳转到对应会话 — **已实现**
2. 应用图标（任务栏）显示未读数量 — **未实现（原 PRD P2）**

## In scope (proposed)

1. 从现有 `permissionUnreadConversationIds` ∪ `completionUnreadConversationIds` 计算未读**会话数**
2. Renderer → Main IPC 同步 count
3. macOS `app.dock.setBadgeCount`；Windows `app.setBadgeCount`（或 overlay fallback）
4. 进入会话清除 unread 时角标同步减少
5. Spec + smoke 更新

## Out of scope (initial)

- Work Tasks / Cron / Team 未读汇总（除非产品另行确认）
- 新 WS 事件、Toast 文案改动
- Tray 托盘独立角标

## Acceptance criteria

- [x] 后台会话完成或需权限时，任务栏角标 +1（按会话，不重复计数）— code complete
- [x] 用户打开该会话后角标 -1 — reuses existing clear paths
- [x] 全部为 0 时角标清除
- [x] Toast 关闭时角标仍更新（与现有 spec 一致）
- [x] 点击 Toast 仍跳转会话（回归 07-01）— user smoke 2026-07-06
- [x] Windows 手工 smoke 通过 — user confirmed 2026-07-06

## Product lock (2026-07-05)

- 按会话数 · Windows only · 07-01 触发规则 · 角标独立于 notificationEnabled

## Hotfix (2026-07-06)

`subscribeConversationListSync` 未 export → dev 白屏；已 export。见 journal `journal-2026-07-06-taskbar-badge-memory-ui.md`。
