#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Claude Code PreToolUse hook: commit-evidence gate.

Denies `git commit` (via Bash tool) when there is an active Trellis task and
no verification evidence has been recorded for it. See
`.trellis/scripts/common/commit_gate.py` for the shared decision logic (same
module is reused by the Cursor adapter).

Trigger: PreToolUse (Bash tool matcher)
"""
from __future__ import annotations

import warnings

warnings.filterwarnings("ignore")

import json
import os
import sys
from pathlib import Path

# Force stdout to use UTF-8 on Windows (matches inject-subagent-context.py).
if sys.platform.startswith("win"):
    import io as _io

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
    elif hasattr(sys.stdout, "detach"):
        sys.stdout = _io.TextIOWrapper(sys.stdout.detach(), encoding="utf-8", errors="replace")  # type: ignore[union-attr]


DIR_WORKFLOW = ".trellis"


def find_repo_root(start_path: str) -> str | None:
    """Find git repo root from start_path upwards."""
    current = Path(start_path).resolve()
    while current != current.parent:
        if (current / ".git").exists():
            return str(current)
        current = current.parent
    return None


def main() -> None:
    if os.environ.get("TRELLIS_HOOKS") == "0" or os.environ.get("TRELLIS_DISABLE_HOOKS") == "1":
        sys.exit(0)

    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    tool_name = input_data.get("tool_name", "") or input_data.get("toolName", "")
    if tool_name != "Bash":
        sys.exit(0)

    tool_input = input_data.get("tool_input", {}) or {}
    command = tool_input.get("command", "")
    if not command:
        sys.exit(0)

    cwd = input_data.get("cwd", os.getcwd())
    repo_root = find_repo_root(cwd)
    if not repo_root:
        sys.exit(0)

    scripts_dir = Path(repo_root) / DIR_WORKFLOW / "scripts"
    if str(scripts_dir) not in sys.path:
        sys.path.insert(0, str(scripts_dir))
    try:
        from common.commit_gate import evaluate_commit_gate  # type: ignore[import-not-found]
    except Exception as exc:
        print(
            f"[commit-gate] failed to import commit_gate, fail-open: {exc!r}",
            file=sys.stderr,
        )
        sys.exit(0)

    decision, reason = evaluate_commit_gate(
        command,
        cwd,
        input_data,
        "claude",
        Path(repo_root),
    )

    if decision == "deny":
        output = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": reason or "Trellis commit gate: evidence missing.",
            }
        }
        print(json.dumps(output, ensure_ascii=False))

    sys.exit(0)


if __name__ == "__main__":
    main()
