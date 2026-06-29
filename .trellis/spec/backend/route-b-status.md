# Route B Status (Snapshot 2026-06-12)

> Current state of the AionUI ↔ CCB-Wanding native ACP loop + MCP registration. For the archived task log, see [`../../tasks/archive/2026-06/06-12-route-b-exe-aionui-runtime/aionui-ccb-wanding-acp-mcp-fix.md`](../../tasks/archive/2026-06/06-12-route-b-exe-aionui-runtime/aionui-ccb-wanding-acp-mcp-fix.md) and [`../../../ccb-installer/AIONUI-BACKEND-STATUS.md`](../../../ccb-installer/AIONUI-BACKEND-STATUS.md). This doc is a **distilled snapshot** — when the source files change, refresh this one.

---

## One-paragraph status

**MCP registration is COMPLETE on the native `--acp` runtime — now in TypeScript source (not dist patch).** Task `06-12-buildmcp-source-migration` completed 2026-06-12; **AionUI merge fix** same day: `resolveSessionMcpConfigs()` always merges `settings.json` user MCP with ACP `params.mcpServers` (e.g. `guide_mcp`) — merge, not either/or. `prefetchAllMcpResources()` connects all; tools appear in `tools[]` passed to QueryEngine. Native smoke: model calls `mcp__quotation__match_quotation` with real data. User confirmed merge fix correct for AionUI path. The `$buildMcp()` dist-patch is no longer needed; dist was rebuilt from source.

---

## What works (verified by smoke test)

| Capability | Status | Evidence |
|---|---|---|
| Native ACP session start | ✅ | `node ccb-installer/test-native-acp-agent.mjs` → `initialize OK, session/new OK, model=minimax-m3` |
| MCP servers load from `settings.json` | ✅ | `[ccb-acp-mcp] loaded 3 servers, 41 tools: excel-mcp,quotation,accurate` |
| Quotation tool callable directly (not via `ExecuteExtraTool`) | ✅ | `tool_call: mcp__quotation__match_quotation {keywords:"直接50",customer_level:"B"}` |
| Quotation returns real data | ✅ | `tool returns 14 candidates` → model filters to 4 DN50 |
| Streamed assistant text reaches AionUI | ✅ | `agent_message_chunk received, stopReason=end_turn` |
| AionUI UI-level integration | ⏳ Pending | See "Open" below |

---

## Live main route (source-level MCP, 2026-06-12)

```text
AionUI (Web/Desktop)
  → aioncore.exe  (process manager, closed-source)
  → Claude Code ACP slot  (Layer 3 — bundled in aionui)
  → route-b/index.js  (ccb-installer/patches/aionui-ccb-route-b)
  → D:\CCB-Wanding\dist\cli.js --acp
  → agent.ts createSession()  (D:\claude-code-B\src\services\acp\agent.ts)
      resolveSessionMcpConfigs(params):
        settings.json mcpServers (scope user) + params.mcpServers e.g. guide_mcp (scope dynamic)
      prefetchAllMcpResources(mcpConfigs) → {clients, tools}
      tools:[...baseTools, ...mcpTools]  ← MCP tools first-class in QueryEngine
  → MiniMax + MCP tools (excel-mcp, quotation, accurate, exa)
```

> **Critical insight (must not regress):** MCP tools must be in the `tools` array passed to QueryEngine. Putting them only in `mcpClients` is **insufficient** — the model uses `ExecuteExtraTool` which fails ("tool not available"). See `acp-session-flow.md` for the producer side.

**The former $buildMcp dist-patch** (was in `entry-WG7IeDEv.js`) is **no longer used**. The dist was rebuilt from source. If you need to debug, the old patch logic is documented in task `tasks/archive/2026-06/06-12-clean-native-aionui-ccb-acp-patch/`.

**Route-b process-local env** (not Windows user-level):

```text
CLAUDE_CONFIG_DIR=%LOCALAPPDATA%\CCB-Wanding\.claude
CLAUDE_CODE_ACP_ALLOW_BYPASS_PERMISSIONS=true
NODE_TLS_REJECT_UNAUTHORIZED=0
CLAUDE_CODE_DISABLE_FAST_MODE=1
CLAUDE_CODE_ENABLE_TELEMETRY=0
ENABLE_SEARCH_EXTRA_TOOLS=false          ← CRITICAL — see note below
CCB_WANDING_SKIP_GROVE=1
+ settings.json.env (ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN, …)
```

