# AionUI ↔ aioncore ↔ CCB-Wanding Boundary

> Read this before changing any cross-layer behavior. The 4-layer chain is the single most important fact about this project.

---

## 1. The 4-layer chain

```
AionUI.exe  (Electron frontend — our code in aionui-src)
  └─ aioncore.exe  (closed-source process manager)
       └─ managed-resources\acp\claude-agent-acp\<ver>\<platform>\node_modules\@agentclientprotocol\claude-agent-acp\dist\
            └─ index.js  ← the "ACP slot entry" (PATCHED by route-b)
                 ├─ acp-agent.js / CCB_WANDING_* env / MCP policy  ← "CCB integration slot" (CCB customizations)
                 └─ spawn CCB-Wanding dist/cli.js --acp   (or direct: `bun dist/cli.js --ccb-acp`)
```

| Layer | What it is | Can we edit? |
|-------|-----------|--------------|
| **1. AionUI.exe** | Electron app, our code | ✅ Yes — `aionui-src` |
| **2. aioncore.exe** | Closed-source binary, manages process lifecycle of layer 3 | ❌ No |
| **3. ACP slot** (`@agentclientprotocol/claude-agent-acp/dist/index.js`) | Vanilla Claude Code ACP runtime; PATCHED by `ccb-installer/scripts/sync-aionui-ccb-route-b.ps1` to embed route-b + CCB customizations | ⚠️ Only via route-b patch — source is `ccb-installer/patches/aionui-ccb-route-b/index.js` |
| **3b. CCB integration slot** (acp-agent.js, `CCB_WANDING_*` env, MCP policy) | CCB customizations layered into the ACP slot | ⚠️ Edit in `ccb-installer/` then re-sync (see [`route-b-sync.md`](./route-b-sync.md)) |
| **4. CCB-Wanding backend** (`D:\CCB-Wanding\dist\cli.js --acp`) | Full Claude Code fork in ACP mode (with all MCP tools) | ✅ **Primary edit surface** — `D:\claude-code-B\src/` → `bun run build` → `deploy-claude-code-b-to-wanding.ps1` → `D:\CCB-Wanding\dist\`. See [`../backend/build-deploy-verify.md`](../backend/build-deploy-verify.md). Never hand-edit minified chunks except emergency hotfix. |

---

## 2. What the desktop exe does for this chain

1. **Resolve `aioncore.exe`** — `packages/desktop/src/process/backend/binaryResolver.ts`
   - First tries: `process.resourcesPath/bundled-aioncore/{platform}-{arch}/aioncore[.exe]`
   - Falls back to: system `PATH` lookup via `where` (Windows) / `which` (POSIX)
2. **Launch it** — wrapped by `packages/desktop/src/process/startup/backendStartup.ts`
   - Returns the port `aioncore` listens on, stashed on `globalThis.__backendPort`
3. **Talk to aioncore over HTTP** — `packages/desktop/src/process/bridge/webuiBridge.ts` calls `http://127.0.0.1:{port}/api/...` for WebUI lifecycle
4. **Never sees raw ACP JSON-RPC** — desktop consumes event shapes aioncore forwards (HTTP/SSE). It does **not** parse ACP frames itself.

---

## 3. Frontend-only vs cross-chain decision rule

| If you change… | Scope |
|----------------|-------|
| UI text, color, layout, hotkey, splash, tray menu | **Desktop only** (Layer 1) |
| A new IPC channel between renderer and main | **Desktop only** (Layer 1) |
| The way desktop invokes aioncore (env, args, port detection) | **Desktop only** (Layer 1) |
| How desktop reads aioncore's HTTP responses | **Desktop only** (Layer 1) |
| What the user sees in chat (new message type, card, form) | **Layers 1 + 2 + 4** — all three must agree on the new shape |
| The greeting / permission / tool-call event flow (root cause) | **Layer 4 (primary)** — fix in `D:\claude-code-B\src/` per outline.md (Primary strategy, L95-110) |
| The same symptoms mitigated defensively in the renderer | **Layer 1 (exception only)** — see [`defensive-fix-policy.md`](./defensive-fix-policy.md); remove after Layer 4 fix |
| MCP tool registration, env injection, route-b patch | **Layer 3 / 3b** — `ccb-installer/`, then re-sync (see [`route-b-sync.md`](./route-b-sync.md)) |

---

## 4. How `tasks/06-12-aionui-exe/prd.md` relates to this boundary

The current PRD ships **emergency-layer** desktop patches (Issues 1–3). That is **interim**, not canonical:

