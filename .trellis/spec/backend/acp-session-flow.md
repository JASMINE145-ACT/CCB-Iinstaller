# ACP Session Flow (Producer)

> Backend side of AionUI chat. For renderer handling, see [`../frontend/chat-acp-flow.md`](../frontend/chat-acp-flow.md). For **what works in production today**, see [`route-b-status.md`](./route-b-status.md).

---

## Entry

| Step | Location |
|------|----------|
| `--acp` flag | `D:\claude-code-B\src\entrypoints\cli.tsx` (`feature('ACP')` gate; always on in default build) |
| stdio NDJSON | `src/services/acp/entry.ts` → `runAcpAgent()` |
| Connection handler | `src/services/acp/agent.ts` → `AcpAgent` |

On startup, `applySafeConfigEnvironmentVariables()` applies settings env so API auth works when launched from AionUI (no inherited shell env).

---

## Session lifecycle

```text
Client (route-b / AionUI)
  │  session/new
  ▼
AcpAgent.createSession()
  │  build QueryEngine context
  │  MCP tools ← see "Source vs live dist" below
  ▼
session/update (greeting, mode, capabilities)
  │
  │  session/prompt (user message)
  ▼
promptConversion → QueryEngine loop
  │  tool_use requests
  ▼
permissions.ts → createAcpCanUseTool → client permission UI
  │  tool results
  ▼
session/update (assistant content, tool_call, tool_result, …)
```

---

## Assistant profile at `session/new` (2026-06-14)

When AionUI starts a **preset assistant** conversation under CCB authority, `AcpAgent.createSession()` must apply the selected profile from `%LOCALAPPDATA%\CCB-Wanding\.claude\assistants\{id}.json` instead of the default WanD quotation CLAUDE.md.

| Source | Location | Notes |
|--------|----------|-------|
| Profile id resolution | `assistantProfiles.ts` → `resolveAssistantProfileIdFromMeta` | `_meta.ccbAssistantProfileId`, `preset_assistant_id`, nested `acp_meta` / `claudeCode.options` |
| Handoff file (Layer 3 workaround) | `consumeNextAssistantProfileId()` | Reads `.aionui-next-assistant-profile.json` written by AionUI before `/warmup` when aioncore omits profile id in `_meta` |
| Context override | `agent.ts` → `userContextOverride` | `buildAssistantClaudeMdContext(profile)` or `resolvePresetContextFromMeta` — **replaces** default user CLAUDE.md |
| MCP / commands | `filterMcpConfigsForAssistantProfile`, `filterCommandsForAssistantProfile` | Profile allowlists applied when profile loads |

Cross-layer contract: [`../integration/aionui-ccb-boundary.md`](../integration/aionui-ccb-boundary.md) § CCB assistant profile handoff.

---

## MCP registration (source — verified 2026-06-12)

Task `06-12-buildmcp-source-migration` completed. `agent.ts createSession()` now:

1. **Always** reads `CLAUDE_CONFIG_DIR/settings.json` → `mcpServers` with `scope: 'user'` (quotation, accurate, excel-mcp for CCB-Wanding); entries in `disabledMcpjsonServers` are **skipped** (`mcpManifest.loadMcpConfigsFromSettings`)
2. **Overlays** `params.mcpServers` from the ACP client (e.g. AionUI `guide_mcp`) with `scope: 'dynamic'` — **merge, do not replace**
3. Calls `prefetchAllMcpResources(mcpConfigs)` → `{clients: mcpClients, tools: mcpTools}`
4. Sets `tools: [...baseTools, ...mcpTools]` — MCP tools are first-class in the QueryEngine

**Must not regress:** MCP tools must appear in the `tools` array passed to the engine. Putting them only in `mcpClients` is **insufficient** — the model uses `ExecuteExtraTool` which fails ("tool not available"). See [`route-b-status.md`](./route-b-status.md) § Live main route.

**The former `$buildMcp` dist-patch** is no longer needed. Do not re-apply it — the source is now correct.

### Scenario: AionUI `guide_mcp` + settings.json merge (2026-06-12)

#### 1. Scope / Trigger

