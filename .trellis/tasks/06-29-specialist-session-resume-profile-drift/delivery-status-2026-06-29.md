# Delivery status — 06-29 specialist session resume profile drift

**Date:** 2026-06-29  
**Task:** [`prd.md`](./prd.md)

## Code changes (root cause fixes)

### AionUI (`D:\Projects\aionui-src`)

| File | Change |
|------|--------|
| `ccbPresetConversationExtra.ts` | Restore + expand `resolveCcbProfileIdFromConversationExtra` (all extra/acp_meta aliases); infer specialist from recent `acp_tool_call` history when extra empty |
| `ccbAssistantProfileSession.ts` | Handoff TTL 60s → **300s** |
| `ccbPresetConversationExtra.test.ts` | +4 tests (10/10 pass) |

### CCB (`claude-code-B` + `ccb-installer` mirrors)

| File | Change |
|------|--------|
| `agent.ts` | `tryRehydrateStaleSession`: **do not** pass wrong-session `ccbAgentId` in `_meta` (lets fresh handoff win) |
| `assistantProfiles.ts` | `MAX_PENDING_PROFILE_AGE_MS` 60s → **300s** |

## Verified

```text
cd D:\Projects\aionui-src
bunx vitest run tests/unit/common-utils/ccbPresetConversationExtra.test.ts
→ 10/10 pass
```

## Deploy (operator)

```powershell
# 1. CCB
cd D:\claude-code-B; bun run build
.\ccb-installer\scripts\deploy-claude-code-b-to-wanding.ps1

# 2. AionUI dev
.\scripts\sync-dev-aionui.ps1   # or your dev sync script
.\scripts\start-dev-full.ps1 -SkipBootstrap

# 3. Smoke: preset quotation session → idle 6min → reopen → inventory by code
#    CCB log: agent session profile applied: quotation-agent
```

## Spec recorded (2026-06-29)

Updated after disk cleanup:

| Spec | Section |
|------|---------|
| `integration/aionui-ccb-boundary.md` | § Specialist resume profile drift |
| `integration/agents-unified-model.md` | § Specialist session resume; Session handoff TTL 300s; validation matrix |
| `backend/acp-session-flow.md` | § 2026-06-29 idle resume profile drift |
| `backend/route-b-status.md` | Handoff TTL + staging note |
| `integration/mcp-health.md` | Triage rows (handoff age, resume guard) |
| `frontend/chat-acp-flow.md` | `stageCcbAssistantProfileFromConversation` rule |

## Not done / follow-up

- Phase A: capture repro `conversation.extra` from user's failing session (optional confirmation)
- Deploy + E2E smoke (operator)
- aioncore `acp_meta` passthrough (dev-only, documented as permanent gap on shipped binary)
- Per-conversation handoff filenames (concurrency hardening)
