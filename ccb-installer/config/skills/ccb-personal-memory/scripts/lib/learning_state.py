#!/usr/bin/env python3
"""Per-session incremental watermark + cooldown state (.learning-state.json).

Structure: {"sessions": {"<sessionKey>": {"processedLines": int, "lastRunAt": ISO-8601}}}
The session key is "<sessionId>|<transcript filename>" because SubagentStop events
share the sessionId but carry per-agent transcripts with independent line counts.
"""
from __future__ import annotations

import json
import time
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, NamedTuple

# Reuse the memory_store lock primitive so state writes share one proven pattern.
from memory_store import _FileLock as FileLock  # noqa: PLC2701
from personal_memory_paths import memory_root

MAX_SESSIONS = 50
COOLDOWN_SEC = 60.0


def state_path(config_dir: Path | None = None) -> Path:
    return memory_root(config_dir) / ".learning-state.json"


def _state_lock_path(config_dir: Path | None) -> Path:
    return state_path(config_dir).with_suffix(".json.lock")


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _parse_iso(raw: str) -> float | None:
    try:
        return datetime.fromisoformat(raw).timestamp()
    except (TypeError, ValueError):
        return None


def session_key(session_id: str, transcript: Path) -> str:
    base = (session_id or "").strip() or "no-session"
    return f"{base}|{transcript.name}"


def load_state(config_dir: Path | None = None) -> dict[str, Any]:
    """Fail-open: corrupt or missing state means 'no watermark' (full reprocess)."""
    path = state_path(config_dir)
    if not path.is_file():
        return {"sessions": {}}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"sessions": {}}
    if not isinstance(data, dict) or not isinstance(data.get("sessions"), dict):
        return {"sessions": {}}
    return data


def get_processed_lines(state: dict[str, Any], key: str) -> int:
    entry = state.get("sessions", {}).get(key)
    if not isinstance(entry, dict):
        return 0
    try:
        return max(0, int(entry.get("processedLines") or 0))
    except (TypeError, ValueError):
        return 0


def seconds_since_last_run(state: dict[str, Any], session_id: str, key: str) -> float | None:
    """Latest lastRunAt across all keys of this sessionId — cooldown is per session."""
    sessions = state.get("sessions", {})
    prefix = ((session_id or "").strip() or "no-session") + "|"
    latest: float | None = None
    for other_key, entry in sessions.items():
        if not isinstance(entry, dict):
            continue
        if other_key != key and not str(other_key).startswith(prefix):
            continue
        stamp = _parse_iso(str(entry.get("lastRunAt") or ""))
        if stamp is not None and (latest is None or stamp > latest):
            latest = stamp
    if latest is None:
        return None
    return max(0.0, time.time() - latest)


def _prune_sessions(sessions: dict[str, Any]) -> None:
    if len(sessions) <= MAX_SESSIONS:
        return
    ordered = sorted(
        sessions.items(),
        key=lambda kv: str((kv[1] or {}).get("lastRunAt") or "") if isinstance(kv[1], dict) else "",
    )
    for stale_key, _ in ordered[: len(sessions) - MAX_SESSIONS]:
        sessions.pop(stale_key, None)


def _store_session(
    state: dict[str, Any],
    key: str,
    processed_lines: int,
    *,
    touch_last_run: bool,
) -> None:
    """In-memory watermark update; lastRunAt only on real learn runs."""
    sessions = state["sessions"]
    current = sessions.get(key)
    entry: dict[str, Any] = dict(current) if isinstance(current, dict) else {}
    entry["processedLines"] = max(processed_lines, get_processed_lines(state, key))
    if touch_last_run:
        entry["lastRunAt"] = _now_iso()
    sessions[key] = entry
    _prune_sessions(sessions)


def _write_state(path: Path, state: dict[str, Any]) -> None:
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(
        json.dumps({"sessions": state["sessions"]}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    tmp.replace(path)


class ClaimResult(NamedTuple):
    decision: str  # "cooldown" | "no-new-lines" | "no-signal" | "claimed"
    start_line: int
    total_lines: int
    elapsed: float | None  # seconds since last learn run; None if never ran


def claim_window(
    config_dir: Path | None,
    session_id: str,
    key: str,
    *,
    count_lines: Callable[[], int],
    has_signal: Callable[[int], bool],
) -> ClaimResult:
    """Atomic gate + watermark claim (R1/R2).

    The whole decide-then-advance sequence runs under the state file lock so
    concurrent Stop/SubagentStop hooks cannot double-claim: the first claimer
    persists watermark + lastRunAt before any other hook process reads state.
    Trade-off: if the worker later crashes, the claimed window is forfeited
    (fail-safe toward fewer, not duplicate, extractions).

    count_lines / has_signal are callables so a cooldown skip performs no
    transcript IO at all; a no-signal skip still advances the watermark
    (screened lines are never rescanned) without touching lastRunAt.
    """
    path = state_path(config_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    with FileLock(_state_lock_path(config_dir)):
        state = load_state(config_dir)
        elapsed = seconds_since_last_run(state, session_id, key)
        if elapsed is not None and elapsed < COOLDOWN_SEC:
            return ClaimResult("cooldown", 0, 0, elapsed)
        processed = get_processed_lines(state, key)
        total_lines = count_lines()
        if total_lines <= processed:
            return ClaimResult("no-new-lines", processed, total_lines, elapsed)
        if not has_signal(processed):
            _store_session(state, key, total_lines, touch_last_run=False)
            _write_state(path, state)
            return ClaimResult("no-signal", processed, total_lines, elapsed)
        _store_session(state, key, total_lines, touch_last_run=True)
        _write_state(path, state)
        return ClaimResult("claimed", processed, total_lines, elapsed)
