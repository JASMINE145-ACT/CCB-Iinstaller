# Change Local Hooks

Hooks are the automation layer that connects a platform to Trellis. When the user wants to change "when context is injected," "how shell commands inherit a session," or "which files are read before an agent starts," hooks are usually the edit point.

## Read These Files First

1. Target platform settings/config, such as `.claude/settings.json`, `.codex/hooks.json`, `.cursor/hooks.json`
2. Target platform hooks directory
3. `.trellis/scripts/common/active_task.py`
4. `.trellis/scripts/common/session_context.py`
5. `.trellis/workflow.md`

## Common Hook Types

| Hook | Purpose |
| --- | --- |
| session-start | Injects a Trellis overview when a session starts, clears, or compacts. |
| workflow-state | Injects a state hint on each user input. |
| sub-agent context | Injects PRD/spec/research before an agent starts. |
| shell session bridge | Lets `task.py` commands in shell see the same session identity. |

## Modification Steps

1. Find the hook registration in settings/config.
2. Confirm the registered script path exists.
3. Read the hook script and identify inputs, outputs, and called `.trellis/scripts/`.
4. Modify hook behavior.
5. If the hook depends on workflow content, synchronize `.trellis/workflow.md`.

## Example: Change New-Session Injection Content

First find the session-start hook:

```text
.claude/settings.json
.claude/hooks/session-start.py
```

If the hook ultimately calls `.trellis/scripts/get_context.py` or `session_context.py`, editing the local script is usually more robust than hard-coding content in the hook.

## Example: Agent Did Not Read JSONL

First confirm:

```bash
python ./.trellis/scripts/task.py current --source
python ./.trellis/scripts/task.py validate <task>
```

If the task and JSONL are correct, determine whether the platform uses hook push or agent pull. For hook push, edit `inject-subagent-context`; for agent pull, edit the agent file.

## Example: Add a Blocking Pre-Commit Gate (2026-07-03, task `07-03-commit-hook-claude-cursor-codex`)

Real case study: the previous state was a **documentation-only** gate — `trellis-task-execution` SKILL.md described a review→test→commit chain, but no hook actually blocked `git commit`. This example is the executable contract for the fix, kept here because any future "add a hook that blocks a shell command" task should start from this, not from scratch.

### 1. Scope / Trigger
- Trigger: block `git commit` at `PreToolUse` time when the active Trellis task has no recorded verification evidence. Only `git commit` — not `push`/`log`/`diff`/`status` — to keep blast radius narrow.

### 2. Signatures
- Shared decision function: `.trellis/scripts/common/commit_gate.py::evaluate_commit_gate(command: str, cwd: str, platform_input: dict, platform: str | None, repo_root: Path) -> tuple[Literal["allow", "deny"], str | None]`
- Per-platform adapters (thin, stdin-JSON in / stdout-JSON or exit-code out): `.claude/hooks/commit-gate.py`, `.cursor/hooks/commit-gate.py`, `.codex/hooks/commit-gate.py`.

### 3. Contracts
- Registration:
  - Claude Code — `.claude/settings.json` → `PreToolUse` matcher `"Bash"` → `python .claude/hooks/commit-gate.py`
  - Cursor — `.cursor/hooks.json` → `"beforeShellExecution"` → `.cursor/hooks/commit-gate.py`
  - Codex — `.codex/hooks.json` → `PreToolUse` matcher `"Bash"` → `.codex/hooks/commit-gate.py` (same matcher name and same `hookSpecificOutput` contract as Claude Code — confirmed from `openai/codex` source, not guessed)
- Escape hatch (all platforms): `TRELLIS_DISABLE_HOOKS=1` or `TRELLIS_HOOKS=0` env var → adapter exits 0 immediately, no evaluation.
- Evidence sources, checked in this priority order for the active task directory:
  1. `execution-plan.md` — the row matching the header's `Active phase` value has a `✅` marker **and** its linked `.md` file resolves to a real file on disk.
  2. `check.jsonl` — last line's `evidence` field contains `pass`/`passed`/`PASS`/`通过` (case-insensitive).
  3. `task.json` → `notes` (plain string in this repo, not a list) contains a `spec: no update` or pass/通过 line dated within 7 days.
  4. None found → `deny`.
