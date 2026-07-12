# Execution Plan — `07-05-wecom-channel-integration` (rev 8)

> **ACTIVE PLAN = rev 8 only.** Everything below the “Rev 7 archive” marker is **read-only history**. Do not execute rev 7/5/4 phases. System-review accepted 2026-07-12: full contract IDs in Workstreams; M-G3 optional/non-blocking; Mode A Phase 0→3 only.

| Field | Value |
|-------|--------|
| **Status** | `in_progress` — Mode A code done; awaiting **M-G1/M-G2** manual |
| **Plan revision** | 8 (2026-07-12 — Mode A: `(userid, groupId)` sessions + reply-context isolation) |
| **Scenario** | **A** (clear Mode A) + **L** (research done) + **D** optional (JS + Rust workstreams) |
| **Plan depth** | Full |
| **Verification profile** | Cross-repo + UI |
| **Repos** | `aionui-src` (ext-wecom-aibot ×2) + `claude-code-best` (AionCore channel relay) |
| **Active phase** | **Phase 3** — Dual-@ manual smoke (M-G1/M-G2 blockers) |
| **Approach** | **A** — per-person sessions (recommended); shared-session remains deferred |

**Decision lock:** Mode A = agent memory per `(paired user, group chatid)`. Replies stay **group-visible**. Concurrent @mentions must not overwrite SDK reply frames.

**Research:** [`research/wecom-group-per-user-session-2026-07-12.md`](./research/wecom-group-per-user-session-2026-07-12.md)  
**Related:** [`research/wecom-agent-profile-handoff-race-2026-07-12.md`](./research/wecom-agent-profile-handoff-race-2026-07-12.md) · media M2/M3 still pending from rev 7

**PRD:** [`prd.md`](./prd.md) · **Spec:** [`.trellis/spec/integration/wecom-channel.md`](../../spec/integration/wecom-channel.md)

**Prior revs:** Rev 7 media P0/P1 — code done, M2 manual pending · Rev 5/4 enable — done · Rev 8 **supersedes** “group session product” ambiguity with Mode A lock.

---

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution + skill-selection | Read: | Contract→TDD→Verify; scenario A+L+D; matrix: research → trellis-research |
| trellis-before-dev / get_context | Shell: | packages → integration; current task `07-05-wecom-channel-integration` |
| wecom-channel.md + identity/state | Read: | Session `(user, chat)`; `replyContextByChat` keyed by chatId only |
| trellis-research (Mode A) | Agent: | [`research/wecom-group-per-user-session-2026-07-12.md`](./research/wecom-group-per-user-session-2026-07-12.md) |
| openspec-explore | Read: | Stance only — requirements already Mode A (no propose) |

---

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | **done** | Capability matrix; research persisted |
| Phase 0 Spec lock | **done** | PRD Mode A + wecom-channel.md contracts; vitest reply-context |
| Phase 1 Reply CTX JS | **done** | Dual-tree rekey by streamId; fail-closed without options.streamId |
| Phase 2 Outbound correlation | **done** | `reply_stream_id` + `stream_finish` → options; extract `__streamId` |
| Phase 3 Concurrency smoke | **pending user** | **M-G1/M-G2** manual (blockers); M-G3 optional |
| plan structure | **PASS** | lint PASS |
| code-reviewer | **PASS** | Layer A PASS; Layer B N/A (finish=false Critical fixed) |

---

## Phase -1 capability matrix

| Capability | Tool | Status | Fallback |
|------------|------|--------|----------|
| Session per-user assert | `cargo test -p aionui-channel` session | available | Add WeCom-focused unit |
| Reply-context rekey | vitest + dual-tree | available | Block ship if SYNC fails |
| Relay options plumbing | AionCore channel | available | — |
| Layer A review | `Agent: code-reviewer` | available | — |
| Manual dual-@ smoke | WeCom internal group | **required** | Block Mode A done |
| Shared-session Mode B | — | **out of scope** | Deferred |

**Plan depth:** Full · **Verification profile:** Cross-repo + UI

