# Fix quotation replay backflow after idle kill

## Problem

WanD quotation (and other ACP) sessions still show **replay backflow** after long idle / agent kill:

When the user leaves the app idle long enough for the ACP agent process/session to be killed, the next user message — or even **reopen + warmup before typing** — can cause completed assistant content from previous turns to be **re-inserted or concatenated** into the new reply bubble. The user-visible symptom is old quotation/assistant blocks appearing again around the new answer (数据倒灌).

This is the **UI/runtime replay** form of backflow, not the quotation prompt verbosity problem.

### Distinction from `06-29-specialist-session-resume-profile-drift`

| Symptom | Task | Layer |
|---------|------|-------|
| `wande-orchestrator 不得直接调用业务 MCP` after idle reopen | 06-29 profile drift | CCB session profile / handoff |
| Old assistant text merged into new reply bubble | **This task (06-19)** | AionUI renderer stream filter + message merge |

Both can appear after the same idle kill; fixing profile drift **does not** fix replay backflow.

## Root causes (validated 2026-06-29)

| # | Layer | Mechanism | Status |
|---|-------|-----------|--------|
| R1 | **Renderer — wake window not consumed** | `postIdleWakeWindow.ts` exists; `AcpSendBox` calls `beginPostIdleWakeWindow` / `acceptPostIdleWakeTurn`, but **`getPostIdleWakeWindowTurnId` has no consumer** in `useAcpMessage.ts` | **Open — primary** |
| R2 | **Renderer — stale turn filter missing** | 06-24 status claimed `shouldDropStaleTurnMessage` in `useAcpMessage.ts`; **symbol does not exist** in current aionui-src | **Open** |
| R3 | **Renderer — `turn_id` not on `TMessage`** | `transformMessage` does not copy `IResponseMessage.turn_id` → cannot filter or assert turn boundaries in merge path | **Open** |
| R4 | **CCB — history replay on resume** | `getOrCreateSession` / `loadSession` → `replayHistoryMessages` pushes prior `assistant` chunks over WS (`agent_message_chunk`) | By design; renderer must ignore during wake |
| R5 | **Renderer — `composeMessage` concat** | `last.msg_id === message.msg_id` → `mergeTextMessageContent` appends; replay or new stream with same `msg_id` → old+new in one bubble | Secondary defense |
| R6 | **Reopen path unguarded** | `useAcpMessage` auto-`warmupConversation` on mount has **no** wake window; replay can hit UI **before user sends** | **Open** |
| R7 | **Packaging** | 06-24 fix never shipped in installer smoke; user may run old renderer | Ops |
| R8 | **ACP slot drain-stuck** | dirty session not torn down (repo patch adds teardown) | `acp-agent.js` |
| R9 | **SDK interrupted turn** | transcript tail incomplete → `Continue from where you left off.` | `sessionTranscript.ts` trim |
| R10 | **SDK loadSession replay** | `replaySessionHistory` full history → WS | suppress meta + renderer drop |
| R11 | **AionCore relay** | optional `new_session_suppressing_replay` | needs release build |

See [`research/root-cause-matrix-2026-06-29.md`](./research/root-cause-matrix-2026-06-29.md).

## Scope

### In scope

- Wire `postIdleWakeWindow` into `useAcpMessage.handleResponseMessage` (drop turn-scoped events during pre-accept window; accept only `acceptPostIdleWakeTurn` id after send).
- Add `shouldDropStaleTurnMessage` (or equivalent) using wake window + runtime active `turn_id`.
- Pass `turn_id` through `transformMessage` → `TMessage` for text/tool/thinking where applicable.
- Guard **reopen auto-warmup** replay (wake window on conversation focus, or `replay`/`history` flag from backend if available).
- Unit tests: `useAcpMessage.dom.test.ts` stale-replay cases; extend `postIdleWakeWindow.test.ts` if needed.
- Optional second line: `composeMessageWithIndex` refuse cross-turn merge when `turn_id` differs.
- Document in `.trellis/spec/frontend/chat-acp-flow.md` § post-idle wake window (referenced in 06-24 but never written).

### Out of scope

- MCP matcher/data changes.
- New run/step persistence.
- Specialist profile handoff (06-29).
- Changing CCB to stop `replayHistoryMessages` entirely (client still needs history for other flows; filter at renderer is smaller).

## Acceptance criteria

1. **Send after idle kill:** Same conversation, idle ≥ agent timeout → user sends follow-up → **no** completed prior-turn assistant text appended into the new assistant bubble.
2. **Reopen before send:** Reopen conversation after idle kill → warmup completes → **no** duplicate/replayed assistant blocks appear in the live list beyond what DB already shows.
3. **History preserved:** Messages loaded from DB remain visible; only **stale WS replay** during wake/resume is suppressed.
4. **Turn boundary:** Stale events with wrong/missing `turn_id` during wake window are dropped (log: `dropped stale turn stream message`).
5. **Regression tests:** `postIdleWakeWindow.test.ts` + new `useAcpMessage` stale-drop tests pass.
6. **Not confused with 06-29:** Specialist resume smoke (quotation-agent profile) remains a separate checklist.

## Implementation phases

### Phase A — Wire wake window consumer (P0)

| File | Change |
|------|--------|
| `aionui-src/.../useAcpMessage.ts` | At top of `handleResponseMessage`: `shouldDropStaleTurnMessage(message)` using `getPostIdleWakeWindowTurnId`; clear window on `finish` / `error` / `turn.completed` |
| `aionui-src/.../postIdleWakeWindow.ts` | Export helper `shouldAcceptTurnScopedMessage(conversation_id, turn_id)` if it simplifies tests |

Lifecycle (unchanged intent):

```
Send click
  → beginPostIdleWakeWindow()           [drop ALL turn-scoped WS]
  → prepareRuntimeSync({ force: true }) [CCB may replayHistoryMessages]
  → sendMessage → turn_id
  → acceptPostIdleWakeTurn(turn_id)     [only this turn_id for 10s]
  → stream to UI
  → clear on finish / error / runtime idle
```

### Phase B — `turn_id` on messages (P0)

| File | Change |
|------|--------|
| `aionui-src/.../chatLib.ts` | `transformMessage`: set `turn_id: message.turn_id` on persisted message types |

### Phase C — Reopen / auto-warmup (P1)

| File | Change |
|------|--------|
| `useAcpMessage.ts` | On conversation mount: optional `beginPostIdleWakeWindow` when hydrating from idle, or drop replay until first user send |
| `useAcpInitialMessage.ts` | Align with send path if Guid resume after idle |

### Phase D — Merge defense (P2, optional)

| File | Change |
|------|--------|
| `Messages/hooks.ts` | In `composeMessageWithIndex` text path: do not merge if `turn_id` differs |

### Phase E — Spec + deploy smoke

- Update `chat-acp-flow.md` § post-idle wake window.
- Dev smoke: idle 6min → reopen → no pre-send replay; send follow-up → clean bubble.
- Rebuild AionUI / sync dev / installer when ready.

## Priority

**P0** (re-opened 2026-06-29 — user repro confirms 06-24 fix incomplete)
