# Runtime Audit - Quotation Assistant Sample

Date: 2026-06-18

Scope: AionUI renderer state, route-b / ACP session, CCB-Wanding agent profile, quotation MCP/Python, live deploy/config.

## Verified Working

### AionUI message continuity defenses

Evidence:

- `chatLib.ts` preserves `turn_id` on text, tool, permission, plan, thinking, tip, and error messages.
- `useAcpMessage.ts` rejects stale turn-scoped events when `turn_id` does not match the active runtime turn, and drops all turn-scoped stream messages when the conversation is idle.
- `normalizeToolCall.ts` extracts `_meta.claudeCode.parentToolUseId`.
- `groupNormalizedToolCalls.ts` groups sub-agent child steps by explicit `parentToolUseId`, with sequential fallback.
- Focused tests:
  - `groupNormalizedToolCalls.test.ts`: 6/6 pass.
  - `useAcpMessage.dom.test.ts --pool=threads`: 7/7 pass.
  - `messageMerging.dom.test.tsx --pool=threads`: 8/8 pass.

Assessment: UI stale-replay defenses are present and covered. The initial combined Vitest run failed because fork workers timed out; individual runs with `--pool=threads` passed.

### Default route-b behavior can delegate to quotation-agent

Command:

```powershell
$env:CCB_TEST_ROUTE_ENTRY='1'
$env:CCB_TEST_PROMPT='查询直接50价格'
$env:CCB_TEST_DUMP_UPDATES='1'
node ccb-installer\test-native-acp-agent.mjs
```

Evidence from stderr / updates:

- `[ACP] session profile id from default fallback: wande-orchestrator`
- `[ACP] agent session profile applied: wande-orchestrator`
- `[ACP] session mcp servers: (none) profile=wande-orchestrator`
- top-level tool call: `Agent`, `subagent_type: quotation-agent`
- child tool call carried `_meta.claudeCode.parentToolUseId`
- child tool call: `mcp__quotation__match_quotation`, raw input `{ keywords: "直接50", customer_level: "B" }`

Assessment: The model/runtime authority chain is structurally correct for the default route: orchestrator does not directly expose quotation MCP and delegates to the specialist.

### Live Python quotation payload shape is current enough

Command:

```powershell
node ccb-installer\scripts\test-quotation-mcp-timing.mjs
```

Result:

- Exit 0.
- After fixing the timing script, `elapsed_ms 4407`.
- Response included `candidate_count`, `candidates_returned: 7`, `candidates_truncated: true`.

Assessment: live Python contains the slim selection payload fields and candidate cap. Direct MCP/Python latency is acceptable; the remaining latency concern belongs to the full model/sub-agent turn.

### Stale ACP session redirect exists in live dist

Evidence:

- `rg` in `D:\CCB-Wanding\dist` found `stale session id redirect` and `tryRehydrateStaleSession` in `chunk-w2zbepyj.js`.

Assessment: backend-side idle session mitigation is deployed.

## Confirmed Problems

### Design correction - quotation-agent intentionally loads excel

User-confirmed product design:

- `quotation-agent` must include both `quotation` and `excel`.
- `quotation` MCP owns product matching, price/inventory matching, and `fill_quotation_sheet`.
- Excel MCP is a post-fill supplement for workbook inspection/editing and should not replace quotation fill logic.

Observed live and desired configuration:

- `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\quotation-agent.md` frontmatter:
  - `mcpServers: quotation, excel`
- `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\quotation-agent.aionui.json`:
  - `mcp_allowlist: ["quotation", "excel"]`
- route-b direct quotation smoke stderr:
  - `[ACP] session mcp servers: quotation, excel profile=quotation-agent`

Assessment:

- This is not config drift. Previous quotation-only notes in spec were an incorrect implementation hypothesis.
- Stability work must preserve `quotation + excel` and fix Excel MCP probe/cold-start behavior directly.

### P1 - Excel MCP health probe fails inside the intended quotation workflow — resolved in latest run, keep as cold-start risk

Command:

```powershell
.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
```

Result:

- Config/files/agent checks passed through all core agents.
- Failure: `[mcp-probe] FAIL excel: connect failed (45051ms)`.
- Because `quotation-agent` still lists `excel`, this failure is not isolated to Excel artifact workflows.

Fix / latest verification:

