# Route B Status (Snapshot 2026-07-02)

> Current state of the AionUI ↔ CCB-Wanding native ACP loop + MCP registration. For the archived task log, see [`../../tasks/archive/2026-06/06-12-route-b-exe-aionui-runtime/aionui-ccb-wanding-acp-mcp-fix.md`](../../tasks/archive/2026-06/06-12-route-b-exe-aionui-runtime/aionui-ccb-wanding-acp-mcp-fix.md) and [`../../../ccb-installer/AIONUI-BACKEND-STATUS.md`](../../../ccb-installer/AIONUI-BACKEND-STATUS.md). This doc is a **distilled snapshot** — when overlay source or smoke evidence changes, refresh within the same week.

---

## One-paragraph status

**MCP registration is COMPLETE on the native `--acp` runtime in TypeScript source (overlay: `ccb-installer/claude-code-b-src/src/services/acp/`).** `resolveSessionMcpConfigs()` merges `settings.json` user MCP with ACP `params.mcpServers` (e.g. `guide_mcp`). Lazy MCP (`excel-mcp`, `exa`) defer prefetch unless the assistant profile explicitly requires them (`keepForProfile` — research-agent exa). Specialist profiles (quotation, accurate, office, research, price-library) bind via `.aionui-next-assistant-profile.json` handoff + `agentSessionProfile.ts` keep-set. **AskUserQuestion is disabled** in CCB (`permissions.ts` → chat fallback). AionUI E2E via `start-dev-full.ps1` + Guid cards is the daily verification path; native smoke scripts remain the CLI oracle.

---

## What works (verified)

| Capability | Status | Evidence |
|---|---|---|
| Native ACP session start | ✅ | `node ccb-installer/test-native-acp-agent.mjs` → session/new OK |
| MCP servers load from `settings.json` | ✅ | `[ccb-acp-mcp] loaded N servers` in smoke logs |
| Quotation tool callable (not via `ExecuteExtraTool`) | ✅ | `mcp__quotation__match_quotation` in native smoke |
| MCP merge settings + params | ✅ | `resolveSessionMcpConfigs` in overlay `agent.ts` |
| Lazy MCP + profile exception (exa) | ✅ | `mcpSessionPrefetch.test.ts` + research-agent Guid |
| Specialist profile handoff | ✅ | `.aionui-next-assistant-profile.json` + `test-mcp-session-health.mjs -Session` |
| Orchestrator MCP guard | ✅ | `evaluateOrchestratorToolGuard` blocks business MCP on router |
| Idle resume profile rehydrate | ✅ | `tryRehydrateStaleSession` clears stale `_meta` (2026-06-29) |
| MiniMax M3 variants | ✅ | `minimax-m3` / `minimax-m3-thinking` in session models |
| Dev vendor sync default | ✅ | `start-dev-full.ps1` → `sync-dev-wanding-vendor.ps1` (Phase 2/2.1) |
| AionUI dev E2E (Mixing) | ✅ | `start-dev-full.ps1 -SkipBootstrap` + org SSO + Guid cards (manual checklist) |

---

## Live main route (source-level MCP)

```text
AionUI (aionui-src)
  → aioncore.exe
  → route-b/index.js  (ccb-installer/patches/aionui-ccb-route-b)
  → D:\CCB-Wanding\dist\cli.js --acp
  → agent.ts createSession()
      resolveSessionMcpConfigs(params, assistantProfile)
      omitLazySessionMcpServers(..., { keepForProfile })
      prefetchAllMcpResources(mcpConfigs) → {clients, tools}
      tools:[...baseTools, ...mcpTools]
  → MiniMax + MCP (quotation, accurate, excel, office-word, exa, price-library, …)
```

**Overlay source (edit here):** `ccb-installer/claude-code-b-src/src/services/acp/` → sync via `sync-claude-code-b-mcp-prefetch.ps1 -Build -Deploy`.

