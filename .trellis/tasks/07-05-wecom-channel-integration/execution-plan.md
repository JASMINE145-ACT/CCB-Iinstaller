# Execution Plan — `07-05-wecom-channel-integration` (rev 3)

| Field | Value |
|-------|--------|
| **Status** | `active` — rev 5 error passthrough |
| **Plan revision** | 5 (2026-07-10 — 853000 errmsg passthrough + fast-fail) |
| **Scenario** | **C** + **external-api** (WeCom credential 853000) |
| **Plan depth** | Full |
| **Verification profile** | Cross-repo |
| **Repos** | `aionui-src` (primary) + `claude-code-best` (Trellis/spec) |
| **Parked** | 2026-07-04 — resumed 2026-07-06 for P1b |
| **Active phase** | **P1d** — error passthrough; manual smoke needs valid WeCom creds |

**PRD:** [`prd.md`](./prd.md) · **Gap:** [`research/gap-analysis-ext-wecom-bot.md`](./research/gap-analysis-ext-wecom-bot.md) · **Bug:** [`research/enable-false-success-2026-07-09.md`](./research/enable-false-success-2026-07-09.md)

---

## Rev 4 — Contract map (enable false-success)

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|-------------------|--------------|----------------------|------|
| `WANd.WECOM.ENABLE.001` | `enablePlugin` failure (`success: false`) shows error toast, never「渠道已启用」 | `aionui-src/.../httpBridge.ts`, `ChannelModalContent.tsx` | `tests/unit/channels/enablePluginResponse.test.ts` (new) | User thinks channel is on; manual smoke blocked |
| `WANd.WECOM.ENABLE.002` | Re-enable with saved Secret (blank password field + `hasToken`) merges stored creds | `ChannelModalContent.tsx` `handleToggleExtensionPlugin` | `tests/unit/channels/extensionEnableConfig.test.ts` (new) | WS never starts; secret missing at runtime |
| `WANd.WECOM.ENABLE.003` | After failed enable, panel shows error + `enabled: false`; success path shows enabled≠connected distinction | `WecomAibotExtensionPanel.tsx`, status poll | Manual: enable with bad secret → red error, no false toast | Confusing「未启用」after green toast |

### Contract: WANd.WECOM.ENABLE.001

**Behavior protected:** Channel enable API semantic errors must propagate to UI as failures.  
**Primary code:** `packages/desktop/src/common/adapter/httpBridge.ts`, `ChannelModalContent.tsx`  
**Tests:** `pnpm test tests/unit/channels/enablePluginResponse.test.ts`  
**Eval / smoke:** Manual — bad secret → error toast, toggle stays off  
**Risk if broken:** False-positive enable; manual smoke appears「无效」

### Contract: WANd.WECOM.ENABLE.002

**Behavior protected:** Extension re-enable sends complete credentials when UI omits masked secret.  
**Primary code:** `ChannelModalContent.tsx` (or shared `buildExtensionEnableConfig`)  
**Tests:** `pnpm test tests/unit/channels/extensionEnableConfig.test.ts`  
**Eval / smoke:** Re-enable with empty Secret field after prior save → `connected` or explicit SDK error  
**Risk if broken:** Silent enable failure loop

### Contract: WANd.WECOM.ENABLE.003

**Behavior protected:** Connection panel reflects backend `status.error` after failed enable.  
**Primary code:** `WecomAibotExtensionPanel.tsx`  
**Tests:** DOM/unit on `connectionLabel` when `status.enabled && status.error`  
**Eval / smoke:** Settings → Channels after failed enable  
**Risk if broken:** User cannot diagnose without Network tab

---

## Rev 4 — Phase -1 capability matrix

| Capability | Tool | Status | Fallback |
|------------|------|--------|----------|
| Bug diagnosis | Explore session + `research/enable-false-success-2026-07-09.md` | **done** | — |
| Frontend fix + tests | trellis-implement / main session | available | — |
| Layer A review | `Agent: code-reviewer` (Superpowers + `.cursor/agents/code-reviewer.md`) | available | — |
| Layer B smoke | `smoke-renderer-imports.mjs` | available | — |
| Rust route (optional) | HTTP 4xx on enable fail — **defer** unless frontend-only insufficient | defer | Keep 200+success:false; fix client |

**Plan depth:** Standard · **Verification profile:** Cross-repo (aionui-src + trellis)

---

