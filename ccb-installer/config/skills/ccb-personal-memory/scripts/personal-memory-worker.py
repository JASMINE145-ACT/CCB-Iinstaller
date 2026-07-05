#!/usr/bin/env python3
"""Background worker: thinking extract (primary) + heuristic fallback → append."""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR / "lib"))

from learning_status import write_status  # noqa: E402
from memory_store import MemoryStoreError, append_candidates  # noqa: E402
from parse_transcript_personal_memory import (  # noqa: E402
    build_transcript_excerpt,
    extract_candidates,
    is_business_dominant,
    transcript_has_write_overlap,
)
from personal_memory_paths import (  # noqa: E402
    default_config_dir,
    employee_profile_path,
    log_path,
    workflow_path,
)
from thinking_client import (  # noqa: E402
    build_user_prompt,
    call_thinking,
    load_api_settings,
    load_mock_entries,
)


def _log(message: str, config_dir: Path) -> None:
    path = log_path(config_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    stamp = __import__("time").strftime("%Y-%m-%d %H:%M:%S")
    with path.open("a", encoding="utf-8", newline="\n") as handle:
        handle.write(f"[{stamp}] worker: {message}\n")


def _employee_summary(config_dir: Path) -> str:
    path = employee_profile_path(config_dir)
    if not path.is_file():
        return ""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return ""
    if not isinstance(data, dict):
        return ""
    parts = []
    for key in ("displayName", "department", "jobTitle", "notes"):
        val = data.get(key)
        if val:
            parts.append(f"{key}={val}")
    return "; ".join(parts)


def _existing_workflow(config_dir: Path) -> str:
    path = workflow_path(config_dir)
    if not path.is_file():
        return ""
    return path.read_text(encoding="utf-8", errors="replace")[-2000:]


def _heuristic_candidates(transcript: Path) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for candidate in extract_candidates(transcript):
        if transcript_has_write_overlap(transcript, candidate):
            continue
        out.append((candidate.target, candidate.text))
    return out


def _thinking_candidates(transcript: Path, config_dir: Path) -> list[tuple[str, str]]:
    mock = (os.environ.get("CCB_PERSONAL_MEMORY_THINKING_MOCK") or "").strip()
    if mock:
        return load_mock_entries(mock)

    force_fallback = (os.environ.get("CCB_PERSONAL_MEMORY_FORCE_FALLBACK") or "").strip() in (
        "1",
        "true",
        "yes",
    )
    if force_fallback:
        raise RuntimeError("forced fallback")

    base, token, model = load_api_settings(config_dir)
    excerpt = build_transcript_excerpt(transcript)
    if not excerpt.strip():
        return []
    prompt = build_user_prompt(
        transcript_excerpt=excerpt,
        existing_workflow=_existing_workflow(config_dir),
        employee_profile_summary=_employee_summary(config_dir),
    )
    return call_thinking(base_url=base, token=token, model=model, user_prompt=prompt)


def run_job(job: dict[str, object]) -> int:
    config_dir = Path(str(job.get("configDir") or default_config_dir()))
    transcript = Path(str(job.get("transcriptPath") or ""))
    session_id = str(job.get("sessionId") or "")
    agent_type = str(job.get("agentType") or "")

    if not transcript.is_file():
        write_status(
            config_dir,
            status="error",
            session_id=session_id,
            agent_type=agent_type,
            error="transcript missing",
        )
        _log("transcript missing", config_dir)
        return 0

    source = "thinking"
    try:
        candidates = _thinking_candidates(transcript, config_dir)
    except Exception as exc:  # noqa: BLE001
        _log(f"thinking failed: {exc}; fallback heuristic", config_dir)
        candidates = _heuristic_candidates(transcript)
        source = "heuristic"

    # Prefer workflow only; drop business-dominant slips from either path
    to_append = [
        (t, b) for t, b in candidates if t == "workflow" and not is_business_dominant(b)
    ]

    try:
        count = append_candidates(to_append, config_dir=config_dir) if to_append else 0
        write_status(
            config_dir,
            status="done",
            session_id=session_id,
            agent_type=agent_type,
            entries_appended=count,
        )
        _log(f"{source} appended {count} from {transcript.name}", config_dir)
    except (MemoryStoreError, OSError) as exc:
        write_status(
            config_dir,
            status="error",
            session_id=session_id,
            agent_type=agent_type,
            error=str(exc),
        )
        _log(f"ERROR: {exc}", config_dir)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--job", required=True, help="Path to job JSON manifest")
    args = parser.parse_args()
    job_path = Path(args.job)
    try:
        job = json.loads(job_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return 0
    if not isinstance(job, dict):
        return 0
    return run_job(job)


if __name__ == "__main__":
    raise SystemExit(main())
