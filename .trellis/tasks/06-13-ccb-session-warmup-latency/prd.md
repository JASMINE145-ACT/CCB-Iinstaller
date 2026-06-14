# CCB Session Warmup Latency

## Goal

Make new CCB-Wanding conversations feel immediate in AionUI, and reduce first-message latency by controlling when ACP warmup happens and by avoiding duplicate session initialization.

## Observed Problem

User symptom:

- From Guid/new chat, typing a first prompt and opening a new conversation can feel like it waits several seconds before the conversation fully expands.
- The first message in a new session also waits longer than later messages.

Log evidence from `2026-06-13`:

- `POST /api/conversations` is fast:
  - `29ms`
  - `38ms`
  - `39ms`
- The slow path is ACP warmup:
  - conversation `3b532b3d`: `/warmup latency_ms=11828`
  - conversation `e719dde6`: `/warmup latency_ms=10742`
- Within warmup, `session/new` dominates:
  - ACP process spawn + initialize happens first.
  - `session/new` response arrives roughly 6-8 seconds after request.
  - `session/set_mode`, `session/set_config_option`, and `available_commands_update` follow.

Current inference:

- This is not primarily an AionUI conversation-create database/API problem.
- It is mostly CCB/ACP session cold start and session/new latency.
- MCP authority page probing is not the main cause of this symptom; it is a separate settings-page/test path.

## Control Points

- `D:\Projects\aionui-src\packages\desktop\src\renderer\pages\guid\hooks\useGuidSend.ts`
  - Creates the conversation and stores the initial message in `sessionStorage`.
  - Can navigate immediately after fast `conversation.create`.
- `D:\Projects\aionui-src\packages\desktop\src\renderer\pages\conversation\utils\warmupConversation.ts`
  - Central per-conversation warmup promise cache.
  - Can expose timings and ensure callers reuse the same warmup.
- `D:\Projects\aionui-src\packages\desktop\src\renderer\pages\conversation\platforms\acp\useAcpMessage.ts`
  - Auto-warmup on conversation page mount, then fetches slash commands.
  - Can avoid making slash command load feel like page creation.
- `D:\Projects\aionui-src\packages\desktop\src\renderer\pages\conversation\platforms\acp\useAcpInitialMessage.ts`
  - Sends initial Guid message when the conversation page mounts.
  - Can explicitly coordinate with the warmup promise so initial send does not race an independent warmup.
- AionCore logs already report total `/warmup` latency.
- CCB-Wanding ACP source can add finer timings around `initialize`, `session/new`, MCP config loading, skills/commands manifest, and available command generation if needed.

## Requirements

### Phase 1: Observability and UX Control

- Add lightweight renderer timing logs for:
  - Guid `conversation.create`
  - navigation to conversation page
  - page auto `warmupConversation`
  - initial-message send start/accepted/error
- Add warmup timing logs in `warmupConversation`.
- Make initial-message send reuse the same warmup path instead of racing the page warmup.
- Keep the page able to render while warmup is preparing; slash commands can arrive after warmup.
- Do not change CCB runtime semantics.

### Phase 2: Backend/ACP Timing Split

- Add or confirm backend timing for:
  - process spawn
  - ACP `initialize`
  - ACP `session/new`
  - model/mode reconciliation
  - config option application
  - available commands/capabilities generation
- Use timings to decide whether the real fix belongs in CCB source, AionCore behavior, or AionUI UX.

### Phase 3: Optimization

One or more of:

- Pre-warm CCB agent earlier when the selected agent is CCB-Wanding and the user begins typing.
- Start warmup immediately after successful `conversation.create`, before or during route transition.
- Avoid duplicate warmup/send initialization races.
- Defer nonessential slash command fetching until after the first render.
- Cache stable command/capability metadata when valid, while preserving backend authority.

## Acceptance Criteria

- [x] Logs clearly show separate timings for create, navigate, warmup, and initial send.
- [x] Initial Guid message path does not start a second independent warmup when page warmup is already in flight.
- [ ] Conversation page can render quickly while runtime status is `preparing`.
- [ ] For a new CCB-Wanding conversation, total `/api/conversations` create remains fast and is not confused with warmup latency.
- [ ] Manual smoke records timings for:
  - new blank CCB conversation
  - new CCB conversation with initial message
  - second message in same conversation
- [ ] No regression to MCP/skills/commands authority behavior.

## Out of Scope

- Rewriting AionCore.
- Removing CCB-Wanding MCP/skills/commands authority.
- Bypassing CCB-Wanding runtime authority by reintroducing AionUI-local command/MCP/skills state.
- Hiding real backend latency without exposing runtime-preparing state.

## Open Questions

- Is the 6-8 second `session/new` caused by MCP server loading, command/skill discovery, model provider initialization, or CCB process cold start?
- Does `available_commands_update` payload size (`~51KB` in logs) materially affect first readiness?
- Should warmup be triggered when selecting/typing with CCB agent, or only after conversation creation?

## Implementation Notes

2026-06-13 first pass:

- `useGuidSend.ts` logs `conversation_create_start`, `conversation_create_done`, and `conversation_navigate_done` with duration and CCB runtime flag.
- `warmupConversation.ts` logs warmup start, ready, error, inflight reuse, and ready reuse.
- `useAcpInitialMessage.ts` now calls `warmupConversation(conversation_id)` before sending the stored initial message. If page auto-warmup is already running, this reuses the same promise instead of starting an independent initialization race.
- `useAcpInitialMessage.ts` logs warmup-before-send duration, send accepted duration, and total initial-message duration.
- AionUI typecheck passed after this first pass.
- Related fix: `ccbSkills.ts` now imports the `CcbSkillPaths` type it already used in `getCcbSkillPaths()`.
- Trellis spec updated:
  - `.trellis/spec/frontend/chat-acp-flow.md` records warmup/first-message timing control points and log markers.
  - `.trellis/spec/integration/aionui-ccb-boundary.md` records the create-vs-warmup latency boundary and diagnosis rule.