| PRD issue | Interim (PRD) | Primary strategy |
|-----------|---------------|------------------|
| Greeting duplicate | `chatLib.ts` dedup | Fix emit path in `claude-code-B\src/`; delete dedup after |
| AskUserQuestion null `tool_call` | Remove frontend guard | Fix permission payload in `claude-code-B\src/` |
| Thinking auto-collapse | `MessageThinking.tsx` | ✅ Stays in desktop — true UI preference, not ACP bug |

New tasks for greeting / MCP / ACP events should target `claude-code-B`, not expand desktop defensive logic.

---

## Cross-references

- Top-level architecture: [`../outline.md`](../outline.md) (Primary strategy in L95-110)
- **Backend entry**: [`../backend/index.md`](../backend/index.md)
- Live MCP status: [`../backend/route-b-status.md`](../backend/route-b-status.md)
- MCP source migration plan: [`../backend/source-migration-mcp.md`](../backend/source-migration-mcp.md)
- ACP producer flow: [`../backend/acp-session-flow.md`](../backend/acp-session-flow.md)
- Sync mechanism: [`route-b-sync.md`](./route-b-sync.md)
- Defensive fix policy: [`defensive-fix-policy.md`](./defensive-fix-policy.md)
- Frontend entry: [`../frontend/index.md`](../frontend/index.md)
- Exe rendering fixes: `tasks/06-12-aionui-exe/prd.md` ✅ 2026-06-12（源码 `D:\Projects\aionui-src`；exe 部署待人工）

---

## Slash Command Boundary (2026-06-13, Phase 2)

Executable `/command` availability is a backend **capability manifest** contract, not a frontend registry.

- Layer 4 (`capabilities.ts` + `agent.ts`) emits `available_commands_update` with per-command `_meta.capability` and full `_meta.capabilities`.
- `prompt` / `local` → `status: ready`. `local-jsx` → `status: needs_mapping` (visible, not executable in shell). Hidden/non-invocable → `status: hidden`.
- Layer 1 AionUI maps capability status in `acpMapping.ts`, merges shell commands (`source: aionui-shell`), disables non-ready items in menu and send path.
- On name conflict, backend CCB-Wanding command wins.
- Backend command changes require build → deploy → route-b sync → aioncore restart → new conversation.

## Config ownership (2026-06-13)

