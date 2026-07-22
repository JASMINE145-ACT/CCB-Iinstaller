#!/usr/bin/env python3
"""CLI: dump Accurate items (paginated) → slim xlsx + jsonl → optional gap report.

Contracts: WANd.ACCURATE.ITEM_DUMP.001 / ITEM_STORE.001 / PRICE_GAP_FILL.001
Does NOT publish price library — gap report is draft-only.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

PYTHON_ROOT = Path(__file__).resolve().parents[2]
PROJECT_ROOT = PYTHON_ROOT.parent
if str(PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ROOT))


def _load_accurate_env() -> None:
    """Load AOL_* from known `.env.accurate` locations (utf-8-sig safe)."""
    candidates = [
        PYTHON_ROOT / ".env.accurate",
        PYTHON_ROOT / "inventory" / ".env.accurate",
        PROJECT_ROOT / "ccb-installer" / "vendor" / "wanding" / ".env.accurate",
        Path(os.environ.get("WANDING_ENV_ACCURATE", "")),
    ]
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    for path in candidates:
        if path and path.is_file():
            load_dotenv(path, override=True, encoding="utf-8-sig")
            return


_load_accurate_env()

from inventory.config import config
from inventory.lib.api.client import AccurateOnlineAPIClient
from inventory.services.item_dump import dump_all_pages, extract_list_rows, save_checkpoint
from inventory.services.item_store import (
    default_dump_stamp,
    rows_to_slim_records,
    write_raw_jsonl,
    write_slim_xlsx,
)
from inventory.services.price_gap_fill import (
    gap_codes,
    load_codes_from_price_library_xlsx,
    load_codes_from_slim_xlsx,
    write_gap_report_csv,
)


DEFAULT_FIELDS = "id,no,name,charField3"


def _fetch_factory(client, fields: str, keywords: str | None):
    def fetch_page(page: int, page_size: int):
        params = {
            "fields": fields,
            "sp.page": page,
            "sp.pageSize": page_size,
        }
        if keywords:
            params["filter.keywords"] = keywords
        result = client.get_table_data("item", params=params, timeout=60)
        rows = extract_list_rows(result)
        if not result.get("s") and page == 1 and not rows:
            msg = result.get("d") if isinstance(result.get("d"), dict) else result
            raise RuntimeError(f"Accurate item/list.do failed page=1: {msg}")
        return rows

    return fetch_page


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Dump Accurate items → local slim store (+ gap report)")
    p.add_argument("--page-size", type=int, default=100)
    p.add_argument("--max-pages", type=int, default=500)
    p.add_argument("--start-page", type=int, default=1, help="Resume pagination from this page")
    p.add_argument("--sleep", type=float, default=0.15, help="Delay between pages (seconds)")
    p.add_argument("--fields", default=DEFAULT_FIELDS)
    p.add_argument(
        "--keywords",
        default="",
        help="Optional filter.keywords; empty = try unfiltered pagination",
    )
    p.add_argument(
        "--out-dir",
        type=Path,
        default=Path(config.ITEM_LIST_SLIM_PATH).resolve().parent,
    )
    p.add_argument(
        "--slim-path",
        type=Path,
        default=None,
        help="Override slim xlsx path (default: ITEM_LIST_SLIM_PATH)",
    )
    p.add_argument("--dry-run", action="store_true", help="Dump in-memory only; do not write files")
    p.add_argument(
        "--gap-report",
        action="store_true",
        help="After store, write gap CSV vs local PRICE_LIBRARY_PATH",
    )
    p.add_argument(
        "--price-library",
        type=Path,
        default=None,
        help="Price library xlsx for gap (default: PRICE_LIBRARY_PATH)",
    )
    p.add_argument("--skip-dump", action="store_true", help="Skip API dump; only gap from existing slim")
    args = p.parse_args(argv)

    out_dir = Path(args.out_dir)
    stamp = default_dump_stamp()
    slim_path = Path(args.slim_path) if args.slim_path else Path(config.ITEM_LIST_SLIM_PATH)
    raw_path = out_dir / f"accurate-item-dump-{stamp}.jsonl"
    ckpt_path = out_dir / f"accurate-item-dump-{stamp}.checkpoint.json"
    gap_path = out_dir / f"price-gap-fill-{stamp}.csv"

    rows: list[dict] = []
    if not args.skip_dump:
        client = AccurateOnlineAPIClient()
        if not client.access_token:
            print("ERROR: Accurate access_token not configured", file=sys.stderr)
            return 2
        kw = (args.keywords or "").strip() or None
        fetch = _fetch_factory(client, args.fields, kw)
        print(f"Dumping item/list.do page_size={args.page_size} keywords={kw!r} ...")
        rows = dump_all_pages(
            fetch,
            page_size=args.page_size,
            max_pages=args.max_pages,
            start_page=args.start_page,
            sleep_s=args.sleep,
        )
        print(f"Fetched {len(rows)} rows (post-dedupe)")
        if args.dry_run:
            print(json.dumps({"row_count": len(rows), "dry_run": True}, ensure_ascii=False))
            return 0
        save_checkpoint(
            ckpt_path,
            {
                "stamp": stamp,
                "page_size": args.page_size,
                "max_pages": args.max_pages,
                "keywords": kw,
                "row_count": len(rows),
                "sample_codes": [r.get("no") for r in rows[:5]],
            },
        )
        write_raw_jsonl(rows, raw_path)
        records = rows_to_slim_records(rows)
        write_slim_xlsx(records, slim_path)
        print(f"Wrote slim={slim_path} ({len(records)} codes)")
        print(f"Wrote raw={raw_path}")
    else:
        if not slim_path.is_file():
            print(f"ERROR: slim missing: {slim_path}", file=sys.stderr)
            return 2
        print(f"Skip dump; using slim={slim_path}")

    if args.gap_report:
        accurate = load_codes_from_slim_xlsx(slim_path)
        pl_path = Path(args.price_library) if args.price_library else Path(config.PRICE_LIBRARY_PATH)
        if not pl_path.is_file():
            print(f"ERROR: price library missing: {pl_path}", file=sys.stderr)
            return 2
        price_codes = load_codes_from_price_library_xlsx(pl_path)
        gap = gap_codes(accurate, price_codes)
        write_gap_report_csv(gap, gap_path)
        print(
            json.dumps(
                {
                    "accurate_codes": len(accurate),
                    "price_lib_codes": len(price_codes),
                    "gap_count": len(gap),
                    "gap_report": str(gap_path),
                    "action": "insert_draft_only_no_publish",
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
