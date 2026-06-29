# App Startup Readiness Gate — MCP/Config Warm Before First Conversation

## Goal

Move **config validation**, **MCP cold start**, and **dependency readiness** from
「first Guid conversation / first message」to **「app open + CCB detected + SSO login
complete」**, so the user's first query never pays install/warmup latency or hits
fetch races.

Parent context: user hit `Failed to fetch (127.0.0.1:53121)` on first「查询 直接50
价格」while MCP warmup (~120s) and `warmupConversation` (~9s) ran in parallel with
Guid initial message send. AOL inventory was already fixed separately (task
`06-27-quotation-mcp-health`).

## Problem (2026-06-28)

```
App open          →  aioncore only
First Guid card   →  spawn ACP + session/new + scheduleWanDMcpWarmup
First message     →  races warmup → AIONUI_INTERNAL_ERROR / Failed to fetch
```

| Symptom | Root cause |
|---------|------------|
| `Failed to fetch (127.0.0.1:53121)` on first send | Renderer fetch during 9s `warmupConversation`; GPU crash concurrent |
| `WanD MCP warmup done: quotation in 120067ms` | `scheduleWanDMcpWarmup` runs at **session/new**, not app open |
| Config/AOL errors in chat | Repair only in Settings health panel or manual scripts |
| User sends before ready | No Guid「就绪」gate; `useAcpInitialMessage` does not block UI |

**Existing assets not wired to startup:**

- `wanDMcpWarmup.ts` — spawns MCP from `settings.json` **without** conversation id
- `CcbMcpHealthPanel` — auto quick check only when Settings → Tools opens
- `test-mcp-health.ps1 -Probe` — full gate exists but CLI-only

## Design — three readiness layers

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1 — Config ready (sync, ~5s)                          │
│  · CCB authority detected                                   │
│  · settings.json + .env.accurate parse (incl. no BOM)      │
│  · agent seeds / sidecars present                           │
│  · auto-repair whitelisted actions (ensure-wanding-settings)│
├─────────────────────────────────────────────────────────────┤
│ Layer 2 — MCP process ready (background, ~30s–120s)         │
│  · quotation + accurate tools/call warm (reuse wanDMcpWarmup)│
│  · Trigger: app ready, NOT session/new                      │
│  · Guid cards show 准备中 → 就绪                             │
├─────────────────────────────────────────────────────────────┤
│ Layer 3 — ACP session ready (optional / phase 2)            │
│  · Hidden anchor conversation or prefetch session/new       │
│  · Reduces first send from ~10s to ~1s                      │
│  · Tradeoff: memory + idle-kill handling                      │
└─────────────────────────────────────────────────────────────┘
```

### Locked decisions (MVP scope)

| Item | Decision |
|------|----------|
| MVP layers | **Layer 1 + Layer 2** only |
| MCP warm set | `quotation` + `accurate` (same as default router / quotation-agent core) |
| Warm trigger | **Main process or renderer app-ready** when `ccbMcpService.isAuthorityActive` |
| Reuse | `warmWanDMcpServers()` from `wanDMcpWarmup.ts` — do not duplicate stdio probe |
| UI gate | Guid specialist cards + send box **disabled until Layer 2 ready** (or timeout + retry) |
| First message | **Must await** warmup promise; no parallel `reloadModelInfo` race |
| Health at startup | Promote quick check (+ optional background probe) from Settings-only to app pipeline |
| Layer 3 | **Deferred** — document in design; separate subtask if needed |

### Non-goals (MVP)

- Warm every MCP (office-word, excel, excel-mcp COM) at app open
- Replace `test-mcp-health.ps1` CLI gate
- Change ROE / quotation business logic

## Acceptance criteria

1. **Cold app launch** (dev `start-dev-full.ps1` or installed Mixing): within 2 min
   of login, logs show `WanD MCP warmup done: quotation` **before** user opens any
   conversation.
2. **Guid 万鼎报价专家**: card or input shows readiness state; user cannot send until
   Layer 2 ready (or explicit「仍要发送」after timeout — TBD in implement).
3. **First message**「查询 直接50 价格」: no `Failed to fetch` / no
   `AIONUI_INTERNAL_ERROR` on clean dev install with AOL fix applied.
4. **Config regression**: startup pipeline fails visibly (tray/banner) if
   `.env.accurate` BOM or missing `python/main.py`; offers one-click repair path.
5. **Smoke**: extend or add script documenting startup readiness verification;
   `test-mcp-health.ps1 -Probe` still PASS after changes.

## Implementation map (draft)

| Area | Files / systems |
|------|-----------------|
| MCP warm at app open | `ccb-installer/.../wanDMcpWarmup.ts`, route-b sync; new hook from AionUI main or CCB bridge |
| Startup health | `aionui-src/.../ccbMcpHealth.ts`, `ccbMcpBridge.ts`; move auto-check from panel-only |
| Guid readiness UI | `guidCapabilitiesCatalog.ts`, Guid cards, `warmupConversation.ts`, `useAcpInitialMessage.ts`, `AcpSendBox.tsx` |
| Readiness state store | New shared module (renderer + optional main IPC) |
| Spec | `integration/mcp-health.md`, `agents-unified-model.md` warmup row, `internal-update.md` new checklist row |
| Deploy | hot zip: wanDMcpWarmup + aionui renderer; NSIS for full UI |

## Verification plan

```powershell
# After implement — dev
.\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap
# 1. Login → wait for readiness indicator on Guid cards
# 2. Open 万鼎报价专家 → send immediately — must not Failed to fetch
# 3. Logs: MCP warmup timestamps BEFORE conversation create

.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session
```

## Related tasks

- `06-27-quotation-mcp-health` — MCP health + AOL BOM (prerequisite, closed)
- Future: Layer 3 anchor session (optional child task)

## Open questions

1. Timeout UX: block send forever vs 120s soft-ready with warning?
2. Background probe (`-Probe`) on every launch vs daily / on failure only?
3. Installed app vs dev: same pipeline via `ccbMcpService` or main-process PowerShell?
