# Regression note — no reply after USER_TURN strip (2026-07-14)

## Symptom
Tool/Agent 成功（子 agent 有库存表），父会话 **无最终文字**。Transcript：

```text
… tool_result → assistant: API Error: 400 invalid params, 400 (2013)
```

Sessions: `8a0e0887` / `34c2ba5f`（`minimax-m3-thinking`）。

## Evidence
- 子 agent 正常综合；父会话续跑 API 400。
- 对失败 jsonl 重放 `normalize`+`ensureToolResultPairing`：**tool_use/tool_result id 对齐**，结构合法。
- MiniMax 2013 常与 tool pairing / invalid params 相关；本次 opaque message 未带 `tool id not found` 细节。

## Action (immediate)
**已全量回滚** `D:\claude-code-B\src\utils\messages.ts`（+ tests）→ rebuild → deploy `D:\CCB-Wanding\dist`。

请用户：**新开 Guid** 再测 `001754`（旧会话可能已含 API Error 污染）。

## Next (after smoke recovers)
USER_TURN.001 改走更窄方案：只在 `mergeUserMessages` 时丢弃 sentinel 文本块，**不要** 全局 skip user message / 改变 `ensureToolResultPairing` 空分支。
