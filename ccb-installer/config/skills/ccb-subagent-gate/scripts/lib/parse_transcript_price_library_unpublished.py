#!/usr/bin/env python3
"""Detect price-library draft mutations without a publish in the same session."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

APPLY_MARKERS = (
    '"applied": true',
    '"applied":true',
    '"published": true',
    '"published":true',
    "mcp__price-library__upsert_price_library_item",
    "mcp__price-library__apply_price_library_import",
    "mcp__price-library__delete_price_library_item",
    "mcp__price-library__restore_price_library_item",
    "mcp__price-library__publish_price_library_draft",
)


def _loads_line(line: str) -> dict[str, Any] | None:
    line = line.strip()
    if not line:
        return None
    try:
        data = json.loads(line)
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def analyze_transcript(transcript_path: Path) -> dict[str, Any]:
    if not transcript_path.is_file():
        return {
            "draft_mutated": False,
            "published_in_session": False,
            "should_warn": False,
            "reason": "transcript missing",
        }

    text = transcript_path.read_text(encoding="utf-8", errors="replace")
    draft_mutated = '"applied": true' in text or '"applied":true' in text
    published_in_session = '"published": true' in text or '"published":true' in text

    should_warn = draft_mutated and not published_in_session
    return {
        "draft_mutated": draft_mutated,
        "published_in_session": published_in_session,
        "should_warn": should_warn,
        "reason": "draft changed without publish" if should_warn else "ok",
    }


def main(argv: list[str]) -> int:
    if len(argv) < 3 or argv[1] != "check":
        print(
            "usage: parse_transcript_price_library_unpublished.py check <transcript_path>",
            file=sys.stderr,
        )
        return 2
    result = analyze_transcript(Path(argv[2]))
    print(json.dumps(result, ensure_ascii=False))
    return 10 if result.get("should_warn") else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