Cross-layer: AionUI `session/new` injects non-empty `mcpServers` (`guide_mcp`). An earlier either/or branch skipped `settings.json` when params were present → quotation/accurate/excel-mcp never registered → `mcp__quotation__match_quotation` **Tool not found** in AionUI dev (model fell back to PowerShell/officecli for xlsx).

#### 2. Signatures

```typescript
// D:\claude-code-B\src\services\acp\agent.ts
export function resolveSessionMcpConfigs(
  params: Pick<NewSessionRequest, 'mcpServers'>,
): Record<string, ScopedMcpServerConfig>

// createSession() L~596:
const mcpConfigs = resolveSessionMcpConfigs(params)
const { clients: mcpClients, tools: mcpTools } =
  await prefetchAllMcpResources(mcpConfigs)
```

#### 3. Contracts

| Source | Field | Scope | Notes |
|--------|-------|-------|-------|
| `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json` | `mcpServers.*` | `user` | quotation, accurate, excel-mcp, exa |
| ACP `session/new` params | `mcpServers[]` with `name` | `dynamic` | AionUI injects `guide_mcp` on every new conversation |
| Merge rule | `{ ...settings, ...params }` | — | Param entry **wins on name collision**; must not skip settings when params non-empty |

AionUI log when injecting: `guide_mcp: injected into solo session`.

#### 4. Validation & Error Matrix

| Condition | Symptom | Fix |
|-----------|---------|-----|
| Only `params.mcpServers` loaded (settings skipped) | `Tool not found` for `mcp__quotation__*` | Use `resolveSessionMcpConfigs` merge |
| Stale aioncore after deploy/sync | Old MCP set still active | Kill **all** `aioncore` + `electron`; restart dev with PATH |
| Old conversation session | Pre-fix engine context | **New conversation** after restart |
| `ENABLE_SEARCH_EXTRA_TOOLS` not `false` in route-b | `ExecuteExtraTool` → "tool not available" | See [`route-b-status.md`](./route-b-status.md) |

#### 5. Good / Base / Bad Cases

- **Good:** AionUI new session → stderr `[ccb-acp-mcp] loaded 3+ servers` including quotation → `查询直接50价格` resolves via MCP (not shell hacks)
- **Base:** Native smoke with empty `params.mcpServers` → settings-only load still works (`test-native-acp-agent.mjs`)
- **Bad:** AionUI session with only `guide_mcp` registered → model cites `ccb-wanding-quotation.md` but tool missing

#### 6. Tests Required

- `bun test src/services/acp/__tests__/agent.test.ts` — 71 pass (regression guard for session wiring + MiniMax model list)
- Manual AionUI: new conversation, agent Claude Code, prompt `查询直接50价格` — no Tool not found
- Optional unit test: `resolveSessionMcpConfigs({ mcpServers: [{ name: 'guide_mcp', ... }] })` includes settings keys

#### 7. Wrong vs Correct

**Wrong** (either/or — regresses AionUI):

```typescript
const mcpConfigs =
  (params.mcpServers?.length ?? 0) > 0
    ? loadFromParamsOnly(params.mcpServers)
    : loadMcpConfigsFromSettings()
```

**Correct** (merge):

```typescript
export function resolveSessionMcpConfigs(params) {
  const paramServers = (params.mcpServers ?? []) as AcpParamMcpServer[]
  return {
    ...loadMcpConfigsFromSettings(),      // scope: 'user'
    ...loadMcpConfigsFromParams(paramServers), // scope: 'dynamic'
  }
}
```

---

### Scenario: MiniMax-M3 variant model list + session switch (2026-06-14)

Task `06-13-ccb-minimax-m3-thinking-models`. AionUI merges CCB `available_variants` for display; **session authority** for `setModel` lives in CCB `agent.ts`.

#### 1. Scope / Trigger

User selects **MiniMax M3 (Thinking)** (`minimax-m3-thinking`) in conversation model dropdown → toast **「模型切换失败」** (`agent.model.switchFailed` → `PUT /api/conversations/:id/model` rejected).

#### 2. Signatures

