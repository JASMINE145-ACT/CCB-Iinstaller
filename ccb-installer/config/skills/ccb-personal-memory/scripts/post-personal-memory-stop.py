#!/usr/bin/env python3
"""Stop / SubagentStop hook — enqueue background personal-memory worker (non-blocking)."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import uuid
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR / "lib"))

from learning_status import write_status  # noqa: E402
from parse_transcript_personal_memory import transcript_has_user_content  # noqa: E402
from personal_memory_paths import default_config_dir, jobs_dir, log_path  # noqa: E402

WORKER = SCRIPT_DIR / "personal-memory-worker.py"


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
    stamp = __import__("time").strftime("%Y-%m-%d %H:%M:%S")
    with path.open("a", encoding="utf-8", newline="\n") as handle:
        handle.write(f"[{stamp}] enqueue: {message}\n")


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


def main() -> int:
    try:
        hook_input = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    try:
        transcript = _transcript_path(hook_input)
        if transcript is None or not transcript.is_file():
            return 0
        if not transcript_has_user_content(transcript):
            return 0

        config_dir = default_config_dir()
        session_id = str(hook_input.get("session_id") or "")
        agent_type = str(hook_input.get("agent_type") or "")

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
            _log(f"spawned job {job_id}", config_dir)
        except OSError as exc:
            write_status(
                config_dir,
                status="error",
                session_id=session_id,
                agent_type=agent_type,
                error=str(exc),
            )
            _log(f"spawn failed: {exc}", config_dir)
    except Exception:  # noqa: BLE001 — fail-open: never block Stop / gate chain
        return 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
