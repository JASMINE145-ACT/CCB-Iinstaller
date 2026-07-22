# 报价 Agent L1 同步 + 仅查价 Eval 覆盖 + Relay 守门

## Goal

修复 2026-07-19 真实会话里 `quotation-agent` 委派返回的 3 重失败:
1. 子代理最终 assistant 文本踩 L1 禁止的 BAD 形态(「按 A 选项已交付」「C 1」错位引用);
2. 父代理(orchestrator)没按 `WANd.ORCH.OUTCOME_RELAY.001` 转述子代理的工具 trace 结果(8020020755 ¥1,219 + 6 货源);
3. install seed `staging/seed/agents/quotation-agent.md` 与 source `packages/.../quotation-agent.md` 不一致(7/18 vs 7/20,~7KB 新内容缺失)。

新增机器兜底,让同种问题下次直接被 grader / hook 拦下,不再等用户触发。

## User-Visible Symptom(原话)

> 刚才报价专家返回的结果里没有具体的物料价格表,只有一个"待继续确认"的状态——可能是「直接 50」这个关键词太短、不足以命中价格库中的具体物料。

实际工具 trace:
- `match_quotation` → 10 候选(含 `8020020755` ¥1,219, `source=共同`)
- `suppliers_hybrid_match` → 6 工厂
- `select_quotation_candidates` → `status: ok` 锁码 `8020020755`

数据齐,文本坏。

## Requirements(契约)

| # | 契约 | 行为 |
|---|------|------|
| R1 | `WANd.QUOTE.SEED.SYNC.001`(新建) | `staging/seed/agents/quotation-agent.md` 字节大小 = `packages/vertical/com.wanding.trade/agents/quotation-agent.md`,SHA256 一致。`deploy-seed-agents.ps1 -ForceMd` 后 live install 哈希也一致。 |
| R2 | `WANd.EVAL.CASE.PRICE_ONLY.001`(新建) | 新 eval case `.agent-eval/cases/quotation-direct50-price-only.json`,prompt = "查询直接 50 的 B 级价格",grader 锁死:工具链 = `match + supplier + select`(无 `inventory.query` / `get_inventory`);`select.input.items[0].candidates[*].code` ⊇ `{8020020755}`;assistant.text 含 `8020020755` + `1219` + ≥3 `name_zh` + 不含 A/B/C 菜单式追问。 |
| R3 | `WANd.QUOTE.RELAY.GUARD.001`(新建) | PostToolUse 钩子 `post-quotation-relay-nudge.py` 挂在 `mcp__quotation__select_quotation_candidates` 返回 `status:ok` 之后:若 assistant 上下文里**未**引用任一 `selections[*].code`,注入一条非阻塞 nudge「下一条 assistant 文本必须包含锁码 X」。`modes.json` `quotation-agent:relay-guard` 默认 `off`(只 nudge 不阻断),与现有 `:knowledge` 一致。 |
| R4 | `WANd.QUOTE.ORCH.RELAY.STRICT.001`(新建) | 父代理(orchestrator)对子代理返回的"查询类"结果(无 artifact)必须**原样转述**至少一个锁码 + 单价。现有 `WANd.ORCH.OUTCOME_RELAY.001` 已有规范,本 task 在 spec 引用并新增 L1 段强化「不得用『待继续确认』式总结覆盖子代理的具体锁码」。 |

## Out of Scope

- 改 `select_quotation_candidates` 本身的 LLM 选型逻辑(eval 已 PASS 单次,flaky 在子代理文本生成)。
- 改父代理(orchestrator)Stop hook `modes.json: wande-orchestrator:outcome-relay`(已 `block`,行为已对)。
- 迁移 84 个 legacy eval case。
- UI 手工验证(Guid 客户端)— 本 task 不改 AionUI。

## Acceptance Criteria

| ID | 内容 | 验证命令 |
|----|------|---------|
| AC1 | staging 与 source 字节/SHA256 一致 | `(Get-FileHash ...).Hash -eq (Get-FileHash ...).Hash` |
| AC2 | `deploy-seed-agents.ps1 -ForceMd` 后 live 与 source 一致 | 同上,`$env:LOCALAPPDATA\CCB-Wanding\.claude\agents\quotation-agent.md` |
| AC3 | 新 eval case 锁定(`status: locked`, `case_hash` 非空) | `node agent-eval-plugin/scripts/agent-eval.mjs confirm --case-file .agent-eval/cases/quotation-direct50-price-only.json --confirmed` |
| AC4 | 新 eval case 跑 1 个 trial 用 mock 候选,`structured_output` PASS + `tool_forbidden` PASS | `node agent-eval-plugin/scripts/agent-eval.mjs run --case-file ... --trials 1` |
| AC5 | 新 hook 在 `select_quotation_candidates` 返回 ok 时注入 nudge,自身 pytest 绿 | `python -m pytest ccb-installer/config/skills/ccb-subagent-gate/scripts/__tests__/test_post_quotation_relay_nudge.py` |
| AC6 | spec 更新到 `.trellis/spec/integration/agents-unified-model.md` § Quotation 选型 + relay | `git diff --stat .trellis/spec/integration/agents-unified-model.md` |
| AC7 | 现有 `quotation-direct50-price-stock` 回归不破(≥ 0/3 PASS 不下降) | 同 case run 比对 |

## Risk Tags

- `migration` — deploy 改 live install,需 GUID 新会话
- `ui` — 改 agent L1,父代理 relay 段,用户会看到
- `long-running` — 全流程含 deploy + 新 session + 多次 eval run

## Technical Notes

- L1 prompt 模板以 `packages/vertical/com.wanding.trade/agents/quotation-agent.md`(2026-07-20)为权威源,`staging/seed/...` 是 install 时的 seed。
- 兄弟 task `07-19-eval-case-50-50-price-and-stock` 已 closeout,模板与 normalizer 已支持 `match_quotation_batch` 别名 → `quotation.match`,但**没有** "无 inventory" 路径的 case。
- 兄弟 task `07-19-selection-api-and-evidence-harness` 已实现 `select_quotation_candidates` MCP + 正常化 + eval harness,本 task 不重写。
- PostToolUse 钩子范例:`post-match-knowledge-nudge.py`(多候选 nudge select),`post-price-tiers-nudge.py`(tiers 后 read data.Md)。新 `post-quotation-relay-nudge.py` 沿用其模板(acp_unwrap + session dedupe + log dir)。
