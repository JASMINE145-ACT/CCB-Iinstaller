# Agent instructions (L0)

Cross-tool defaults for this repository (Codex, Claude Code, and other agents that read `AGENTS.md`).

**Spec entry (AionUI + CCB-Wanding):** `.trellis/spec/index.md`

## Deferred skills / heavy workflows

Skills, Trellis workflows, and Superpowers-style process packs stay on disk but are **deferred by default**: do **not** auto-load them, do **not** run Trellis/Superpowers session injectors, and do **not** invent mandatory review→test→docs gates unless the user explicitly names a skill/command (for example `/trellis-start`, `/trellis:continue`, or “use skill X”).

When the user explicitly asks, read the named skill/command and follow it. Spec under `.trellis/spec/` still applies when editing the matching package/layer.

## Scope

- Prefer the smallest change that satisfies the request.
- Use this repo’s own build/test commands when verifying; report concrete evidence.

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

## CCB-Wanding Packaging / Release Pointer

Before **打包 / 发版 / NSIS / `build-wanding`**:

1. Read `.trellis/spec/integration/wanding-release-standard.md` (§0 · §2.3 · §5.5 · §6.8–6.9 · §10)
2. Read `.trellis/spec/integration/wanding-packaging-whitelist.md` (`$shipScripts` + bootstrap runtime closure)
3. If the user asks for a Trellis plan: `/trellis:plan-execution` or `@trellis-task-execution` → **Scenario J**
4. Cursor auto-attach: `.cursor/rules/wanding-release-packaging.mdc` when editing installer scripts / NSI / delivery notes

## Task execution planning (when user asks)

For multi-workstream Trellis tasks (especially ccb-installer + aionui-src), when the user explicitly asks to plan/execute via Trellis:

- **Cursor**: `@trellis-task-execution` or command **`/trellis:plan-execution`**
- **Skill path**: `.agents/skills/trellis-task-execution/` (mirrored in `.cursor/skills/`, `.claude/skills/`)
- **Meta-tool map**: `docs/ai-tools-reference.md` §五 · §八

## Code review agent (Cursor)

**Canonical reviewer:** Superpowers **`code-reviewer`** subagent (`subagent_type: "code-reviewer"`).

- **Plugin base:** `C:\Users\m1774\.cursor\plugins\cache\cursor-public\superpowers\b7a8f76985f1e93e75dd2f2a3b424dc731bd9d37\agents\code-reviewer.md`
- **Project extension:** `.cursor/agents/code-reviewer.md` (Layer A + Layer B)
- **Layer A spec:** `.trellis/spec/code-review-layer-a.md`
- **Cursor rule:** `.cursor/rules/code-reviewer-agent.mdc` (`alwaysApply: true`)
