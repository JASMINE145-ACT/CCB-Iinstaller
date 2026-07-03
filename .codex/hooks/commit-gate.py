#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Codex CLI PreToolUse hook: commit-evidence gate.

Denies `git commit` (via the "Bash" shell-tool hook identity — see
`.trellis/tasks/07-03-commit-hook-claude-cursor-codex/research/codex-hook-tool-name.md`)
when there is an active Trellis task and no verification evidence has been
recorded for it. See `.trellis/scripts/common/commit_gate.py` for the shared
decision logic (same module is reused by the Claude Code and Cursor
adapters).

Codex-specific output contract (confirmed from `openai/codex` source, see the
research doc above):
- Codex's PreToolUse output parser is Rust `serde` with
  `#[serde(deny_unknown_fields)]` — ANY unrecognized top-level JSON key makes
  the whole payload fail to parse and the hook fails OPEN (does not block).
  This means the multi-platform hybrid-JSON pattern used by
  `.codex/hooks/inject-subagent-context.py` (Claude + Cursor `permission` +
  Gemini `updatedInput` fields all mixed together) is UNSAFE to reuse here
  for a `deny` decision. This adapter emits ONLY the Claude-compatible
  `hookSpecificOutput` shape with no extra top-level keys.
- Belt-and-suspenders: on `deny` this adapter ALSO exits with status code 2
  and writes the reason to stderr, which Codex independently treats as a
  block (`exit_code_two_blocks_processing`), regardless of whether the JSON
  on stdout parses. If either path has an unforeseen quirk, the other still
  blocks.

Caveat (per research doc): confirmed against `openai/codex` source at commit
`da4c8ca5`, but no official docs/hooks.md exists yet for this feature. An
empirical smoke test against a real `codex` binary is recommended before
fully trusting this in production.

Trigger: PreToolUse (matcher "Bash" — Codex's canonical hook identity for all
shell-executing tools, same string Claude Code uses).
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
        "codex",
        Path(repo_root),
    )

    if decision == "deny":
        message = reason or "Trellis commit gate: evidence missing."
        # Path 1: clean, Codex-only JSON shape (no extra top-level keys —
        # `deny_unknown_fields` would otherwise fail the whole payload open).
        output = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": message,
            }
        }
        print(json.dumps(output, ensure_ascii=False))
        # Path 2: exit code 2 + stderr reason — Codex-confirmed independent
        # blocking mechanism that sidesteps JSON parsing entirely.
        print(message, file=sys.stderr)
        sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    main()
