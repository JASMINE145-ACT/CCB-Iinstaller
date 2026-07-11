#!/usr/bin/env python3
"""Stop / SubagentStop hook — DISABLED (unified idle precipitation mainline).

Personal memory extraction moved to ccb-session-precipitation (AionUI idle 60s).
This hook is a no-op to avoid dual-track LLM / auto-append.
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR / "lib"))

from personal_memory_paths import default_config_dir, log_path  # noqa: E402


def _log(message: str, config_dir: Path) -> None:
    path = log_path(config_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with path.open("a", encoding="utf-8", newline="\n") as handle:
        handle.write(f"[{stamp}] {message}\n")


def main() -> int:
    try:
        hook_input = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    config_dir = default_config_dir()
    session_id = str(hook_input.get("session_id") or "")
    event = str(hook_input.get("hook_event_name") or "Stop")
    _log(
        f"skip: unified-precipitation-mainline event={event} session={session_id} "
        "(Stop hook disabled; learning via idle 60s precipitation worker)",
        config_dir,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
