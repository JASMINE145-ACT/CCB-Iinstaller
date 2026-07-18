# Dual-call 合同 — WANd.TRADE.SOURCING.DUAL.001

## 触发

用户意图 ∈ {询价, 查价, 选型, 价+库存}，且关键词可映射为产品/品类。

**不触发（只调名录）：** 纯工厂地址 / 联系人 / 车型推荐。

## 同轮工具

| 工具 | 作用 |
|------|------|
| `mcp__quotation__match_quotation` 或 `_batch` | 价库 SKU |
| `mcp__supplier-directory__suppliers_hybrid_match` | 谁有货 + 证据 |

禁止用价库 `supplier` 列冒充名录。禁止编造未返回的厂。

## 合成回复形态（硬）

```text
1) 推荐（B档）：<料号> <名称> <单价若有>
   选型理由：<一行>
2) 其他可能：≤4 bullet（可选）
3) 货源（名录）：
   - <厂名> — <snippet 或 matched_fields 摘要>
   （无命中）名录未找到相关工厂
```

| 字段 | 来源 | 禁止 |
|------|------|------|
| 推荐料号/价 | quotation MCP | 猜价 |
| 货源厂名 | hybrid `items[]` | 未返回厂 |
| 证据 | `snippet` / `matched_fields` | 业务 md Grep |

## 写路径（不变）

| 写入 | 工具 | 权限 |
|------|------|------|
| 名录 | `suppliers_upsert` 等 | 白名单 + confirmed |
| 知识库 | `append_business_rule` | confirmed + org token |
| 价库 | `upsert_price_library_item` | price_admin + draft |

## Guid / 路由

- **唯一卡：** `quotation-agent`（含 supplier MCP；读+写）
- **`supplier-directory-agent`：** 已移除；`package.json` alias → `quotation-agent`