## Rev 4 — Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| **P1c.1** | P0 | RED tests for enable response + enable config | 001, 002 | ui | `Skill: superpowers:test-driven-development` | `tests/unit/channels/*.test.ts` | Failing tests documenting current bug | Fast |
| **P1c.2** | P0 | Fix `enablePlugin` bridge + ChannelModal error handling | 001 | ui | trellis-implement | `httpBridge.ts` or channel adapter, `ChannelModalContent.tsx` | No success toast on `success: false` | Standard |
| **P1c.3** | P0 | Merge saved credentials on re-enable | 002 | security | trellis-implement | `ChannelModalContent.tsx` | enable payload includes secret when `hasToken` | Standard |
| **P1c.4** | P1 | Surface `status.error` in panel | 003 | ui | trellis-implement | `WecomAibotExtensionPanel.tsx` | Error visible when enable fails | UI |
| **P1c.5** | P0 | Review + test gate | 001–003 | — | `Agent: code-reviewer` → test | — | Layer A/B PASS + vitest green | Cross-repo |
| **P1c.6** | P1 | Manual smoke resume | 001–003 | external-api | user | WeCom app | Connected or clear SDK error | UI |

---

## Rev 4 — TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| P1c.1 | 001 | Test: mock `{ success: false, error }` → handler throws / returns failure | `pnpm test tests/unit/channels/enablePluginResponse.test.ts` | same |
| P1c.1 | 002 | Test: `hasToken` + empty secret → merged config includes secret from store mock | `pnpm test tests/unit/channels/extensionEnableConfig.test.ts` | same |
| P1c.2–4 | 001–003 | RED above fails before patch | `pnpm test tests/unit/wecom/` + new channel tests | `pnpm test tests/unit/channels/` |
| P1c.5 | all | — | `cargo test -p aionui-channel` (no rust change expected) | optional |

**Baseline (pre-fix):** `pnpm test tests/unit/wecom/` → **22/22 PASS** (2026-07-09) — does not cover enable contract yet.

**P1c.1 (2026-07-09):** Helpers + RED-target tests added in aionui-src:

- `extensionEnableConfig.ts`, `channelBridgeResponse.ts`
- `pnpm test tests/unit/channels/` → **8/8 PASS**
- **Not wired** into `ChannelModalContent` / `enablePlugin` yet → integration still RED

---

## Rev 4 — Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| 001 | `pnpm test tests/unit/channels/enablePluginResponse.test.ts` | 4/4 PASS; code-reviewer Layer A A5 | **pass** |
| 002 | `cargo test -p aionui-channel --lib merge_extension_enable_raw_keeps` + extensionEnableConfig tests | PASS; 30/30 vitest | **pass** |
| 003 | Manual: enable → error toast not green | pending user retry | pending |
| Manual smoke (8) | After 001–003 green: DM pairing | PRD §Manual smoke | blocked until P1c |

**Gate chain (implementation):**

```text
RED tests (P1c.1)
  → implement P1c.2–4
  → Agent: code-reviewer PASS (Layer A + B)
  → pnpm test (wecom + channels)
  → manual enable retry
  → trellis-update-spec + check.jsonl
```

---

## Rev 4 — Evidence block (planning session)

| Type | Output |
|------|--------|
| Read | `research/enable-false-success-2026-07-09.md` — trace + 3 contracts |
| Read | `.trellis/spec/code-review-layer-a.md` A5 incident class |
| Test | `pnpm test tests/unit/wecom/` → 22/22 PASS (baseline; gap = no enable tests) |
| Explore | User screenshot: toast enabled + panel 未启用 |

**Approval required** before P1c.2 implementation. Say **执行 task** or **implement** to proceed.

---

## Rev 5 — Contract map (error passthrough)

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|-------------------|--------------|----------------------|------|
| `WANd.WECOM.ENABLE.004` | WeCom SDK auth failure (`853000`) surfaces as specific errmsg in toast + panel, fast-fail not 45s timeout | `sdk-runtime.js`, `host.rs`, `manager.rs`, `routes.rs` | `sdk-runtime-auth-log.test.ts`, `extension_stderr_auth_error` test, `sanitize_plugin_status_error` test | User chases runtime when creds are wrong |

### Contract: WANd.WECOM.ENABLE.004

**Behavior protected:** Enable failure shows `invalid bot_id or secret` (or errmsg), not generic runtime hint.  
**Primary code:** `examples-wecom-dev/.../sdk-runtime.js`, `AionCore/.../host.rs`, `manager.rs`, `routes.rs`  
**Tests:** `pnpm test tests/unit/wecom/sdk-runtime-auth-log.test.ts`; `cargo test -p aionui-channel extension_stderr sanitize_plugin`  
**Eval / smoke:** Bad creds → toast + panel show errmsg within ~5s  
**Risk if broken:** Misdiagnosis as AionUI wiring bug

