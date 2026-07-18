# Research — inventory without code (2026-07-14)

Source: explore agent + specs (`agents-unified-model`, quotation MCP, inventory Python).

## Capability today

| Path | Works without Accurate code? | Notes |
|------|------------------------------|-------|
| `match_quotation` → `get_inventory_by_code` | No | Needs code from **price library / mapping** |
| Quotation MCP `search_inventory` | N/A | **Not registered** on MCP surface (legacy; agent must not call) |
| Python `handle_search_inventory` / AOL `item/list.do` | **Yes** | Name/keywords → candidates + qty |
| Accurate UI (domestic) | Ops-only | VPN/CN UI — out of AI product loop |

**Gap for 堵漏王：** 不在价库 → match 空 → 无码 → 库存工具链断。仓库真有，系统侧只能靠**码**或**未暴露的按名搜**。

## AI integration thesis

1. **P0 主闭环 = 编码映射清单**（业务同事已说清）— AI 是**建表/补码/对账**助手。
2. **P1 = 重新接线 `search_inventory`** — AI/Agent 在「价库 miss」时按名搜 AOL，**多候选人确认**后再 `get_inventory_by_code`。
3. **P2 = 价库 enrichment** — 确认过的映射/AOL 结果建议写入价库杂项 SKU，减少下次无码。

Anti-pattern: 「AI 直接猜库存」或假装已有 `match_price_and_get_inventory`。

## Provisional contracts

- `WANd.INV.CODE_MAP.001` — curated ZH/ID ↔ Accurate code
- `WANd.INV.NAME_SEARCH.001` — MCP `search_inventory` re-expose
- `WANd.INV.PRICE_MISS_STOCK.001` — price miss → map/search → stock（禁瞎报）

## Open product decisions

- Map storage: CSV in vendor data vs Org API vs price-library rows with flag
- Who confirms: quotation-agent vs price-library-agent vs Excel + human