> **`ENABLE_SEARCH_EXTRA_TOOLS=false` (added 2026-06-13):** Newer claude-code-B defaults `getSearchExtraToolsMode()` to `'tst'` (always defer), which routes ALL MCP tool calls through `ExecuteExtraTool` instead of the `tools[]` array. In ACP context, `ExecuteExtraTool` fails with "tool not available". Setting this env var to `false` forces `'standard'` mode — MCP tools are passed directly in `tools[]` and the model calls them without the deferred wrapper. This env var is set with `??` so the caller can override if needed. Source: `D:\claude-code-B\src\utils\searchExtraTools.ts` `getSearchExtraToolsMode()` L170.

---

## Fallback route (kept, not active)

```text
AionUI → aioncore → ACP slot → route-b → D:\CCB-Wanding\dist\chunks\ccb-native-acp-agent.js
  → MiniMax + quotation shortcut (keyword detection, internal MCP dispatch)
```

That shim proved AionUI streaming, turn completion, history persistence, MiniMax config isolation, and a quotation shortcut answering `查询直接50价格`. **It bypasses the original Wanding loop runtime and uses keyword detection (not model-driven tool use)**, so it is not the final target. Do not delete.

---

## Config boundary (must not regress)

```text
Official Claude Code:        C:\Users\m1774\.claude
CCB-Wanding / AionUI:        C:\Users\m1774\AppData\Local\CCB-Wanding\.claude
```

**Rules:**
- Do not write Windows user-level `ANTHROPIC_*`
- Do not write Windows user-level `CLAUDE_CONFIG_DIR`
- Do not modify `C:\Users\m1774\.claude` for CCB-Wanding
- Only inject CCB config into the AionUI/CCB child process (route-b does this)

See `config-layer.md` for the full settings.json layout.

---

## Open / not yet verified

| Item | Why it's open | Blocks? |
|---|---|---|
| AionUI UI-level integration (`查询直接50价格` end-to-end) | Backend merge fix confirmed correct; full UI render + AskUserQuestion flow may still need spot-check | Partial — MCP registration unblocked |
| `accurate` MCP end-to-end (precise pricing) | Server loaded, no test prompt yet | No (quotation proves the registration pattern works) |
| `AskUserQuestion` clarification in UI (multi-match → 4 candidates → user picks) | Smoke test: `[permission] AskUserQuestion` appears after direct mcp__ call — UI render untested | Yes for this specific flow |
| ~~Migration of $buildMcp from dist-patch → source~~ | ✅ **DONE** — task `06-12-buildmcp-source-migration` completed 2026-06-12 | — |

---

## Update 2026-06-14 (Phase 3): Assistant Profiles + MiniMax M3

### CCB Assistant Profiles (Preset Cards → CCB Runtime)

| Layer | What changed |
|-------|-------------|
| AionUI | `ccbAssistantProfileMigration.ts` seeds builtin profiles on startup → `%LOCALAPPDATA%\CCB-Wanding\.claude\assistants\*.json` (21 profiles created) |
| AionUI | `ccbPresetConversationExtra.ts` — profile `claude_md` → `preset_context` + `ccb_assistant_profile_id` on create (Layer 3 workaround until aioncore passthrough) |
| AionUI | `ccbAssistantProfileSession.ts` + `warmupConversation.ts` — writes `.aionui-next-assistant-profile.json` before `/warmup` (**300s TTL**, one-shot; resume staging via `stageCcbAssistantProfileFromConversation` since 2026-06-29) |
| CCB | `assistantProfiles.ts` — profile schema, loader, MCP/skill allowlist filter, `consumeNextAssistantProfileId()` (file handoff), `resolveAssistantProfileIdFromMeta()` (multi-shape meta) |
| CCB | `agent.ts` — profile-owned `userContextOverride` replaces default WanD CLAUDE.md for preset sessions |
| AionUI | Phase 2 strict authority: `ccbPresetConversationExtra` sends profile id only (no `preset_context`/`preset_rules`); `ccbConfigMigrationShared.ts` strips prompt fields |

