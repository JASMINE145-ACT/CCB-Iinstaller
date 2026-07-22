"""Persist Accurate item dump to slim xlsx + jsonl (WANd.ACCURATE.ITEM_STORE.001)."""
from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Sequence

from inventory.services.item_dump import normalize_item_code, row_code

COL_CODE = "Item Code"
COL_NAME = "Item Name"
COL_CHINESE = "Chinese name"
SLIM_COLUMNS = (COL_CODE, COL_NAME, COL_CHINESE)


def rows_to_slim_records(rows: Sequence[dict]) -> List[Dict[str, str]]:
    records: List[Dict[str, str]] = []
    seen = set()
    for row in rows:
        if not isinstance(row, dict):
            continue
        code = row_code(row)
        if not code or code in seen:
            continue
        seen.add(code)
        name = str(row.get("name") or row.get(COL_NAME) or "").strip()
        chinese = str(
            row.get("charField3")
            or row.get("chineseName")
            or row.get("chinese")
            or row.get(COL_CHINESE)
            or ""
        ).strip()
        if chinese.lower() in {"nan", "none", "nat"}:
            chinese = ""
        records.append({COL_CODE: code, COL_NAME: name, COL_CHINESE: chinese})
    return records


def write_slim_xlsx(records: Sequence[Dict[str, str]], dest: Path) -> Path:
    import pandas as pd

    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    df = pd.DataFrame(list(records), columns=list(SLIM_COLUMNS))
    # Atomic replace: write temp then replace
    fd, tmp_name = tempfile.mkstemp(suffix=".xlsx", dir=str(dest.parent))
    os.close(fd)
    tmp_path = Path(tmp_name)
    try:
        df.to_excel(tmp_path, index=False)
        tmp_path.replace(dest)
    except Exception:
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
        raise
    return dest


def write_raw_jsonl(rows: Sequence[dict], dest: Path) -> Path:
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    return dest


def default_dump_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def codes_from_slim_records(records: Sequence[Dict[str, str]]) -> set[str]:
    return {normalize_item_code(r.get(COL_CODE)) for r in records if normalize_item_code(r.get(COL_CODE))}