---

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|-------------------|--------------|----------------------|------|
| `WANd.WECOM.SESSION.PER_USER.001` | Group: two members → two `(user, chat)` sessions / ACP bindings | `session.rs`, `action.rs`, `sqlite_channel.rs` | cargo: two users same chat_id → two sessions | Cross-talk of quotation context |
| `WANd.WECOM.REPLY.CTX.USER.001` | Concurrent @ in same group cannot overwrite each other’s SDK reply `frame` | `state.js`, `ext-wecom-aibot-channel.js` | vitest: two setReplyContext same chatId different streamId | Wrong reply / empty / crossed streams |
| `WANd.WECOM.REPLY.CTX.OUT.001` | Outbound send/edit resolves context by inbound `streamId`, not group chatId alone | `sdk-runtime.js`, `orchestrator.rs`, `stream_relay.rs`, `plugin.rs` | unit + relay options assert | Edits land on wrong frame |
| `WANd.WECOM.SLASH.NEW.SCOPE.001` | `/new` resets only issuer `(user, chat)` | `action.rs` | cargo: A /new does not delete B | Accidental group wipe |
| `WANd.WECOM.PRIVACY.GROUP.VIS.001` | Mode A isolates memory, not visibility — replies stay group-visible | docs + help text | Manual AC note | False privacy expectation |
| `WANd.WECOM.PAIR.PER_USER.001` | Pairing per platform user id; unauthorized @ → pairing only | pairing + inbound | existing pairing tests | Shared pairing codes in group |
| `WANd.WECOM.MEDIA.OUT.SYNC.001` | Dual-tree stay identical for reply-context changes | both `ext-wecom-aibot` trees | hash/diff gate | Dev vs install drift |
| `WANd.WECOM.MEDIA.OUT.CTX.001` | Media before finish — **per streamId** after rekey | sdk + outbound-file | existing + concurrency | File send fail under dual-@ |

### Contract cards (P0)

#### Contract: WANd.WECOM.SESSION.PER_USER.001

**Behavior protected:** In an internal group, each paired WeCom user gets an independent channel session and ACP conversation for that `chatid`.  
**Primary code:** `AionCore/.../session.rs`, `action.rs`  
**Tests:** `cargo test -p aionui-channel --lib session` (+ new assert if missing)  
**Eval / smoke:** Two users @bot → different contexts (no shared prior turns)  
**Risk if broken:** Alice’s询价混进 Bob’s session

#### Contract: WANd.WECOM.REPLY.CTX.USER.001

**Behavior protected:** Concurrent group @mentions keep distinct SDK reply frames.  
**Primary code:** `state.js` (rekey Map by `streamId`), inbound `setReplyContext`  
**Tests:** `tests/unit/wecom/ext-wecom-aibot-reply-context.test.ts` (new)  
**Eval / smoke:** Dual-@ overlapping streams  
**Risk if broken:** Crossed replies / `no active reply context`

#### Contract: WANd.WECOM.REPLY.CTX.OUT.001

**Behavior protected:** Stream relay / file outbound correlates to the correct inbound `streamId`.  
**Primary code:** `sdk-runtime.js`, `orchestrator.rs`, `stream_relay.rs`, `extension_channel/plugin.rs`  
**Tests:** Rust options passthrough + JS lookup-by-streamId  
**Eval / smoke:** Dual-@ + file bubble  
**Risk if broken:** Chunks/files attach to wrong user’s turn

