# Claude Code B Capability Parity Audit

Date: 2026-06-30

## Conclusion

The product does not reproduce every Claude Code B capability.

It runs the real Claude Code B `QueryEngine`, so most core agent behavior is
inherited rather than reimplemented. Core reasoning, tool loops, MCP, session
persistence, cancellation, permissions, subagent execution, and automatic
compaction are therefore present.

Parity becomes partial at the ACP, AionUI, and product-policy layers. Some
capabilities are adapted, hidden, not rendered, or explicitly disabled.

## Architecture

```text
AionUI
  -> closed-source aioncore
  -> patched ACP / route-b
  -> D:\CCB-Wanding\dist\cli.js --acp
  -> Claude Code B ACP agent
  -> QueryEngine
```

The ACP agent constructs `QueryEngine` with the normal tools, commands, MCP
clients, agents, permission callback, model configuration, and restored
messages. It calls `submitMessage()` instead of maintaining a separate,
simplified agent loop.

## Capability Matrix

| Area | Assessment | Evidence / limitation |
| --- | --- | --- |
| Core model and tool loop | High parity | Real `QueryEngine` is used |
| Automatic compaction | High backend parity | Proactive/reactive compaction and compact boundaries are in source and deployed dist |
| Manual `/compact` | Available | Command type is `local`, supports non-interactive execution |
| Compaction UI | Partial | Completion and usage reset are bridged; CLI-level progress/detail is not fully reproduced |
| Session persistence/resume | High parity | JSONL transcript restore, incomplete-tail trimming, compact-boundary restore |
| MCP tools | High parity | MCP clients and prefetched tools are passed into `QueryEngine` |
| Deferred extra-tool search | Disabled | `ENABLE_SEARCH_EXTRA_TOOLS=false` |
| Synchronous subagents | Available | Agent definitions are loaded and passed to the engine |
| Background tasks | Disabled | Live settings set `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` |
| Permissions / AskUserQuestion | High parity | ACP permission bridge and custom question handling exist |
| Cancellation / queued prompts | High parity | ACP agent queues concurrent prompts and interrupts the engine |
| Native CLI commands and panels | Partial | Many `local-jsx` commands require AionUI-specific mappings |
| Attachments | Partial | Images and embedded text supported; blobs/audio/outbound images have limitations |
| SDK event rendering | Partial | Some events, including tool-use summaries and attachments, are skipped by the ACP bridge |
| Fast Mode | Disabled | Route-b configuration disables it |
| Plugin auto-update | Disabled | Product configuration disables it |
| Telemetry | Disabled | Operational difference, not a core user workflow |

## Automatic Compaction

Automatic compaction is not a frontend imitation. It executes inside the same
Claude Code B query loop used by the CLI.

The backend includes:

- proactive and reactive automatic compaction;
- micro-compaction and context-collapse preparation;
- configurable threshold handling;
- repeated-failure circuit breaking;
- persistent compact-boundary messages;
- transcript restoration after a compacted session resumes;
- pre/post compact hook support in the backend.

The deployed `D:\CCB-Wanding\dist` contains compact-boundary handling, so this
is not only present in the development source.

Current live settings do not explicitly disable auto-compaction. Claude Code B
defaults `autoCompactEnabled` to enabled. The live settings do explicitly
disable background tasks.

Product-level compaction parity is still not complete:

- AionUI mainly receives completion/status signals and resets usage;
- it does not reproduce every native CLI compaction visualization;
- runtime verification is still required to prove threshold behavior,
  hooks, UI state, and resume behavior together in the currently running
  packaged application.

## Intentional Product Differences

The following are deliberate product policy choices rather than missing
Claude Code B source code:

- background tasks are disabled;
- Fast Mode is disabled;
- deferred extra-tool discovery is disabled because it conflicts with the
  orchestrator's MCP filtering model;
- orchestrator sessions delegate to specialists, while specialist sessions
  cannot recursively delegate;
- plugin auto-update, telemetry, and some CLI-specific behavior are disabled.

These choices mean the product can be stable and correct for its intended
workflow without being feature-identical to Claude Code B.

## Native CLI UX Gap

Claude Code B has many `local-jsx` commands backed by terminal UI components.
ACP cannot execute these directly without renderer mappings. Examples include
configuration, context inspection, permissions, MCP management, agent
management, diagnostics, hooks, model selection, memory, plugins, status, and
usage panels.

The capability manifest correctly marks such commands as requiring mappings,
but that also proves that full CLI interaction parity has not been reached.

## Recommended Definition of Done

Do not use "all backend capabilities reproduced" as the product claim.

Use this more accurate statement:

> The product embeds Claude Code B's core agent engine and preserves its main
> reasoning, tool, MCP, session, permission, and compaction behavior. CLI-only
> interfaces and selected background/experimental capabilities are adapted or
> intentionally disabled.

Before treating automatic compaction as production-verified, run an end-to-end
smoke test that:

1. lowers the compaction window in an isolated test process;
2. triggers a compact boundary through AionUI;
3. verifies compact start/end logs and the AionUI completion/usage update;
4. restarts or rehydrates the session;
5. verifies summarized context is retained without a repeated-compaction loop.