```typescript
// D:\claude-code-B\src\services\acp\agent.ts
function buildMiniMaxM3SessionModels(currentModelId: string): SessionModelState
function applyMiniMaxM3SessionModels(session: AcpSession, modelId: string): void

// createSession() — when shouldExposeMiniMaxM3Variants():
const models = buildMiniMaxM3SessionModels(rawModelId)

// unstable_setSessionModel / setSessionConfigOption(model):
if (shouldExposeMiniMaxM3Variants() && resolveMiniMaxM3Variant(modelId)) {
  applyMiniMaxM3SessionModels(session, modelId)
}
```

UI merge (display only — **does not** fix setModel):

```typescript
// D:\Projects\aionui-src\...\ccbAcpModelInfo.ts
mergeCcbMiniMaxAcpModelInfo(handshakeInfo, ccbModelInfo)
resolveCcbAuthorityAcpModelInfo(sessionInfo, ccbModelInfo) // CCB authority: variants from CCB, current from session
```

**2026-06-14 (session reuse):** `getOrCreateSession` must call `applyMiniMaxM3SessionModels` when reusing an in-memory session so aioncore never caches legacy effort-tier lists after resume/warmup.

**2026-06-14 (AionUI shell):** Under CCB authority, `useAcpModelInfo` must not persist `acp.config.preferredModelId`, must not fall back to handshake effort tiers, and `selectModel` always runs warmup → `setModel` → session reload.

**2026-06-14 (Guid → session model):** When CCB authority strips `extra.current_model_id`, AionUI must write **`extra.ccb_preferred_model_id`** from Guid `selectedAcpModel` and auto-apply via `setModel` after warmup. **Do not** compare UI-preserved display ids (`preserveCcbUserModelSelection`) when deciding whether to call `setModel` — use raw backend id via `resolveBackendSessionModelId()` in `ensureCcbSessionPreferredModel()`.

| Helper | Role |
|--------|------|
| `resolveCcbSessionPreferredModelId()` | Read preferred id from conversation extra |
| `resolveBackendSessionModelId()` | Raw ACP session model id (no UI preserve mask) |
| `ensureCcbSessionPreferredModel()` | GET model → compare raw ids → `setModel` if mismatch |
| Call sites | `useAcpModelInfo` auto-apply; `useAcpInitialMessage` before first Guid message; `AcpSendBox` before user send |

Log markers: `auto_apply_preferred_model_confirmed` / `ensure_preferred_model status: applied` (not `auto_apply_preferred_model_skipped` when backend is still `minimax-m3` but UI shows Thinking).

**2026-06-14 (idle session stale id):** After aioncore **IdleTimeout** (~5min default) kills the CLI, a later send may warmup a **new** ACP session but still `session/prompt` with the **old** persisted `acp_session_id` → `Session not found` → mislabeled `USER_LLM_PROVIDER_ENDPOINT_NOT_FOUND`.

| Layer | Mitigation (shipped) |
|-------|----------------------|
| **CCB `resolveSessionRequest`** | If requested id missing and exactly **one** in-memory session → redirect prompt/setModel to live id (`agent.ts`) |
| **AionUI send** | `warmupConversation(..., { force: true })` before each user send |
| **AionUI setModel** | `acpRuntimeGuard.ts` — 404 NOT_FOUND → warmup → retry |
| **aioncore (upstream)** | Single writer for session id; evict invalidates; honest error codes |

Files: CCB `agent.ts`; AionUI `warmupConversation.ts`, `AcpSendBox.tsx`, `acpRuntimeGuard.ts`, `ipcBridge.ts`.

**2026-06-29 (idle resume profile drift):** After idle kill + reopen, specialist Guid sessions could bind `wande-orchestrator` instead of `quotation-agent` / `accurate-agent` → orchestrator MCP guard blocks business tools.

| Layer | Mitigation |
|-------|------------|
| **AionUI warmup** | `stageCcbAssistantProfileFromConversation` before `/warmup` — full extra alias resolve + `acp_tool_call` history inference when extra empty |
| **CCB rehydrate** | `tryRehydrateStaleSession`: do not inject stale `appliedProfileId` into bootstrap `_meta` (meta wins over disk handoff at `resolveSessionProfileIdForCreate`) |
| **Handoff TTL** | 60s → **300s** on both AionUI writer and CCB `consumeNextAssistantProfileId` |

