#!/usr/bin/env python3

"""JSONL store for precipitation proposals and decisions."""

from __future__ import annotations



import json

import uuid

from datetime import datetime, timezone

from pathlib import Path

from typing import Any



from precipitation_paths import decisions_path, pending_path, resolved_path, runs_dir, summary_path





def _now_iso() -> str:

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()





def _read_jsonl(path: Path) -> list[dict[str, Any]]:

    if not path.is_file():

        return []

    rows: list[dict[str, Any]] = []

    for line in path.read_text(encoding="utf-8").splitlines():

        line = line.strip()

        if not line:

            continue

        try:

            obj = json.loads(line)

        except json.JSONDecodeError:

            continue

        if isinstance(obj, dict):

            rows.append(obj)

    return rows





def _append_jsonl(path: Path, obj: dict[str, Any]) -> None:

    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("a", encoding="utf-8", newline="\n") as handle:

        handle.write(json.dumps(obj, ensure_ascii=False) + "\n")





def _resolved_ids(config_dir: Path | None = None) -> set[str]:

    return {

        str(row.get("proposalId") or "")

        for row in _read_jsonl(resolved_path(config_dir))

        if row.get("proposalId")

    }





def list_pending(config_dir: Path | None = None) -> list[dict[str, Any]]:

    resolved = _resolved_ids(config_dir)

    return [

        r

        for r in _read_jsonl(pending_path(config_dir))

        if r.get("status") == "pending" and str(r.get("id") or "") not in resolved

    ]





def write_summary(

    config_dir: Path | None,

    *,

    status: str,

    pending_count: int | None = None,

    session_id: str = "",

    conversation_id: str = "",

    error: str | None = None,

    skipped_reason: str | None = None,

) -> None:

    path = summary_path(config_dir)

    path.parent.mkdir(parents=True, exist_ok=True)

    existing: dict[str, Any] = {}

    if path.is_file():

        try:

            existing = json.loads(path.read_text(encoding="utf-8"))

        except (OSError, json.JSONDecodeError):

            existing = {}

    pending = pending_count if pending_count is not None else len(list_pending(config_dir))

    payload = {

        "status": status,

        "pendingCount": pending,

        "updatedAt": _now_iso(),

        "sessionId": session_id or existing.get("sessionId") or "",

        "conversationId": conversation_id or existing.get("conversationId") or "",

        "error": error,

        "skippedReason": skipped_reason,

        "lastRunAt": _now_iso() if status in ("done", "error", "skipped") else existing.get("lastRunAt"),

    }

    if status == "running":

        payload["startedAt"] = _now_iso()

    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")





def append_proposals(config_dir: Path | None, proposals: list[dict[str, Any]]) -> int:

    if not proposals:

        return 0

    path = pending_path(config_dir)

    count = 0

    for item in proposals:

        row = {

            "id": item.get("id") or f"precip-{uuid.uuid4().hex[:12]}",

            "status": "pending",

            "lane": item.get("lane", "unknown"),

            "title": item.get("title", ""),

            "content": item.get("content", ""),

            "evidence": list(item.get("evidence") or [])[:5],

            "sessionId": item.get("sessionId", ""),

            "conversationId": item.get("conversationId", ""),

            "agentId": item.get("agentId", ""),

            "confidence": float(item.get("confidence") or 0.0),

            "metadata": item.get("metadata") or {},

            "createdAt": _now_iso(),

        }

        _append_jsonl(path, row)

        count += 1

    return count





def write_run_artifact(

    config_dir: Path | None,

    session_id: str,

    bundle: dict[str, Any],

    *,

    run_id: str = "",

) -> Path:

    out_dir = runs_dir(config_dir)

    out_dir.mkdir(parents=True, exist_ok=True)

    safe_session = session_id.replace("/", "_") or "unknown"

    safe_run = run_id.replace("/", "_").strip() if run_id else "latest"

    path = out_dir / f"{safe_session}__{safe_run}.json"

    path.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return path





def run_already_processed(config_dir: Path | None, session_id: str, run_id: str) -> bool:

    if not session_id or not run_id:

        return False

    safe_session = session_id.replace("/", "_")

    safe_run = run_id.replace("/", "_")

    return (runs_dir(config_dir) / f"{safe_session}__{safe_run}.json").is_file()





def record_decision(

    config_dir: Path | None,

    *,

    proposal_id: str,

    action: str,

    edited_content: str | None = None,

    review_notes: str | None = None,

) -> bool:

    if proposal_id in _resolved_ids(config_dir):

        return False



    rows = _read_jsonl(pending_path(config_dir))

    found: dict[str, Any] | None = None

    for row in rows:

        if row.get("id") == proposal_id and row.get("status") == "pending":

            found = dict(row)

            break

    if not found:

        return False



    final_content = edited_content if edited_content is not None else str(found.get("content") or "")

    now = _now_iso()

    _append_jsonl(

        resolved_path(config_dir),

        {

            "proposalId": proposal_id,

            "action": action,

            "content": final_content,

            "resolvedAt": now,

        },

    )

    _append_jsonl(

        decisions_path(config_dir),

        {

            "proposalId": proposal_id,

            "action": action,

            "lane": found.get("lane"),

            "editedContent": edited_content,

            "reviewNotes": review_notes,

            "at": now,

        },

    )

    write_summary(config_dir, status="done", pending_count=len(list_pending(config_dir)))

    return True

