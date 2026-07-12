# Research — 知识库更新误路由价库（2026-07-11）

## Symptom

User:「测试一下 知识库更新 随便弄一个 test 加进去」

Observed:

1. `Skill: price-library-edit`
2. Delegate `quotation-agent`
3. `mcp__price-library__get_price_library_draft`
4. `mcp__price-library__upsert_price_library_item`

## Expected (product lock)

| Intent | Path |
|--------|------|
| Org business knowledge | `quotation-agent` → `append_business_rule` |
| Price library | `price-library-agent` → upsert / `price-library-edit` |
| Bare「知识库」 | Clarify once, then route |

## Root cause

1. Lexicon collision: 知识库 vs 价格库/价库  
2. `quotation-agent` tool decision table missing `append_business_rule` row  
3. `wande-orchestrator` routing table missing disambiguation + price-library row  
4. `price-library-edit` skill fired on「知识库」

## Sources

- Live chat transcript 2026-07-11  
- `quotation-agent.md` §共享知识库写入 / 工具决策表  
- `org-knowledge.md` § Agent write path  
- `wande-orchestrator.md` 路由表  
- `price-library-edit/SKILL.md` description  

## Confidence

High — misroute reproduced in production chat; correct contracts already documented but not discoverable in decision tables.
