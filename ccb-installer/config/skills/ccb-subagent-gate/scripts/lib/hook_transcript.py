#!/usr/bin/env python3
"""Shared PreToolUse transcript path + session flag helpers for subagent gates."""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

READ_TOOL_NAMES = frozenset({"Read", "read_file"})


def safe_session_id(session_id: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", session_id.strip())
    return cleaned or "unknown"


def session_flag_dir(subdir: str) -> Path:
    base = os.environ.get("SUBAGENT_GATE_LOG_DIR") or os.environ.get("LOCALAPPDATA")
    if base:
        return Path(base) / subdir
    return Path.home() / ".claude" / "logs" / subdir


def session_flag_path(session_id: str, subdir: str) -> Path:
    return session_flag_dir(subdir) / f"{safe_session_id(session_id)}.flag"


def mark_session_flag(session_id: str, subdir: str) -> None:
    if not session_id.strip():
        return
    flag_dir = session_flag_dir(subdir)
    flag_dir.mkdir(parents=True, exist_ok=True)
    session_flag_path(session_id, subdir).write_text("1\n", encoding="utf-8")


def session_has_flag(session_id: str, subdir: str) -> bool:
    if not session_id.strip():
        return False
    return session_flag_path(session_id, subdir).is_file()


def read_tool_file_path(block: dict[str, Any]) -> str:
    raw_input = block.get("input")
    if isinstance(raw_input, dict):
        for key in ("file_path", "filePath", "path", "target_file"):
            value = raw_input.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    payload = json.dumps(block, ensure_ascii=False)
    match = re.search(
        r'"(?:file_path|filePath|path|target_file)"\s*:\s*"([^"]+)"',
        payload,
    )
    return match.group(1) if match else ""


def derive_agent_transcript_path(hook_input: dict[str, Any]) -> Path | None:
    """PreToolUse passes parent transcript_path; subagent Read lives in agent-*.jsonl."""
    agent_id = str(hook_input.get("agent_id") or "").strip()
    session_id = str(hook_input.get("session_id") or "").strip()
    transcript_raw = str(hook_input.get("transcript_path") or "").strip()
    if not agent_id or not session_id or not transcript_raw:
        return None
    parent = Path(transcript_raw).parent
    candidate = parent / session_id / "subagents" / f"agent-{agent_id}.jsonl"
    return candidate if candidate.is_file() else None


def resolve_hook_transcript_paths(hook_input: dict[str, Any]) -> list[Path]:
    paths: list[Path] = []
    seen: set[str] = set()
    for key in ("transcript_path", "agent_transcript_path"):
        raw = str(hook_input.get(key) or "").strip()
        if raw and raw not in seen:
            seen.add(raw)
            paths.append(Path(raw))
    derived = derive_agent_transcript_path(hook_input)
    if derived is not None:
        key = str(derived)
        if key not in seen:
            seen.add(key)
            paths.append(derived)
    return paths
