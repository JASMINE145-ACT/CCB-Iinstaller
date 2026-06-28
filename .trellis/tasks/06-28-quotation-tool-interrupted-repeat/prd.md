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

- Every ACP run persists prompt, cancel, tool-use, tool-result, timeout, and
  process-exit evidence under the CCB-Wanding log directory.
- A quotation specialist reproduction distinguishes:
  - MCP completed and result was lost downstream
  - MCP never returned
  - session was explicitly cancelled
  - ACP/CCB child process exited
  - query timeout fired
- Root cause has a failing regression test before the behavior is changed.
- Fix is verified through the Route B/AionUI integration path.
