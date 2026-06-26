#!/usr/bin/env python3
"""Check quotation transcript for multi-candidate match without knowledge Read."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

KNOWLEDGE_MARK = "wanding_business_knowledge"
MATCH_TOOL_MARKERS = (
    "mcp__quotation__match_quotation",
    "match_quotation",
)


def _loads_maybe(value: Any) -> Any:
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return value
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return value
    return value


def _candidate_count_from_payload(data: Any) -> int | None:
    if not isinstance(data, dict):
        return None
    if isinstance(data.get("results"), list):
        counts = [
            item.get("candidate_count")
            for item in data["results"]
            if isinstance(item, dict) and isinstance(item.get("candidate_count"), int)
        ]
        if counts:
            return max(counts)
    count = data.get("candidate_count")
    return count if isinstance(count, int) else None


def _is_user_turn_start(obj: dict[str, Any]) -> bool:
    if obj.get("type") != "user":
        return False
    message = obj.get("message")
    if not isinstance(message, dict):
        return False
    content = message.get("content")
    if isinstance(content, str) and content.strip():
        return True
    if isinstance(content, list):
        for block in content:
            if not isinstance(block, dict):
                continue
            if block.get("type") == "tool_result":
                continue
            if block.get("type") == "text" and str(block.get("text") or "").strip():
                return True
    return False


def _slice_current_turn(lines: list[str]) -> list[str]:
    start = 0
    for idx, line in enumerate(lines):
        obj = _loads_line(line)
        if obj and _is_user_turn_start(obj):
            start = idx
    return lines[start:]


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


def _line_has_read_knowledge(obj: dict[str, Any]) -> bool:
    for block in _iter_content_blocks(obj):
        block_type = block.get("type")
        name = str(block.get("name") or block.get("toolName") or "")
        if block_type == "tool_use" and name == "Read":
            payload = json.dumps(block.get("input") or block, ensure_ascii=False)
            if KNOWLEDGE_MARK in payload:
                return True
        if block_type == "tool_result":
            payload = str(block.get("content") or "")
            if KNOWLEDGE_MARK in payload and "Read" in json.dumps(obj, ensure_ascii=False):
                return True
    text = json.dumps(obj, ensure_ascii=False)
    return KNOWLEDGE_MARK in text and "Read" in text and "file_path" in text


def _line_has_multi_match_result(obj: dict[str, Any]) -> bool:
    for block in _iter_content_blocks(obj):
        if block.get("type") != "tool_result":
            continue
        payload = _loads_maybe(block.get("content"))
        count = _candidate_count_from_payload(payload)
        if count is not None and count > 1:
            return True
    return False


def _line_has_match_tool_use(obj: dict[str, Any]) -> bool:
    for block in _iter_content_blocks(obj):
        if block.get("type") != "tool_use":
            continue
        name = str(block.get("name") or block.get("toolName") or "")
        if any(marker in name for marker in MATCH_TOOL_MARKERS):
            return True
    return False


def analyze_transcript(transcript_path: Path) -> dict[str, Any]:
    if not transcript_path.is_file():
        return {
            "multi_match": False,
            "knowledge_read_after_match": False,
            "should_warn": False,
            "reason": "transcript missing",
        }

    raw_lines = transcript_path.read_text(encoding="utf-8", errors="replace").splitlines()
    turn_lines = _slice_current_turn(raw_lines)

    multi_match_idx: int | None = None
    for idx, line in enumerate(turn_lines):
        obj = _loads_line(line)
        if not obj:
            continue
        if _line_has_multi_match_result(obj):
            multi_match_idx = idx
            break
        if _line_has_match_tool_use(obj):
            # Fallback: escaped candidate_count on same line after failed structural parse
            match = re.search(r'"candidate_count"\s*:\s*(\d+)', line)
            if match and int(match.group(1)) > 1:
                multi_match_idx = idx
                break

    if multi_match_idx is None:
        return {
            "multi_match": False,
            "knowledge_read_after_match": False,
            "should_warn": False,
            "reason": "no multi-candidate match in current turn",
        }

    read_after = False
    for line in turn_lines[multi_match_idx + 1 :]:
        obj = _loads_line(line)
        if obj and _line_has_read_knowledge(obj):
            read_after = True
            break

    return {
        "multi_match": True,
        "knowledge_read_after_match": read_after,
        "should_warn": not read_after,
        "reason": "multi-candidate match without knowledge Read after match"
        if not read_after
        else "knowledge Read present",
    }


def main(argv: list[str]) -> int:
    if len(argv) < 3 or argv[1] != "check":
        print("usage: parse_transcript_knowledge_gate.py check <transcript_path>", file=sys.stderr)
        return 2
    result = analyze_transcript(Path(argv[2]))
    print(json.dumps(result, ensure_ascii=False))
    return 10 if result.get("should_warn") else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
