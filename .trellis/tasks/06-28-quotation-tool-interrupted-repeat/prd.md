# Repeated quotation tool interruption

## Problem

In the WanD quotation specialist conversation, `mcp__quotation__match_quotation`
is invoked with valid input but the turn sometimes ends with
`[Tool use interrupted]` before a tool result is rendered. The incident has
occurred more than once.

## Scope

Trace the full lifecycle across:

1. AionUI user send/cancel and conversation lifecycle
2. aioncore ACP process lifecycle
3. `claude-agent-acp` prompt/cancel/tool event pairing
4. CCB-Wanding native ACP session
5. quotation MCP stdio and Python

## Current evidence

- Direct quotation deep probe passes `match_quotation` and
  `get_inventory_by_code` in 15.7 seconds.
- Python path, quotation data access, and AOL credentials are healthy on the
  current machine.
- Installed, dev, and bundled `acp-agent.js` copies have the same hash and use
  the 120-second `query.next` timeout plus one silent retry.
- `[Tool use interrupted]` is synthesized when a tool-use block has no paired
  tool-result block. It is not a quotation MCP error payload.
- Existing ACP diagnostics did not persist the cancel and tool-result pairing
  evidence needed to classify repeated incidents.

## Diagnostic hypothesis

The repeated symptom is an ACP lifecycle interruption that leaves an orphaned
tool-use event. Candidate triggers are explicit session cancel, process
teardown/restart, transport exit, or query timeout. Do not attribute it to
quotation matching until a failing run shows an MCP error/result.

## Acceptance criteria

- A failing reproduction proves whether the MCP result exists upstream of the
  AionUI tool card.
- Root cause has a failing regression test before the behavior is changed.
- The regression verifies the complete lifecycle:
  `tool_use pending -> tool_result completed|failed`.
- The built and deployed fix is verified through Route B with
  `quotation-agent`, not only through the direct MCP probe.
- Repeated runs complete `match_quotation` without an orphaned tool call.
- The cross-layer role/content-block contract is recorded in Trellis specs.
