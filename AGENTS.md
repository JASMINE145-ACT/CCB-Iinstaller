<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

**Spec entry (AionUI + CCB-Wanding):** `.trellis/spec/index.md`

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->

---

## AionUI Frontend Pointer

For AionUI exe frontend work (UI, IPC, ACP event handling, CCB-Wanding integration), start at:

- **Entry**: `.trellis/spec/frontend/index.md` — Rule 0, decision tree, Docs Index
- **Project strategy** (source-first for ACP bugs): `.trellis/spec/outline.md` (Primary strategy / Rule 0)
- **Backend boundary / sync / defensive fix**: `.trellis/spec/integration/index.md`

Use `.trellis/spec/frontend/coding-rules.md` and `file-map.md` for renderer patterns (legacy Trellis bootstrap stubs were removed 2026-06-26).

## CCB-Wanding Backend Pointer

For CCB-Wanding / MCP / ACP backend work (claude-code-B source, dist deploy, quotation MCP), start at:

- **Entry**: `.trellis/spec/backend/index.md` — Rule 0, two layers of truth (source vs live dist)
- **Live status snapshot**: `.trellis/spec/backend/route-b-status.md`
- **Build + deploy + smoke**: `.trellis/spec/backend/build-deploy-verify.md`
- **route-b sync** (after backend or patch changes): `.trellis/spec/integration/route-b-sync.md`

## Task execution planning (Cursor / Claude)

Before multi-workstream Trellis tasks (especially ccb-installer + aionui-src):

- **Cursor**: `@trellis-task-execution` or command **`/trellis:plan-execution`**
- **Skill path**: `.agents/skills/trellis-task-execution/` (mirrored in `.cursor/skills/`, `.claude/skills/`)
- **Meta-tool map**: `docs/ai-tools-reference.md` §五 · §八

## Code review agent (Cursor)

**Canonical reviewer:** Superpowers **`code-reviewer`** subagent (`subagent_type: "code-reviewer"`).

- **Plugin base:** `C:\Users\m1774\.cursor\plugins\cache\cursor-public\superpowers\b7a8f76985f1e93e75dd2f2a3b424dc731bd9d37\agents\code-reviewer.md`
- **Project extension:** `.cursor/agents/code-reviewer.md` (Layer A + Layer B)
- **Layer A spec:** `.trellis/spec/code-review-layer-a.md`
- **Cursor rule:** `.cursor/rules/code-reviewer-agent.mdc` (`alwaysApply: true`)
