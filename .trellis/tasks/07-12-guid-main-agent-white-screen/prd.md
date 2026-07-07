# Guid 主 agent 发消息后白屏 / 首条丢失

**Status:** draft  
**Created:** 2026-07-06  
**Scenario:** 用户从 Guid 默认入口（wande-orchestrator）发送首条消息后白屏；历史会话亦报告「闪烁 + 需发第二次」。

## Goal

稳定复现并修复 **Guid → 会话页** 首条消息链路中的白屏/闪烁/首条丢失；区分 **dev HMR 干扰** vs **真实 product bug**。

## Symptoms (user report 2026-07-06)

| # | Symptom | When |
|---|---------|------|
| S1 | 主 agent 发对话后 **白屏** | Guid 默认 orchestrator，发首条后 |
| S2 | 白屏闪烁，过一会才进会话 | 历史报告（journal 2026-07-06） |
| S3 | 第一次消息未出现，需再发一次 | 历史报告 |

## Evidence (planning session)

- Dev log `28298`: `POST /api/conversations` 201，`preset_assistant_id=wande-orchestrator`（23:51:14）
- **无** `acpConversation.sendMessage` / `POST .../messages` 记录 → 首条未达 backend 或 renderer 在 send 前崩溃/重载
- **23:51:34 / 23:52:31** Vite `(client) page reload` — `SiderWorkTasksEntry.tsx` + `workTasks.json`（07-03 未提交改动）
- aionui-src 本地未提交 diff 涉及：`useGuidSend.ts`（07-08 `CCB_DEFAULT_SESSION_AGENT_ID`）、`SiderWorkTasksEntry`（07-03）、`useTaskbarAttentionBadge`（07-05）、`GuidPage` memory banner（07-06）

## Non-goals

- quotation / learn-by-data / knowledge gate 业务逻辑（除非 prove 首条 send 被 hook 阻断）
- packaged exe 性能 parity

## Acceptance criteria

- [ ] **AC1** 稳定 dev 环境（无并发 HMR）下，Guid 默认发首条 → 无白屏，单条 user bubble + agent 响应
- [ ] **AC2** CDP / main log 有 `sendMessage` 201 + `[useAcpInitialMessage] send_accepted` 或等效
- [ ] **AC3** 若根因为 HMR：文档化 dev 约束；若根因为代码：单元/E2E 回归
- [ ] **AC4** `chat-acp-flow.md` 或 journal 更新根因与 fix

## Related tasks (suspect map)

| Task | Suspect mechanism | Priority |
|------|-------------------|----------|
| 07-03-work-tasks-center-sync | Sider HMR full reload | P0 |
| 07-05-message-attention-taskbar-badge | Layout global hook | P1 |
| 07-08-platform-agent-registry-acp-lint | `useGuidSend` ccbProfileId staging | P1 |
| 07-11-conversation-survives-upgrade | knowledge hooks（首条不应触发） | P3 |
| 07-06-learn-by-data-* | vendor/python only | P3 |
