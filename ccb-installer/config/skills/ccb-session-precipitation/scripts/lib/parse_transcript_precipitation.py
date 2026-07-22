#!/usr/bin/env python3
"""Transcript parsing and heuristic extraction for session precipitation."""
from __future__ import annotations

import json
import re
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Iterable

WORKFLOW_MARKERS = (
    "我习惯",
    "以后都",
    "默认先",
    "记住",
    "我通常",
    "我一般",
    "下次",
    "按我的习惯",
)

BUSINESS_MARKERS = (
    "业务规则",
    "知识库",
    "口径",
    "选型",
    "系列",
    "默认用",
    "纠偏",
)

ACK_MARKERS = ("对了", "可以", "就按这个", "没问题", "好的", "谢谢")

TOOL_NAME_RE = re.compile(r"mcp__\w+__\w+|Agent\([^)]+\)|Read\b", re.IGNORECASE)


def _loads_line(line: str) -> dict[str, Any] | None:
    line = line.strip()
    if not line:
        return None
    try:
        data = json.loads(line)
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def read_transcript_lines(path: Path) -> list[str]:
    if not path.is_file():
        return []
    return path.read_text(encoding="utf-8", errors="replace").splitlines()


def iter_user_messages(lines: Iterable[str]) -> list[str]:
    out: list[str] = []
    for line in lines:
        obj = _loads_line(line)
        if not obj or obj.get("type") != "user":
            continue
        message = obj.get("message")
        if not isinstance(message, dict):
            continue
        content = message.get("content")
        if isinstance(content, str) and content.strip():
            out.append(content.strip())
        elif isinstance(content, list):
            parts = []
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    text = str(block.get("text") or "").strip()
                    if text:
                        parts.append(text)
            if parts:
                out.append("\n".join(parts))
    return out


def iter_tool_names(lines: Iterable[str]) -> list[str]:
    names: list[str] = []
    for line in lines:
        obj = _loads_line(line)
        if not obj:
            continue
        if obj.get("type") != "assistant":
            continue
        message = obj.get("message")
        if not isinstance(message, dict):
            continue
        content = message.get("content")
        if not isinstance(content, list):
            continue
        for block in content:
            if not isinstance(block, dict):
                continue
            if block.get("type") == "tool_use":
                name = str(block.get("name") or "").strip()
                if name:
                    names.append(name)
    return names


def find_transcript(
    session_id: str,
    transcript_path: str | None = None,
    config_dir: str | Path | None = None,
) -> Path | None:
    import os

    if transcript_path:
        p = Path(transcript_path).resolve()
        allowed_roots: list[Path] = [Path.home() / ".claude" / "projects"]
        for raw in (
            config_dir,
            os.environ.get("CLAUDE_CONFIG_DIR"),
            os.environ.get("CCB_WANDING_CONFIG_DIR"),
        ):
            if raw:
                allowed_roots.append(Path(raw) / "projects")
        if not any(root.is_dir() and (p == root or root in p.parents) for root in allowed_roots):
            return None
        if p.is_file():
            return p
    if not session_id:
        return None

    project_roots: list[Path] = []
    for raw in (
        config_dir,
        os.environ.get("CLAUDE_CONFIG_DIR"),
        os.environ.get("CCB_WANDING_CONFIG_DIR"),
    ):
        if raw:
            project_roots.append(Path(raw) / "projects")
    project_roots.append(Path.home() / ".claude" / "projects")

    seen: set[Path] = set()
    for projects in project_roots:
        try:
            resolved = projects.resolve()
        except OSError:
            resolved = projects
        if resolved in seen:
            continue
        seen.add(resolved)
        if not projects.is_dir():
            continue
        matches = list(projects.glob(f"**/{session_id}.jsonl"))
        if matches:
            return matches[0]
    return None


def merge_transcript_lines(main: Path | None, session_id: str) -> list[str]:
    if not main or not main.is_file():
        return []
    lines = read_transcript_lines(main)
    sub_dir = main.parent / "subagents"
    if sub_dir.is_dir():
        for child in sorted(sub_dir.glob("agent-*.jsonl")):
            lines.extend(read_transcript_lines(child))
    return lines