---

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 0 | P0 | Spec + PRD Mode A lock | `WANd.WECOM.SESSION.PER_USER.001`, `WANd.WECOM.PRIVACY.GROUP.VIS.001`, `WANd.WECOM.PAIR.PER_USER.001`, `WANd.WECOM.SLASH.NEW.SCOPE.001` | docs | trellis-update-spec | `prd.md`, `wecom-channel.md` | Mode A AC; shared deferred | Fast |
| 0 | P0 | RED tests (reply race) | `WANd.WECOM.REPLY.CTX.USER.001` | ui | TDD | new vitest | fails before fix | Cross-repo |
| 1 | P0 | Rekey reply context by streamId | `WANd.WECOM.REPLY.CTX.USER.001`, `WANd.WECOM.MEDIA.OUT.CTX.001`, `WANd.WECOM.MEDIA.OUT.SYNC.001` | concurrency | trellis-implement | `state.js`, `sdk-runtime.js`, channel.js ×2 trees | GREEN vitest | Cross-repo |
| 2 | P0 | Pass streamId through relay | `WANd.WECOM.REPLY.CTX.OUT.001` | backend | trellis-implement | orchestrator, stream_relay, plugin.rs | GREEN cargo | Cross-repo |
| 3 | P1 | Docs/help + optional config note | `WANd.WECOM.PRIVACY.GROUP.VIS.001`, `WANd.WECOM.SLASH.NEW.SCOPE.001` | docs | docs | help text / README | Mode A semantics | Fast |
| 3 | P0 | Dual-@ manual smoke | `WANd.WECOM.REPLY.CTX.USER.001`, `WANd.WECOM.REPLY.CTX.OUT.001`, `WANd.WECOM.SESSION.PER_USER.001` | ui | user | WeCom group | **M-G1/M-G2** PASS (blockers) | UI |
| 4 | — | Shared-session Mode B | docs-only/no-runtime-contract | — | — | — | **out** | — |

**Parallel:** Phase 1 (JS) and Phase 2 (Rust) can run in parallel after RED tests exist; merge owner: streamId contract (options + Map key) must agree before green.

---

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| Reply rekey | REPLY.CTX.USER.001 | Two contexts same chatId/different streamId — second overwrites (current) | `pnpm test tests/unit/wecom/ext-wecom-aibot-reply-context.test.ts` | same |
| Session per-user | SESSION.PER_USER.001 | N/A if existing green — add assert | `cargo test -p aionui-channel --lib session` | same |
| Outbound correlation | REPLY.CTX.OUT.001 | send_message options `{}` — no streamId | `cargo test -p aionui-channel` + vitest lookup | same |
| Slash scope | SLASH.NEW.SCOPE.001 | N/A if existing — add A≠B assert | `cargo test -p aionui-channel --lib slash_new` / session reset | same |
| Dual-tree | SYNC.001 | hash mismatch | file hash equal both trees | same |

