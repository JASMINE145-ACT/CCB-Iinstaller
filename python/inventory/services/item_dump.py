"""Accurate Item dump merge + checkpoint helpers (WANd.ACCURATE.ITEM_DUMP.001)."""
from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Optional, Set

FetchPageFn = Callable[[int, int], List[dict]]


def normalize_item_code(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none", "nat"}:
        return ""
    return text


def row_code(row: dict) -> str:
    return normalize_item_code(row.get("no") or row.get("Item Code") or row.get("code") or "")


def merge_pages(
    pages: Iterable[List[dict]],
    *,
    dedupe_by_code: bool = True,
) -> List[dict]:
    """Merge list.do pages; prefer first occurrence per Item Code (`no`)."""
    out: List[dict] = []
    seen: Set[str] = set()
    for page in pages:
        for row in page or []:
            if not isinstance(row, dict):
                continue
            code = row_code(row)
            if dedupe_by_code and code:
                if code in seen:
                    continue
                seen.add(code)
            out.append(row)
    return out


def dump_all_pages(
    fetch_page: FetchPageFn,
    *,
    page_size: int = 100,
    max_pages: int = 500,
    start_page: int = 1,
    sleep_s: float = 0.0,
    stop_when_empty: bool = True,
    stop_when_duplicate_page: bool = True,
) -> List[dict]:
    """
    Call fetch_page(page, page_size) from start_page.. until stop.
    fetch_page must return a list of row dicts (may be empty).
    Duplicate-page stop only triggers when the page id-set is non-empty
    (omitting `id` from fields must not truncate after page 1).
    """
    if page_size < 1:
        raise ValueError("page_size must be >= 1")
    if start_page < 1:
        raise ValueError("start_page must be >= 1")
    pages: List[List[dict]] = []
    last_ids: Optional[Set[Any]] = None
    end_page = start_page + max_pages - 1
    for page in range(start_page, end_page + 1):
        rows = fetch_page(page, page_size) or []
        if stop_when_empty and not rows:
            break
        ids = {r.get("id") for r in rows if isinstance(r, dict) and r.get("id") is not None}
        if (
            stop_when_duplicate_page
            and last_ids is not None
            and ids
            and ids == last_ids
        ):
            break
        pages.append(rows)
        last_ids = ids if ids else last_ids
        if sleep_s > 0:
            time.sleep(sleep_s)
        if len(rows) < page_size:
            break
    return merge_pages(pages)


def save_checkpoint(path: Path, state: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def load_checkpoint(path: Path) -> Optional[Dict[str, Any]]:
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def extract_list_rows(api_result: dict) -> List[dict]:
    if not api_result or not api_result.get("s"):
        return []
    data = api_result.get("d", [])
    if isinstance(data, dict):
        data = data.get("r", [])
    return data if isinstance(data, list) else []
