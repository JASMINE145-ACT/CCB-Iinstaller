# Lightweight approach + full relay（产品决策记录）

Date: 2026-07-20  
Source: 用户确认「可以先记录」+「报价要把结果返回 orchestra，orchestra 就是转发，不要缺斤少两」

## Lightweight（三刀）

1. **减 PostToolUse**：默认保留 match→select nudge + select-ok relay nudge；评估 tiers / knowledge-mark / mutate-invalidate。
2. **L1 分层**：常驻决策表+硬禁令+GOOD/BAD+**结果正文义务**；填单/learn-by-data/Org mutate 按需；长表 maint。
3. **设定**：查价 fail-open；写路径严；`modes off` ≠ 关 PostToolUse。

目标 L1 ~120–180 行。禁盲删锚点（绑 07-11 inventory）。

## Full relay（不缺斤少两）

```text
quotation-agent  ──完整结果正文──▶  orchestrator  ──原样转发──▶  用户
```

**子最小交付集（有则必写）：** 锁码 · 单价 · 推荐一句 · 货源要点（若调名录）· 库存（若已查）

**父义务：** 转发上述字段；禁止只说「已交给报价专家」；可排版，不可省略关键数字/编码。

Contracts: `WANd.QUOTE.RETURN.FULL.001`（子）+ `WANd.QUOTE.ORCH.RELAY.STRICT.001`（父）。

## Implementation gate

仍须用户「批准 / 执行」后再改代码。本文件仅记录决策。