---

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| SESSION.PER_USER.001 | cargo session tests + dual-user @ | two sessions | unit path OK; M-G1 pending |
| REPLY.CTX.USER.001 | vitest reply-context | no clobber | **PASS** (4 tests) |
| REPLY.CTX.OUT.001 | cargo + vitest | streamId in options + lookup | **PASS** (unit); M-G1 pending |
| SLASH.NEW.SCOPE.001 | cargo /new | A reset ≠ B | pending M-G2 |
| PRIVACY.GROUP.VIS.001 | PRD/spec + help | accepted risk recorded | **PASS** (spec) |
| MEDIA.OUT.CTX/SYNC | existing + dual-tree | PASS | **PASS** (hash sync) |
| Manual **M-G1** (blocker) | Two users @ overlapping | correct interleaved replies | pending |
| Manual **M-G2** (blocker) | User A `/new`; B continues | B context intact | pending |
| Manual **M-G3** | Unauthorized C @bot | pairing only | **optional / non-blocking** |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-05-wecom-channel-integration/execution-plan.md` | PASS | **PASS** |
| Gate chain | code-reviewer → tests → UI smoke (M-G1/G2) → trellis-update-spec | — | review+unit **PASS**; UI pending |

---

## Manual steps (Mode A)

| ID | Blocking? | Steps | Pass |
|----|-----------|-------|------|
| **M-G1** | **Yes** — Mode A done gate | Internal group; User A and B both paired; both @bot with different queries overlapping | Each reply matches issuer; no crossed content |
| **M-G2** | **Yes** — Mode A done gate | A sends `/new`; B continues prior thread | B session intact; A starts clean |
| **M-G3** | **No** — optional / non-blocking this round | Unauthorized C @bot | Pairing only; no agent leak into A/B sessions |

**Explicit non-goals:** private group replies; group-as-shared-session; renaming `conversationId` to include userid (unless UI needs later).

---

## Conditional recovery

- If dual-@ still crosses after JS rekey → verify Phase 2 streamId plumbing before more JS.
- If pairing codes flood group → product decision (DM pairing) — separate task.
- Profile handoff race under dual session create → keep `_meta.ccbAgentId` (already fixed).

---

## Rev 7 archive (media — historical)

> **READ-ONLY ARCHIVE.** Do not execute phases below. Active Mode A work is **rev 8 only** (above). Retained for media M2/M3 evidence and enable history.

# Execution Plan — `07-05-wecom-channel-integration` (rev 7)

| Field | Value |
|-------|--------|
| **Status** | `active` — P0 outbound + P1 inbound media done; **agent-profile bind fix** 2026-07-12 (awaiting WeCom `/new` smoke) |
| **Plan revision** | 7 (2026-07-11 — harden contracts; MVP = outbound file; inbound deferred) |
| **Scenario** | **B** (large spec extension) + **L** (research done) + **H** (path allowlist) |
| **Plan depth** | Full |
| **Verification profile** | Cross-repo + UI manual smoke |
| **Repos** | `aionui-src` (ext-wecom-aibot ×2 trees) + `claude-code-best` (AionCore bridge + Trellis) |
| **Parked** | 2026-07-04 — resumed 2026-07-06 for P1b |
| **Active phase** | **Agent-profile bind** (2026-07-12) + media M2/M3 pending |
| **Approach** | **B** — contracts locked; P0 implemented 2026-07-11 |

**Hotfix (2026-07-12):** Channel Settings already `quotation-agent`, but ACP bound `wande-orchestrator` via shared handoff race. Fixed `_meta.ccbAgentId` on `session/new` + WeCom `/new` → `session.new`. Research: [`research/wecom-agent-profile-handoff-race-2026-07-12.md`](./research/wecom-agent-profile-handoff-race-2026-07-12.md).

**PRD:** [`prd.md`](./prd.md) · **Gap:** [`research/gap-analysis-ext-wecom-bot.md`](./research/gap-analysis-ext-wecom-bot.md) · **Media research:** [`research/wecom-aibot-media-capabilities.md`](./research/wecom-aibot-media-capabilities.md)

**Prior revs:** Rev 6 (mixed inbound+outbound draft) → superseded by rev 7; Rev 5 (error passthrough) — implemented; Rev 4 (enable) — implemented.

---

## Rev 7 — Decision lock (MVP cut)


| Layer | In this ship (P0) | Explicitly out |
|-------|-------------------|----------------|
| Outbound **file** | Yes — `messageType=file` → `uploadMedia` → `replyMedia` | — |
| Outbound **image** / stream `msg_item` | No | P2 |
| Proactive `sendMediaMessage` (no reply ctx) | No | P3 |
| Inbound image/file/mixed | No | P1 (`WANd.WECOM.MEDIA.IN.001`) |
| Text `replyStream` | Unchanged | — |
| Dual extension trees | **Must stay in sync** | Single-tree drift forbidden |

**Highest risks (must not regress):**

1. **AionCore bridge first** — `outgoing_to_json` today drops `file_url` / `file_name`; SDK alone cannot see media entities.
2. **Reply-context lifetime** — `replyStreamForChat(..., finish=true)` clears context; `replyMedia` must complete **before** finish clear.
3. **Path allowlist** — no arbitrary local paths; whitelist + size + ext/MIME + audit log.
4. **Inbound not in P0** — temp TTL / agent path / scan are P1-only.
5. **Two trees** — `examples-wecom-dev/ext-wecom-aibot` **and** `examples/ext-wecom-aibot` must receive the same outbound file behavior.

---

## Rev 7 — Session evidence (planning invocations)

| Invocation | Output |
|------------|--------|
| `Read: trellis-task-execution/SKILL.md` | Contract → TDD → Contract Verification doctrine loaded |
| `Read: trellis-task-execution/skill-selection.md` | Scenario B/L + H (security allowlist); cross-repo → Full |
| `Read: trellis-before-dev` | Task `07-05-wecom-channel-integration`; `.trellis/spec/integration/wecom-channel.md` |
| `Agent: trellis-research` | [`research/wecom-aibot-media-capabilities.md`](./research/wecom-aibot-media-capabilities.md) |
| User risk review (2026-07-11) | Approach **B**; P0 outbound only; harden bridge / reply ctx / allowlist / dual-tree |

---

## Rev 7 — Phase -1 capability matrix

| Capability | Tool | Status | Fallback |
|------------|------|--------|----------|
| Media SDK surface | research doc | **done** | WeCom docs |
| AionCore `outgoing_to_json` File fields | trellis-implement | available | Block P0 if missing |
| Extension file send + allowlist | trellis-implement | available | Text degrade |
| Dual-tree sync | mirror patch both dirs | required | Fail gate if drift |
| Layer A review | `Agent: code-reviewer` | available | — |
| Layer B (renderer) | N/A (no settings UI in P0) | N/A | — |
| Rust tests | `cargo test -p aionui-channel` | available | — |
| JS unit tests | `bun test` / existing wecom unit paths | available | — |
| Manual WeCom smoke | user + internal group | **required for M2** | Block ship without M2 |

**Plan depth:** Full · **Verification profile:** Cross-repo + UI

---

## Rev 7 — Contract map (P0 ship)

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|-------------------|--------------|----------------------|------|
| `WANd.WECOM.MEDIA.OUT.001` | `UnifiedOutgoingMessage(File)` → extension JSON → WeCom downloadable file | `plugin.rs` `outgoing_to_json`; `ext-wecom-aibot-channel.js`; `sdk-runtime.js` | Rust serialize test + JS mock upload/reply + **M2** | Quotation Excel never reaches WeCom |
| `WANd.WECOM.MEDIA.OUT.SECURITY.001` | Outbound path must pass allowlist / size / ext / MIME; reject + audit otherwise | shared JS validator (both trees) | Unit: reject `C:\Windows\...`, oversize, `.exe` | Arbitrary local file exfil |
| `WANd.WECOM.MEDIA.OUT.CTX.001` | `replyMedia` runs while reply context exists; finish clear only after media (or after safe text fallback) | `sdk-runtime.js`, channel `sendMessage` | Unit: mock finish order; **M2** | `no active reply context` → silent fail |
| `WANd.WECOM.MEDIA.OUT.DEGRADE.001` | Upload/validation failure → text fallback; `replyStream` still finishes; no hang | channel + sdk-runtime | Unit mock SDK reject; **M2-fail** path | Stuck stream / empty reply |
| `WANd.WECOM.MEDIA.OUT.SYNC.001` | Dev tree and packaged `examples/` tree behave identically for file send | both `ext-wecom-aibot` trees | Diff gate or shared test against both entrypoints | Installer vs local-dev drift |

### Contract: WANd.WECOM.MEDIA.OUT.001 — wire format (locked)

**Behavior protected:** AionCore emits File messages the extension can send via SDK.

**JSON from `outgoing_to_json` (required fields when `messageType === "file"`):**

| Field | Source | Notes |
|-------|--------|-------|
| `messageType` | `OutgoingMessageType::File` → `"file"` | Already partially present; incomplete today |
| `file_url` **or** `file_path` | `UnifiedOutgoingMessage.file_url` (local path or file URL) | Prefer absolute local path under allowlist |
| `file_name` | `file_name` | Fallback: basename of path |
| `mime_type` | optional; JS may infer from ext | e.g. `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `text` / `content.text` | optional caption | Text stream path unchanged for non-file |

