# PRD — Word 文档颗粒度优化（DocumentSpec + MCP 宏渲染）

> Task: `07-16-word-skill-mcp-granularity`  
> Status: planning  
> Priority: P1  
> **Route:** **A** — MCP-only 宏化，不动 architecture lock  
> Parent: [`07-13-word-creator-document-toolchain`](../07-13-word-creator-document-toolchain/prd.md)

## One-line

在 **MCP-only** 前提下，用 **DocumentSpec AST + 稳定 block id + 事务幂等 + 双层校验** 把 113 次原子调用降为 ≤15–20 次 **可观察、可精准 patch** 的宏/微调用 —— 不是 10 个 opaque bulk blob。

## 背景

- 痛点：word-creator 报告生成 100+ 次 `mcp__office-word__*`，慢且难编排。
- 约束：`word-creator` MCP-only；禁止 officecli / skill（见 agents-unified-model + word-creator.md）。
- 用户补充（2026-07-16）：**仅降调用次数不够**；必须保留文档可控性与可靠性。

## 目标

1. **P0** MCP 调用 ≤15–20（含校验；PDF +1）。
2. **P0** **DocumentSpec / AST** 作为 compose 中间表示（非 opaque bulk）。
3. **P0** **section_id + block_id** 锚定 docx，支持精准 micro patch。
4. **P0** **事务、幂等、失败恢复**（apply_id、backup、rollback、分批 commit）。
5. **P0** **结构校验 + 渲染校验** 双层 Gate（spec 合法 + 产物对齐 manifest）。
6. **P1** `word-mcp-skill-boundary.md` + orchestrator 委派 DocumentSpec 模板。

## 非目标

- 不给 word-creator 引入 skill / officecli（Route A）。
- 不 fork 未 pin 的外部 document-SKILLs。
- 不在本任务完成 pdf-toolkit 入站全链路。

## Phase 1（P0）— 六项并列（非仅 bulk + SOP）

| # | 工作包 | 交付 |
|---|--------|------|
| 1 | **DocumentSpec / AST** | JSON schema + 示例 + `research/documentspec-ast-design.md` 升格为 spec 附录 |
| 2 | **section_id / block_id** | bookmark 锚点 + render manifest |
| 3 | **Bulk MCP** | `render_document_spec`, `patch_block_by_id`, `get_document_manifest` |
| 4 | **事务 / 幂等 / 恢复** | apply envelope, backup, rollback tool, run-report.json |
| 5 | **结构 + 渲染校验** | `validate_document_spec`, `validate_rendered_document` |
| 6 | **SOP** | word-creator.md + orchestrator brief：compose 必须走 DocumentSpec |

## Phase 2（P1）

- `word-mcp-skill-boundary.md`（54-tool 分类 + DocumentSpec 路由）
- smoke baseline 场景 + call count 证据

## Phase 3

- Contract Verification + spec 沉淀

## 验收标准

1. 同 baseline 场景 **≤20 MCP calls**。
2. DocumentSpec → render → **Gate S + Gate R** 均 PASS。
3. 对指定 `block_id` 的 patch **1–2 次 MCP**，manifest 更新，Gate R 仍 PASS。
4. 模拟 mid-render 失败 → backup restore 成功，run-report 可追溯。
5. `word-mcp-skill-boundary.md` 落盘。

## 风险

| 风险 | 缓解 |
|------|------|
| bulk 变 opaque | DocumentSpec + manifest 强制 |
| bookmark 与 outline 漂移 | Gate R manifest 对齐 |
| vendor MCP 扩展成本 | 最小 5-tool 集；escape hatch 保留 atomic |
| orchestrator 不传 spec | 委派模板 + 缺 spec 则 refuse compose |

## 关联

- Research: `research/scope-conflict-review.md`, `research/documentspec-ast-design.md`
- Agent: `ccb-installer/config/agents/word-creator.md`
- Spec: `agents-unified-model.md` § Word Creator MCP-only