Log marker (success): `[ACP] agent session profile applied: quotation-agent`. Failure: same line with `wande-orchestrator` on a specialist card chat.

Spec: [`../integration/agents-unified-model.md`](../integration/agents-unified-model.md) § Specialist session resume; task `06-29-specialist-session-resume-profile-drift`.

**2026-06-29 (query.next drain-stuck orphan):** When `query.next(120000)` times out, the ACP slot calls `query.interrupt()` and drains stale events. If the CCB CLI subprocess does not return to idle within MAX_DRAIN iterations (process stuck), the previous code silently retried on the still-busy process → duplicate prompt execution → first-conversation 错乱.

| Layer | Mitigation |
|-------|------------|
| **ACP slot drain gate** | `drainObservedClean` flag in `patches/aionui-acp/acp-agent.js`: set to `true` only when drain loop sees `done \|\| !m` (stream ended) or `session_state_changed: idle`; silent retry is gated on `drainObservedClean === true` |
| **Drain-stuck path** | Logs `drain-stuck: no retry, orphan cleanup pending` and throws `首条响应超时` immediately — no second prompt sent to busy subprocess |
| **Session preserved** | Session is NOT deleted on drain failure; next AionUI `warmupConversation(force:true)` recreates it cleanly |

Log markers: `prompt timeout retry attempt=1 sessionId=…` (clean drain, retry proceeds) / `prompt timeout drain-stuck: no retry` (stuck process, immediate error).

Task: `06-29-acp-prompt-orphan-cleanup-on-query-next-timeout`.

#### 3. Contracts

| Layer | Visible ids | Upstream API | thinking |
|-------|-------------|--------------|----------|
| CCB session `availableModels` | `minimax-m3`, `minimax-m3-thinking` | `MiniMax-M3` | disabled / adaptive |
| AionUI dropdown | same (via merge) | — | selection only |
| Request body | — | `MiniMax-M3` | from `resolveMiniMaxM3Variant` in `claude.ts` |

**Must not regress:** MiniMax sessions must **not** expose effort tiers (`minimax-m3/default`, `low`, …) in ACP `model.options` — aioncore validates against that list.

#### 4. Validation & Error Matrix

| Condition | Symptom | Fix |
|-----------|---------|-----|
| UI merge only, old `agent.ts` | Dropdown shows 2 variants; switch fails | Deploy `buildMiniMaxM3SessionModels` in CCB dist |
| Legacy session (effort-tier list) | First switch to thinking fails | `applyMiniMaxM3SessionModels` on switch (no new session required) |
| Stale CCB dist / old aioncore child | Switch still fails after UI fix | `deploy-claude-code-b-to-wanding.ps1` → restart AionUI (kill aioncore) |
| `auto_apply` compares UI-preserved id | Log `auto_apply_preferred_model_skipped` but session backend id is `minimax-m3`; no `agent_thought_chunk` | Deploy `ensureCcbSessionPreferredModel` + `resolveBackendSessionModelId`; **new session** smoke |
| Wrong `ipcBridge` import in shared config | Electron white screen; esbuild `No matching export "ipcBridge"` | Wave 3 in `dev-test-ship.md` §8 — `acpConversation` from adapter; namespace from `@/common` |

#### 5. Good / Base / Bad Cases

- **Good:** New session → `session/new` models = 2 variant ids → switch to `minimax-m3-thinking` → no error toast → next prompt uses `thinking.adaptive`
- **Base:** Legacy effort-tier session → first switch upgrades list → subsequent switches work
- **Bad:** Handshake/UI shows thinking variant but session options still `default/low/…` → setModel rejected

#### 6. Tests Required

- `bun test src/services/acp/__tests__/agent.test.ts` — 71 pass (MiniMax session create, switch, legacy list, setSessionConfigOption)
- `bun test src/utils/model/__tests__/minimaxM3.test.ts` — 4 pass
- Manual: conversation dropdown → **MiniMax M3 (Thinking)** → success toast; send message

#### 7. Wrong vs Correct

**Wrong** (effort tiers in session — switch fails):

```typescript
const modelOptions = getModelOptions()
const models = {
  availableModels: modelOptions.map(m => ({ modelId: m.value, ... })),
  currentModelId: profileModel || currentModel,
}
```