- Preserved `quotation-agent` as `quotation + excel`.
- Updated `ccb-installer/config/mcp-health-manifest.json` so health expects `quotation-agent expected=[quotation,excel]`.
- `.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session` later passed:
  - `excel tools=25 4101ms`
  - `quotation-agent expected=[quotation,excel] actual=[quotation,excel]`
  - `PASS MCP health check complete`

Current impact:

- Health is green in the latest run.
- Earlier 45s Excel connect failure shows cold-start/probe timing can still fluctuate and should remain monitored.

### P1 - Quotation MCP tools lack `annotations.readOnlyHint` — fixed in repo and live bundle

Expected from spec:

- Read-only quotation tools should have `annotations: { readOnlyHint: true }` so CCB can batch them concurrently.

Observed:

- `Select-String` found no `readOnlyHint` or `annotations` in:
  - `mcp_servers/quotation-server/dist/index.js`
  - `D:\CCB-Wanding\vendor\mcp-servers\quotation-server\dist\index.js`
- `D:\claude-code-B\src\services\mcp\client.ts` uses `tool.annotations?.readOnlyHint ?? false`.
- `D:\claude-code-B\src\services\tools\toolOrchestration.ts` partitions concurrent batches only when `tool.isConcurrencySafe()` is true.

Impact:

- Multiple `match_quotation` calls in one model response are treated as non-concurrency-safe and run serially.
- This contradicts the agent prompt's parallel-first quotation workflow.

Fix / latest verification:

- Added `annotations: { readOnlyHint: true }` to 7 read-only tools in:
  - `mcp_servers/quotation-server/dist/index.js`
  - `D:\CCB-Wanding\vendor\mcp-servers\quotation-server\dist\index.js`
- Left `fill_quotation_sheet` without the annotation because it writes a file.
- `rg readOnlyHint D:\CCB-Wanding\vendor\mcp-servers\quotation-server\dist\index.js` shows 7 matches.

### P1 - AskUserQuestion is still active in live CCB-Wanding — fixed and deployed

Expected from spec:

- CCB-Wanding quotation flow should not use ACP AskUserQuestion; clarification should be assistant text followed by the next user message.

Observed:

- `D:\claude-code-B\src\services\acp\permissions.ts` still routes `ASK_USER_QUESTION_TOOL_NAME` to `handleAskUserQuestion()`.
- live dist `chunk-w2zbepyj.js` contains `handleAskUserQuestion(...)`.
- Business MCP removed `ask_clarification`, but built-in `AskUserQuestion` remains available.

Impact:

- The old UI permission round-trip can still occur if the model chooses built-in `AskUserQuestion`.
- This is a contract mismatch between docs and runtime.

Fix / latest verification:

