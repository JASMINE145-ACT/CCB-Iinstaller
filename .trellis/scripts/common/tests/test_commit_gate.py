"""Tests for `.trellis/scripts/common/commit_gate.py`.

Uses a fake `repo_root` (pytest `tmp_path`) with its own `.trellis/tasks/` and
`.trellis/.runtime/sessions/` layout — never touches this repo's real
`.trellis/` state. Session identity is pinned via the `TRELLIS_CONTEXT_ID`
env-var override that `common.active_task.resolve_context_key` already
supports, so tests don't depend on which platform/session this process
happens to be running under.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

# `.trellis/scripts` (parent of the `common` package) must be on sys.path so
# `import common.commit_gate` resolves the same way the hook adapters resolve
# it at runtime (sys.path insert, not a relative import).
_SCRIPTS_DIR = Path(__file__).resolve().parents[2]
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from common import commit_gate  # noqa: E402
from common.commit_gate import evaluate_commit_gate, is_git_commit_command  # noqa: E402

CONTEXT_KEY = "test-ctx"


def _write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


def _activate_task(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, task_name: str) -> Path:
    """Create a fake task dir + session pointer and return the task dir."""
    task_ref = f".trellis/tasks/{task_name}"
    task_dir = tmp_path / ".trellis" / "tasks" / task_name
    task_dir.mkdir(parents=True, exist_ok=True)

    session_path = tmp_path / ".trellis" / ".runtime" / "sessions" / f"{CONTEXT_KEY}.json"
    _write_json(session_path, {"current_task": task_ref, "platform": "claude"})

    monkeypatch.setenv("TRELLIS_CONTEXT_ID", CONTEXT_KEY)
    return task_dir


def _deactivate_task(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("TRELLIS_CONTEXT_ID", raising=False)


# =============================================================================
# is_git_commit_command
# =============================================================================


@pytest.mark.parametrize(
    "command",
    [
        "git commit -m \"msg\"",
        "git commit",
        "git -C /some/dir commit -m x",
        "git --git-dir=/x/.git commit -m x",
        "cd repo && git add -A && git commit -m x",
        "GIT_AUTHOR_NAME=x git commit -m x",
    ],
)
def test_is_git_commit_command_true_cases(command: str) -> None:
    assert is_git_commit_command(command) is True


@pytest.mark.parametrize(
    "command",
    [
        "git status",
        "git log --grep=commit",
        "git push",
        "git diff",
        "npm run commit",
        "echo commit",
    ],
)
def test_is_git_commit_command_false_cases(command: str) -> None:
    assert is_git_commit_command(command) is False


# =============================================================================
# evaluate_commit_gate
# =============================================================================


def test_non_commit_command_allows_without_active_task_lookup(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def _fail_if_called(*_args, **_kwargs):
        raise AssertionError("active task resolution must not run for non-commit commands")

    monkeypatch.setattr(commit_gate, "_load_active_task_resolver", _fail_if_called)

    decision, reason = evaluate_commit_gate(
        "git status", str(tmp_path), {}, "claude", tmp_path
    )

    assert decision == "allow"
    assert reason is None


def test_no_active_task_allows(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    _deactivate_task(monkeypatch)

    decision, reason = evaluate_commit_gate(
        "git commit -m test", str(tmp_path), {}, "claude", tmp_path
    )

    assert decision == "allow"
    assert reason is None


def test_active_task_with_execution_plan_evidence_allows(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    task_dir = _activate_task(tmp_path, monkeypatch, "fake-task-plan")

    (task_dir / "p1-done.md").write_text("done", encoding="utf-8")
    (task_dir / "execution-plan.md").write_text(
        "\n".join(
            [
                "# Execution Plan",
                "",
                "| Field | Value |",
                "|-------|--------|",
                "| **Active phase** | **P1** — do the thing |",
                "",
                "## Progress snapshot",
                "",
                "| Phase | State | Delivery / evidence |",
                "|-------|--------|---------------------|",
                "| **P1** Foo | ✅ | [`p1-done.md`](./p1-done.md) |",
                "",
                "## Next section",
                "",
                "irrelevant",
                "",
            ]
        ),
        encoding="utf-8",
    )

    decision, reason = evaluate_commit_gate(
        "git commit -m test", str(tmp_path), {}, "claude", tmp_path
    )

    assert decision == "allow"
    assert reason is None


def test_active_task_with_no_evidence_denies(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _activate_task(tmp_path, monkeypatch, "fake-task-empty")

    decision, reason = evaluate_commit_gate(
        "git commit -m test", str(tmp_path), {}, "claude", tmp_path
    )

    assert decision == "deny"
    assert isinstance(reason, str)
    assert reason.strip()


def test_active_task_with_check_jsonl_pass_allows(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    task_dir = _activate_task(tmp_path, monkeypatch, "fake-task-checkjsonl")

    (task_dir / "check.jsonl").write_text(
        "\n".join(
            [
                json.dumps({"check": "earlier", "evidence": "unrelated"}),
                json.dumps({"check": "lint+test", "evidence": "pytest 5/5 PASS"}),
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    decision, reason = evaluate_commit_gate(
        "git commit -m test", str(tmp_path), {}, "claude", tmp_path
    )

    assert decision == "allow"
    assert reason is None


def test_internal_exception_fails_open_with_stderr_warning(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    _activate_task(tmp_path, monkeypatch, "fake-task-boom")

    def _boom(*_args, **_kwargs):
        raise RuntimeError("simulated parsing crash")

    monkeypatch.setattr(commit_gate, "_check_jsonl_evidence", _boom)

    decision, reason = evaluate_commit_gate(
        "git commit -m test", str(tmp_path), {}, "claude", tmp_path
    )

    assert decision == "allow"
    assert reason is None

    captured = capsys.readouterr()
    assert "[commit-gate] internal error, fail-open" in captured.err
    assert "simulated parsing crash" in captured.err
