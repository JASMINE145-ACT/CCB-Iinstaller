#!/usr/bin/env python3
"""Price-library data.Md Read gate — session-scoped before field writes."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

DATA_MD_MARKERS = ("data.Md", "data/data.Md", r"vendor\wanding\data\data.Md")
DATA_MD_FALLBACK_PATH = r"D:\CCB-Wanding\vendor\wanding\data\data.Md"
WRITE_TOOL_NAMES = frozenset(
    {
        "mcp__price-library__upsert_price_library_item",
        "mcp__price-library__apply_price_library_import",
    }
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


def _iter_content_blocks(obj: dict[str, Any]) -> list[dict[str, Any]]:
    message = obj.get("message")
    if not isinstance(message, dict):
        return []
    content = message.get("content")
    if isinstance(content, list):
        return [block for block in content if isinstance(block, dict)]
    return []


def _payload_has_data_md(text: str) -> bool:
    lowered = text.lower()
    return "data.md" in lowered or "data\\md" in lowered


def _line_has_read_data_md(obj: dict[str, Any]) -> bool:
    for block in _iter_content_blocks(obj):
        block_type = block.get("type")
        name = str(block.get("name") or block.get("toolName") or "")
        if block_type == "tool_use" and name == "Read":
            payload = json.dumps(block.get("input") or block, ensure_ascii=False)
            if _payload_has_data_md(payload):
                return True
    text = json.dumps(obj, ensure_ascii=False)
    return _payload_has_data_md(text) and "Read" in text and "file_path" in text


def transcript_has_data_md_read(*paths: Path) -> bool:
    for path in paths:
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            obj = _loads_line(line)
            if obj and _line_has_read_data_md(obj):
                return True
    return False


def analyze_transcript(
    transcript_path: Path,
    *,
    agent_transcript_path: Path | None = None,
) -> dict[str, Any]:
    paths = [transcript_path]
    if agent_transcript_path is not None:
        paths.append(agent_transcript_path)
    data_md_read = transcript_has_data_md_read(*paths)
    return {
        "data_md_read_in_session": data_md_read,
        "should_block": not data_md_read,
        "reason": "data.Md Read present" if data_md_read else "field write without session data.Md Read",
    }


def main(argv: list[str]) -> int:
    if len(argv) < 3 or argv[1] != "check":
        print(
            "usage: parse_transcript_data_md_gate.py check <transcript_path> [agent_transcript_path]",
            file=sys.stderr,
        )
        return 2
    agent_path = Path(argv[3]) if len(argv) > 3 else None
    result = analyze_transcript(Path(argv[2]), agent_transcript_path=agent_path)
    print(json.dumps(result, ensure_ascii=False))
    return 10 if result.get("should_block") else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
