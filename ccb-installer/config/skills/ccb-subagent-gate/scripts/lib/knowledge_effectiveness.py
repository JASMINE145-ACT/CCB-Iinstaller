#!/usr/bin/env python3
"""Knowledge effectiveness — hash-bound Read state + match-count invalidation (ADR 2026-07-06)."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any

from hook_transcript import safe_session_id, session_flag_dir  # noqa: E402

KNOWLEDGE_EFFECTIVENESS_SUBDIR = "knowledge-effectiveness"
KNOWLEDGE_CONTINUITY_SUBDIR = "knowledge-continuity"
KNOWLEDGE_FALLBACK_PATH = r"D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md"
# Deny next match when completed match count since last effective Read reaches this value.
MATCH_COUNT_LIMIT = 4


def resolve_knowledge_path() -> Path:
    raw = (os.environ.get("WANDING_BUSINESS_KNOWLEDGE_PATH") or "").strip()
    path = Path(raw) if raw else Path(KNOWLEDGE_FALLBACK_PATH)
    return path


def compute_kb_content_hash(path: Path | None = None) -> str:
    kb_path = path or resolve_knowledge_path()
    if not kb_path.is_file():
        return ""
    digest = hashlib.sha256(kb_path.read_bytes()).hexdigest()
    return digest


def current_config_generation() -> str:
    return (os.environ.get("CCB_CONFIG_GENERATION") or "").strip()


def _state_dir() -> Path:
    return session_flag_dir(KNOWLEDGE_EFFECTIVENESS_SUBDIR)


def state_path(session_id: str) -> Path:
    return _state_dir() / f"{safe_session_id(session_id)}.json"


def conversation_state_path(conversation_id: str) -> Path:
    return session_flag_dir(KNOWLEDGE_CONTINUITY_SUBDIR) / f"{safe_session_id(conversation_id)}.json"


def resolve_conversation_id(hook_input: dict[str, Any]) -> str:
    for key in ("conversation_id", "ccb_conversation_id"):
        raw = str(hook_input.get(key) or "").strip()
        if raw:
            return raw
    return (os.environ.get("CCB_CONVERSATION_ID") or "").strip()


def load_conversation_knowledge_state(conversation_id: str) -> dict[str, Any] | None:
    if not conversation_id.strip():
        return None
    path = conversation_state_path(conversation_id)
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    return data if isinstance(data, dict) else None


def save_conversation_knowledge_state(conversation_id: str, state: dict[str, Any]) -> None:
    if not conversation_id.strip():
        return
    state_dir = session_flag_dir(KNOWLEDGE_CONTINUITY_SUBDIR)
    state_dir.mkdir(parents=True, exist_ok=True)
    conversation_state_path(conversation_id).write_text(
        json.dumps(state, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def load_state(session_id: str) -> dict[str, Any] | None:
    if not session_id.strip():
        return None
    path = state_path(session_id)
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    return data if isinstance(data, dict) else None


def save_state(session_id: str, state: dict[str, Any]) -> None:
    if not session_id.strip():
        return
    state_dir = _state_dir()
    state_dir.mkdir(parents=True, exist_ok=True)
    state_path(session_id).write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def default_state(*, kb_hash: str) -> dict[str, Any]:
    return {
        "kb_content_hash": kb_hash,
        "match_count_since_read": 0,
        "invalidated": False,
        "invalidated_reason": None,
        "read_at_generation": current_config_generation() or None,
    }


def mark_knowledge_effective_read(session_id: str) -> dict[str, Any]:
    kb_hash = compute_kb_content_hash()
    state = default_state(kb_hash=kb_hash)
    if session_id.strip():
        save_state(session_id, state)
    return state


def invalidate_knowledge(session_id: str, reason: str) -> None:
    if not session_id.strip():
        return
    state = load_state(session_id) or default_state(kb_hash=compute_kb_content_hash())
    state["invalidated"] = True
    state["invalidated_reason"] = reason.strip() or "invalidated"
    save_state(session_id, state)


def increment_match_count(session_id: str) -> int:
    if not session_id.strip():
        return 0
    kb_hash = compute_kb_content_hash()
    state = load_state(session_id)
    if state is None:
        state = default_state(kb_hash=kb_hash)
    count = int(state.get("match_count_since_read") or 0) + 1
    state["match_count_since_read"] = count
    save_state(session_id, state)
    return count


def knowledge_is_effective(
    hook_input: dict[str, Any],
    *,
    transcript_has_read: bool,
    session_has_legacy_read: bool = False,
) -> tuple[bool, str]:
    """Return (effective, reason_code). reason_code empty when effective."""
    session_id = str(hook_input.get("session_id") or "").strip()
    conversation_id = resolve_conversation_id(hook_input)
    kb_hash = compute_kb_content_hash()
    conv_state = load_conversation_knowledge_state(conversation_id) if conversation_id else None

    if conv_state:
        if conv_state.get("invalidated"):
            return False, str(conv_state.get("invalidated_reason") or "invalidated")
        stored_conv_hash = str(conv_state.get("kb_content_hash") or "").strip()
        if kb_hash and stored_conv_hash and kb_hash != stored_conv_hash:
            return False, "kb_hash_changed"
        count = int(conv_state.get("match_count_since_read") or 0)
        if count >= MATCH_COUNT_LIMIT:
            return False, "match_count_exceeded"
        if session_id and load_state(session_id) is None:
            inherited = default_state(kb_hash=stored_conv_hash or kb_hash)
            inherited["match_count_since_read"] = count
            inherited["read_at_generation"] = conv_state.get("read_at_generation")
            save_state(session_id, inherited)
        return True, ""

    state = load_state(session_id) if session_id else None
    has_read_evidence = transcript_has_read or session_has_legacy_read

    if state is None:
        if not has_read_evidence:
            return False, "missing_read"
        if session_id:
            mark_knowledge_effective_read(session_id)
        return True, ""

    if state.get("invalidated"):
        return False, "invalidated"

    stored_hash = str(state.get("kb_content_hash") or "").strip()
    if kb_hash and not stored_hash:
        return False, "kb_hash_changed"
    if kb_hash and stored_hash and kb_hash != stored_hash:
        return False, "kb_hash_changed"

    count = int(state.get("match_count_since_read") or 0)
    if count >= MATCH_COUNT_LIMIT:
        return False, "match_count_exceeded"

    return True, ""


def deny_reason_for_code(code: str, kb_path: str) -> str:
    if code == "kb_hash_changed":
        return (
            "业务知识库已更新，请重新 Read 一次后再查价（本会话需刷新知识有效性）：\n"
            f"  {kb_path}"
        )
    if code == "match_count_exceeded":
        return (
            f"距上次有效 Read 已完成 {MATCH_COUNT_LIMIT} 次查价，请重新 Read 业务知识库后再 match：\n"
            f"  {kb_path}"
        )
    if code == "invalidated":
        return (
            "业务知识库规则已变更（如 append_business_rule 落库），请重新 Read 后再查价：\n"
            f"  {kb_path}"
        )
    return (
        "查价前必须先 Read 一次业务知识库（本会话只需读一次，后续查价不必重复 Read）：\n"
        f"  {kb_path}\n"
        "完成 Read 后再调用 match_quotation。"
    )
