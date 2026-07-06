#!/usr/bin/env python3
"""Stop / SubagentStop hook — gated enqueue of background personal-memory worker.

Sync path stays millisecond-level: regex pre-screen only, never any network call.
Decision order: cooldown → no-new-lines → no-signal → enqueue (R1/R2).
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import uuid
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR / "lib"))

from learning_state import claim_window, session_key  # noqa: E402
from learning_status import write_status  # noqa: E402
from parse_transcript_personal_memory import (  # noqa: E402
    lines_have_new_signal,
    read_transcript_lines,
)
from personal_memory_paths import default_config_dir, jobs_dir, log_path  # noqa: E402

WORKER = SCRIPT_DIR / "personal-memory-worker.py"
STALE_JOB_SEC = 7 * 24 * 3600


def _transcript_path(hook_input: dict[str, object]) -> Path | None:
    event = str(hook_input.get("hook_event_name") or "Stop")
    if event == "SubagentStop":
        raw = str(hook_input.get("agent_transcript_path") or "").strip()
        if not raw:
            raw = str(hook_input.get("transcript_path") or "").strip()
    else:
        raw = str(hook_input.get("transcript_path") or "").strip()
    return Path(raw) if raw else None


def _log(message: str, config_dir: Path) -> None:
    path = log_path(config_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with path.open("a", encoding="utf-8", newline="\n") as handle:
        handle.write(f"[{stamp}] {message}\n")


def _cleanup_stale_jobs(config_dir: Path) -> None:
    """Hygiene (R8): drop job manifests older than 7 days on every hook run."""
    directory = jobs_dir(config_dir)
    if not directory.is_dir():
        return
    cutoff = time.time() - STALE_JOB_SEC
    for path in directory.glob("*.json"):
        try:
            if path.stat().st_mtime < cutoff:
                path.unlink(missing_ok=True)
        except OSError:
            continue


def _spawn_worker(job_path: Path) -> None:
    creationflags = 0
    if sys.platform == "win32":
        # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW
        creationflags = 0x00000008 | 0x00000200 | 0x08000000

    kwargs: dict[str, object] = {
        "args": [sys.executable, str(WORKER), "--job", str(job_path)],
        "stdin": subprocess.DEVNULL,
        "stdout": subprocess.DEVNULL,
        "stderr": subprocess.DEVNULL,
        "close_fds": True,
    }
    if creationflags:
        kwargs["creationflags"] = creationflags
    else:
        kwargs["start_new_session"] = True

    # Sync mode for tests only
    if (os.environ.get("CCB_PERSONAL_MEMORY_SYNC") or "").strip() in ("1", "true", "yes"):
        subprocess.run(
            [sys.executable, str(WORKER), "--job", str(job_path)],
            check=False,
            timeout=60,
        )
        return

    subprocess.Popen(**kwargs)  # noqa: S603


def _should_enqueue(
    transcript: Path,
    session_id: str,
    config_dir: Path,
) -> tuple[int, int] | None:
    """Return (start_line, total_lines) to enqueue, or None after logging a skip.

    Skips deliberately write NO status file: a concurrent SubagentStop worker may
    be mid-learning, and writing idle here would clobber the AionUI banner
    contract. Skip decisions are observable via the log line only (R7 choice).
    """
    key = session_key(session_id, transcript)
    cached: list[str] | None = None

    def _lines() -> list[str]:
        # Lazy single read: cooldown skips never touch the transcript, and the
        # line count + signal scan share one read (hook fast-path IO budget).
        nonlocal cached
        if cached is None:
            cached = read_transcript_lines(transcript)
        return cached

    # claim_window is atomic (decide + watermark write under one file lock),
    # so concurrent Stop/SubagentStop events cannot double-claim this window.
    result = claim_window(
        config_dir,
        session_id,
        key,
        count_lines=lambda: len(_lines()),
        has_signal=lambda processed: lines_have_new_signal(_lines(), start_line=processed),
    )
    if result.decision == "claimed":
        return result.start_line, result.total_lines
    if result.decision == "cooldown":
        _log(f"skip: cooldown session={key} elapsed={result.elapsed or 0:.0f}s", config_dir)
    elif result.decision == "no-new-lines":
        _log(f"skip: no-new-lines session={key} processed={result.start_line}", config_dir)
    else:
        _log(
            f"skip: no-signal session={key} lines={result.start_line}-{result.total_lines}",
            config_dir,
        )
    return None


def main() -> int:
    try:
        hook_input = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    try:
        transcript = _transcript_path(hook_input)
        if transcript is None or not transcript.is_file():
            return 0

        config_dir = default_config_dir()
        session_id = str(hook_input.get("session_id") or "")
        agent_type = str(hook_input.get("agent_type") or "")
        _cleanup_stale_jobs(config_dir)

        window = _should_enqueue(transcript, session_id, config_dir)
        if window is None:
            return 0
        start_line, total_lines = window

        job_id = uuid.uuid4().hex[:12]
        job_dir = jobs_dir(config_dir)
        job_dir.mkdir(parents=True, exist_ok=True)
        job_path = job_dir / f"{job_id}.json"
        job = {
            "jobId": job_id,
            "configDir": str(config_dir),
            "transcriptPath": str(transcript),
            "sessionId": session_id,
            "agentType": agent_type,
            "hookEvent": str(hook_input.get("hook_event_name") or "Stop"),
            "startLine": start_line,
        }
        job_path.write_text(json.dumps(job, ensure_ascii=False), encoding="utf-8")

        write_status(
            config_dir,
            status="learning",
            session_id=session_id,
            agent_type=agent_type,
        )
        try:
            _spawn_worker(job_path)
            _log(
                f"learn: enqueued job {job_id} session={session_key(session_id, transcript)}"
                f" lines={start_line}-{total_lines}",
                config_dir,
            )
        except OSError as exc:
            write_status(
                config_dir,
                status="error",
                session_id=session_id,
                agent_type=agent_type,
                error=str(exc),
            )
            _log(f"learn: spawn failed: {exc}", config_dir)
    except Exception:  # noqa: BLE001 — fail-open: never block Stop / gate chain
        return 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
