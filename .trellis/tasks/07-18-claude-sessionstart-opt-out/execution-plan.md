# Execution plan: Claude + Codex SessionStart opt-out + on-demand bootstrap

| Field | Value |
|-------|-------|
| **Status** | in_progress |
| **Scenario** | A — clear PRD (unregister SessionStart + plan-execution Bootstrap) |
| **Plan depth** | Lite |
| **Verification profile** | Fast |
| **Active phase** | Phase 2 verify — GREEN + code-review PASS; optional host smoke left to user |

**Task:** `07-18-claude-sessionstart-opt-out`  
**Risk tags:** `harness` · `docs`

---

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | SKILL.md + `/trellis:plan-execution` |
| skill-selection.md | Read: | Scenario A |
| trellis-before-dev | Read: | `agent-hooks-overview.md`; `.codex/hooks.json` |
| Scope updates | — | User: Codex too; then OK to add Phase -1 Bootstrap into plan-execution |

---

## Phase -1 capability matrix

| Capability | Status | Notes |
|------------|--------|-------|
| Unregister Claude/Codex SessionStart | available | JSON only |
| Keep session-start.py | available | Re-enable via re-register |
| Keep UserPromptSubmit + commit-gate | available | Not moved into command |
| Phase -1 Bootstrap in plan-execution | available | Command + 3 skill mirrors |
| Auto SessionStart via command | **impossible** | Command is opt-in only — by design |
| Cursor SessionStart hooks | N/A | Out of scope |

**Plan depth:** Lite

---

## Scenario classification

- **A** — harness config + command/skill docs  
- Bootstrap is **complementary** to remaining hooks, not a replacement for breadcrumb/commit-gate  

---

## Contract map (lite)

- **touches:** `WANd.HARNESS.CLAUDE_SESSIONSTART.001` (provisional; Claude + Codex unregister + on-demand bootstrap)
- **Behavior protected:**
  1. New Claude/Codex sessions do **not** auto-inject heavy SessionStart context.
  2. Per-turn `[workflow-state:...]` and commit-gate still work via hooks.
  3. Invoking `/trellis:plan-execution` (or loading `trellis-task-execution`) **requires** a Phase -1 Bootstrap that runs the read-only status/context commands and summarizes before planning.
- **GREEN:**
  1. Dual JSON assert — no SessionStart; UserPromptSubmit + PreToolUse/Bash present on `.claude/settings.json` and `.codex/hooks.json`.
  2. Grep: `Phase -1` / `Session bootstrap` / `task.py current` present in `.cursor/commands/trellis-plan-execution.md` and all three `trellis-task-execution/SKILL.md` mirrors.
  3. Optional manual: new session no SessionStart notice; `@trellis-plan-execution` runs bootstrap.
- **Manual smoke:** As above, per host you use.

---

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | done | plan includes Codex + Bootstrap |
| Phase 0a | done | `.claude/settings.json` SessionStart removed |
| Phase 0b | done | `.codex/hooks.json` SessionStart removed |
| Phase 0c | done | command + 3 skill mirrors — Phase -1 Bootstrap |
| Phase 1 | done | `agent-hooks-overview.md` Layer 1 + Events used row |
| Phase 2 | done | GREEN dual JSON + bootstrap grep PASS; code-reviewer PASS ([review](dbccbc44-2bef-430e-90a6-8cadc5f83c37)); Events used nit fixed |
| Contract Verification | done | GREEN + review; optional manual Claude/Codex smoke for user |

---

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 0a | P0 | Unregister Claude SessionStart | WANd.HARNESS.CLAUDE_SESSIONSTART.001 | harness | inline | `.claude/settings.json` | No SessionStart; other hooks same | Fast |
| 0b | P0 | Unregister Codex SessionStart | WANd.HARNESS.CLAUDE_SESSIONSTART.001 | harness | inline | `.codex/hooks.json` | No SessionStart; other hooks same | Fast |
| 0c | P0 | On-demand Bootstrap | WANd.HARNESS.CLAUDE_SESSIONSTART.001 | docs | inline | `.cursor/commands/trellis-plan-execution.md`, `.cursor/skills/trellis-task-execution/SKILL.md`, `.claude/skills/...`, `.agents/skills/...` | Phase -1 Bootstrap section with four commands; note hooks still own breadcrumb/commit-gate | Fast |
| 1 | P1 | Spec sync | WANd.HARNESS.CLAUDE_SESSIONSTART.001 | docs | inline | `.trellis/spec/integration/agent-hooks-overview.md` | SessionStart unregistered; pointer to plan-execution bootstrap | Fast |
| 2 | P0 | Verify | WANd.HARNESS.CLAUDE_SESSIONSTART.001 | harness | python + grep | — | GREEN PASS | Fast |

**Bootstrap section must include (read-only, once at start):**

```text
python ./.trellis/scripts/task.py current --source
python ./.trellis/scripts/task.py list --mine --status in_progress
python ./.trellis/scripts/get_context.py --mode packages
git status -sb
→ summarize active task + package/spec indexes before planning
```

**Out of scope:** delete session-start.py; change no_task policy; Cursor hooks; TRELLIS_HOOKS=0; auto-run plan-execution on SessionStart.

---

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| 0a+0b | WANd.HARNESS.CLAUDE_SESSIONSTART.001 | SessionStart present in both JSON | Dual JSON assert | Same |
| 0c Bootstrap | same | Command/skill lack Phase -1 Bootstrap | Grep four paths for `task.py current` + `get_context.py --mode packages` | Same |
| Spec | same | Overview says SessionStart always on | Doc: unregistered + on-demand bootstrap | N/A |

---

## Contract Verification

| Contract | Verification | Required evidence | Status |
|----------|--------------|-------------------|--------|
| WANd.HARNESS.CLAUDE_SESSIONSTART.001 | Dual JSON GREEN | exit 0 | PASS |
| same | Bootstrap grep on command + 3 skills | matches | PASS |
| plan structure | lint_execution_plan.py | PASS (pre-implement) | PASS |
| same | code-reviewer | Layer A PASS, Layer B N/A, Overall PASS | PASS |

---

## Conditional recovery

- Re-enable SessionStart from git into either JSON; scripts never deleted.
- Breadcrumb/commit issues → fix remaining hooks, not Bootstrap text.
- If Bootstrap omitted on one skill mirror → sync all three + command.

---

## Manual steps (user)

1. New Claude/Codex session: confirm no heavy SessionStart inject / first-reply notice.
2. User turn: `[workflow-state:…]` still present.
3. `@trellis-plan-execution`: agent should run Phase -1 Bootstrap commands before planning.

Implementation complete for automated gates. Say `/trellis:finish-work` or ask to archive when smoke OK.
