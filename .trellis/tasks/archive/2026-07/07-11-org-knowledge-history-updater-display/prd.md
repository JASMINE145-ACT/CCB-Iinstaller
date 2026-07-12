# PRD — Org Knowledge 历史版本「更新人」显示账号名

> **Task:** `07-11-org-knowledge-history-updater-display`  
> **Status:** completed (2026-07-11, user smoke OK)  
> **Priority:** P2  
> **Date:** 2026-07-11

## One-line

**组织知识库 `/org-knowledge` 历史版本列表的「更新人」应显示登录账号名（如 `admin`、`yjc`），而不是 `user_019ede87-…` 内部 ID。**

## Problem

用户截图：`#/org-knowledge` → 历史版本 → `更新人：user_019ede87-9c27-7352-8087-584b78b69b2e`。

根因：

| 层 | 现状 |
|----|------|
| API | `OrgKnowledgeRevisionResponse.updated_by_id` 仅 ID |
| UI | `OrgKnowledgePage` 直接 `{ user: item.updated_by_id }` |
| 先例 | Work Tasks 已有 `assignee: PublicUser` / `created_by: PublicUser` |

## In scope

- 历史列表 +（若 doc 摘要区有同类展示）统一显示 username
- AionCore org-knowledge service 解析 user id → username
- aionui 类型 + 渲染

## Out of scope

- 用户改名后历史审计名是否回溯（见设计选项 B）
- Work Tasks / Preview 历史（不同模块）
- 新建 Trellis task 以外的 MCP agent 审计 UI

## Acceptance

- [x] **AC1** 历史版本行显示 `更新人：admin`（或对应账号），非 `user_*` ID — **PASS 2026-07-11**
- [x] **AC2** 用户已删除或查不到时，降级为短 ID 或 i18n「未知用户」，不空白、不 crash — **PASS** (helper + legacy map)
- [x] **AC3** MCP / UI 保存 / 回退 actor 解析 — **PASS** (listMembers + backend join)
- [x] **AC4** API 契约测试 + UI 单测/手工 smoke — **8+7 tests PASS; user smoke**
- [x] **AC5** `org-knowledge.md` spec 补充 `updated_by` 字段说明 — **done**

## Related

- Spec: `.trellis/spec/integration/org-knowledge.md`
- UI: `aionui-src/.../OrgKnowledgePage/index.tsx:301`
- API: `AionCore/crates/aionui-api-types/src/org_knowledge.rs`
