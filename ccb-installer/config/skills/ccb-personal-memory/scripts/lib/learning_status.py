#!/usr/bin/env python3
"""Learning status file for UI banner (.learning-status.json)."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from personal_memory_paths import learning_status_path


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def write_status(
    config_dir: Path | None,
    *,
    status: str,
    session_id: str = "",
    agent_type: str = "",
    entries_appended: int = 0,
    error: str | None = None,
    started_at: str | None = None,
) -> Path:
    path = learning_status_path(config_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    existing: dict[str, Any] = {}
    if path.is_file():
        try:
            existing = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            existing = {}

    started = started_at or existing.get("startedAt") or _now_iso()
    finished = _now_iso() if status in ("done", "error", "idle") else None
    payload = {
        "status": status,
        "startedAt": started if status == "learning" else (existing.get("startedAt") or started),
        "finishedAt": finished,
        "sessionId": session_id or existing.get("sessionId") or "",
        "agentType": agent_type or existing.get("agentType") or "",
        "entriesAppended": entries_appended,
        "error": error,
    }
    if status == "learning":
        payload["startedAt"] = _now_iso()
        payload["finishedAt"] = None
        payload["entriesAppended"] = 0
        payload["error"] = None
        payload["sessionId"] = session_id
        payload["agentType"] = agent_type

    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path


def read_status(config_dir: Path | None) -> dict[str, Any] | None:
    path = learning_status_path(config_dir)
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None
