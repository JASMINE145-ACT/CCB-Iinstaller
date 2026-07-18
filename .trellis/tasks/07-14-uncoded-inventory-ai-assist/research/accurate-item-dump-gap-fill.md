# Research — Accurate Item dump → store → price gap-fill (2026-07-14)

User lock: (1) API 抓 Accurate (2) 存放好 (3) 对比价格库查缺补漏.

## Existing code

| Piece | Path | Gap |
|-------|------|-----|
| `GET /api/item/list.do` | `python/inventory/lib/api/client.py` `get_table_data("item")` | Needs keywords / `filter.no` today → **no unfiltered dump** |
| Search + detail | `python/inventory/agents/table_agent.py` | Per-query, not full catalog |
| Local slim index | `item-list-slim.xlsx` via `resolver.py` / `ITEM_LIST_SLIM_PATH` | Prebuilt offline — **not** refreshed by API today |
| Price gap-fill | `upsert_price_library_item` / xlsx `preview|apply_price_library_import` → draft → `publish` | Confirmed workflow exists |

## Implications for plan

1. **ITEM_DUMP** is net-new: **batch/paginated** list (± detail enrich); user OK with 分批拉 (2026-07-14).
2. **ITEM_STORE** should refresh slim xlsx (repo pattern) + optional jsonl snapshot for audit.
3. **PRICE_GAP_FILL**: codes in Accurate store but not in price library → draft import only; **no silent overwrite** of tier prices; publish is explicit `price_admin` step.

## Contracts (provisional)

- `WANd.ACCURATE.ITEM_DUMP.001`
- `WANd.ACCURATE.ITEM_STORE.001`
- `WANd.ORG.PRICE_GAP_FILL.001`
