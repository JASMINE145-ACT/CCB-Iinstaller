# WeCom prompt rehydrate history bleed - 2026-07-12

## Symptom

In the WeCom WanD quotation-agent session around 2026-07-12 10:54, the user sent only:

```text
查询直接50价格
```

The outbound WeCom bubble contained old assistant answers from earlier turns in the same conversation, then finally included fragments for the current "直接50" request.

## Root cause

The prior AionCore ChannelStreamRelay Start-arm fix only blocks Text/Finish emitted before AgentStreamEvent::Start.

This incident was emitted after Start:

1. AionCore prompt_existing_session() emits AgentStreamEvent::Start.
2. CCB ACP prompt() calls resolveSessionRequestForPrompt().
3. tryRehydrateStaleSession() detects a stale requested session with one active session.
4. It tears down the active session and calls getOrCreateSession(requestedSessionId, ...).
5. getOrCreateSession() loads disk transcript into initialMessages, then also replays those historical messages to the ACP client.
6. Because this happens inside the current session/prompt, after AionCore Start, WeCom relay treats the replayed assistant chunks as current-turn text and concatenates them into one outbound bubble.

This explains why WANd.CHANNEL.STREAM.TURN.001 unit tests passed while live WeCom still failed.

## Fix

Added a prompt-time replay suppression switch:

- tryRehydrateStaleSession() passes replayToClient: false.
- getOrCreateSession() still loads transcript into QueryEngine initialMessages.
- getOrCreateSession() skips ACP client replay when replayToClient === false.
- Normal loadSession / explicit history replay behavior remains unchanged.

Contract name used for this patch:

```text
CCB.PROMPT.REHYDRATE.NO_CLIENT_REPLAY
```

## Files

- ccb-installer/src/services/acp/agent.ts
- ccb-installer/claude-code-b-src/src/services/acp/agent.ts
- D:\claude-code-B\src\services\acp\agent.ts after sync
- D:\CCB-Wanding\dist\chunk-k67w6c9p.js after build/deploy
- ccb-installer/src/services/acp/__tests__/agentReplaySuppression.test.ts

## Verification

Commands run:

```text
node --check ccb-installer\src\services\acp\agent.ts
bun test ccb-installer/src/services/acp/__tests__/agentReplaySuppression.test.ts ccb-installer/src/services/acp/__tests__/sessionTranscript.test.ts ccb-installer/src/services/acp/__tests__/promptConversion.test.ts ccb-installer/src/services/acp/__tests__/mcpSessionPrefetch.test.ts ccb-installer/src/services/acp/__tests__/packageRegistry.test.ts
.\ccb-installer\scripts\sync-claude-code-b-mcp-prefetch.ps1 -Build -Deploy
rg -n "replayToClient|current WeCom reply bubble|stale session rehydrated" "D:\CCB-Wanding\dist" -S -g "chunk-*.js"
```

Results:

- Targeted repo tests: 19 pass, 0 fail.
- CCB build/deploy script internal tests: 59 pass, 0 fail.
- Live dist contains replayToClient: false and guarded replay calls.

Known unrelated test gap:

- Full bun test ccb-installer/src/services/acp/__tests__ still has pre-existing alias/dependency resolution failures outside this patch.

## Live status

Old aioncore.exe / electron.exe processes were stopped.

The direct dev startup chain reached:

```text
node D:\Projects\aionui-src\scripts\dev-bootstrap.mjs launch start --extensions
bun run start
electron-vite dev --config packages/desktop/electron.vite.config.ts
```

At last process check, electron.exe and aioncore.exe had not appeared yet, so live WeCom AC remains pending.

Required smoke:

```text
新会话: 你好 -> 查询直接50价格 -> 很好
```

Acceptance:

The third bubble must not include complete old literal answers from the first two turns.

## Runtime update - 2026-07-12

After the direct dev startup chain finished compiling, process check observed:

```text
aioncore.exe  D:\Projects\claude-code-best\AionCore\target\release\aioncore.exe
electron.exe  D:\Projects\aionui-src\node_modules\.bun\electron@37.10.3\...
electron-vite.exe D:\Projects\aionui-src\node_modules\.bin\electron-vite.exe
```

So the AionUI dev runtime is now up with the patched CCB dist available. Remaining AC is the human WeCom smoke: new session `你好 -> 查询直接50价格 -> 很好`, with no old full-answer literals in the third bubble.
