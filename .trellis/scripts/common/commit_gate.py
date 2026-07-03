#!/usr/bin/env python3
"""Shared commit-evidence gate logic (Claude Code / Cursor / Codex).

Single source of truth for the "is `git commit` safe to run right now"
decision. Platform hook adapters (`.claude/hooks/commit-gate.py`,
`.cursor/hooks/commit-gate.py`, ...) call `evaluate_commit_gate` and translate
the result into their own JSON contract — no platform-specific logic lives
here.

Decision policy (see task 07-03-commit-hook-claude-cursor-codex prd.md ADR):
- Not a `git commit` invocation -> allow, no further work.
- No active Trellis task (or a stale one) -> allow, nothing to gate against.
- Active task with verification evidence found -> allow.
- Active task with no verification evidence found -> deny, actionable reason.
- Any internal error in this module -> fail-open (allow) + visible stderr
  warning. A bug here must never be able to block every commit.
"""
from __future__ import annotations

import json
import os
import re
import shlex
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

DIR_WORKFLOW = ".trellis"
DIR_SCRIPTS = "scripts"

# git global options that consume the *next* token as a value when passed as
# two separate args (e.g. `git -C /path commit`). Options using `=` form
# (`--git-dir=/path`) are handled without consuming an extra token.
_GIT_GLOBAL_OPTS_WITH_VALUE = {
    "-c",
    "-C",
    "--git-dir",
    "--work-tree",
    "--namespace",
    "--exec-path",
}

_ACTIVE_PHASE_RE = re.compile(r"\|\s*\*\*Active phase\*\*\s*\|\s*(.+?)\s*\|\s*$", re.MULTILINE)
_PHASE_CODE_RE = re.compile(r"P-?\d+(?:\.\d+)?[A-Za-z]?")
_PROGRESS_SNAPSHOT_RE = re.compile(r"##\s*Progress snapshot\s*\n(.*?)(?=\n##\s|\Z)", re.DOTALL)
_MD_LINK_RE = re.compile(r"\]\(([^)]+\.md)\)")

_PASS_KEYWORDS = ("pass", "passed", "通过")
_NOTES_KEYWORD_RE = re.compile(r"spec:\s*no update|pass|通过", re.IGNORECASE)
_DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")
_NOTES_FRESHNESS_DAYS = 7


# =============================================================================
# `git commit` command detection
# =============================================================================


def _tokenize_command(command: str) -> list[str]:
    try:
        return shlex.split(command, posix=os.name != "nt")
    except ValueError:
        return []


def is_git_commit_command(command: str) -> bool:
    """Detect a real `git commit` invocation, tolerating -C/env-prefix/chaining.

    Deliberately conservative: only flags the token stream when a token whose
    basename is `git`/`git.exe` is followed (after skipping recognized global
    options) by a bare `commit` subcommand token. This avoids false positives
    like `git log --grep=commit` or `git status`.
    """
    tokens = _tokenize_command(command)
    for index, token in enumerate(tokens):
        name = Path(token.strip("\"'")).name.lower()
        if name not in ("git", "git.exe"):
            continue
        cursor = index + 1
        while cursor < len(tokens):
            candidate = tokens[cursor]
            if candidate.startswith("-"):
                opt = candidate.split("=", 1)[0]
                cursor += 1
                if opt in _GIT_GLOBAL_OPTS_WITH_VALUE and "=" not in candidate:
                    cursor += 1
                continue
            if candidate == "commit":
                return True
            break
    return False


# =============================================================================
# Freshness helper (shared by execution-plan.md and check.jsonl evidence)
# =============================================================================


def _staged_files_oldest_mtime(repo_root: Path) -> float | None:
    """Oldest mtime among `git diff --cached --name-only` files, or None.

    None means "skip the freshness check" — either git failed (not a repo,
    git missing, etc.) or nothing is staged. Per PRD ADR we never hard-fail
    on git errors here.
    """
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only"],
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if result.returncode != 0:
        return None

    names = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    if not names:
        return None

    mtimes: list[float] = []
    for name in names:
        try:
            mtimes.append((repo_root / name).stat().st_mtime)
        except OSError:
            continue
    return min(mtimes) if mtimes else None


def _evidence_is_fresh(evidence_path: Path, repo_root: Path) -> bool:
    oldest_staged = _staged_files_oldest_mtime(repo_root)
    if oldest_staged is None:
        return True
    try:
        evidence_mtime = evidence_path.stat().st_mtime
    except OSError:
        return True
    return evidence_mtime >= oldest_staged


# =============================================================================
# Evidence source (a): execution-plan.md Progress snapshot
# =============================================================================


def _extract_active_phase_code(execution_plan_text: str) -> str | None:
    match = _ACTIVE_PHASE_RE.search(execution_plan_text)
    if not match:
        return None
    code_match = _PHASE_CODE_RE.search(match.group(1))
    return code_match.group(0) if code_match else None


def _progress_snapshot_section(execution_plan_text: str) -> str | None:
    match = _PROGRESS_SNAPSHOT_RE.search(execution_plan_text)
    return match.group(1) if match else None


def _is_table_separator_row(row_text: str) -> bool:
    body = row_text.replace("|", "").strip()
    return bool(body) and set(body) <= {"-", ":", " "}


def _find_phase_row(section_text: str, phase_code: str) -> str | None:
    code_token_re = re.compile(rf"(?<![A-Za-z0-9]){re.escape(phase_code)}(?![A-Za-z0-9])")
    for line in section_text.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        if _is_table_separator_row(stripped):
            continue
        cells = [cell.strip() for cell in stripped.strip("|").split("|")]
        if not cells:
            continue
        first_cell = cells[0].replace("*", "")
        if code_token_re.search(first_cell):
            return stripped
    return None