## Rev 5 — Workstreams (executed 2026-07-10)

| Phase | Workstream | touches | Status |
|-------|------------|---------|--------|
| P1d.1 | SDK logger → `setConnectionStatus('error')` on auth log | 004 | done |
| P1d.2 | host stderr → `HostEvent::Error` | 004 | done |
| P1d.3 | `plugin_status_errors` + status API `error` field | 004 | done |
| P1d.4 | Sanitize enable `BridgeResponse.error` | 004 | done |
| P1d.5 | Manual: re-enter valid Bot ID + Secret from WeCom admin | external-api | **user** |

## Rev 5 — Contract Verification

| Contract | Verification | Evidence | Status |
|----------|--------------|----------|--------|
| 004 | vitest + cargo unit tests | 2/2 + host/manager tests PASS | **pass** |
| 004 | code-reviewer Layer A | PASS (3a2a2ffc) | **pass** |
| 004 | Manual enable with bad creds | panel shows `invalid bot_id or secret` | pending rebuild + retry |
| Manual smoke | Valid WeCom creds → Connected | user action | blocked |

## Rev 5 — Evidence

| Type | Output |
|------|--------|
| Read | `research/enable-error-passthrough-2026-07-10.md` |
| Read | Explore handoff — 23:12 log `errcode=853000` |
| Agent | code-reviewer PASS rev 5 |
| Test | `sdk-runtime-auth-log` 2/2; `sanitize_plugin_status_error`; `extension_stderr_auth_error` |

**Root cause (ops):** WeCom returns `853000 invalid bot_id or secret` — verify credentials in admin, re-paste Secret in UI.

---


## Approval gate (strict)

| Milestone | Can approve? |
|-----------|----------------|
| Rev 2 architecture direction | **Yes** — extension-first, SDK primary, no Rust wecom |
| Full P1–P5 implement | **No** — until P0 go/no-go on extension runtime host |
| P1a SDK spike | After P0 doc + runtime lifecycle decision |
| P1b bridge | After P1a connected/disconnected lifecycle proven |
| Compat production label | Only after P2 security checklist |

---

## External review summary (2026-07-04)

**Verdict:** Direction pass; P0 prerequisite must be solid.

Incorporated items: extension runtime lifecycle, product-object mode matrix, `wsUrl` optional, group @bot rules, identity namespacing, expanded security register, P1a/P1b split, compat production label gate, plugin id rename, agent routing boundary.

Archive: [`research/external-review-chatgpt-2026-07-04.md`](./research/external-review-chatgpt-2026-07-04.md)

---

## Architecture (unchanged core)

Extension channel in aionui-src; AionCore metadata only; **no** Rust `PluginType::Wecom`.

```
Channels UI → ext-wecom-aibot (SDK WS) | ext-wecom-bot (HTTP compat)
           → unified channel / pairing
           → AionCore channel manager (metadata + status)
```

---

## Phase -1 — Capability matrix

| Capability | Tool | Status | Fallback |
|------------|------|--------|----------|
| P0 gap + go/no-go | trellis-research | available | Main session |
| Runtime spike | trellis-implement | available | aionui-src spike branch |
| Security hardening | code-review + unit tests | available | — |
| Spec | trellis-update-spec | available | — |

---

## Phase 0 — P0 gap analysis (current)

**Required output:** [`research/gap-analysis-ext-wecom-bot.md`](./research/gap-analysis-ext-wecom-bot.md) must include:

1. Code path inventory with file refs
2. Extension runtime lifecycle decision
3. Credential schema (botId, secret, optional wsUrl)
4. Primary/compat matrix by **product object**
5. Security risk register
6. **Explicit go/no-go for P1**

| Step | Output |
|------|--------|
| Inventory ext-wecom-bot + UI drift | §1 gap doc |
| Trace extension start/stop in desktop | Runtime lifecycle §3 — **decision pending spike** |
| User Bot credentials | Manual evidence checklist |
| Record go/no-go | Gap doc §8 checkbox |

---

## Phase 1…N — Workstreams (rev 3)

| Phase | WS | Risk | Required output | Gate |
|-------|-----|------|-----------------|------|
| **P0** | G Gap + go/no-go | concurrency | Filled gap doc + runtime decision | **Blocks P1** |
| **P1a** | L SDK spike | external-api | Connect/disconnect/reconnect states; singleton BotID | Blocks P1b |
| **P1b** | L Bridge | ui | Pipeline + DM/group pairing + namespaced ids | Blocks P3 smoke |
| **P2** | H Compat hardening | security | S1–S12 compat subset + tests | Production label |
| **P3** | U UI | ui | ext-wecom-aibot card; no builtin wecom confusion | — |
| **P4** | T Tests | — | bun test + e2e | — |
| **P5** | K Packaging + spec | packaging | backlog + wecom-channel.md | — |

