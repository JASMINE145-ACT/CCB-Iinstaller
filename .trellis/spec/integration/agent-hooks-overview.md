# Agent Hooks Overview — Quick Reference

> One-page map of every hook mechanism touching this repo, so you can place a new hook (or debug an existing one) without reading 1000+ lines of [`agents-unified-model.md`](./agents-unified-model.md) first. For the deep dive (roe-judge internals, historical bug fixes, deploy scripts, full per-agent audit table), go there — this doc only indexes and cross-links.

---

## Two layers — do not confuse them

| | Layer 1 — this repo's own dev hooks | Layer 2 — WanD/CCB product agent hooks |
|---|---|---|
| **Purpose** | Manage *this Claude Code development session* (Trellis workflow-state, subagent context injection, commit gate) | Runtime guardrails + memory capture for *shipped* WanD agents running on end-user machines |
| **Configured in** | `.claude/settings.json` (this repo root) | Per-agent `.md` YAML frontmatter, shipped into `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\` |
| **Scripts live in** | `.claude/hooks/*.py` | `ccb-installer/config/skills/<skill>/scripts/*` |
| **Events used** | `SessionStart`, `PreToolUse`, `UserPromptSubmit` | `PreToolUse`, `PostToolUse`, `Stop` |

Layer 1 has **no Stop hook** — it doesn't care how *this* conversation ends. Layer 2 is almost entirely about what happens at Stop (delivery gate, memory capture). Don't reuse Layer 1 script conventions when adding a Layer 2 hook or vice versa.

---

## Layer 1 — dev-repo hooks (`.claude/settings.json`)

| Event | Matcher | Script | Purpose |
|-------|---------|--------|---------|
| SessionStart | startup / clear / compact | `session-start.py` | Injects prior session summary |
| PreToolUse | Task / Agent | `inject-subagent-context.py` | Gives dispatched subagents context |
| PreToolUse | Bash | `commit-gate.py` | Pre-commit checks |
| UserPromptSubmit | — | `inject-workflow-state.py` | Injects the `[workflow-state:...]` breadcrumb you see every turn |

4 scripts in `.claude/hooks/`, 4 entries in settings.json — no orphans either direction (verified 2026-07-06).

---

## Layer 2 — WanD agent hooks (shipped product)

Two independent skill families, both invoked as `type: command` with an absolute `$LOCALAPPDATA/CCB-Wanding/.claude/skills/<skill>/scripts/<file>` path:

- **`ccb-subagent-gate`** — runtime delivery gate + business guardrails (PreToolUse/PostToolUse business rules, Stop-time `roe-judge` delivery check). Deep dive: [`agents-unified-model.md`](./agents-unified-model.md) §Subagent delivery gate, §Universal ROE.
- **`ccb-personal-memory`** — deterministic personal-preference capture at Stop (task `07-06-ccb-memory-auto-accumulation`). Deep dive: [`agents-unified-model.md`](./agents-unified-model.md) §Personal memory Stop hook (1.1.7).

### Current agent × hook matrix

| Agent | PreToolUse | PostToolUse | Stop (execution order) |
|-------|------------|-------------|--------------------------|
| `wande-orchestrator` | — | — | `post-personal-memory-stop.py` only |
| `quotation-agent` | `pre-match-knowledge-gate.py` | `post-match-knowledge-nudge.py`, `post-price-tiers-nudge.py` | `post-personal-memory-stop.py` → `subagent-gate.sh` |
| `accurate-agent` | — | — | `post-personal-memory-stop.py` → `subagent-gate.sh` |
| `price-library-agent` | `pre-price-library-data-md-gate.py` | `post-price-library-confirm-nudge.py` | `subagent-gate.sh` only (no personal-memory — out of MVP scope) |
| `word-creator` / `excel-creator` / `ppt-creator` | — | — | `subagent-gate.sh` only (personal-memory deferred — low value for office-creation turns) |

Ordering rule: the lightweight 30s memory hook always runs **before** the heavier 120s `subagent-gate.sh`, so a slow/blocked gate never delays the deterministic memory append.

⚠️ **Known stale doc**: `agents-unified-model.md` §Agent format audit (2026-06-17) still lists "Orchestrator: … no hooks (intentional)" — that was true before task `07-06` added the personal-memory Stop hook on 2026-07-06. Treat the matrix above as current; that audit table needs a follow-up refresh.

### Two provisioning mechanisms (not duplication — different use cases)

1. **Source-baked** — hooks written directly into the packaged `.md` frontmatter under `ccb-installer/packages/vertical/com.wanding.trade/agents/` and `ccb-installer/config/agents/`. This is what a **fresh install** gets.
2. **Live-patch scripts** — `patch-subagent-gate-hooks.ps1` / `patch-personal-memory-hooks.ps1` merge the same hook block into an **already-installed** agent `.md` under `%LOCALAPPDATA%`, idempotently (skip if already present). This is the **upgrade path** for machines installed before a given hook existed. Neither script creates a backup — rollback means redeploying the pristine agent `.md` from source.

### Terminology note: "Stop" vs "SubagentStop"

Design docs (and `SKILL.md`s) talk about agents reacting to "SubagentStop" when they're delegated via the `Agent` tool. In practice there is **no separate `SubagentStop:` frontmatter key** — every agent declares `hooks: Stop: ...` in its own frontmatter, and the same hook fires whether that agent is the main session or a delegated subagent. "SubagentStop" is just the name used when describing the event from the **parent orchestrator's** point of view.

### Concurrency protection (personal-memory)

`ccb-personal-memory/scripts/lib/memory_store.py` guards against `wande-orchestrator` Stop and a delegated `quotation-agent`/`accurate-agent` Stop firing close together and both appending to the same `personal/workflow.md`:

- Exclusive-create lock file (`open(path, "x")`), 25s timeout with polling — leaves headroom under the 30s hook budget.
- Atomic write: content built in `<file>.tmp`, then `Path.replace()` onto the real target.
- Test fixtures cover signal/dedup/already-write/business-exclude cases; no dedicated concurrent-race fixture yet (tracked in `07-06-ccb-memory-auto-accumulation/execution-plan.md` §TDD contract).

---

## Where to go next

| Need | Go to |
|------|-------|
| Full per-agent hook audit table, roe-judge internals, historical hang-bug fixes | [`agents-unified-model.md`](./agents-unified-model.md) |
| `ccb-subagent-gate` behavior per agent | `ccb-installer/config/skills/ccb-subagent-gate/SKILL.md` |
| `ccb-personal-memory` behavior, log path | `ccb-installer/config/skills/ccb-personal-memory/SKILL.md` |
| Personal memory feature history / TDD contract | `.trellis/tasks/07-06-ccb-memory-auto-accumulation/execution-plan.md` |
