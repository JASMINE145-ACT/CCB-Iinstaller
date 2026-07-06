#!/usr/bin/env python3
"""Transcript parsing for personal memory Stop hook."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

WORKFLOW_MARKERS = (
    "我习惯",
    "以后都",
    "默认先",
    "工作流",
    "惯例",
    "记住这个偏好",
    "记住偏好",
    "会话惯例",
    "我通常",
    "我一般",
    "下次",
    "以后记得",
    "按我的习惯",
    "每次都",
)

PROFILE_MARKERS = (
    "我是",
    "我的角色",
    "叫我",
    "所在部门",
    "我所在",
)

# Explicit "remember this" instructions must always pass the hook pre-screen (R1).
PERSONAL_REMEMBER = re.compile(r"记住|别忘了")

# Tiered business veto (R5): one STRONG hit vetoes; WEAK terms need >= 2 distinct
# hits so personal habits that merely mention a business noun survive
# (e.g. 「我习惯先查供应商库存再报价」 stays; 「给这个客户的折扣按9折」 is vetoed).
BUSINESS_STRONG = re.compile(
    r"折扣|打折|含税|利润率|报价纠偏|append_business_rule|"
    r"[0-9０-９一二两三四五六七八九十]\s*折",
    re.IGNORECASE,
)
BUSINESS_WEAK_TERMS: tuple[str, ...] = ("客户", "供应商", "知识库", "口径")

WRITE_WORKFLOW_MARK = re.compile(r"memory[/\\]personal[/\\]workflow\.md", re.IGNORECASE)
WRITE_PROFILE_MARK = re.compile(r"memory[/\\]personal[/\\]profile\.md", re.IGNORECASE)


@dataclass(frozen=True)
class MemoryCandidate:
    target: str  # "workflow" | "profile"
    text: str
    source_message: str


def _loads_line(line: str) -> dict[str, Any] | None:
    line = line.strip()
    if not line:
        return None
    try:
        data = json.loads(line)
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def _extract_user_text(obj: dict[str, Any]) -> str:
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
            if not isinstance(block, dict):
                continue
            if block.get("type") == "tool_result":
                continue
            if block.get("type") == "text":
                parts.append(str(block.get("text") or ""))
        return "".join(parts).strip()
    return ""


def read_transcript_lines(transcript_path: Path) -> list[str]:
    """Raw transcript lines; the length is the incremental watermark unit (R2)."""
    if not transcript_path.is_file():
        return []
    return transcript_path.read_text(encoding="utf-8", errors="replace").splitlines()


def iter_user_texts(lines: list[str], *, start_line: int = 0) -> Iterable[str]:
    """User message texts from already-read lines (lets callers read the file once)."""
    for index, line in enumerate(lines):
        if index < start_line:
            continue
        obj = _loads_line(line)
        if not obj:
            continue
        text = _extract_user_text(obj)
        if text:
            yield text


def iter_user_messages(transcript_path: Path, *, start_line: int = 0) -> Iterable[str]:
    yield from iter_user_texts(read_transcript_lines(transcript_path), start_line=start_line)


def _contains_any(text: str, markers: tuple[str, ...]) -> bool:
    return any(marker in text for marker in markers)


def is_business_dominant(text: str) -> bool:
    """True when text is primarily a business/pricing rule, not a personal habit.

    Strong terms (pricing/discount/tax) veto alone; weak terms (customer,
    supplier, knowledge base, caliber) only veto when >= 2 distinct hits.
    """
    if BUSINESS_STRONG.search(text):
        return True
    weak_hits = {term for term in BUSINESS_WEAK_TERMS if term in text}
    return len(weak_hits) >= 2


def _summarize_for_bullet(text: str, *, max_len: int = 120) -> str:
    cleaned = " ".join(text.split())
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[: max_len - 1] + "…"


def classify_message(text: str) -> MemoryCandidate | None:
    if not text.strip():
        return None
    summary = _summarize_for_bullet(text)
    if _contains_any(text, WORKFLOW_MARKERS) or PERSONAL_REMEMBER.search(text):
        if is_business_dominant(text):
            return None
        return MemoryCandidate(target="workflow", text=summary, source_message=text)
    if is_business_dominant(text):
        return None
    if _contains_any(text, PROFILE_MARKERS):
        return MemoryCandidate(target="profile", text=summary, source_message=text)
    return None


def extract_candidates(
    transcript_path: Path,
    *,
    start_line: int = 0,
) -> list[MemoryCandidate]:
    seen: set[tuple[str, str]] = set()
    out: list[MemoryCandidate] = []
    for message in iter_user_messages(transcript_path, start_line=start_line):
        candidate = classify_message(message)
        if candidate is None:
            continue
        key = (candidate.target, candidate.text.casefold())
        if key in seen:
            continue
        seen.add(key)
        out.append(candidate)
    return out


def _tool_use_write_content(obj: dict[str, Any]) -> tuple[str, str] | None:
    message = obj.get("message")
    if not isinstance(message, dict):
        return None
    content = message.get("content")
    blocks = content if isinstance(content, list) else []
    for block in blocks:
        if not isinstance(block, dict) or block.get("type") != "tool_use":
            continue
        name = str(block.get("name") or block.get("toolName") or "")
        if name != "Write":
            continue
        payload = block.get("input")
        if not isinstance(payload, dict):
            payload = block
        file_path = str(payload.get("file_path") or payload.get("path") or "")
        body = str(payload.get("content") or payload.get("contents") or "")
        return file_path, body
    return None


def _extract_assistant_text(obj: dict[str, Any]) -> str:
    if obj.get("type") != "assistant":
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


def lines_have_new_signal(lines: list[str], *, start_line: int = 0) -> bool:
    """Millisecond regex pre-screen (R1): any classifiable user message after watermark."""
    for message in iter_user_texts(lines, start_line=start_line):
        if classify_message(message) is not None:
            return True
    return False


def build_transcript_excerpt(
    transcript_path: Path,
    *,
    start_line: int = 0,
    max_chars: int = 6000,
) -> str:
    """User turns + last assistant texts for thinking input (from watermark onward)."""
    if not transcript_path.is_file():
        return ""
    lines_out: list[str] = []
    assistant_tail: list[str] = []
    raw_lines = transcript_path.read_text(encoding="utf-8", errors="replace").splitlines()
    for index, line in enumerate(raw_lines):
        if index < start_line:
            continue
        obj = _loads_line(line)
        if not obj:
            continue
        user = _extract_user_text(obj)
        if user:
            lines_out.append(f"User: {user}")
            continue
        assistant = _extract_assistant_text(obj)
        if assistant:
            assistant_tail.append(f"Assistant: {assistant[:200]}")
    for item in assistant_tail[-3:]:
        lines_out.append(item)
    text = "\n".join(lines_out)
    if len(text) > max_chars:
        return text[-max_chars:]
    return text


def transcript_has_write_overlap(
    transcript_path: Path,
    candidate: MemoryCandidate,
) -> bool:
    if not transcript_path.is_file():
        return False
    norm = candidate.text.casefold()
    mark = WRITE_WORKFLOW_MARK if candidate.target == "workflow" else WRITE_PROFILE_MARK
    for line in transcript_path.read_text(encoding="utf-8", errors="replace").splitlines():
        obj = _loads_line(line)
        if not obj:
            continue
        write_info = _tool_use_write_content(obj)
        if write_info is None:
            continue
        file_path, body = write_info
        if not mark.search(file_path):
            continue
        if norm in body.casefold():
            return True
    return False