**Must not change in P0:** text-only `replyStream` path for `messageType=text`.

**Primary code:**  
`AionCore/.../extension_channel/plugin.rs` ·  
`aionui-src/examples-wecom-dev/ext-wecom-aibot/channels/{ext-wecom-aibot-channel.js,sdk-runtime.js}` ·  
mirror under `examples/ext-wecom-aibot/`

**Tests:**  
- Rust: `cargo test -p aionui-channel outgoing_to_json` (or new `extension_channel_outgoing_file`) asserts File payload includes `file_url`/`file_name`  
- JS: mock `uploadMedia` + `replyMedia`; assert called with file type + filename  

**Eval / smoke:** Manual **M2** — quotation → WeCom file bubble  

**Risk if broken:** WanD 报价表 blocked on WeCom

### Contract: WANd.WECOM.MEDIA.OUT.SECURITY.001 — allowlist (locked before code)

| Rule | P0 value |
|------|----------|
| Allowed roots | Agent artifact / workspace dirs only (exact list fixed in impl notes + tests; e.g. CCB workspace + session artifact dirs — **no** drive-root / user home / system paths) |
| Max size | ≤ 20 MB soft (WeCom SDK allows 50 MB; P0 tighter) |
| Allowed extensions | `.xlsx`, `.xls`, `.csv`, `.pdf`, `.docx`, `.txt` (P0 quotation-centric; expand later) |
| MIME | Must match extension allowlist when provided |
| Reject behavior | Do **not** upload; send text fallback per DEGRADE.001; write audit log (path basename only — never full secret paths if outside allowlist) |
| Symlinks / `..` | Resolve + reject if escapes allowlist root |

