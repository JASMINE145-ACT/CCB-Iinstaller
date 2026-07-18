# Phase 2 ITEM_STORE — done

- Slim writer: `python/inventory/services/item_store.py` (atomic xlsx replace + raw jsonl)
- Output (local, gitignored `data/*.xlsx`): `data/item-list-slim.xlsx` + `data/accurate-item-dump-*.jsonl`
- Schema: `Item Code` / `Item Name` / `Chinese name`（Accurate `charField3` → Chinese；live cn 7346/8316）
- Review: code-reviewer PASS