def _normalize(text: str) -> str:
    return re.sub(r"\s+", "", text.lower())


def kb_overlap(summary: str, kb_text: str) -> str:
    if not summary or not kb_text:
        return "none"
    norm_summary = _normalize(summary)
    norm_kb = _normalize(kb_text)
    if norm_summary in norm_kb:
        return "duplicate"
    if SequenceMatcher(None, norm_summary, norm_kb).ratio() > 0.85:
        return "duplicate"
    for chunk in re.split(r"[。；\n]", kb_text):
        chunk = chunk.strip()
        if len(chunk) < 8:
            continue
        if _normalize(chunk) in norm_summary or _normalize(summary) in _normalize(chunk):
            return "partial"
    return "none"


def _workflow_duplicate(bullet: str, workflow_text: str) -> bool:
    if not workflow_text:
        return False
    norm = _normalize(bullet)
    for line in workflow_text.splitlines():
        line = line.strip().lstrip("-").strip()
        if not line:
            continue
        if SequenceMatcher(None, norm, _normalize(line)).ratio() >= 0.85:
            return True
    return False


def extract_proposals(
    *,
    lines: list[str],
    session_id: str,
    conversation_id: str,
    kb_text: str,
    workflow_text: str,
    user_acknowledged: bool,
) -> list[dict[str, Any]]:
    proposals: list[dict[str, Any]] = []
    user_msgs = iter_user_messages(lines)
    if len(user_msgs) < 1 and len(iter_tool_names(lines)) < 2:
        return proposals

    for msg in user_msgs:
        if any(m in msg for m in WORKFLOW_MARKERS):
            if _workflow_duplicate(msg, workflow_text):
                continue
            proposals.append(
                {
                    "lane": "personal_habit",
                    "title": "个人工作习惯",
                    "content": msg[:200],
                    "evidence": [msg[:300]],
                    "sessionId": session_id,
                    "conversationId": conversation_id,
                    "confidence": 0.75,
                }
            )
            break

        if any(m in msg for m in BUSINESS_MARKERS) and len(msg) >= 12:
            overlap = kb_overlap(msg, kb_text)
            if overlap == "duplicate":
                continue
            proposals.append(
                {
                    "lane": "business_rule",
                    "title": "业务知识库补充建议",
                    "content": msg[:300],
                    "evidence": [msg[:300]],
                    "sessionId": session_id,
                    "conversationId": conversation_id,
                    "confidence": 0.55 if overlap == "partial" else 0.7,
                    "metadata": {"kbOverlap": overlap},
                }
            )
            break

    tools = iter_tool_names(lines)
    if tools and (user_acknowledged or len(tools) >= 2):
        seq = " → ".join(tools[:8])
        proposals.append(
            {
                "lane": "golden_path",
                "title": "实现路径",
                "content": seq,
                "evidence": user_msgs[-1:] if user_msgs else [],
                "sessionId": session_id,
                "conversationId": conversation_id,
                "confidence": 0.65 if user_acknowledged else 0.5,
                "metadata": {"toolSequence": tools[:12]},
            }
        )
        if user_msgs:
            proposals.append(
                {
                    "lane": "eval_case",
                    "title": "Eval 候选",
                    "content": user_msgs[0][:200],
                    "evidence": [user_msgs[0][:300]],
                    "sessionId": session_id,
                    "conversationId": conversation_id,
                    "confidence": 0.5,
                    "metadata": {
                        "expectedTools": [t for t in tools if t.startswith("mcp__")][:4],
                        "suggestedInput": user_msgs[0][:200],
                    },
                }
            )

    return proposals


def user_acknowledged_idle(user_msgs: list[str]) -> bool:
    if not user_msgs:
        return True
    last = user_msgs[-1]
    if any(a in last for a in ACK_MARKERS) and len(last) < 40:
        return True
    return False
