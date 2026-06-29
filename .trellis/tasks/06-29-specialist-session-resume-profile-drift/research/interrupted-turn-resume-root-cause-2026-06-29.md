# Interrupted Turn Resume Root Cause - 2026-06-29

## User Report

The original profile-drift issue is still not fully solved from the user's
perspective. After the agent is killed, the next query can receive the previous
unfinished assistant answer first, then the new query answer in the same visible
run.

This is a different root cause class from the original `wande-orchestrator`
fallback.

## Evidence

1. The installed AionUI ACP slot is still the patched SDK adapter path:
   `D:\CCB-Wanding\AionUi\resources\bundled-aioncore\win32-x64\managed-resources\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\acp-agent.js`.
2. That adapter has the `query.next timeout` drain gate (`drainObservedClean`),
   but on drain-stuck it only logs:
   `prompt timeout drain-stuck: no retry, orphan cleanup pending`.
   It does not tear down/delete the dirty session in that branch.
3. The same adapter exposes `loadSession: true` and `sessionCapabilities.resume`.
   Its SDK resume code contains built-in interrupted-turn behavior: if the
   transcript tail is incomplete, it adds a synthetic meta prompt
   `Continue from where you left off.`
4. CCB Route-B source rehydrate also loads disk transcript via
   `deserializeMessages(log.messages)` into `initialMessages`, but no evidence
   was found that it trims the tail to the last complete user/assistant turn
   boundary before feeding it to the next QueryEngine.

## Root-Cause Hypothesis

```text
agent killed / query.next timeout / drain-stuck
  -> transcript ends inside an unfinished turn
  -> dirty session remains, or resume/load rehydrates the unfinished transcript
  -> SDK/QueryEngine treats the tail as interrupted work
  -> it continues the old answer before processing the user's new query
```

## Why The Previous Fix Did Not Solve It

- The previous work fixed which specialist profile is applied on idle/reopen.
- It did not define a recovery contract for where a killed turn may resume.
- A safe resume must either tear down the dirty in-memory session and/or trim
  restored transcript history to a complete turn boundary before accepting the
  next user prompt.

## Checked Paths

- `ccb-installer/patches/aionui-acp/acp-agent.js`
  - prompt loop around `query.next timeout`
  - drain-stuck branch logs "orphan cleanup pending" but leaves session alive
- installed bundled ACP slot under `D:\CCB-Wanding\AionUi\resources\...`
  - contains the same `query.next timeout` patch path
- `ccb-installer/src/services/acp/agent.ts`
  - `tryRehydrateStaleSession` fixes wrong profile meta only
  - `getOrCreateSession` loads `initialMessages` from disk history

