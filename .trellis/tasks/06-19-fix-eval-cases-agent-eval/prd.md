# fix-eval-cases-agent-eval

## Goal

修复 `eval/agent_eval_cases.jsonl` 中经 review 发现的设计缺陷，使 eval cases 能准确、无冗余地覆盖各 agent 行为。

## Decision (ADR-lite)

**E2E sequential 依赖处理**
- Context: cases 39/40 依赖 38 的状态，harness 当前按独立 case 跑
- Decision: **让 input 自包含**（在 input 里写入已完成步骤的上下文，如文件路径、已生成报价单的假设状态）
- Consequence: harness 无需改动；input 稍长但每个 case 可独立运行

**Session 组精简**
- Decision: 删除 6 个与非 session 组实质重复的 case：`session-open-no-excel-on-price`(47)、`session-open-qingshan-first-turn`(52)、`session-open-multi-3-parallel`(53)、`session-open-candidates-first-turn`(57)、`session-open-no-thinking-delegate`(58)、`session-open-anti-skip-mcp`(59)
- Consequence: session 组从 16 → 10，覆盖 greet / cross-contamination / stock first turn / combined tool / tax level / fill / attachment / parse 等 session-specific 行为

**permission-email-blocked 期望行为**
- Decision: orchestrator 遇到高风险外发操作应请求确认（返回确认提示），不应直接 delegate 到 agent
- 修改为 `allow_empty_tools: true`，明确 `forbidden_tools: ["mcp__gmail__","mcp__email__","mcp__accurate__"]`

**批量策略统一**
- Decision: ≤10 件用 parallel match_quotation，不用 batch；`quote-multi-parallel-3`(10) 补加 `forbidden_tools: ["mcp__quotation__match_quotation_batch"]`，删除现已冗余的 session-open-multi-3-parallel(53)

## Requirements

### P0（必修）

1. **新增批量续批 case**
   - id: `quote-multi-over-10-continuation`
   - input: 12 件产品（超过 batch size），期望 agent 在 `items_truncated: true` 后继续调用直到全部完成
   - `must_not: ["return_partial_without_continuation","drop_items_silently"]`

2. **E2E cases 39/40 改为自包含 input**
   - case 39 (correction): input 补充"在上一步已生成报价单，路径为工作区默认路径"
   - case 40 (remarks O列): input 补充"报价单文件已在工作区路径 `%APPDATA%\AionUi\quotation-workspace\draft.xlsx`"

3. **`permission-email-blocked` 字段修正**
   - 改 `expected_tools` → 移除（改用 `allow_empty_tools: true`）
   - 补 `forbidden_tools: ["mcp__gmail__","mcp__email__","mcp__accurate__"]`

### P1（应做）

4. **`excel-missing-file` 补 forbidden_tools**
   - 加 `"forbidden_tools": ["Agent","mcp__quotation__match_quotation"]`

5. **`quote-multi-parallel-3` 补 batch forbidden**
   - 加 `"mcp__quotation__match_quotation_batch"` 到 forbidden_tools

6. **精简 session 冗余 case（删除 6 条）**
   - 删: 47, 52, 53, 57, 58, 59

## Acceptance Criteria

- [ ] 新增 `quote-multi-over-10-continuation` case
- [ ] cases 39/40 input 自包含，可独立运行
- [ ] `permission-email-blocked` 有完整 `forbidden_tools`，移除歧义 `expected_tools`
- [ ] `excel-missing-file` 有 `forbidden_tools`
- [ ] `quote-multi-parallel-3` 禁了 batch
- [ ] 6 个冗余 session case 已删除
- [ ] jsonl 每行合法 JSON，无重复 id，总数从 59 → 54（-6+1）

## Definition of Done

- `eval/agent_eval_cases.jsonl` 可用 `jq` 或 Python json 逐行解析无报错
- 无重复 id（`jq -r '.id' | sort | uniq -d` 输出为空）
- 所有 P0 + P1 项完成

## Out of Scope

- 不改 eval harness 代码
- 不添加新 agent / 新 MCP tool 的 eval
- 不修改 E2E 场景的业务逻辑（只改 input 措辞和字段）

## Technical Notes

- 文件：`eval/agent_eval_cases.jsonl`（59 条）
- 删除 ids: session-open-no-excel-on-price, session-open-qingshan-first-turn, session-open-multi-3-parallel, session-open-candidates-first-turn, session-open-no-thinking-delegate, session-open-anti-skip-mcp
- 新增: quote-multi-over-10-continuation
- 修改: cases 39(quote-fill-correction-no-rematch), 40(quote-fill-remarks-o-column-only), 17-18(permission-email-blocked), 20(excel-missing-file), 10(quote-multi-parallel-3)
