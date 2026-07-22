#!/usr/bin/env python3
"""Atomic per-run FullReview outcome (TurnHarvest contract)."""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from precipitation_paths import runs_dir

OUTCOMES = frozenset(
    {"proposals", "no_proposals", "retryable_error", "permanent_skip"}
)


def outcome_path(config_dir: Path, run_id: str) -> Path:
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in run_id.strip()) or "unknown"
    return runs_dir(config_dir) / f"{safe}.outcome.json"


def write_run_outcome(
    config_dir: Path,
    *,
    run_id: str,
    session_id: str,
    conversation_id: str = "",
    lease_id: str = "",
    review_through_turn_id: str = "",
    outcome: str,
    proposal_count: int = 0,
    retryable: bool | None = None,
    error_code: str | None = None,
) -> Path:
    if outcome not in OUTCOMES:
        raise ValueError(f"invalid outcome: {outcome}")
    if retryable is None:
        retryable = outcome == "retryable_error"
    payload: dict[str, Any] = {
        "runId": run_id,
        "sessionId": session_id,
        "conversationId": conversation_id or "",
        "leaseId": lease_id or "",
        "reviewThroughTurnId": review_through_turn_id or run_id,
        "outcome": outcome,
        "proposalCount": int(proposal_count),
        "retryable": bool(retryable),
        "errorCode": error_code,
        "finishedAt": _iso_now(),
    }
    path = outcome_path(config_dir, run_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".outcome.json.tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, path)
    return path


def read_run_outcome(config_dir: Path, run_id: str) -> dict[str, Any] | None:
    path = outcome_path(config_dir, run_id)
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def _iso_now() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
