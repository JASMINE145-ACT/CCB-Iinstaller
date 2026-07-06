#!/usr/bin/env python3
"""Background worker: thinking extract (primary) + heuristic fallback → validate → append.

Validation (R3/R5): every candidate carries (target, text, evidence); evidence must
fuzzily locate inside a user message of the incremental window, text must be
6-120 chars, business-dominant text is vetoed. Near-dup rejection (R4) lives in
memory_store.should_skip_candidate so both thinking and heuristic paths share it.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from difflib import SequenceMatcher
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR / "lib"))

from learning_status import write_status  # noqa: E402
from memory_store import (  # noqa: E402
    MemoryStoreError,
    append_candidates,
    read_bullets,
)
from parse_transcript_personal_memory import (  # noqa: E402
    build_transcript_excerpt,
    extract_candidates,
    is_business_dominant,
    iter_user_messages,
    transcript_has_write_overlap,
)
from personal_memory_paths import (  # noqa: E402
    default_config_dir,
    employee_profile_path,
    log_path,
)
from thinking_client import (  # noqa: E402
    build_user_prompt,
    call_thinking,
    load_api_settings,
    load_mock_entries,
)

VALID_TARGETS = ("workflow", "profile")
MIN_TEXT_CHARS = 6
MAX_TEXT_CHARS = 120
EVIDENCE_MATCH_RATIO = 0.6

# (target, text, evidence)
Candidate = tuple[str, str, str]


def _log(message: str, config_dir: Path) -> None:
    path = log_path(config_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    stamp = __import__("time").strftime("%Y-%m-%d %H:%M:%S")
    with path.open("a", encoding="utf-8", newline="\n") as handle:
        handle.write(f"[{stamp}] {message}\n")


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


def _bullets_hint(target: str, config_dir: Path) -> str:
    """Full normalized bullet list as dedup hint (R4) — not a byte-tail window."""
    return "\n".join(f"- {body}" for body in read_bullets(target, config_dir))


def _heuristic_candidates(transcript: Path, start_line: int) -> list[Candidate]:
    out: list[Candidate] = []
    for candidate in extract_candidates(transcript, start_line=start_line):
        if transcript_has_write_overlap(transcript, candidate):
            continue
        # Heuristic evidence is the source user message itself.
        out.append((candidate.target, candidate.text, candidate.source_message))
    return out


def _thinking_candidates(
    transcript: Path,
    config_dir: Path,
    start_line: int,
) -> list[Candidate]:
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
    excerpt = build_transcript_excerpt(transcript, start_line=start_line)
    if not excerpt.strip():
        return []
    prompt = build_user_prompt(
        transcript_excerpt=excerpt,
        existing_workflow=_bullets_hint("workflow", config_dir),
        existing_profile=_bullets_hint("profile", config_dir),
        employee_profile_summary=_employee_summary(config_dir),
    )
    return call_thinking(base_url=base, token=token, model=model, user_prompt=prompt)


def _evidence_locatable(evidence: str, user_messages: list[str]) -> bool:
    """Evidence must anchor to a user message: substring or ratio >= 0.6 (R3)."""
    normalized = " ".join(evidence.split()).casefold()
    if not normalized:
        return False
    for message in user_messages:
        candidate = " ".join(message.split()).casefold()
        if not candidate:
            continue
        if normalized in candidate or candidate in normalized:
            return True
        if SequenceMatcher(None, normalized, candidate).ratio() >= EVIDENCE_MATCH_RATIO:
            return True
    return False


def _validate_candidates(
    candidates: list[Candidate],
    *,
    transcript: Path,
    start_line: int,
) -> list[tuple[str, str]]:
    user_messages = list(iter_user_messages(transcript, start_line=start_line))
    accepted: list[tuple[str, str]] = []
    for target, text, evidence in candidates:
        body = " ".join(text.split())
        if target not in VALID_TARGETS:
            continue
        if not (MIN_TEXT_CHARS <= len(body) <= MAX_TEXT_CHARS):
            continue
        if is_business_dominant(body):
            continue
        if not _evidence_locatable(evidence, user_messages):
            continue
        accepted.append((target, body))
    return accepted


def run_job(job: dict[str, object]) -> int:
    config_dir = Path(str(job.get("configDir") or default_config_dir()))
    transcript = Path(str(job.get("transcriptPath") or ""))
    session_id = str(job.get("sessionId") or "")
    agent_type = str(job.get("agentType") or "")
    try:
        start_line = max(0, int(job.get("startLine") or 0))
    except (TypeError, ValueError):
        start_line = 0

    if not transcript.is_file():
        write_status(
            config_dir,
            status="error",
            session_id=session_id,
            agent_type=agent_type,
            error="transcript missing",
        )
        _log("learn: transcript missing", config_dir)
        return 0

    source = "thinking"
    try:
        candidates = _thinking_candidates(transcript, config_dir, start_line)
    except Exception as exc:  # noqa: BLE001
        _log(f"learn: thinking failed: {exc}; fallback heuristic", config_dir)
        candidates = _heuristic_candidates(transcript, start_line)
        source = "heuristic"

    to_append = _validate_candidates(candidates, transcript=transcript, start_line=start_line)

    try:
        appended = append_candidates(to_append, config_dir=config_dir) if to_append else []
        texts = [body for _, body in appended]
        skipped = None
        if not appended:
            skipped = "no-valid-entries" if candidates else "no-candidates"
        write_status(
            config_dir,
            status="done",
            session_id=session_id,
            agent_type=agent_type,
            entries_appended=len(appended),
            skipped_reason=skipped,
            last_entries=texts,
        )
        _log(
            f"learn: source={source} appended={len(appended)}"
            f" entries={json.dumps(texts, ensure_ascii=False)}",
            config_dir,
        )
    except (MemoryStoreError, OSError) as exc:
        write_status(
            config_dir,
            status="error",
            session_id=session_id,
            agent_type=agent_type,
            error=str(exc),
        )
        _log(f"learn: ERROR: {exc}", config_dir)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--job", required=True, help="Path to job JSON manifest")
    args = parser.parse_args()
    job_path = Path(args.job)
    try:
        try:
            job = json.loads(job_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return 0
        if not isinstance(job, dict):
            return 0
        return run_job(job)
    finally:
        # Hygiene (R8): job manifest is single-use — remove it on every exit path.
        try:
            job_path.unlink(missing_ok=True)
        except OSError:
            pass


if __name__ == "__main__":
    raise SystemExit(main())
