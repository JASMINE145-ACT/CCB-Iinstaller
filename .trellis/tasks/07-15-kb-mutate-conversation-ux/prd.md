# PRD — 业务知识库 Mutate 对话体验

## Goal

修好 Guid / 报价专家路径上 **业务知识库 append → confirm → apply / delete** 的对话体验与权限一致性：减少「中断感」与多余回合，保留 Org Mutate 双阶段安全语义；**UI 外观可差异，业务已配置的 mutate 逻辑必须与 MCP 复刻对齐**。

## Incident（2026-07-15 Guid）

1. 用户要追加 `test` → agent 预览 → 用户答 `ok` 被拒 → 再答 `确认` / `执行` 才落库（doc 16→17，`block_id=f32f0e87002f`）。
2. 用户要删除该块 → preview OK → apply `FORBIDDEN`（生产 slug 无 env/test 门禁）；agent 只抛运维选项。
3. 用户反馈：**中断**很影响体验；流程**繁琐**；要求再挖其它问题。

## Locked doctrine

| 项 | 决定 |
|----|------|
| Mutate spine | **保留** `preview → user confirm → apply`（`WANd.ORG.MUTATE.UX.001`）— 不取消二次确认 |
| UI vs 业务 | UI 交互控件可不同（按钮 / chip / 自然语言）；**envelope / error_code / RBAC / locator / budget** 必须与已配置 Org Mutate 一致 |
| Parent | `07-14-kb-business-completeness` — 不重开 K+Foundation 后端 MVP；本任务接 UX + P1-RBAC 产品化 + 确认词表 |
| Prod smoke | 默认仍禁随意对生产 slug 做破坏性冒烟；清理 incident 块走 **UI** 或临时 flag / 真实 admin JWT（本任务修门禁后） |

## Problems to fix（含再发现）

| # | Problem | Severity |
|---|---------|----------|
| P1 | **中断感**：预览后停轮等待确认；删流程同样；偶发同轮无合成（历史「戛然而止」） | UX P0 |
| P2 | **确认过繁**：硬词「确认/同意」拒 `ok`/`删除`；删侧未写死词表却更保守；多轮复读 | UX P0 |
| P3 | **删权限谎言**：spec/PRD 写 `is_admin`；代码只看 `ORG_KNOWLEDGE_MCP_DELETE` / `ORG_KNOWLEDGE_DELETE_IS_ADMIN` / `*_test` — JWT admin 仍 FORBIDDEN | Product P0 |
| P4 | **写删不对称**：任意 org JWT 可 append apply；delete apply 锁死；`#/org-knowledge` PUT 又任意可改全文 — 违背「业务逻辑复刻」 | Product P0 |
| P5 | Guid 默认生产 slug；测试/清理易卡 FORBIDDEN；agent 英文门禁原文 | UX P1 |
| P6 | Delete L1 缺 append 级「同轮展示 preview」硬块 | UX P1 |

## Acceptance

- [x] 确认词表规范落地（L1）：接受明确肯定（含 `ok`/`好的`/`可以`/`删除`（当语境=确认 delete apply））；仍拒绝含糊 / 改内容指令
- [x] Append **与** Delete：preview 后同轮可见合成硬约束（L1）
- [x] Delete apply：JWT admin / `org_knowledge.write`（经 `GET /api/auth/user`）可通过；无权限中文 FORBIDDEN
- [x] Spec：`org-mutate-ux.md` + `org-knowledge.md` + registry
- [x] Unit + L1 ForceMd + vendor sync
- [ ] Guid smoke（用户）+ incident `test` 块清理

## Out of scope

- 取消二次确认 / 静默写生产库
- Phase S 供应商 delete
- 全文大改仍只走 `#/org-knowledge`（不强制 MCP `update_business_rule`）
- 关闭 parent task 的 Phase 4 smoke（可并行引用）

## Related

- Spec: `.trellis/spec/integration/org-mutate-ux.md`, `org-knowledge.md`
- Parent backlog: `P1-RBAC-product`
- Agent: `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md`
- Gate code: `python/admin/org_knowledge_mutate.py` `can_apply_knowledge_delete`