---

## Security checklist (compat — production blockers)

See gap doc §5. Highlights:

- `timingSafeEqual` signatures (test + **code-review** — not timing measurable in unit test alone)
- Replay: timestamp ±5m, nonce cache, msgid dedup
- XML XXE off, body size cap
- receiveid validation after decrypt
- response_url HTTPS + allowlist + SSRF block
- Credential encryption + log redaction
- Audit: pairing, enable/disable, credential update

**Rule:** Compat not production-ready unless P2 passes. Else label experimental / not bundled.

---

## TDD contract (rev 3)

| WS | RED | GREEN | Notes |
|----|-----|-------|-------|
| Signature | bad sig accepted | rejected; malformed length no throw | + code-review for timingSafeEqual |
| Replay | stale timestamp accepted | rejected | — |
| Decrypt | oversized payload | rejected | — |
| SDK spike | enable no WS | connected state | manual + optional integration |
| UI e2e | coming soon on wecom | ext card visible | ext-channels.e2e |

---

## Manual smoke (8 scenarios)

- [ ] Internal DM pairing + stream reply
- [ ] Internal group @bot reply
- [ ] Group non-@bot **no** trigger
- [ ] Visibility in-range / out-of-range
- [ ] Disable → no agent
- [ ] Disconnect → reconnect
- [ ] Bad Secret → UI error
- [ ] Duplicate BotID enable → singleton behavior

---

## Verification gate (unchanged chain + Layer B for renderer UI)

```
Layer A: code-reviewer | trellis-check  (logic, spec, UX)
Layer B: smoke-renderer-imports.mjs     (icon exports default; optional --full-module) — mandatory for P1a UI / settings changes
         See .trellis/spec/frontend/layer-b-renderer-review.md
Tests:   bun test + e2e as applicable
Manual:  manual smoke (8 scenarios below)
Docs:    trellis-update-spec → jsonl → finish-work
```

Full chain: **Layer A PASS + Layer B PASS** → bun test → manual smoke → trellis-update-spec → jsonl → finish-work

---

## Progress snapshot

| Phase | State | Evidence |
|-------|--------|----------|
| Rev 1 | rejected | Rust wecom path |
| Rev 2 | superseded | — |
| Rev 3 plan | **draft** | This file + expanded gap/prd |
| P0 G | **done (conditional)** | Runtime trace doc; **NO-GO** for live messaging until AionCore host |
| P1a scaffold | **done** | ext-wecom-aibot + inbound + UI + 11 unit tests |
| P1a UI (Channels) | **done** | WecomAibotExtensionPanel + WebuiModalContent fix; icon import white-screen fixed 2026-07-07 |
| P1a UI agent picker | **done (2026-07-09)** | `channelAgentOptions.ts` merges CCB presets + CLI; persists `custom_agent_id` |
| P1b bridge | **done (uncommitted)** | AionCore extension channel JS host + Wecom PluginType; cargo test 206+ pass |
| P1 manual smoke | **unblocked — retry** | P1c enable contract implemented; user manual enable toggle |
| P1c enable contract | **implemented** | 001–003 code+tests pass; manual smoke pending |

---

## Resume checklist (when picking up again)

1. Read [`research/p0-extension-channel-runtime-trace.md`](./research/p0-extension-channel-runtime-trace.md)
2. Implement or schedule AionCore extension channel JS host (`enable_extension_plugin` → `start()`)
3. Obtain test BotID + Secret + internal group for manual smoke (PRD §Manual smoke)
4. Run dev: `.\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap` (extensions on by default) → Settings → Channels → `ext-wecom-aibot` → Bot ID + Secret + Agent
5. Wire P1b inbound → channel pairing / agent routing pipeline

**Code location (uncommitted):** `D:/Projects/aionui-src/examples/ext-wecom-aibot/` + `ChannelModalContent.tsx` / `WecomAibotExtensionPanel.tsx` / `WebuiModalContent.tsx`

**UI white-screen fix (2026-07-07):** `@icon-park/react` has no `PlugsConnected` or `Warning` exports; static import chain crashed Settings → 远程连接. Use `LinkOne` + `Caution` only.

---

## Defer / out of scope

Rust wecom; corp self-built app; external customer groups; group webhook-only; WanD logic in extension; vertical package naming.