**Verification:**
- AionUI: `ccbPresetConversationExtra.test.ts` 3 pass + `ccbConfigMigration` 11 pass + `buildAgentConversationParams` 6 pass + `useAssistantList.dom.test.ts` + `useAssistantEditor.dom.test.ts` (25 pass total)
- CCB: `assistantProfiles.test.ts` 11 pass; `agent.test.ts` 73 pass
- AionUI TypeScript: `tsc --noEmit` clean
- code-review PASS

**Smoke VERIFIED 2026-06-14:** New preset conversation (Word/Excel card) → ask「你可以做什么」→ returns Word Creator persona, NOT WanD 报价 assistant. ✅

### MiniMax M3 Model Variants

| Variant | Upstream model | Thinking |
|---------|---------------|---------|
| `minimax-m3` | `MiniMax-M3` | `{ type: "disabled" }` |
| `minimax-m3-thinking` | `MiniMax-M3` | `{ type: "adaptive" }` |

AionUI `ccbAcpModelInfo.ts` merges CCB `available_variants` over ACP effort-tier lists. `selectedAgent` TDZ white-screen fix applied. Session `availableModels` + `setSessionModel` for switch failure. See task `06-13-ccb-minimax-m3-thinking-models` (archived 2026-06-14).

---

## Next small steps (priority order)

1. ~~Manual smoke: preset assistant~~ — ✅ DONE 2026-06-14 (Word Creator persona confirmed)
2. **Manual smoke: MiniMax M3** — select `minimax-m3` / `minimax-m3-thinking`, inspect logged request body for correct `thinking.type`
3. Test AionUI UI with `查询直接50价格` prompt — confirm full user flow renders (AskUserQuestion multi-candidate)
4. Verify `accurate` tool end-to-end (precise pricing)

---

## Trellis task links

| Task | Status | Relevance |
|---|---|---|
| `tasks/archive/2026-06/06-12-route-b-exe-aionui-runtime/` | Archived | Earlier Route B runtime work that this status builds on |
| `tasks/archive/2026-06/06-12-clean-native-aionui-ccb-acp-patch/` | Archived | The $buildMcp patch work — predecessor of current state |
| `tasks/06-12-buildmcp-source-migration/` | ✅ Completed 2026-06-12 | Migrated $buildMcp from dist-patch to agent.ts source |
| `tasks/06-12-aionui-exe/prd.md` | ✅ Completed 2026-06-12 | AionUI desktop: greeting dedup, thinking stay-expanded, AskUserQuestion UI — source in `D:\Projects\aionui-src`; exe deploy manual |
| `tasks/00-bootstrap-guidelines/` | Active | Initial trellis setup — unrelated to Route B |

---

## Refresh policy

- **When the source files change** (new patch, new verification, new test): update this doc within the same day.
- **When `acp-session-flow.md` is updated** to reflect that MCP clients DO load from settings in source: update § "Open" to mark item 4 done and § "Live main route" with the source-level mechanism.
- **When a Route B version is bumped** (e.g., claude-agent-acp version changes): update [`../integration/route-b-sync.md`](../integration/route-b-sync.md) — that doc owns the version tracking.

---

## Update 2026-06-13 (Phase 2): Capability Manifest

The slash command list is driven by CCB-Wanding **capability manifest** (`capabilities.ts`).

**Producer:** `sendAvailableCommandsUpdate()` → `buildAvailableCommandsUpdatePayload(session.commands)`.

**Exposure rule:**

| Type | Slash list | Status |
|---|---|---|
| `prompt`, `local` | Yes | `ready` |
| `local-jsx` | Yes (disabled in AionUI) | `needs_mapping` |
| hidden / non-invocable | No | `hidden` (in full manifest) |

**AionUI rule:** CCB manifest authoritative; shell commands (`aionui-shell`) supplement only; non-ready capabilities visible but blocked.

**Verification performed (Phase 2):**

- `bun test src/services/acp/__tests__/capabilities.test.ts` + `agent.test.ts` → 70 pass
- AionUI `slashCommandsMerge.test.ts` → 4 pass; `bunx tsc --noEmit` → 0 errors
- `bun run build` → deploy → `sync-aionui-ccb-route-b.ps1` (5 targets)
- `node ccb-installer/test-native-acp-agent.mjs` → `available_commands_update`, `stopReason=end_turn`
- Deployed dist contains `needs_mapping` + `buildAvailableCommandsUpdatePayload` (verified in chunk)
- `node ccb-installer/test-native-acp-agent.mjs` -> received `available_commands_update`, streamed response, `stopReason=end_turn`