**Correct** (MiniMax gate):

```typescript
const models = shouldExposeMiniMaxM3Variants()
  ? buildMiniMaxM3SessionModels(rawModelId)
  : { availableModels: modelOptions.map(...), currentModelId: rawModelId }
```

---

## Key modules

| Module | Responsibility |
|--------|----------------|
| `agent.ts` | Sessions, engine wiring, ACP method handlers |
| `permissions.ts` | Map engine permission checks to ACP permission requests |
| `promptConversion.ts` | ACP prompt parts → `QueryEngine.submitMessage` input (text string or Anthropic image blocks) |
| `bridge.ts` | Shared ACP ↔ engine helpers |

**Image prompts (2026-06-29):** ACP advertises `promptCapabilities.image: true`, but Route-B previously used `promptToQueryInput()` (text-only) → MiniMax M3 never received pixels → agent replied「无法读取图片」. Fix: `promptToSubmitInput()` — no images → plain string; with `type: image` chunks → Anthropic blocks (base64 **or** http `uri` → url source). **Parity follow-up (same day):** `resource.text` + uri → `[@name](uri)` + `<context ref="uri">` (matches `acp-agent.js` `promptToClaude`). `agent.prompt()` calls `submitMessage(promptToSubmitInput(...))`. Overlay: `ccb-installer/src/services/acp/promptConversion.ts`; deploy via `sync-claude-code-b-mcp-prefetch.ps1 -Build -Deploy`. Quotation L1: `quotation-agent.md` §图片/截图询价.

### Capability parity audit (2026-06-29)

Pattern: **advertise capability → inbound conversion must preserve payload**. Audit after image fix:

| Area | Route-B (`agent.ts` + `promptConversion.ts`) | Legacy patch (`patches/aionui-acp/acp-agent.js` `promptToClaude`) | Risk |
|------|-----------------------------------------------|---------------------------------------------------------------------|------|
| **Image base64** | ✅ `promptToSubmitInput` → Anthropic blocks | ✅ `chunk.data` → base64 source | Fixed 2026-06-29 on Route-B |
| **Image HTTP URL** | ✅ `uri` http → `{ source: { type: 'url' } }` (2026-06-29 parity) | ✅ `chunk.uri` http → url source | Fixed Route-B |
| **embeddedContext** | ✅ `resource.text` + uri → link + `<context ref>` (2026-06-29 parity) | ✅ same wrapper | Fixed Route-B |
| **Resource blob** | ❌ Ignored (no `resource.blob`) | ❌ Comment: ignore blob | Binary attachments silently dropped on both paths |
| **Audio** | N/A (not advertised) | ❌ Ignored in switch default | OK — no false capability |
| **Outbound image URL** | `bridge.ts` converts model URL images → `[image: url]` text to UI | Same class of degradation | Display-only; not inbound |
| **Deprecated API** | `promptToQueryInput` still exported; **only** `agent.prompt` + tests reference | N/A | Grep before reuse; prefer `promptToSubmitInput` |
| **Dual ACP entry** | Guid Route-B → `D:\CCB-Wanding\dist` chunk | Non–Route-B builds may still load `acp-agent.js` | Image fix applies to Route-B; patch path was already OK |

**When adding ACP capabilities:** add conversion in `promptConversion.ts`, unit test in `promptConversion.test.ts`, sync via `sync-claude-code-b-mcp-prefetch.ps1`, compare with `acp-agent.js` `promptToClaude` for parity.

Tests: `src/services/acp/__tests__/`.

---

## Event types (reference)

Exact JSON shapes vary by SDK version. AionUI maps these in `useAcpMessage.ts` / `MessageAcpToolCall.tsx`. Typical sequence:

1. `session/new` response — session id, model info
2. `session/update` — `agent_message_chunk`, `tool_call`, `tool_result`, `plan`, etc.
3. Permission round-trip before tool execution (`requestPermission` — includes `AskUserQuestion` for multi-match quotation)

### AskUserQuestion in ACP (2026-06-12)

`permissions.ts` `handleAskUserQuestion()` — do **not** send generic Allow/Reject for this tool.

