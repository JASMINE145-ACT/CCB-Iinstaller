# Resume profile drift — repro notes (2026-06-29)

## User report

- Conversation: quotation work (三通50 / 直接50, fill_quotation_sheet) then later「查询两个编码的库存」
- Context: user **re-enabled** the conversation after some time (idle / reopen)
- Failure: `mcp__quotation__get_inventory_by_code_batch` with codes `8020020751`, `8020020755`
- Error: `wande-orchestrator 不得直接调用业务 MCP。请使用 Agent 工具委派 quotation-agent 或 accurate-agent.`

## Feasibility review (2026-06-29) — verified against code

| Finding | Verdict | Evidence |
|---------|---------|----------|
| Phase A must run first | ✅ | No `conversation.extra` capture yet for repro session |
| Old sessions may lack `ccb_assistant_profile_id` | ✅ | `aionui-ccb-boundary.md`: "New preset conversation only" |
| `stageCcbAssistantProfileFromConversation` only read 2 extra fields | ✅ **bug** | Missed `ccb_agent_id`, `acp_meta.ccbAgentId` |
| Handoff file global + 60s TTL | ✅ | `ccbAssistantProfileSession.ts` + CCB `assistantProfiles.ts` |
| R4 `tryRehydrateStaleSession` copies wrong `appliedProfileId` | ✅ **bug** | `agent.ts` — meta beats handoff in `resolveSessionProfileIdForCreate` |
| aioncore passthrough dead for shipped binary | ✅ | `aionui-ccb-boundary.md` § Layer 3; dev `AionCore/crates` optional |
| Layer 4 already calls stage before every warmup | ✅ | `warmupConversation.ts` → `stageCcbAssistantProfileFromConversation` |

## Root cause chain (code-confirmed)

```
warmupConversation(force)
  → stageCcbAssistantProfileFromConversation
       → only ccb_assistant_profile_id | preset_assistant_id  ❌ (fixed: +ccb_agent_id + acp_meta)
       → if empty: no stage → CCB default orchestrator
  → /warmup → session/new

idle stale id redirect:
  tryRehydrateStaleSession
    → _meta: { ccbAgentId: activeSession.appliedProfileId }  ❌ wrong session
    → meta wins over fresh handoff in resolveSessionProfileIdForCreate
```

## Phase A capture checklist

- [ ] `conversation.extra` at resume time (full JSON)
- [ ] CCB log: `session profile id from {meta|handoff|default}`
- [ ] CCB log: `agent session profile applied: …`
- [ ] Renderer log: staging profile id on warmup
- [ ] Age of handoff file if present

## Fixes in flight (2026-06-29)

1. **AionUI** `resolveCcbProfileIdFromConversationExtra` + message history inference (`mcp__quotation__*` → quotation-agent)
2. **AionUI** handoff TTL 60s → 300s
3. **CCB** `tryRehydrateStaleSession`: do not pass wrong-session `ccbAgentId` in `_meta`
4. **CCB** `assistantProfiles.ts` handoff TTL 60s → 300s (claude-code-B)

## Workaround (until deploy)

New conversation from **万鼎报价专家** Guid card; re-enter codes.
