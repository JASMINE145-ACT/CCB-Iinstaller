#!/usr/bin/env python3
"""Quotation knowledge Read gate — session-scoped, enforced before/at price match."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

KNOWLEDGE_MARK = "wanding_business_knowledge"
KNOWLEDGE_FALLBACK_PATH = r"D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md"
MATCH_TOOL_MARKERS = (
    "mcp__quotation__match_quotation",
    "mcp__quotation__match_quotation_batch",
    "match_quotation",
)
MATCH_TOOL_NAMES = frozenset(
    {
        "mcp__quotation__match_quotation",
        "mcp__quotation__match_quotation_batch",
    }
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


def _line_has_match_tool_use(obj: dict[str, Any]) -> bool:
    for block in _iter_content_blocks(obj):
        if block.get("type") != "tool_use":
            continue
        name = str(block.get("name") or block.get("toolName") or "")
        if any(marker in name for marker in MATCH_TOOL_MARKERS):
            return True
    return False


def _line_has_match_result(obj: dict[str, Any]) -> bool:
    for block in _iter_content_blocks(obj):
        if block.get("type") != "tool_result":
            continue
        payload = _loads_maybe(block.get("content"))
        if isinstance(payload, dict) and "keywords" in payload:
            if _candidate_count_from_payload(payload) is not None:
                return True
            if payload.get("results") is not None or payload.get("candidates") is not None:
                return True
    return False


def _line_has_multi_match_result(obj: dict[str, Any]) -> bool:
    for block in _iter_content_blocks(obj):
        if block.get("type") != "tool_result":
            continue
        payload = _loads_maybe(block.get("content"))
        count = _candidate_count_from_payload(payload)
        if count is not None and count > 1:
            return True
    return False


def transcript_has_knowledge_read(*paths: Path) -> bool:
    """True if any transcript file contains Read(wanding_business_knowledge)."""
    for path in paths:
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            obj = _loads_line(line)
            if obj and _line_has_read_knowledge(obj):
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

    knowledge_read_in_session = transcript_has_knowledge_read(*paths)

    if not transcript_path.is_file():
        return {
            "price_match_in_turn": False,
            "multi_match": False,
            "knowledge_read_in_session": knowledge_read_in_session,
            "knowledge_read_after_match": knowledge_read_in_session,
            "should_warn": False,
            "should_block": False,
            "reason": "transcript missing",
        }

    raw_lines = transcript_path.read_text(encoding="utf-8", errors="replace").splitlines()
    turn_lines = _slice_current_turn(raw_lines)

    price_match_in_turn = False
    multi_match = False
    for line in turn_lines:
        obj = _loads_line(line)
        if not obj:
            continue
        if _line_has_match_tool_use(obj) or _line_has_match_result(obj):
            price_match_in_turn = True
        if _line_has_multi_match_result(obj):
            multi_match = True
        elif _line_has_match_tool_use(obj):
            match = re.search(r'"candidate_count"\s*:\s*(\d+)', line)
            if match and int(match.group(1)) > 1:
                multi_match = True

    should_block = price_match_in_turn and not knowledge_read_in_session
    reason = (
        "price match in turn without session knowledge Read"
        if should_block
        else "knowledge Read present for session"
        if knowledge_read_in_session
        else "no price match in current turn"
    )

    return {
        "price_match_in_turn": price_match_in_turn,
        "multi_match": multi_match,
        "knowledge_read_in_session": knowledge_read_in_session,
        "knowledge_read_after_match": knowledge_read_in_session,
        "should_warn": should_block,
        "should_block": should_block,
        "reason": reason,
    }


def main(argv: list[str]) -> int:
    if len(argv) < 3 or argv[1] != "check":
        print("usage: parse_transcript_knowledge_gate.py check <transcript_path> [agent_transcript_path]", file=sys.stderr)
        return 2
    agent_path = Path(argv[3]) if len(argv) > 3 else None
    result = analyze_transcript(Path(argv[2]), agent_transcript_path=agent_path)
    print(json.dumps(result, ensure_ascii=False))
    return 10 if result.get("should_block") else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