| Step | Behavior |
|------|----------|
| Parse input | `AskUserQuestionTool.inputSchema` → `questions[]` |
| Permission options | Each candidate: `{ optionId: auq:{qIdx}:{encodeURIComponent(label)}, name: label — description }` + `reject` |
| Multi-question | One `requestPermission` round per unanswered question (sequential) |
| multiSelect | `confirm_key` = `auqm:{qIdx}:{enc(l1)}\|{enc(l2)}` → `answers[q] = "l1, l2"` |
| On allow | `updatedInput.answers` = `{ [questionText]: selectedLabel }` before `AskUserQuestionTool.call()` |
| On reject | Immediate deny; **no** next permission round (frontend must not show awaiting-next spinner) |
| rawInput per round | `toolCall.rawInput = { ...input, answers: partial }` before each `requestPermission` |
| AionUI | `MessageAskUserQuestionCard` + nav bar; `auq:*` / `auqm:*` options (not Allow/Reject) |

`optionId` prefixes shared with AionUI `askUserQuestionIds.ts` — decode uses `safeDecodeURIComponent` (malformed `%` → null → deny/skip):

- Single: `auq:{idx}:{encodeURIComponent(label)}`
- Multi: `auqm:{idx}:{enc(l1)}|{enc(l2)}` — any malformed segment fails whole decode; labels joined with `", "` in answer

When debugging duplicate or missing UI messages, **compare producer logs from `--acp` stdout** with consumer `chatLib.composeMessage` — fix producer first per [`../integration/defensive-fix-policy.md`](../integration/defensive-fix-policy.md).

### Tool result role contract (2026-06-28)

QueryEngine emits a tool invocation as an assistant-role `tool_use`, but emits
the corresponding `tool_result` / `mcp_tool_result` inside a **user-role SDK
message**. `forwardSessionUpdates()` must therefore:

1. forward assistant `tool_use` as ACP `tool_call status=pending`;
2. ignore ordinary user text already owned by the ACP client;
3. extract user-role `tool_result` / `mcp_tool_result`;
4. forward it as the matching `tool_call_update status=completed|failed`.

Do not discard the entire user-role SDK message. That creates an orphaned tool
call; later SDK transcript repair may display `[Tool use interrupted]` even
though the MCP itself completed successfully.

Regression: `src/services/acp/__tests__/bridge.test.ts` test
`forwards user tool_result as completed tool_call_update`.

**Live dist verify (2026-06-13):** After deploy, grep `D:\CCB-Wanding\dist\chunk-*.js` for `toolCall.rawInput` / `safeDecodeURIComponent` / `auqm:` before AionUI smoke. See [`build-deploy-verify.md`](./build-deploy-verify.md) §2 post-deploy spot-check.

---

## Debug / smoke commands

### Native `--acp` smoke (recommended)

```powershell
cd D:\Projects\claude-code-best
node ccb-installer/test-native-acp-agent.mjs
# Expect: initialize OK, session/new OK, agent_message_chunk, stopReason=end_turn

# With quotation prompt:
$env:CCB_TEST_PROMPT = "查询直接50价格"
node ccb-installer/test-native-acp-agent.mjs

# Via route-b entry (integration path):
$env:CCB_TEST_ROUTE_ENTRY = "1"
node ccb-installer/test-native-acp-agent.mjs
```

### Manual stdio

```powershell
$env:CLAUDE_CONFIG_DIR = "$env:LOCALAPPDATA\CCB-Wanding\.claude"
D:\CCB-Wanding\vendor\bun\bun.exe D:\CCB-Wanding\dist\cli.js --acp
```

After source changes: [`build-deploy-verify.md`](./build-deploy-verify.md).

---

## Slash Command Manifest (2026-06-13, Phase 2 capability update)

CCB-Wanding is the source of truth for slash command **capabilities** in AionUI ACP sessions.

`agent.ts` stores `commands = await getCommands(cwd)` on each session and emits them through `available_commands_update` via `capabilities.ts`:

| Command type | Menu status | ACP execution |
|---|---|---|
| `prompt` | `ready` | Expands into model-visible prompt content |
| `local` | `ready` | Returns text / local command result |
| `local-jsx` | `needs_mapping` (`requires_renderer_ui`) | Visible in menu; AionUI must not execute until renderer adapter exists |
| hidden / non-invocable | `hidden` | In `_meta.capabilities` only; excluded from slash list |