- Synced `permissions.ts` and `askUserQuestionPermissionResolve.ts` from `ccb-installer/src/services/acp/` to `D:\claude-code-B\src\services\acp\`.
- Built `D:\claude-code-B` with `bun run build`.
- Deployed to `D:\CCB-Wanding\dist` with backup `D:\CCB-Wanding\dist.backup-20260618-195008`.
- Live dist contains `denyAskUserQuestionUseChat` and `AskUserQuestion disabled; use chat follow-up`.

### P1/P2 - Default route-b quotation can exceed the native smoke timeout — still a performance risk

Command:

```powershell
$env:CCB_TEST_ROUTE_ENTRY='1'
$env:CCB_TEST_PROMPT='查询直接50价格'
$env:CCB_TEST_DUMP_UPDATES='1'
node ccb-installer\test-native-acp-agent.mjs
```

Result:

- Correct routing and tool call occurred.
- Script timed out at 90s before `end_turn`.
- The model was already streaming final answer text, but no terminal result arrived before timeout.

Latest verification:

- `ccb-installer\scripts\test-quotation-mcp-timing.mjs` previously reported `elapsed_ms ~90072`, but that was a test bug: the script always waited a fixed 90s before printing.
- Fixed the script to exit when MCP response id=2 arrives.
- Corrected timing: `node ccb-installer\scripts\test-quotation-mcp-timing.mjs` passed in `elapsed_ms 4407`.
- Direct Python stdin protocol for `match_quotation` returned `直接50` in `elapsed_ms=5941`.
- Default route smoke first still timed out at ~91s after correct `Agent(quotation-agent)` and child `mcp__quotation__match_quotation`.
- A later default route smoke completed in ~71s with:
  - `Agent` top-level call
  - child `mcp__quotation__match_quotation` with `parentToolUseId`
  - child `Read D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md`
  - streamed table of real `直接50` candidates
  - `stopReason: end_turn`
- Optimized `python/main.py` selection instructions so routine short price lookups do not force `Read knowledge_source`; the model should Read only for close candidates, business-rule tie-breaks, or correction history.
- Synced the same rule to live `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\quotation-agent.md`.
- After syncing live Python, direct quotation-agent route completed in ~26s with one `mcp__quotation__match_quotation` call and no `Read`.
- After deleting `.aionui-next-assistant-profile.json`, default orchestrator route completed in ~42s:
  - `[ACP] session profile id from default fallback: wande-orchestrator`
  - top-level `Agent`
  - child `mcp__quotation__match_quotation` with `parentToolUseId`
  - no `Read` tool call
  - `stopReason: end_turn`

Current impact:

- Behavior is now logically correct and passes the current 90s smoke threshold in the latest isolated default-route run.
- Model/UI/runtime continuity is present.
- The MCP/Python lookup itself is ~4-6s. Full ACP/model sub-agent overhead remains non-trivial (~42s latest default-route run) but is no longer sitting at the timeout ceiling.

### P2 - Health/session test isolation can leave or refresh handoff state

Observed:

- `.aionui-next-assistant-profile.json` appeared under `%LOCALAPPDATA%\CCB-Wanding\.claude\`.
- `test-mcp-session-health.mjs` is known to write this handoff file.
- Parallel health/native smoke can cause subsequent sessions to be bound to `quotation-agent` when the intended route was default orchestrator.

Assessment:

- Source `createSession()` does call `resolveSessionProfileIdForCreate(... consumeHandoff: true)`.
- Do not conclude consume is broken from this run alone because tests were run concurrently.

Impact:

- Smoke scripts need isolation/cleanup; otherwise runtime conclusions can be contaminated.

## Additional Evidence

### Direct quotation-agent route can complete

Command:

```powershell
$env:CCB_TEST_ROUTE_ENTRY='1'
$env:CCB_TEST_PROMPT='查询直接50价格'
node ccb-installer\test-native-acp-agent.mjs
```

One run completed in ~68s with:

- `[ACP] session profile id from handoff: quotation-agent`
- `[ACP] agent session profile applied: quotation-agent`
- `[ACP] session mcp servers: quotation, excel profile=quotation-agent`
- `[ACP] WanD MCP warmup done: quotation in 6412ms`
- `stopReason: end_turn`

Assessment: Direct specialist runtime can complete with the intended `quotation + excel` tool set.

### Old `test-runtime-mcp.mjs` is not reliable for current runtime

Command:

```powershell
node ccb-installer\test-runtime-mcp.mjs
```

Result:

- `quotation connected=false tools=0`
- `accurate connected=false tools=0`

Assessment: This appears to use a deprecated/alternate runtime MCP probing path. Prefer `test-mcp-health.ps1`, `test-quotation-mcp-timing.mjs`, and `test-native-acp-agent.mjs`.

## Fix Status / Next Order

1. Done: preserved `quotation-agent` as `quotation + excel` in seed, live sidecar, health manifest, and spec.
2. Done in latest run: MCP health passes with Excel included; keep cold-start timing under observation.
3. Done: added `readOnlyHint` to read-only quotation MCP tools in repo and live bundle.
4. Done: deployed AskUserQuestion hard-deny behavior to live CCB dist.
5. Done for the main sample path: default route-b quotation turn dropped from timeout/~71s to ~42s by making business-knowledge `Read` conditional for routine short price lookups.
6. Next: make health/session smoke scripts clean staged handoff before/after each profile test, or use `_meta` profile ids instead of global handoff files in native tests.

Cleanup: removed the staged `.aionui-next-assistant-profile.json` after smoke tests so the next default session is not accidentally bound to `quotation-agent`.

## Current Risk Summary

The runtime is not fundamentally broken: profile authority, default delegation, subagent parent metadata, quotation MCP data payload, stale session redirect, and AionUI stale-turn guards are all present.

The runtime is much closer to commercially stable: profile authority, default delegation, subagent parent metadata, live MCP health, read-only annotations, AskUserQuestion contract, and the sample quotation turn now align. Remaining risks are broader repeated-run latency variance and smoke script handoff isolation, not a broken quotation MCP or UI/model continuity path.