**Upstream-only modules (not in overlay):** `assistantProfiles.ts`, `bridge.ts`, `capabilities.ts`, `mcpManifest.ts`, `entry.ts` — live in `D:\claude-code-B\src\services\acp\`.

> **Critical insight:** MCP tools must be in the `tools` array passed to QueryEngine. `ENABLE_SEARCH_EXTRA_TOOLS=false` is set in route-b (not `??`) so MCP is not routed through broken `ExecuteExtraTool`.

---

## Route-b process-local env

```text
CLAUDE_CONFIG_DIR=%LOCALAPPDATA%\CCB-Wanding\.claude
CLAUDE_CODE_ACP_ALLOW_BYPASS_PERMISSIONS=true
ENABLE_SEARCH_EXTRA_TOOLS=false          ← route-b forces false (not ??)
CCB_WANDING_SKIP_GROVE=1
+ settings.json.env (ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN, …)
```

---

## Config boundary (must not regress)

```text
Official Claude Code:        C:\Users\m1774\.claude
CCB-Wanding / AionUI:        C:\Users\m1774\AppData\Local\CCB-Wanding\.claude
```

Only inject CCB config into the AionUI/CCB child process (route-b does this). See `config-layer.md`.

---

## Open / follow-up

| Item | Status | Notes |
|---|---|---|
| AskUserQuestion UI flow | **By design disabled** | Backend denies AUQ; multi-candidate clarification via chat text — see `acp-session-flow.md` § AskUserQuestion |
| `accurate` MCP deep E2E | ⏳ Spot-check | Probe includes `accurate_summarize_records`; manual Guid smoke optional |
| Overlay → dist drift | ⚠️ Process | After overlay edits run `sync-claude-code-b-mcp-prefetch.ps1 -Build -Deploy` |
| Phase 4 cold ship `1.1.3-dev` | ⏳ Ship track | See `SHIP-P0-1` in full-system-review backlog |
| `registerSessionGateHooks` | N/A | Not in overlay; gates via agent frontmatter Stop + `ccb-subagent-gate` skill |

---

## Changelog (high level)

| Date | Change |
|------|--------|
| 2026-06-12 | MCP source migration; settings + params merge |
| 2026-06-13 | `ENABLE_SEARCH_EXTRA_TOOLS=false`; capability manifest |
| 2026-06-14 | Assistant profiles + MiniMax M3 |
| 2026-06-29 | Specialist idle resume; orchestrator guard hardening |
| 2026-06-30 | Default vendor sync in dev; subagent gate knowledge ROE |
| 2026-07-01 | Permission mode sync (Frontend authority); research-agent toolstack |
| 2026-07-02 | Lazy exa `keepForProfile`; data glob vendor sync; Step 2 backend audit **7/10** |

---

## Next small steps

1. After overlay ACP edits: `sync-claude-code-b-mcp-prefetch.ps1 -Build -Deploy` + `sync-aionui-ccb-route-b.ps1`
2. `test-mcp-health.ps1 -Probe -Session` serial — all manifest `agent_profiles`
3. Optional: `start-dev-full.ps1 -VendorStrict` before release-candidate dev sessions

---

## Refresh policy

- **When overlay `claude-code-b-src` changes:** update this doc + run native smoke within the same week.
- **When `acp-session-flow.md` changes:** cross-check § Open and env notes here.
- **When route-b ACP slot version bumps:** update [`../integration/route-b-sync.md`](../integration/route-b-sync.md).

---

## Trellis task links

| Task | Relevance |
|---|---|
| `06-30-full-system-review` Step 2 | Backend audit 7/10 — `reviews/step-02-backend.md` |
| `06-29-specialist-session-resume-profile-drift` | Resume handoff + rehydrate |
| `06-28-research-agent-toolstack` | exa lazy MCP + keep-set |
| `07-01-aionui-full-auto-permission-sync` | Frontend mode sync (Backend honors bypass) |
| `06-26-aionui-source-level-recovery` | Phase 4 cold ship dependency |
