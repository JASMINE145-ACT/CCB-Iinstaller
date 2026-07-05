# Execution Plan — `07-05-wecom-channel-integration` (rev 3)

| Field | Value |
|-------|--------|
| **Status** | `parked` |
| **Plan revision** | 3 (2026-07-04 — ChatGPT external review incorporated) |
| **Scenario** | B |
| **Plan depth** | Full |
| **Verification profile** | Cross-repo |
| **Repos** | `aionui-src` (primary) + `claude-code-best` (Trellis/spec) |
| **Parked** | 2026-07-04 — P1a complete; resume when AionCore runtime host or WeCom credentials needed |
| **Active phase** | **Parked after P1a** — next: P1b (AionCore extension channel host) |

**PRD:** [`prd.md`](./prd.md) · **Gap:** [`research/gap-analysis-ext-wecom-bot.md`](./research/gap-analysis-ext-wecom-bot.md)

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

## Verification gate (unchanged chain)

code-reviewer → bun test + e2e → manual smoke → trellis-update-spec → jsonl → finish-work

---

## Progress snapshot

| Phase | State | Evidence |
|-------|--------|----------|
| Rev 1 | rejected | Rust wecom path |
| Rev 2 | superseded | — |
| Rev 3 plan | **draft** | This file + expanded gap/prd |
| P0 G | **done (conditional)** | Runtime trace doc; **NO-GO** for live messaging until AionCore host |
| P1a scaffold | **done** | ext-wecom-aibot + inbound + UI + 11 unit tests |
| P1b bridge | **deferred** | AionCore extension channel runtime host — resume when prioritized |

---

## Resume checklist (when picking up again)

1. Read [`research/p0-extension-channel-runtime-trace.md`](./research/p0-extension-channel-runtime-trace.md)
2. Implement or schedule AionCore extension channel JS host (`enable_extension_plugin` → `start()`)
3. Obtain test BotID + Secret + internal group for manual smoke (PRD §Manual smoke)
4. Run `just dev-ext` + enable `ext-wecom-aibot` → verify `authenticated` connection state
5. Wire P1b inbound → channel pairing / agent routing pipeline

**Code location (uncommitted):** `D:/Projects/aionui-src/examples/ext-wecom-aibot/` + `ChannelModalContent.tsx` changes

---

## Defer / out of scope

Rust wecom; corp self-built app; external customer groups; group webhook-only; WanD logic in extension; vertical package naming.
