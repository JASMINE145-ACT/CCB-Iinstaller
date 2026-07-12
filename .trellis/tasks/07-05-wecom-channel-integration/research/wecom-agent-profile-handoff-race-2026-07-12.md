# Research — WeCom channel bound wrong CCB profile (orchestrator vs quotation)

**Date:** 2026-07-11 / 2026-07-12  
**Task:** `07-05-wecom-channel-integration`  
**Symptom:** WeCom Settings selected **万鼎报价专家** (`quotation-agent`), but live replies behaved as **工作助手** (`wande-orchestrator`) and showed `委派 → 万鼎报价专家`.

## Evidence (AionUi-Dev DB + handoff)

| Layer | Observed |
|-------|----------|
| `client_preferences` `assistant.wecom.agent` | `custom_agent_id: quotation-agent` |
| Conversation `a29438ae.extra` | `ccb_assistant_profile_id` / `preset_assistant_id` / `acp_meta.ccb*` = `quotation-agent` |
| `%LOCALAPPDATA%/CCB-Wanding/.claude/.aionui-next-assistant-profile.json` | **`profile_id: wande-orchestrator`** (staged after desktop Guid) |
| ACP `session/new` from AionCore | **did not** put `ccbAgentId` into `_meta` |

## Root cause

CCB Route B resolves session profile as:

1. `_meta.ccbAgentId` / nested `acp_meta`  
2. shared handoff file `.aionui-next-assistant-profile.json`  
3. default `wande-orchestrator`

AionCore historically relied on (2) for channel traffic (`ccb_profile_handoff.rs`). Desktop Guid and WeCom channel **share one handoff file** → last writer wins. Guid default session overwrote handoff to orchestrator; channel `session/new` consumed it.

Conversation.extra already had the correct specialist id — the ACP create path simply never forwarded it into `_meta`.

Secondary: WeCom text `/new` was **not** mapped to `session.new` (only button callbacks), so users could not force a fresh ACP session after fixing settings.

## Fix (2026-07-12)

1. **`AcpSessionParams::new_session_request`** — attach `_meta.ccbAgentId` (+ `acp_meta`) from `preset_assistant_id` / `custom_agent_id`.  
2. **Resume path** — merge Claude `resume` overlay **onto** CCB meta (do not replace).  
3. **`ActionExecutor`** — `/new` `/reset` → `session.new`; `/status` `/help`; `session.new` also stages handoff.

## Manual verify

1. Rebuild + restart `start-dev-full.ps1 -SkipBootstrap -SkipVendorSync`  
2. WeCom: send `/new`  
3. Send Excel +「报价」— expect **direct** quotation-agent (no orchestrator「请说下一步」/「委派 →」 wrapper)  
4. Confirm Settings Agent still **万鼎报价专家**

## Spec impact

Update `.trellis/spec/integration/wecom-channel.md` Agent routing: channel ACP `session/new` **must** forward CCB profile into `_meta`; handoff is belt-and-suspenders only.