Payload shape:

- Each `availableCommands[]` entry carries `_meta.capability` (`source`, `status`, `execution`, `reason`).
- Session update carries `_meta.capabilities` (full manifest).

Generator: `D:\claude-code-B\src\services\acp\capabilities.ts` — tests in `__tests__/capabilities.test.ts`.

AionUI must treat CCB manifest as authoritative. Shell-only commands use `source: aionui-shell` and must not override backend names.

After changing command exposure: `bun test src/services/acp/__tests__`, `bun run build`, deploy to `D:\CCB-Wanding\dist`, sync route-b, restart aioncore, then open a new AionUI conversation.

## Scenario: Duplicate-only tool-use normalization (2026-06-29)

### 1. Scope / Trigger

`ensureToolResultPairing()` receives a second assistant message containing only
an ordinary `tool_use` whose id has already been seen. Streaming and final
message paths can both expose the same completed invocation.

### 2. Signatures

```typescript
// D:\claude-code-B\src\utils\messages.ts
export function ensureToolResultPairing(messages: Message[]): Message[]
```

### 3. Contracts

- Retain the first ordinary `tool_use.id` and pair it normally.
- Remove later ordinary `tool_use` blocks with the same id.
- Drop an assistant message emptied only by that deduplication; do not turn it
  into user-visible failure text.
- Preserve `[Tool use interrupted]` repair for genuinely unpaired server/MCP
  tool-use blocks.

### 4. Validation & Error Matrix

| Input condition | Required output |
|---|---|
| First ordinary `tool_use` | Retain |
| Duplicate ordinary `tool_use`, mixed with text | Remove duplicate; retain text |
| Duplicate ordinary `tool_use` only | Drop entire message |
| Orphan server/MCP tool-use only | Emit interruption placeholder |

### 5. Good / Base / Bad Cases

- **Good:** completed inventory call plus duplicate-only event produces one
  call, one result, and the final inventory answer.
- **Base:** a normal non-duplicate call/result sequence is unchanged.
- **Bad:** stripping a duplicate and inserting `[Tool use interrupted]` falsely
  reports failure after a successful MCP result.

### 6. Tests Required

- Unit: `messages.test.ts` assertion
  `drops duplicate-only tool_use message after a completed result instead of emitting interrupted placeholder`.
- Integration: repeat Route B with
  `CCB_TEST_EXPECT_TOOL=mcp__quotation__get_inventory_by_code` and
  `CCB_TEST_FORBID_TEXT=[Tool use interrupted`; every run must reach `end_turn`.

### 7. Wrong vs Correct

```typescript
// Wrong: duplicate removal invents a semantic failure.
if (finalContent.length === 0) {
  finalContent = [{ type: 'text', text: '[Tool use interrupted]' }]
}

// Correct: drop a message emptied only by ordinary tool-use deduplication.
if (finalContent.length === 0 && removedDuplicateToolUse &&
    !removedOrphanServerToolUse) {
  continue
}
```

## MCP Manifest for AionUI Settings (2026-06-13)

CCB-Wanding exposes a JSON MCP manifest for the AionUI settings shell (not ACP session wire).

| Piece | Path |
|-------|------|
| Settings → manifest | `src/services/acp/mcpManifest.ts` |
| CLI (AionUI probes this) | `node dist/cli.js --ccb-mcp-manifest [--test] [--server=name]` |
| Handler | `src/cli/handlers/ccbMcpManifest.ts` |

With `--test`, the CLI connects to each **enabled** server (`fetchToolsForClient`), maps tools into manifest JSON, and returns connection status. Disabled servers (`disabledMcpjsonServers`) are listed but not probed.

AionUI main spawns the CLI with `CLAUDE_CONFIG_DIR=%LOCALAPPDATA%\CCB-Wanding\.claude` and maps manifest entries to `IMcpServer` (`ccbMcpSettings.ts`).

Tests: `__tests__/mcpManifest.test.ts`. Deploy: `deploy-claude-code-b-to-wanding.ps1` (no route-b sync required for manifest-only changes).
