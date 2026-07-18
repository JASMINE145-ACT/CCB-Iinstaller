# Research — `(no content)` after Agent/MCP

**Date:** 2026-07-14  
**Scenario:** C（bug）— systematic diagnose before fix  
**Explore:** Agent explore + prior task `06-29-price-tiers-synthesis-and-seed-fallback`

## Symptom chain

```text
User: 001754 查询库存
  → Agent(quotation-agent) → get_inventory_by_code OK (name, qty=0)
Model thinks: The user's last message was "(no content)"
  → Wrong reply: 「还有什么需要帮忙…上一轮已返回」
User follow-up: 的确是有的对吧只不过是没库存？
  → Same empty-turn deflection instead of confirming catalog hit + zero stock
```

## Evidence

| Artifact | Finding |
|----------|---------|
| Dist `createUserMessage` | `content: e \|\| '(no content)'` |
| UI / Ink path | `trim() === '(no content)'` → **don't render bubble** |
| ACP `agent.ts` `prompt` | Empty inbound prompt → `end_turn`; **does not** strip sentinel from history |
| Thinking quote | Literal `(no content)` → almost certainly **in context**, not pure hallucination |
| Related PRD | 06-29 tiers：tool OK then「你最后一条消息没有内容」 |

## Ranked hypotheses

1. **P0** Invisible user turn with sentinel after tool/Agent continue path (createUserMessage falsy).  
2. Model mislabels tool_result user-role as “no content” (weaker if thinking quotes sentinel).  
3. Real follow-up lost; later empty turn wins.  
4. AionUI auto-empty `session/prompt` (secondary; sentinel string is ccb).  

## Fix layer recommendation

| Layer | Action |
|-------|--------|
| **ccb-src primary** | Stop writing sentinel into API history; strip `(no content)` / empty meta continues in normalize |
| **Mitigation** | PostToolUse / agent ROE: after inventory/Agent success, forbid empty-user deflection |
| **aionui secondary** | Log prompts around Agent done; verify follow-up integrity |

## Contract (provisional)

`WANd.ACP.USER_TURN.001` — model-facing history must not contain empty/`(no content)` user text turns after tool_result/Agent completion; UI hide must match API exclude.