def _execution_plan_evidence(task_dir: Path, repo_root: Path) -> Path | None:
    plan_path = task_dir / "execution-plan.md"
    if not plan_path.is_file():
        return None
    try:
        text = plan_path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None

    phase_code = _extract_active_phase_code(text)
    if not phase_code:
        return None

    section = _progress_snapshot_section(text)
    if not section:
        return None

    row = _find_phase_row(section, phase_code)
    if not row or "✅" not in row:  # "✅"
        return None

    link_match = _MD_LINK_RE.search(row)
    if not link_match:
        return None

    linked_path = (task_dir / link_match.group(1)).resolve()
    if not linked_path.is_file():
        return None
    if not _evidence_is_fresh(linked_path, repo_root):
        return None
    return linked_path


# =============================================================================
# Evidence source (b): check.jsonl last entry
# =============================================================================


def _check_jsonl_evidence(task_dir: Path, repo_root: Path) -> Path | None:
    jsonl_path = task_dir / "check.jsonl"
    if not jsonl_path.is_file():
        return None

    last_entry: Any = None
    try:
        with jsonl_path.open("r", encoding="utf-8") as handle:
            for raw_line in handle:
                line = raw_line.strip()
                if not line:
                    continue
                try:
                    last_entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
    except OSError:
        return None

    if not isinstance(last_entry, dict):
        return None

    evidence_text = str(last_entry.get("evidence", "")).lower()
    if not any(keyword in evidence_text for keyword in _PASS_KEYWORDS):
        return None

    if not _evidence_is_fresh(jsonl_path, repo_root):
        return None
    return jsonl_path


# =============================================================================
# Evidence source (c): task.json notes
# =============================================================================


def _notes_text(task_json: dict[str, Any]) -> str:
    notes = task_json.get("notes")
    if isinstance(notes, str):
        return notes
    if isinstance(notes, list):
        return "\n".join(str(item) for item in notes)
    return ""


def _read_json_file(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _task_json_has_recent_evidence(task_dir: Path) -> bool:
    data = _read_json_file(task_dir / "task.json")
    if not isinstance(data, dict):
        return False

    notes_text = _notes_text(data)
    if not notes_text:
        return False

    cutoff = datetime.now(timezone.utc) - timedelta(days=_NOTES_FRESHNESS_DAYS)
    for keyword_match in _NOTES_KEYWORD_RE.finditer(notes_text):
        window_start = max(0, keyword_match.start() - 80)
        window_end = min(len(notes_text), keyword_match.end() + 80)
        window = notes_text[window_start:window_end]
        for date_match in _DATE_RE.finditer(window):
            try:
                parsed = datetime.strptime(date_match.group(0), "%Y-%m-%d").replace(
                    tzinfo=timezone.utc
                )
            except ValueError:
                continue
            if parsed >= cutoff:
                return True
    return False


# =============================================================================
# Active task resolution (delegates to common.active_task)
# =============================================================================


def _load_active_task_resolver(repo_root: Path):
    """Import `resolve_active_task`, inserting `.trellis/scripts` if needed.

    Kept as a separate function (rather than a top-level import) so tests can
    monkeypatch it, and so a broken `.trellis/scripts` layout surfaces as a
    caught exception (fail-open) instead of an import-time crash.
    """
    scripts_dir = repo_root / DIR_WORKFLOW / DIR_SCRIPTS
    if str(scripts_dir) not in sys.path:
        sys.path.insert(0, str(scripts_dir))
    from common.active_task import resolve_active_task  # type: ignore[import-not-found]

    return resolve_active_task


# =============================================================================
# Public entry point
# =============================================================================


def evaluate_commit_gate(
    command: str,
    cwd: str,
    platform_input: dict[str, Any] | None,
    platform: str | None,
    repo_root: Path,
) -> tuple[str, str | None]:
    """Decide whether a shell `command` running as `git commit` should proceed.

    Returns `("allow", None)` or `("deny", reason)`. Never raises — any
    internal error is caught and turned into a fail-open `("allow", None)`
    plus a visible stderr warning.
    """
    _ = cwd  # not currently used for evaluation; kept for adapter symmetry
    try:
        if not is_git_commit_command(command):
            return "allow", None

        resolve_active_task = _load_active_task_resolver(repo_root)
        active = resolve_active_task(repo_root, platform_input, platform)
        if not active.task_path or active.stale:
            return "allow", None

        task_dir = (repo_root / active.task_path).resolve()
        if not task_dir.is_dir():
            return "allow", None

        if _execution_plan_evidence(task_dir, repo_root) is not None:
            return "allow", None
        if _check_jsonl_evidence(task_dir, repo_root) is not None:
            return "allow", None
        if _task_json_has_recent_evidence(task_dir):
            return "allow", None

        reason = (
            "Trellis commit gate: no verification evidence found for active task "
            f"'{active.task_path}'. Before committing, do one of: "
            "(1) run trellis-check and land a PASS entry in check.jsonl, "
            "(2) mark the active phase done with a checkmark in execution-plan.md's "
            "Progress snapshot, linked to an existing evidence file, or "
            "(3) add a dated note to task.json (e.g. 'spec: no update — <reason>' "
            "or a PASS summary) within the last 7 days. "
            "Escape hatch: set TRELLIS_DISABLE_HOOKS=1 to bypass."
        )
        return "deny", reason
    except Exception as exc:  # noqa: BLE001 - fail-open by design, see module docstring
        print(f"[commit-gate] internal error, fail-open: {exc!r}", file=sys.stderr)
        return "allow", None
