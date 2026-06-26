# Agent Expansion Template

> Use this template when adding or changing a CCB-Wanding agent. It records the stability rules learned from the quotation-agent commercial pass and keeps future assistants aligned with the current keep-set.

## When to Use

Use this document before creating a new agent, adding MCP access to an existing agent, or changing delegation behavior. For the current runtime model, read [`integration/agents-unified-model.md`](./integration/agents-unified-model.md) first.

## Decision Record

Fill this section before implementation.

| Field | Value |
|-------|-------|
| Agent id | `<agent-id>` |
| Display name | `<Chinese/product name>` |
| Primary entry | `Guid direct` / `orchestrator delegation` / `both` |
| Delegatable | `true` / `false` |
| Runtime authority | `MCP` / `skill` / `prompt-only` |
| Required MCP | `<none>` or `[server-a, server-b]` |
| Supplemental MCP | `<none>` or `[server-x]` |
| Required skills | `<none>` or `[skill-a]` |
| Model pin | `<none>` or `minimax-m3` / other |
| Stop hook | `off` / `warn` / `block` |
| Business data source | `<none>` or absolute file path |
| Fast path | `<none>` or the minimal tools/MCP for common chat |
| Delivery path | `<none>` or the heavier tools/MCP for artifact handoff |
| Commercial risk | `low` / `medium` / `high` and why |

## Stability Rules

1. The L1 markdown body is the runtime persona authority. Do not store runtime instructions in the sidecar.
2. Frontmatter `mcpServers` is the runtime MCP authority. Sidecar `mcp_allowlist` mirrors it for AionUI only.
3. Do not add helper MCP tools that only return UI/clarification objects unless the model can reliably complete the turn from them. Prefer normal assistant text questions. Do not use `AskUserQuestion` in CCB-Wanding/AionUI sessions (hard-denied in `permissions.ts`).
4. A specialist direct Guid session must call its own tools directly. It must not delegate to itself through `Agent()`.
5. The default orchestrator should not receive business MCP servers. It delegates to specialists.
6. Stop hooks are allowed only when the validator is proven against real delegated transcripts. Start with `warn` or `off` for high-value commercial paths, then promote to `block` after false positives are understood.
7. If the agent depends on live vendor code, sync both source and live dist/vendor paths before smoke testing.
8. Every new agent must be represented in seed files, sidecar, health manifest, gate mode, Trellis spec, and live deployment notes.
9. Keep the default agent path fast. Do not attach supplemental MCP servers to a high-frequency chat path just because they may be useful later.
10. Split fast chat and artifact delivery when their tool needs differ, unless the product design intentionally combines them. Current exception: `quotation-agent` intentionally uses `quotation + excel` because Excel inspection/editing is part of the quotation workflow; keep the prompt clear that `quotation` is primary and `excel` is only for post-fill sheet inspection or edits.

## Required Files

Create or update all applicable files.

| File | Required change |
|------|-----------------|
| `ccb-installer/config/agents/<agent-id>.md` | L1 body + frontmatter |
| `ccb-installer/config/agents/<agent-id>.aionui.json` | UI metadata + MCP/skill mirror |
| `ccb-installer/config/agents/README.md` | Keep-set and authority summary |
| `ccb-installer/config/mcp-health-manifest.json` | Required MCP + tool prefixes |
| `ccb-installer/config/skills/ccb-subagent-gate/config/modes.json` | `off` / `warn` / `block` |
| `ccb-installer/config/skills/ccb-subagent-gate/SKILL.md` | Gate behavior notes |
| `.trellis/spec/integration/agents-unified-model.md` | Runtime model, smoke matrix, audit table |
| `.trellis/spec/integration/mcp-health.md` | Health expectations |
| `.trellis/spec/backend/route-b-status.md` | Live status update when behavior changes |

## Markdown Frontmatter Template

```yaml
---
name: <agent-id>
description: <short user-facing capability>
model: minimax-m3
mcpServers:
  - <required-mcp>
skills:
  - <skill-name>
permissionMode: acceptEdits
hooks:
  Stop:
    - type: command
      command: <absolute-or-deployed-hook-command>
---
```

Rules:

- Keep `name` equal to the file stem so `Agent(subagent_type=...)` resolves correctly.
- Omit `model` unless this specialist needs a stable commercial model pin.
- Use `mcpServers` for MCP agents; use `skills` for skill agents. Avoid mixing unless there is a concrete workflow reason.
- Omit `hooks` when the agent should not run the subagent gate.

## Sidecar Template

```json
{
  "agent_id": "<agent-id>",
  "display_name": "<Chinese/product name>",
  "enabled": true,
  "guid_primary": true,
  "delegatable": true,
  "avatar": "tool",
  "sort_order": 100,
  "mcp_allowlist": ["<required-mcp>"],
  "skills": {
    "enabled": ["<skill-name>"],
    "disabled": []
  },
  "recommended_prompts": [],
  "source": "bundled"
}
```

Rules:

- Sidecar is UI and catalog metadata only.
- `mcp_allowlist` must mirror frontmatter `mcpServers` for AionUI.
- `delegatable: false` hides the agent from orchestrator delegation too, unless CCB source has a special bypass. Use carefully.

## Health Manifest Template

```json
"<agent-id>": {
  "required_mcp": ["<required-mcp>"],
  "tool_prefixes": ["mcp__<required-mcp>__"]
}
```

Rules:

- Include every MCP server that must be present for a commercially valid answer.
- Supplemental MCP can be listed when the agent is expected to use it in normal operation.
- For skill-only agents, use an empty `required_mcp` list.
- Do not list supplemental MCP in the fast-path agent unless the prompt also instructs the model to use it in normal turns.

## Performance Policy

Prefer a two-entry design when latency-sensitive chat and heavier delivery use different tools.

| Path | MCP shape | Use when |
|------|-----------|----------|
| Fast path | Minimal required MCP only | Routine lookup, price, stock, summary, and short answers |
| Delivery path | Required MCP + artifact/editing MCP | User explicitly asks for a file, sheet validation, post-processing, or batch handoff |

Current reference:

- `quotation-agent`: quotation workflow, `mcpServers: [quotation, excel]`; use `quotation` for match/fill and `excel` only after a sheet exists or the user explicitly asks for workbook inspection/editing.
- Future split agents are optional product changes, not the current design.

Warmup rule:

- Default router should warm only high-frequency business MCP (`quotation`, `accurate`).
- Direct office sessions may warm their own MCP (`word-creator` -> `office-word`, `excel-creator` -> `excel`).
- Do not warm every installed MCP on every session; it competes for startup resources and makes simple chats feel slow.

## Gate Mode Policy

| Mode | Use when |
|------|----------|
| `off` | Validator is unproven, agent has no deterministic artifact, or false positives would block commercial flow |
| `warn` | Validator is useful for telemetry but not yet safe to block |
| `block` | Validator is deterministic and tested with real delegated and direct transcripts |

Promotion path: `off` -> `warn` -> `block`. Do not skip to `block` for customer-critical flows without transcript tests.

## Smoke Checklist

Run this checklist before declaring the agent stable.

1. Seed deploy writes `.md` and `.aionui.json` without BOM or encoding corruption.
2. Live `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\` matches seed for this agent.
3. MCP health passes:

```powershell
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
```

4. Direct Guid session uses the expected agent profile and calls tools directly.
5. Default orchestrator delegates through `Agent(<agent-id>)` when appropriate.
6. Subagent transcript contains expected MCP or skill evidence.
7. Stop hook mode behaves as documented: no delay, no false block, expected warn/block output.
8. Commercial answer includes verifiable source data or generated artifact path, not a claimed result only.

## Current Reference Patterns

| Pattern | Existing agents | Authority |
|---------|-----------------|-----------|
| Business MCP specialist | `quotation-agent`, `accurate-agent` | L1 body + `mcpServers` + health manifest |
| Office MCP artifact agent | `word-creator`, `excel-creator` | MCP + gate block |
| Office skill artifact agent | `ppt-creator`, `word-form-creator`, `cowork` | skills + gate where applicable |
| Router | `wande-orchestrator` | no MCP, delegates only |

## Review Questions

Before merge or release, answer these in the PR or Trellis update:

1. What is the single source of runtime authority for this agent?
2. Which tool evidence proves the agent did real work?
3. What happens if the MCP server or skill is unavailable?
4. Can a valid answer be blocked by the gate? If yes, why is the risk acceptable?
5. Are direct Guid and orchestrator delegation both tested if both are supported?