### Contract: WANd.WECOM.MEDIA.OUT.CTX.001 — reply timing (locked)

```text
1. Ensure reply context exists for chatId (from inbound frame)
2. Validate path (SECURITY.001)
3. uploadMedia({ type: 'file', filename })
4. replyMedia(frame, media_id, ...)     ← MUST run while context live
5. Optional text caption via replyStream(finish=false) if needed
6. replyStream(..., finish=true)        ← clears context LAST
```

**Forbidden:** `finish=true` before `replyMedia`.  
**Out of P0:** `sendMediaMessage` without reply context (P3).

### Contract: WANd.WECOM.MEDIA.OUT.DEGRADE.001

**Behavior protected:** Validation/SDK failures still complete the turn with user-visible text (e.g. `[文件发送失败] name — reason`); no stuck「Thinking…」.

### Contract: WANd.WECOM.MEDIA.OUT.SYNC.001

**Behavior protected:** Same channel JS semantics in:

- `aionui-src/examples-wecom-dev/ext-wecom-aibot/` (dev)
- `aionui-src/examples/ext-wecom-aibot/` (packaged sample)

**Gate:** P0 PR must touch both trees (or prove one is generated from the other). Diff of `channels/*` for file-send helpers must be empty or documented sync script.

### Deferred (not in rev 7 ship)

| Contract | Status |
|----------|--------|
| `WANd.WECOM.MEDIA.IN.001` | **Deferred P1** — handlers + download + temp TTL + attachments parse |
| Outbound image / mixed inline | **Deferred P2** |
| Proactive `sendMediaMessage` | **Deferred P3** |

---

## Rev 7 — Workstreams (P0 only)

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| **P1e.0** | P0 | Lock AC in PRD + `wecom-channel.md` (outbound file only; cite contracts above) | docs-only | — | edit plan/prd (this rev); full spec update **after** GREEN | `prd.md`, `wecom-channel.md` | AC bullets match OUT.* contracts | — |
| **P1e.1** | P0 | RED: Rust `outgoing_to_json` File serialization | OUT.001 | cross-repo | `Skill: superpowers:test-driven-development` | `plugin.rs` + tests | Failing assert: `file_url`/`file_name` present | Fast |
| **P1e.2** | P0 | GREEN: AionCore bridge passthrough File fields | OUT.001 | cross-repo | trellis-implement | `plugin.rs` (± bridge.mjs) | JSON carries `messageType=file` + path/name/mime | Cross-repo |
| **P1e.3** | P0 | RED: JS allowlist + file send + reply-order tests (mock SDK) | OUT.SECURITY.001, OUT.CTX.001, OUT.DEGRADE.001 | security | TDD | `tests/...outbound-media*.test.js` (or unit under wecom) | Fail until validator + replyMedia order exist | Fast |
| **P1e.4** | P0 | GREEN: extension `sendMessage` file branch — validate → upload → replyMedia → finish | OUT.001, CTX, SECURITY, DEGRADE | external-api | trellis-implement | both trees: `ext-wecom-aibot-channel.js`, `sdk-runtime.js`, shared validator module | Dual-tree sync | UI |
| **P1e.5** | P0 | Upstream producer (if needed): stream_relay / message_service emit `OutgoingMessageType::File` when agent artifact path known | OUT.001 | agent-routing | trellis-implement + spike | `stream_relay.rs` / `message_service.rs` | File message reaches extension (not text-only path leak) | Cross-repo |
| **P1e.6** | P0 | Review + automated gates | all OUT.* | — | `Agent: code-reviewer` → test-agent | — | Layer A PASS; cargo + JS tests green; SYNC.001 dual-tree | Cross-repo |
| **P1e.7** | P0 | Manual smoke **M2** (+ degrade spot-check) | OUT.001, DEGRADE | external-api | user | WeCom group | File bubble received | UI |