- Freshness: evidence file mtime must be `>=` the oldest mtime among `git diff --cached --name-only` output; if that git call fails or returns empty, skip the freshness check (don't hard-fail on git errors).
- No active task (or stale session pointer) → always `allow` — nothing to gate against.

### 4. Validation & Error Matrix
| Condition | Result |
|---|---|
| Command is not `git commit` (e.g. `git status`, `git log --grep=commit`) | `allow`, fast-path, no active-task lookup |
| No active task / stale | `allow` |
| Active task, evidence found (any of the 3 sources) | `allow` |
| Active task, no evidence found | `deny` + actionable reason (what to run to produce evidence) |
| `commit_gate.py` internal exception (bug in the gate itself) | **fail-open**: `allow` + visible `stderr` warning — a bug in the gate must never brick all commits |
| `TRELLIS_DISABLE_HOOKS=1` set | `allow`, no evaluation |

### 5. Good/Base/Bad Cases
- Good: task has `execution-plan.md` with `Active phase` row ✅-linked to an existing done-file → commit proceeds silently.
- Base: no active Trellis task at all (e.g. unrelated repo maintenance) → commit proceeds, gate never engages.
- Bad: active task, agent tries to commit straight after editing code with zero check.jsonl/execution-plan/task.json evidence → **denied**, reason names the missing evidence and what sub-agent/skill to run.

### 6. Tests Required
- `.trellis/scripts/common/tests/test_commit_gate.py` (18 cases) — `is_git_commit_command` true/false matrix (incl. `git -C`, `--git-dir=`, chained `&&`, env-prefix, `git log --grep=commit` non-match), no-active-task allow, each evidence-source allow path, no-evidence deny with non-empty reason, internal-exception fail-open + stderr warning.
- `.trellis/scripts/common/tests/test_commit_gate_codex_adapter.py` (7 cases, subprocess-level against the real adapter script in an isolated fake repo) — includes `test_deny_stdout_json_has_no_extra_top_level_keys`, the regression guard for the gotcha below.

### 7. Wrong vs Correct

**Wrong** (what `inject-subagent-context.py` does today for prompt injection, and why it must NOT be copied for a `deny` decision on Codex):
```json
{
  "hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "..."},
  "permission": "deny",
  "updatedInput": {}
}
```
Codex's hook-output parser is Rust `serde` with `#[serde(deny_unknown_fields)]`. Any key beyond what Codex recognizes (`permission`, `updatedInput` here) makes the **whole JSON fail to parse**, and Codex fails open — the commit is silently allowed, the opposite of the intent. This only breaks Codex; Claude Code and Cursor tolerate extra keys, which is why the multi-format hybrid blob works fine for prompt-injection hooks (`allow`-only, no risk) but is unsafe to reuse for any hook that can `deny`.

**Correct** (Codex adapter emits *only* its own shape, plus a belt-and-suspenders exit code):
```json
{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "..."}}
```
and the adapter process additionally exits with status `2` (Codex-confirmed to block regardless of stdout JSON shape) — so a future unforeseen parser quirk still fails closed instead of open.

**Also correct** (self-modification boundary you will hit if you try this): a sub-agent — and even the **main session** — attempting to add the `PreToolUse`/`"Bash"` matcher to `.claude/settings.json` was blocked by the Claude Code auto-mode permission classifier as "editing the agent's own permission/hook configuration." This is not a bug to route around; it means wiring `.claude/settings.json` for a new blocking hook requires the human to make that specific edit (or explicitly instruct the AI to do it in a message that itself constitutes the authorization the classifier is asking for — a generic task-level "you handle it" earlier in the conversation was not treated as sufficient by the classifier for this specific self-modifying action).

## Notes

- Settings handle registration, hook scripts handle behavior; inspect both together.
- Different platforms support different hook events. Do not directly copy another platform's settings.
- Hooks should read project-local `.trellis/`; they should not depend on Trellis upstream source paths.
- Hook failures should produce visible errors so AI does not silently lose context.
- A hook that can `deny`/block (not just inject context) needs its own per-platform output-shape verification — do not assume a format that works for one platform's `allow`-only hook is safe to reuse for another platform's blocking hook. See the commit-gate example above for the Codex `deny_unknown_fields` case.
