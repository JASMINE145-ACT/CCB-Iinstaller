"""Subprocess-level smoke tests for `.codex/hooks/commit-gate.py`.

Unlike `test_commit_gate.py` (which calls `evaluate_commit_gate` in-process),
these tests exercise the actual Codex adapter script end-to-end: fabricated
`PreToolUse` stdin JSON in, real subprocess exit code + stdout/stderr out.
This is the layer `evaluate_commit_gate`'s own unit tests cannot cover:
stdin parsing, the `TRELLIS_HOOKS`/`TRELLIS_DISABLE_HOOKS` escape hatch, the
"Bash"-only matcher gate, and — most importantly — the exact shape of the
JSON written to stdout on `deny`, since Codex's PreToolUse output parser uses
`#[serde(deny_unknown_fields)]` and will silently fail OPEN (not block) if
the payload contains any key beyond `hookSpecificOutput`. See
`.trellis/tasks/07-03-commit-hook-claude-cursor-codex/research/codex-hook-tool-name.md`.

Uses a fully fake repo under pytest `tmp_path` (its own `.git` marker,
`.trellis/scripts/common/{active_task,commit_gate}.py` copies, and
`.trellis/.runtime/sessions/` / `.trellis/tasks/` layout) — never touches
this repo's real `.trellis/` state, mirroring the isolation approach used by
`test_commit_gate.py`.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

# `.trellis/scripts/common/tests/<this file>` -> repo root is 4 levels up.
_REPO_ROOT = Path(__file__).resolve().parents[4]
_ADAPTER_PATH = _REPO_ROOT / ".codex" / "hooks" / "commit-gate.py"
_REAL_SCRIPTS_COMMON = _REPO_ROOT / ".trellis" / "scripts" / "common"

CONTEXT_KEY = "codex-adapter-test-ctx"


def _make_fake_repo(tmp_path: Path) -> Path:
    """Build a self-contained fake repo tree the adapter can operate against.

    Copies the (stdlib-only, self-contained) `active_task.py` and
    `commit_gate.py` modules into the fake repo's own `.trellis/scripts/common/`
    so the adapter's `sys.path.insert` + `import common.commit_gate` resolves
    entirely within `tmp_path`, never touching this repo's real modules'
    on-disk state (only their source, read-only).
    """
    (tmp_path / ".git").mkdir(parents=True, exist_ok=True)

    fake_common = tmp_path / ".trellis" / "scripts" / "common"
    fake_common.mkdir(parents=True, exist_ok=True)
    (fake_common / "__init__.py").write_text("", encoding="utf-8")
    for module_name in ("active_task.py", "commit_gate.py"):
        shutil.copyfile(_REAL_SCRIPTS_COMMON / module_name, fake_common / module_name)

    return tmp_path


def _activate_task(repo_root: Path, task_name: str) -> Path:
    """Create a fake task dir + session pointer file; returns the task dir."""
    task_ref = f".trellis/tasks/{task_name}"
    task_dir = repo_root / ".trellis" / "tasks" / task_name
    task_dir.mkdir(parents=True, exist_ok=True)

    session_path = repo_root / ".trellis" / ".runtime" / "sessions" / f"{CONTEXT_KEY}.json"
    session_path.parent.mkdir(parents=True, exist_ok=True)
    session_path.write_text(
        json.dumps({"current_task": task_ref, "platform": "codex"}, ensure_ascii=False),
        encoding="utf-8",
    )
    return task_dir


def _run_adapter(
    repo_root: Path,
    *,
    tool_name: str = "Bash",
    command: str = "git commit -m test",
    extra_input: dict | None = None,
    context_key: str | None = CONTEXT_KEY,
    disable_hooks: bool = False,
) -> subprocess.CompletedProcess[str]:
    stdin_obj = {
        "hook_event_name": "PreToolUse",
        "tool_name": tool_name,
        "tool_input": {"command": command},
        "cwd": str(repo_root),
        "session_id": "irrelevant-since-context-key-override-wins",
    }
    if extra_input:
        stdin_obj.update(extra_input)

    env = os.environ.copy()
    env.pop("TRELLIS_HOOKS", None)
    env.pop("TRELLIS_DISABLE_HOOKS", None)
    env.pop("TRELLIS_CONTEXT_ID", None)
    if context_key is not None:
        env["TRELLIS_CONTEXT_ID"] = context_key
    if disable_hooks:
        env["TRELLIS_DISABLE_HOOKS"] = "1"

    return subprocess.run(
        [sys.executable, str(_ADAPTER_PATH)],
        input=json.dumps(stdin_obj),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        cwd=str(repo_root),
        env=env,
        timeout=30,
        check=False,
    )


@pytest.fixture
def fake_repo(tmp_path: Path) -> Path:
    return _make_fake_repo(tmp_path)


def test_no_active_task_allows_silently(fake_repo: Path) -> None:
    result = _run_adapter(fake_repo, context_key=None)

    assert result.returncode == 0
    assert result.stdout == ""


def test_non_bash_tool_ignored(fake_repo: Path) -> None:
    _activate_task(fake_repo, "fake-task-nonbash")

    result = _run_adapter(fake_repo, tool_name="Write", command="git commit -m test")

    assert result.returncode == 0
    assert result.stdout == ""


def test_non_commit_command_allows(fake_repo: Path) -> None:
    _activate_task(fake_repo, "fake-task-noncommit")

    result = _run_adapter(fake_repo, command="git status")

    assert result.returncode == 0
    assert result.stdout == ""


def test_active_task_without_evidence_denies_with_exit_code_2(fake_repo: Path) -> None:
    _activate_task(fake_repo, "fake-task-empty")

    result = _run_adapter(fake_repo)

    assert result.returncode == 2
    # stderr must carry the reason too (belt-and-suspenders exit-code-2 path,
    # confirmed independent of stdout JSON per Codex's `pre_tool_use.rs` tests).
    assert result.stderr.strip()
    assert "Trellis commit gate" in result.stderr


def test_deny_stdout_json_has_no_extra_top_level_keys(fake_repo: Path) -> None:
    """Guard against Codex's `#[serde(deny_unknown_fields)]` fail-open trap.

    Any top-level key besides `hookSpecificOutput` would make Codex's parser
    reject the whole payload and fail OPEN — silently not blocking the
    commit. This is the single most important assertion in this file.
    """
    _activate_task(fake_repo, "fake-task-empty-2")

    result = _run_adapter(fake_repo)

    assert result.returncode == 2
    payload = json.loads(result.stdout)
    assert set(payload.keys()) == {"hookSpecificOutput"}

    hook_output = payload["hookSpecificOutput"]
    assert hook_output["hookEventName"] == "PreToolUse"
    assert hook_output["permissionDecision"] == "deny"
    assert isinstance(hook_output["permissionDecisionReason"], str)
    assert hook_output["permissionDecisionReason"].strip()
    assert set(hook_output.keys()) == {
        "hookEventName",
        "permissionDecision",
        "permissionDecisionReason",
    }


def test_active_task_with_check_jsonl_pass_allows(fake_repo: Path) -> None:
    task_dir = _activate_task(fake_repo, "fake-task-checkjsonl")
    (task_dir / "check.jsonl").write_text(
        json.dumps({"check": "lint+test", "evidence": "pytest 5/5 PASS"}) + "\n",
        encoding="utf-8",
    )

    result = _run_adapter(fake_repo)

    assert result.returncode == 0
    assert result.stdout == ""
    assert result.stderr == ""


def test_disable_hooks_env_var_bypasses_deny(fake_repo: Path) -> None:
    _activate_task(fake_repo, "fake-task-bypassed")

    result = _run_adapter(fake_repo, disable_hooks=True)

    assert result.returncode == 0
    assert result.stdout == ""
