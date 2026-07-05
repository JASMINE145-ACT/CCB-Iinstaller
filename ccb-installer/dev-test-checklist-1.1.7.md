# Dev test checklist — CCB-Wanding 1.1.7 (personal memory Stop hook)

Release focus: **personal memory auto-accumulation** via `ccb-personal-memory` Stop/SubagentStop hook.

## P1 — Installer seed

- [ ] Run `ensure-wanding-settings.ps1` (or bootstrap Quick)
- [ ] Confirm `%LOCALAPPDATA%\CCB-Wanding\.claude\memory\` exists with `MEMORY.md`, `personal/profile.md`, `personal/workflow.md`
- [ ] Confirm **no** `memory/business/` seed
- [ ] Confirm `CLAUDE.md` contains `<!-- CCB-MEMORY-RULES:START -->` block
- [ ] Re-run ensure — existing `workflow.md` entries **not** overwritten

## P2 — Skill + hooks

- [ ] `deploy-ccb-skills.ps1` deploys `ccb-personal-memory`
- [ ] `patch-personal-memory-hooks.ps1` patches `wande-orchestrator`, `quotation-agent`, `accurate-agent`
- [ ] Agent frontmatter lists `post-personal-memory-stop.py` **before** `subagent-gate.sh` (quote/accurate)

## P3 — Stop hook smoke (thinking-primary + async)

- [ ] End session → **immediately** can start a new chat (not blocked)
- [ ] Banner shows「Agent 正在学习记录您的习惯」while learning
- [ ] Banner hides after done / ~90s stale
- [ ] Orchestrator: express preference (with or without「我习惯」) → `workflow.md` gains line
- [ ] Repeat same preference → **no duplicate**
- [ ] Business correction (customer discount) → **not** appended
- [ ] Log: `.claude/logs/personal-memory-stop.log` has enqueue + worker lines
- [ ] Status file: `.claude/memory/.learning-status.json` transitions learning → done

## P3b — Memory sider (P6)

- [ ] Sider **记忆** between 知识库 and 价格库 (CCB authority)
- [ ] `/memory` personal tab shows profile.md / workflow.md
- [ ] Edit + save updates disk file
- [ ] Business tab empty state when no `memory/business/*`

## P4 — Commands + boundary

- [ ] `/记住` command deployed to `.claude/commands/记住.md`
- [ ] `/记住` guides **personal paths only**
- [ ] Settings employee profile fields not duplicated in workflow by hook

## P5 — Regression

- [ ] `subagent-gate.sh` still runs after memory hook on quotation/accurate Stop
- [ ] Knowledge Read gate unchanged on quotation PreToolUse
- [ ] `python -m unittest discover -s ccb-installer/config/skills/ccb-personal-memory/tests` passes

## Evidence

Record: date, install version, transcript snippet, workflow.md diff, log tail.