Runtime MCP/skills/commands for CCB-Wanding sessions are owned by `%LOCALAPPDATA%\CCB-Wanding\.claude\`, not AionUI local keys. See [`aionui-config-inventory.md`](./aionui-config-inventory.md).

## MCP authority in AionUI settings (2026-06-13)

When `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json` exists, the AionUI MCP page is a **shell editor** over CCB config — not the aioncore `/api/mcp/*` DB.

| Concern | Owner | Mechanism |
|---------|-------|-----------|
| MCP server list + transport | CCB `settings.json` → `mcpServers` | AionUI main reads via `ccbMcpSettings.ts` |
| Enabled/disabled | CCB `settings.json` → `disabledMcpjsonServers` | Toggle writes disabled list; ACP skips disabled via `loadMcpConfigsFromSettings()` |
| Live status + tools | CCB CLI | `node D:\CCB-Wanding\dist\cli.js --ccb-mcp-manifest --test` (spawned from main, 120s timeout) |
| CRUD (add/edit/delete/import) | CCB `settings.json` | `ccbMcpBridge.ts` IPC → `ccbMcpSettings.ts` |
| Legacy `mcp.config` | AionUI local (read-only cache) | `ensureMcpCatalog()` mirrors CCB list into local cache for UI only |

**Backend manifest source:** `claude-code-B/src/services/acp/mcpManifest.ts` + CLI handler `cli/handlers/ccbMcpManifest.ts`.

## CCB session warmup latency boundary (2026-06-13)

New CCB-Wanding conversations split into two latency domains:

| Phase | Main owner | Expected evidence |
|---|---|---|
| Conversation row create (`POST /api/conversations`) | AionUI/aioncore conversation service | Should be fast; observed 29-39ms |
| Runtime warmup (`POST /api/conversations/{id}/warmup`) | aioncore ACP manager + CCB-Wanding ACP runtime | Can be slow; observed 10-12s |
| ACP `session/new` | CCB-Wanding / ACP slot chain | Dominated observed warmup: roughly 6-8s |
| First Guid initial message | AionUI renderer + aioncore send path | Must reuse warmup; do not race another session init |

Diagnosis rule:

- If `conversation.create` is slow, inspect AionUI/aioncore create path, workspace setup, and DB.
- If `conversation.create` is fast but the first page/message waits, inspect `/warmup`, ACP `initialize`, and ACP `session/new`.
- MCP settings manifest probing is a settings-page/test path and should not be assumed to explain new chat warmup unless logs show it on that path.

Renderer timing markers were added in the latency task:

- `useGuidSend.ts`: create and navigate durations.
- `warmupConversation.ts`: shared warmup promise start/ready/error/reuse.
- `useAcpInitialMessage.ts`: warmup-before-send and send-accepted durations.

The renderer-side rule is that `warmupConversation(conversation_id)` is the coordination point. Initial message sending should wait on/reuse it so page auto-warmup and first message do not start independent runtime initialization.

**2026-06-14 — idle agent + stale session id:**

| Symptom | Misleading UI | Actual backend |
|---------|---------------|----------------|
| Second message after ~5min idle | `USER_LLM_PROVIDER_ENDPOINT_NOT_FOUND` | `Session {old-id} not found` on `session/prompt` while warmup just created a new session |

| Rule | Owner |
|------|-------|
| Guid **initial** send | Reuse page warmup — `warmupConversation(id)` **without** `force` |
| **Subsequent** user sends | `warmupConversation(id, { force: true })` before `POST .../messages` — bypass renderer `ready` cache after idle kill |
| Terminal stream error `USER_LLM_PROVIDER_ENDPOINT_NOT_FOUND` | `invalidateWarmupConversation(id)` so retry can re-warm |

Files: `warmupConversation.ts`, `AcpSendBox.tsx` (`prepareRuntimeSync`), `useAcpMessage.ts`.

**2026-06-14 — Guid model variant (CCB authority):**

| Field | Purpose |
|-------|---------|
| `extra.ccb_preferred_model_id` | Session-scoped Guid selection (`minimax-m3-thinking`); **not** global `acp.config` |
| `useAcpModelInfo` auto-apply | After warmup, if session model ≠ preferred → `setModel` once variants loaded |

Files: `useGuidSend.ts`, `buildAgentConversationParams.ts`, `useAcpModelInfo.ts`, `ccbAcpModelInfo.ts`.


## CCB assistant profile handoff (2026-06-14)

When user selects a Guid **preset assistant card** (Word/Excel 等) under CCB authority, the effective session instructions/skills/MCP must come from `%LOCALAPPDATA%\CCB-Wanding\.claude\assistants\{id}.json`, **not** the default WanD quotation CLAUDE.md.

### Layer 3 gap (aioncore)

- AionUI stores `preset_assistant_id`, `ccb_assistant_profile_id`, `preset_context` on conversation `extra`.
- aioncore `AcpBuildExtra` includes `preset_assistant_id` / `preset_context` but **does not** forward `acp_meta.ccbAssistantProfileId` into ACP `session/new` `_meta` (verified: no `acp_meta` string in `aioncore.exe`).
- CCB `resolveAssistantProfileIdFromMeta` alone is insufficient when `_meta` never carries the profile id.

### Integration workaround (until aioncore passthrough)

| Step | Owner | Mechanism |
|------|-------|-----------|
| Create conversation | AionUI renderer | `buildCcbPresetConversationExtra` → `preset_context` (profile `claude_md`) + `ccb_assistant_profile_id` |
| Before `/warmup` | AionUI renderer → main IPC | `stageNextSessionProfile` writes `.aionui-next-assistant-profile.json` under CCB config dir (60s TTL) |
| `session/new` | CCB `agent.ts` | `consumeNextAssistantProfileId()` then `getAssistantProfile`; fallback `resolvePresetContextFromMeta` → `userContextOverride` replaces default CLAUDE.md |
| MCP/skills filter | CCB | `filterMcpConfigsForAssistantProfile` / `filterCommandsForAssistantProfile` when profile loads |

**Files:** AionUI `ccbAssistantProfileSession.ts`, `ccbPresetConversationExtra.ts`, `warmupConversation.ts`; CCB `assistantProfiles.ts`, `agent.ts`.

**Smoke:** New preset conversation only (existing sessions keep old context). Ask「你可以做什么」— must match preset (e.g. Word Creator), not WanD quotation persona.

**Deploy chain:** AionUI dev restart + CCB `bun run build` → `deploy-claude-code-b-to-wanding.ps1` → **new** preset conversation for profile/MCP changes.