**Parallel split:** P1e.1–2 (Rust) ∥ P1e.3–4 (JS) after field names locked above; **merge owner:** JSON field names in OUT.001 table (single source of truth).  
**P1e.5** only if File messages never leave AionCore today — spike before coding; if agent already sets `file_url`, skip.

**Inbound workstreams:** removed from active plan (see Deferred).

---

## Rev 7 — TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| P1e.1–2 Rust | OUT.001 | Serialize File without `file_url` fails new test | `cargo test -p aionui-channel` (filter extension_channel / outgoing file) | same |
| P1e.3–4 JS | OUT.SECURITY / CTX / DEGRADE | Allowlist rejects; replyMedia-before-finish fails | `bun test` / project wecom unit command targeting outbound-media | same both trees |
| P1e.5 producer | OUT.001 | N/A if already emitting File; else failing integration stub | `cargo test -p aionui-channel` | same |
| P1e.6 gates | all | — | code-reviewer PASS → tests | — |
| P1e.7 smoke | OUT.001 | — | Manual **M2** | — |

---

## Rev 7 — Contract Verification (P0 gate)

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| OUT.001 | `cargo test -p aionui-channel outgoing_to_json` (2 pass) + vitest outbound-media + **M2** | Rust+JS green; WeCom file bubble | **auto PASS**; **M2 pending** |
| OUT.SECURITY.001 | vitest allowlist / oversize / ext + default roots include `D:\CCB-Wanding\workspace` | 11 tests pass | **PASS** |
| OUT.CTX.001 | vitest `planOutboundSend` media before finish | test output | **PASS** |
| OUT.DEGRADE.001 | vitest validation failure → `[文件发送失败]` | test output | **PASS** |
| OUT.SYNC.001 | dual-tree SHA match for outbound-file/sdk/channel | checklist | **PASS** |
| IN.001 | — | — | **deferred** |

**Gate chain:** `Agent: code-reviewer` **PASS** (2026-07-11) → cargo + vitest **PASS** → manual **M2** → `trellis-update-spec` (media section) → jsonl  

**Do not claim P0 done without:** OUT.001 + SECURITY.001 + CTX.001 automated evidence **and** M2.

**P1e.5 note:** No Rust `OutgoingMessageType::File` producer yet; P0 live path = **text auto-attach** of allowlisted absolute paths in assistant reply (quotation Excel paths). Typed File bridge ready for later.

---

## Rev 7 — Manual smoke (P0)

| ID | Steps | Pass criteria | Ship |
|----|-------|---------------|------|
| **M2** | Trigger quotation (or inject File outgoing) → agent produces Excel under allowlist | User receives **file message** in WeCom | **Required** |
| **M2b** | Force invalid path / oversize (dev harness or mock) | Text fallback; stream completes; no stuck Thinking | Required if harness available; else unit covers DEGRADE |
| **M1 / M3 / M4 inbound** | — | — | **Deferred with P1** |

---

## Rev 7 — Recovery / re-approval

| Trigger | Action |
|---------|--------|
| User says **执行 task** / **执行 P0** | Start P1e.1 RED; no inbound code |
| Producer cannot emit File (P1e.5 hard) | Stop; re-approve spike options (artifact hook vs text-path parse — prefer typed File message) |
| Reply context unavailable at send time | Re-approve P3 `sendMediaMessage` exception — **not** silent workaround in P0 |
| Dual-tree sync too costly | Re-approve single canonical path + sync script; do not ship one-sided |
| User expands to inbound | New plan rev; activate IN.001 workstreams |

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
| **P1e media plan** | **rev 7 implemented (auto)** | code-reviewer PASS; cargo outgoing_to_json 2/2; vitest outbound-media 11/11; dual-tree sync; **M2 manual pending** |

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

**Rev 7 media deferrals (explicit):** inbound image/file/mixed (`IN.001`); outbound image / stream `msg_item` (P2); proactive `sendMediaMessage` without reply context (P3); expanding allowlist beyond quotation-centric extensions.
