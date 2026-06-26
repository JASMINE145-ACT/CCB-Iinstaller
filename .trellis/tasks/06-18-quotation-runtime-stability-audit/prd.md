# Quotation Runtime Stability Audit

## Problem

The user needs a serious runtime audit using the quotation assistant as the sample path. The target is not only whether quotation MCP returns data, but whether the whole agent runtime is coherent and stable across AionUI, aioncore/route-b, CCB-Wanding ACP, model/tool behavior, and renderer state.

Known risk classes from the spec:

- UI can show stale or replayed assistant/tool output after idle or tab switches.
- Model behavior can break continuity if assistant profile handoff, direct specialist mode, or orchestrator delegation is wrong.
- Quotation can hang or degrade if MCP tool registration, tool annotations, Stop hooks, AskUserQuestion behavior, or live Python/MCP deploy state drift.
- AionUI may correctly render events only if ACP events preserve `turn_id`, tool ids, and parent subagent metadata.

## Goals

1. Verify current live quotation-agent runtime configuration:
   - agent markdown and sidecar are present and aligned;
  - `mcpServers` / `mcp_allowlist` reflect the intended quotation workflow (`quotation + excel`);
   - the tool surface is current and does not expose stale tools.
2. Verify backend model/tool behavior:
   - default route uses orchestrator -> `Agent(quotation-agent)` when appropriate;
   - specialist quotation card can call quotation MCP directly;
   - read-only quotation tools are concurrency-safe;
   - AskUserQuestion is not used as the normal WanD clarification mechanism.
3. Verify UI/state continuity risks:
   - AionUI preserves `turn_id`;
   - stale turn-scoped events are rejected;
   - cached completed assistant/tool messages are not replayed as current output.
4. Produce a concrete issue list with evidence, layer ownership, and recommended next steps.

## Non-Goals

- Do not refactor unrelated code. The user has explicitly asked to continue and modify runtime/config issues found during the audit.
- Do not revert existing dirty worktree changes.
- Do not rely on old conversations for runtime conclusions; use fresh sessions where possible.

## Evidence To Collect

- Spec and code references for the expected contracts.
- Live config snapshots from `%LOCALAPPDATA%\CCB-Wanding\.claude\agents` and `settings.json`.
- Quotation MCP probe output.
- Native ACP route-b smoke output for at least one quotation prompt.
- AionUI code audit notes for message continuity and rendering mapping.

## Acceptance Criteria

- A written audit artifact exists under `research/`.
- Each finding identifies owner layer: AionUI, aioncore/route-b, CCB-Wanding ACP, MCP/Python/data, or config/deploy.
- Each finding distinguishes observed evidence from inference.
- The final response gives the user a concise severity-ranked view and next actions.
