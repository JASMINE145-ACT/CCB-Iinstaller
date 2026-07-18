# PRD — Org Mutate 家族第一步（知识库 K + Foundation）

## Goal

把价库 / 业务知识库 / 供应商目录纳入统一的 **Org Mutate**「对库修改」协议；本任务交付该协议的 **Foundation 契约**，并以业务知识库为第一实现域完成 **`delete_business_rule` + append 预算硬规则**——不是孤立补丁。

## Spine（全家共用）

```text
preview → 用户确认 → apply → audit/history → shadow/缓存同步
```

沉淀机制**不拥有写库权**，只生成 Org Mutate Proposal → Inbox approve → 再调统一 mutate MCP（与手工 Agent / Guid 同一治理链）。

## Locked (2026-07-14)

| 项 | 决定 |
|----|------|
| MVP | **K + Foundation**（**不做**供应商 delete） |
| K | `delete_business_rule` + append budget 三硬规则 |
| Foundation | `WANd.ORG.MUTATE.UX.001`；knowledge 首实现；价库/供应商 **字段别名兼容、渐进对齐** |
| Delete 语义 | Markdown **去块**；revision **history 保留**；可 UI/REST revert |
| Delete 定位 | 新块 stamp `block_id`；旧块 `content_hash + doc_version + snippet`；多匹配 `AMBIGUOUS_MATCH` |
| **Delete RBAC（MVP，吸收 system-review）** | **不得**「任意 org JWT 可删」。须满足其一：`is_admin` / manager 角色 / capability `org_knowledge.write`（若已存在）/ **feature flag** / **仅 test slug**。未配门禁时 delete **只允许 preview**（`FORBIDDEN` on apply） |
| Smoke | **禁止**默认打生产 `wanding_business_knowledge`；用 **test slug** 或可 revert fixture + 记录 version before/after |
| Phase S / P1 | 供应商 delete；get/list/revert MCP；`update_business_rule`；长期 write RBAC 产品化 |
| Out | §4.1 seed Save；沉淀 funnel 大改（契约 + 负向说明；跨任务 PROMOTION） |

## Unified envelope

见 execution-plan；knowledge MVP 必返回子集，**append 旧字段保留兼容**（`rule_text`/`section`/`requires_confirmation` 仍可用）。

`error_code` ∈ `AUTH_REQUIRED|FORBIDDEN|CONFLICT|AMBIGUOUS_MATCH|LIMIT_EXCEEDED|NEAR_DUPLICATE`

## Append budget 硬规则

1. 超硬顶 → `LIMIT_EXCEEDED`（禁静默截断）  
2. 禁拆块（L1 + 测）  
3. 近重 → `NEAR_DUPLICATE`（算法：`research/near-duplicate-append.md`）

## Acceptance

- [ ] Spec + registry：`WANd.ORG.MUTATE.UX.001`  
- [ ] delete：可追溯；locator 兼容旧块；RBAC/test-slug gate；Guid/test smoke  
- [ ] append：envelope 子集 + 旧字段；预算三规则  
- [ ] implement/check.jsonl 非空；task 元数据与 K+Foundation 一致  
- [ ] 提交边界：Phase 0 docs ≠ Phase 1 code  
- [ ] code-reviewer + unit + smoke PASS  
