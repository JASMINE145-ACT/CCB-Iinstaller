# Specialist Session Resume — Preserve Agent Profile After Idle / Reopen

## Goal

When a user **reopens or resumes** a Guid **specialist** conversation (e.g. **万鼎报价专家** / `quotation-agent`) after idle timeout or days later, the ACP runtime must **stay bound to that specialist** — not silently fall back to `wande-orchestrator`. The user must be able to continue quotation/inventory work with **direct MCP** calls, without orchestrator guard errors or extra `Agent()` delegation.

## Problem (2026-06-29 repro)

User resumed an existing quotation conversation (prior turns: match, fill_quotation_sheet, multi-SKU pricing). After sending「查询两个编码的库存」:

```
Tool: mcp__quotation__get_inventory_by_code_batch
Input: { "codes": ["8020020751", "8020020755"] }

Error: wande-orchestrator 不得直接调用业务 MCP。
       请使用 Agent 工具委派 quotation-agent 或 accurate-agent。
```

**Interpretation:** UI/conversation history looks like quotation specialist; **runtime session profile** is `wande-orchestrator`. Orchestrator guard (`evaluateOrchestratorToolGuard`) correctly blocks `mcp__quotation__*` — wrong profile on resume.

## Feasibility review (2026-06-29) — incorporated

| Phase | Verdict | Action |
|-------|---------|--------|
| **A Diagnose** | ✅ Blocking | Capture `conversation.extra` for repro session before claiming done |
| **B AionUI stage** | ✅ Partially exists | **Harden** `stageCcbAssistantProfileFromConversation` (extra aliases + history inference); fix handoff TTL / concurrency notes |
| **C CCB rehydrate** | ✅ Code bug confirmed | `tryRehydrateStaleSession` must not inject wrong-session `ccbAgentId` into `_meta` |
| **D aioncore passthrough** | ⚠️ Not primary fix | **Shipped binary:** permanent gap — handoff only. **Dev:** optional `AionCore/crates` passthrough |
| **B2 Legacy sessions** | ❌ Was missing | Infer specialist from transcript when extra lacks profile id |

## Root causes (validated)

| # | Layer | Mechanism | Status |
|---|-------|-----------|--------|
| R1 | **AionUI stage** | `stageCcbAssistantProfileFromConversation` only read `ccb_assistant_profile_id` / `preset_assistant_id`; skipped `ccb_agent_id` / `acp_meta` | **Fixing** |
| R1b | **No extra** | Pre-06-14 or default-router sessions have no profile in extra | **B2 inference** |
| R2 | **aioncore gap** | No `acp_meta` in `session/new` `_meta` on shipped binary | **Document**; handoff workaround |
| R3 | **Handoff TTL** | 60s global file; slow `session/new` edge case | **Extend to 300s** |
| R4 | **CCB stale rehydrate** | Wrong `appliedProfileId` in `_meta` **overrides** fresh handoff | **Fixing** |
| R5 | **Resolution order** | meta → handoff → default orchestrator | By design once R4 fixed |

## Scope

### In scope

| Track | Path | Change |
|-------|------|--------|
| **B — AionUI** | `ccbPresetConversationExtra.ts`, new `ccbConversationProfileResolve.ts` | Resolve all extra aliases; infer from `acp_tool_call` history |
| **B — TTL** | `ccbAssistantProfileSession.ts`, `claude-code-B/assistantProfiles.ts` | Handoff max age 60s → 300s |
| **C — CCB** | `agent.ts` | `tryRehydrateStaleSession`: empty `_meta` on cross-session rehydrate |
| **B2** | AionUI inference | `mcp__quotation__*` → `quotation-agent`; `mcp__accurate__*` → `accurate-agent` |
| **Spec** | integration specs | Resume contract + smoke |

### Out of scope

- Orchestrator guard rule changes
- Per-conversation handoff filenames (future; global file + TTL extension for now)
- Quotation reply format

### Phase D — aioncore (documentation only for MVP)

- **Production:** `aioncore.exe` does not forward `acp_meta` — permanent; rely on handoff.
- **Dev optional:** `AionCore/crates` passthrough — separate follow-up, not blocking this task.

## Acceptance criteria

1. **Resume smoke (quotation-agent):** preset card → match → idle/restart → reopen → inventory by code → `agent session profile applied: quotation-agent`; no orchestrator guard error.
2. **Resume smoke (accurate-agent):** same for accurate tools.
3. **Regression:** default Guid still `wande-orchestrator`.
4. **Legacy session:** conversation with `mcp__quotation__*` in history but no extra profile → resume stages `quotation-agent`.
5. **Tests:** `ccbPresetConversationExtra.test.ts` + CCB `agent.test.ts` rehydrate case.

## Implementation phases

### Phase A — Diagnose (parallel with fix)

Capture repro `conversation.extra` + CCB logs. See `research/resume-repro-2026-06-29.md`.

### Phase B — AionUI harden (P0)

- Expand extra field resolution.
- Message-history inference when extra empty.
- Handoff TTL 300s.

### Phase C — CCB rehydrate (P0)

- Do not pass alien `ccbAgentId` on stale rehydrate.

### Phase B2 — Legacy inference (P1, same PR)

- Scan recent messages for business MCP tool titles.

### Phase E — Deploy + spec

- `sync-dev-aionui` / `deploy-claude-code-b-to-wanding.ps1` + dev restart.
- Old sessions without history signals: still「新开 Guid 会话」.

## Priority

**P0**
