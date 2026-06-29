# Root cause matrix — replay backflow (2026-06-29)

User repro: after agent kill or send follow-up (e.g.「很好」), **greeting + prior quotation table + new reply** appear in one assistant run/bubble.

## Layer map

| ID | Layer | Mechanism | Fix track |
|----|-------|-----------|-----------|
| R1 | AionUI renderer | `postIdleWakeWindow` producer only; no consumer in `useAcpMessage` | Phase A — wire filter |
| R2 | AionUI renderer | `shouldDropStaleTurnMessage` never implemented | Phase A |
| R3 | AionUI renderer | `transformMessage` omits `turn_id` on `TMessage` | Phase B |
| R4 | ACP SDK adapter | `loadSession` → `replaySessionHistory` full history → WS | Phase C — suppress when meta / renderer drop |
| R5 | AionUI renderer | `composeMessage` merges by `msg_id` without `turn_id` check | Phase D |
| R6 | AionUI reopen | auto-`warmupConversation` on mount, no replay guard | Phase C — warmup guard window |
| R7 | Packaging | patch/aionui not deployed to installed bundle | Ops |
| R8 | ACP slot patch | `query.next` drain-stuck left dirty session (partial fix: teardown added in repo) | acp-agent.js |
| R9 | SDK / QueryEngine | incomplete transcript tail → `Continue from where you left off.` | Route-B `trimMessagesToCompleteTurnBoundary` |
| R10 | Route-B | `replayHistoryMessages` to client after `getOrCreateSession` | trim + renderer drop |
| R11 | AionCore (optional) | `new_session_suppressing_replay` — outbound relay guard | separate; needs release build |

## Distinction

- **06-29 profile drift**: wrong `ccbAgentId` → orchestrator MCP guard. Does not cause text concat.
- **06-19 backflow**: history replay / interrupted turn → UI concat. Profile fix does not help.

## Implementation order (this PR)

1. AionUI `shouldDropStaleTurnStreamMessage` + mount warmup guard
2. `transformMessage` + merge `turn_id` guard
3. SDK `loadSession` skip replay when `suppressSessionReplay` meta
4. Tests + spec note
