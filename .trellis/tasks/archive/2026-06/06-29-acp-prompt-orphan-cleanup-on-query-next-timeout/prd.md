# ACP Prompt Orphan Cleanup on query.next Timeout

## Goal

When `query.next(120000)` times out (client-side ACP slot gives up waiting for the first event
from CCB), the CCB Layer-4 process is NOT notified — it continues running the LLM call as an
orphan. If the user retries (manually via the `[Tool use interrupted]` banner, or SDK auto-retries),
a second `session/prompt` arrives at CCB while the first is still processing, creating a dual-request
race that causes "第一次对话会错乱". This task adds a proper abort/cleanup chain so only one
generation is in flight per conversation at any time.

## What I already know

* **`CCB_WANDING_QUERY_NEXT_TIMEOUT_MS`** defaults to 120000 ms (raised from 60000 in
  `patches/aionui-acp/acp-agent.js`); env override supported. Spec: `agents-unified-model.md` L276.
* **`[Tool use interrupted]` retry banner** — Phase 2A UI (`AcpChat.tsx` / `MessageList.tsx` /
  `AcpSendBox.tsx`, commit `f77c697`) shows a retry button when the SDK stream is interrupted.
  The banner triggers a retry that hits CCB while old session is still alive.
* **`warmupConversation(force: true)`** — called on every user send; creates a new ACP session
  when the old one has been idle-killed by aioncore (5min IdleTimeout).
* **CCB `resolveSessionRequest`** — if requested session id missing and exactly one in-memory
  session → redirect to live id. Does NOT abort the live session before accepting the new prompt.
* **`tryRehydrateStaleSession`** — may pick up an orphan session's `appliedProfileId` on resume
  (separate from this task's scope, already partially addressed in 06-29 drift fix).
* **Layer architecture** (cannot edit Layer 2 aioncore; can edit Layer 1 AionUI + Layer 3 ACP
  slot patch + Layer 4 CCB): Spec `aionui-ccb-boundary.md`.
* **No current abort API** — CCB does not expose a `/session/abort` or `/session/cancel` endpoint.
  The ACP slot has no mechanism to signal abandonment on `query.next` timeout.

## Root Cause (confirmed by code read)

`acp-agent.js` already has:
1. **`queryNextWithTimeout(120s)`** — throws on first event timeout
2. **Silent retry loop** (`retry_prompt: while(true)`) — retries once after interrupt + drain
3. **`session.query.interrupt()`** + drain loop — waits for `session_state_changed: idle`

**The gap:** The drain loop tracked `done || !m` (stream ended) as a `break` but did NOT set
a "clean" flag. When MAX_DRAIN (100 iterations × 5s each) was reached without seeing idle,
the code still continued to the silent retry. Retry then ran on a still-busy CCB CLI subprocess
→ two prompts in flight → **duplicate execution → 错乱**.

## Open Questions

_None — root cause confirmed, fix implemented._

## Requirements (evolving)

* [ ] When `query.next` times out in the ACP slot, send an explicit abort signal to CCB before
  any retry attempt.
* [ ] CCB must handle the abort signal and cancel any in-progress LLM stream for that session.
* [ ] The `[Tool use interrupted]` retry banner should not trigger a second `session/prompt`
  until the first is confirmed terminated.

## Acceptance Criteria (evolving)

* [ ] User triggers first send → `query.next` times out → clicks retry → only one LLM call
  runs at any moment; first is aborted before second starts.
* [ ] No duplicate assistant messages appear in the conversation.
* [ ] CCB log shows `[ACP] abort: prior generation cancelled` before `[ACP] prompt: start`.

## Definition of Done

* CCB abort endpoint or in-process cancellation implemented + tested.
* ACP slot `acp-agent.js` patch updated to call abort on timeout.
* AionUI retry banner defers until abort ACK received (or timeout).
* Spec updated: `agents-unified-model.md` + `acp-session-flow.md`.

## Out of Scope

* Profile drift on resume (covered in `06-29-specialist-session-resume-profile-drift`).
* aioncore `IdleTimeout` tuning.
* Per-conversation handoff file concurrency hardening (separate follow-up item in delivery-status).

## Technical Notes

* Edit surface: Layer 4 (CCB `agent.ts`) + Layer 3 patch (`ccb-installer/patches/aionui-acp/acp-agent.js`).
* CCB build + deploy: `bun run build` → `deploy-claude-code-b-to-wanding.ps1`.
* ACP slot patch sync: `sync-aionui-ccb-patch.ps1`.
* Spec files to update after fix: `agents-unified-model.md`, `acp-session-flow.md`.
