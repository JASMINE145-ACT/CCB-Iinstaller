#!/usr/bin/env python3
"""Build a capped full-transcript excerpt for precipitation LLM (user + assistant + tools)."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable

MAX_EXCERPT_CHARS = 12_000


def _loads_line(line: str) -> dict[str, Any] | None:
    line = line.strip()
    if not line:
        return None
    try:
        data = json.loads(line)
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def _user_text(obj: dict[str, Any]) -> str:
    if obj.get("type") != "user":
        return ""
    message = obj.get("message")
    if not isinstance(message, dict):
        return ""
    content = message.get("content")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(str(block.get("text") or ""))
        return "".join(parts).strip()
    return ""


def _assistant_parts(obj: dict[str, Any]) -> list[str]:
    if obj.get("type") != "assistant":
        return []
    message = obj.get("message")
    if not isinstance(message, dict):
        return []
    content = message.get("content")
    parts: list[str] = []
    if isinstance(content, str) and content.strip():
        parts.append(content.strip()[:400])
        return parts
    if not isinstance(content, list):
        return parts
    for block in content:
        if not isinstance(block, dict):
            continue
        if block.get("type") == "text":
            text = str(block.get("text") or "").strip()
            if text:
                parts.append(text[:300])
        elif block.get("type") == "tool_use":
            name = str(block.get("name") or "").strip()
            if name:
                parts.append(f"[tool:{name}]")
    return parts


def build_full_transcript_excerpt(lines: Iterable[str], *, max_chars: int = MAX_EXCERPT_CHARS) -> str:
    """Linear transcript for LLM: User / Assistant / tool markers."""
    out: list[str] = []
    for line in lines:
        obj = _loads_line(line)
        if not obj:
            continue
        user = _user_text(obj)
        if user:
            out.append(f"User: {user}")
            continue
        assistant = _assistant_parts(obj)
        if assistant:
            out.append("Assistant: " + " ".join(assistant))
    text = "\n".join(out)
    if len(text) <= max_chars:
        return text
    head = text[: max_chars // 2]
    tail = text[-max_chars // 2 :]
    return head + "\n...[truncated]...\n" + tail
