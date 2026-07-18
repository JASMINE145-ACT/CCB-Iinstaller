# PRD: Claude Code + Codex SessionStart opt-out + on-demand bootstrap

## Problem

Opening Claude Code or Codex in this repo always runs `SessionStart` → `session-start.py`, which injects a large Trellis context block. Small tasks feel over-harnessed. After removing SessionStart, operators still need a **manual** way to recover that opening summary when they intentionally start formal work.

## Goal

1. Make **Claude Code and Codex** **opt-in for heavy Trellis bootstrap**.
2. Keep per-turn breadcrumb + commit-gate + subagent jsonl injection.
3. Fold former SessionStart **read-only summary** into `/trellis:plan-execution` (and `trellis-task-execution` skill) as **Phase -1 Bootstrap**, so `@` that command reconstitutes: task status, active tasks, git short status, package/spec index via `get_context.py`.

## Decision

1. **Remove** only `SessionStart` (`startup` / `clear` / `compact`) from:
   - `.claude/settings.json`
   - `.codex/hooks.json`
2. **Keep** on both hosts: `UserPromptSubmit`, `PreToolUse` Bash commit-gate, `PreToolUse` Task/Agent jsonl inject.
3. **Do not** use `TRELLIS_HOOKS=0` / `TRELLIS_DISABLE_HOOKS=1`.
4. **Do not** delete `session-start.py` (either host) — unregister only.
5. **Add Phase -1 Bootstrap** to:
   - `.cursor/commands/trellis-plan-execution.md`
   - `.cursor/skills/trellis-task-execution/SKILL.md`
   - `.claude/skills/trellis-task-execution/SKILL.md`
   - `.agents/skills/trellis-task-execution/SKILL.md`
   Required once at command/skill start (read-only):
   - `python ./.trellis/scripts/task.py current --source`
   - `python ./.trellis/scripts/task.py list --mine --status in_progress` (or equivalent list of actives)
   - `python ./.trellis/scripts/get_context.py --mode packages`
   - `git status -sb`
   - Summarize active task + touched-package spec indexes before planning.
   Explicitly **not** part of bootstrap: per-turn workflow-state (stays on UserPromptSubmit hook); commit-gate (stays on PreToolUse); first-reply Chinese SessionStart notice (obsolete).
6. **Docs**: update `.trellis/spec/integration/agent-hooks-overview.md` — SessionStart unregistered; on-demand bootstrap via plan-execution.
7. Out of scope: Cursor hooks/settings; `no_task` A/B/C policy text.

## Acceptance criteria

- [ ] `.claude/settings.json` and `.codex/hooks.json` have no `SessionStart`.
- [ ] Remaining hooks on both hosts unchanged.
- [ ] Both `session-start.py` still on disk.
- [ ] Command + three skill mirrors document Phase -1 Bootstrap with the four commands above.
- [ ] `agent-hooks-overview.md` reflects unregister + on-demand bootstrap pointer.
- [ ] GREEN dual-host assert PASS.
- [ ] Manual (optional): new session without SessionStart notice; `@trellis-plan-execution` still loads bootstrap summary.

## Non-goals

- Changing workflow.md A/B/C routing.
- Disabling commit-gate or UserPromptSubmit.
- Making plan-execution auto-run on session start.
