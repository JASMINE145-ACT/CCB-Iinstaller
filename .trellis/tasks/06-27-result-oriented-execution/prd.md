# Result-Oriented Execution (ROE) — Stop Gate Auto-Continue Until Done

## Goal

Establish a platform-level **Result-Oriented Execution (ROE)** contract: for user
**executable intent** (write, modify, delete, fill forms, generate or edit files),
the agent must not `end_turn` with text-only promises before machine-verifiable
**Done** is reached. When not Done, the Stop hook **REJECTs** and CCB **auto-continues**
the query loop — the user should not need to say「继续完成」.

## Problem

WanD agents frequently **stop early** on executable write/delivery tasks: the assistant
says「收到 / 将继续 / 马上 update」without a follow-up tool call. Users must manually
nudge「继续完成」. This is a **missing execution contract**, not a one-off quotation
edit bug.

Existing infrastructure supports auto-continue but does not cover write operations:

- `.trellis/spec/integration/agents-unified-model.md` § Subagent delivery gate:
  Office agents use `exit 2` → query continues
- `D:/claude-code-B/src/query.ts` L1558–1581: `stop_hook_blocking` → `continue`
- `quotation-agent` gate in `ccb-subagent-gate/config/modes.json` is **`off`**
- SOP「必须出结果 / 少调用」conflicts with「finish writes before stopping」

## ROE Contract

> For executable intent, do not end with text-only completion claims before Done.
> On not-Done, Stop hook REJECT → auto-continue (no user「继续完成」).

**Only two valid stop points:**

1. **Done** — tool and/or artifact evidence
2. **Blocked-on-user** — explicit clarification in assistant text; wait for next user message

## Done Evidence Levels

| Level | Evidence | Use |
|-------|----------|-----|
| L3 | Artifact read-back (xlsx cell/row matches intent) | Edit quotation, fill sheet |
| L2 | Required write tool success in intent window | Generic writes |
| L1 | Read-only MCP + table reply | Price/inventory lookup only |
| L0 | Assistant natural-language completion claim | **Never alone** |

## Architecture

```
User executable intent
        │
        ▼
   Model turn
        │
   tool use or text only
        │
        ▼
   Stop hook ROE validator
        │
   ┌────┴────┐
 PASS      REJECT (exit 2)
   │         │
   ▼         ▼
 end_turn   blocking error → query.ts continue → model turn
```

## MVP Boundary (Recommended First Ship)

> **Preferred path:** ship MVP first, then expand using the full Requirements /
> Implementation Plan below. Nothing in the full plan is deleted — MVP is a strict
> subset aligned with [`docs/loop-design.md`](../../../docs/loop-design.md) §10.3
> (Goal + Validation) and §11.2 (EXIT CONDITION + MAX ITERATIONS), without the
> five-piece macro loop, second LLM verifier, or L3 artifact read-back.

### MVP scope (唯一必做)

```
MVP
├── Stop hook：promise-without-tool  → block
├── Stop hook：write-intent + 无 L2 write tool success  → block
├── Clarification 豁免（真澄清：引导语 + A/B/C 或缺信息）
├── N=5 + subagent-gate-roe.log
├── quotation-agent SOP 一小节（改已有报价单 + 不得空话 end_turn）
└── gate fixture 测试（5 条：改单 / 空话 / 查价 / 澄清 / tool-failed）
```

### MVP Done definition

| Item | MVP rule |
|------|----------|
| **Goal** | User write/edit/delete/fill intent on quotation path |
| **Validation (L2 only)** | **Within intent window only:** successful write tool **call + result** for `fill_quotation_sheet`, `edit_excel`, `mcp__excel__write*` (tool invoked alone is **not** Done) |
| **Not in MVP** | L3 xlsx read-back; separate LLM `/goal` judge; accurate/orchestrator ROE |
| **Stop** | PASS hook, or clarification-only end_turn, or N=5 escalate (pass hook = stop auto-continue; user takes over — **not** fake Done) |
| **Checker** | `quotation-roe.sh` fixed-order rules on transcript — maker (model) does not self-grade |

### Intent window (normative — do not scan full transcript)

The intent window is the **only** scope for L2 checks, write-intent detection, and
promise-without-tool. Scanning the full transcript causes false passes when a prior
turn succeeded but the current turn is incomplete.

```
Example false pass if scanning full transcript:
  Turn 1: fill_quotation_sheet success ✓
  Turn 2 user: "再把 B 款删掉"
  Turn 2 assistant: "收到，马上删" (no tool)
  → Full scan sees Turn 1 L2 → wrongly PASS
```

**Window definition:**

| Case | Window start | Window end |
|------|--------------|------------|
| Current user message has write intent | **Most recent user message** matching write-intent keywords | Current transcript end |
| No write intent, but last assistant has promise-without-tool signal | **Most recent user message** (degraded fallback) | Current transcript end |
| Neither | No ROE window; step 4 early-pass applies | — |

Write-intent keywords on **user role text only**（改 / 删 / 填 / 更新 / 写入 / 追加 /
报价单 / 行 / 价格 / code…）— do not infer intent from tool_result text.

### MVP judgment order (normative — `quotation-roe.sh`)

Execute **in this fixed order**; first match wins:

```
┌─────────────────────────────────────────────────────────────┐
│  1. Extract intent window (see above)                       │
│  2. L2 write success IN window          → PASS              │
│  3. Last assistant = true clarification → PASS              │
│  4. No write intent AND no promise      → PASS              │
│  5. ROE block count >= N (default 5)    → PASS + log        │
│     (escalate: stop auto-continue; user takes over)         │
│  6. Else BLOCK:                                               │
│     • write-intent + no L2 success                            │
│     • promise-without-tool + no L2 success                    │
└─────────────────────────────────────────────────────────────┘
```

**Why order matters:** clarification (step 3) must run **before** block (step 6).
Otherwise「请确认 A 改价 / B 追加 / C 删除」can be mis-blocked as promise-without-tool.

Shared helpers in `roe-common.sh`:

- `extract_intent_window(transcript)` → start/end line range
- `has_l2_write_success_in_window(window)` → tool name + result check
- `is_clarification_message(last_assistant_text)` → used at steps 3 and 6
- `has_write_intent(user_text)` / `is_promise_without_tool(last_assistant, window)`

### L2 write success (tool name + result)

MVP does **not** require xlsx read-back (L3), but **must not** treat a failed tool
call as Done.

**Tool names (in window):**

- `fill_quotation_sheet`
- `edit_excel`
- `mcp__excel__write*` (prefix match)

**Result must indicate success:**

- `is_error` is not `true` (align with existing `has_successful_mcp_call` in
  `parse-transcript.sh`)
- No obvious failure markers in tool result text/JSON: `error`, `failed`, `REJECT`,
  `exception`, non-zero exit hints (calibrate against fixtures)

**Not Done:** tool was invoked but returned error or business failure while
`is_error: false` — tune patterns as fixtures reveal gaps; prefer false block over
false pass for write paths.

### Promise-without-tool (narrow — avoid Chinese false positives)

Do **not** block on isolated words like「收到」alone. Last assistant must satisfy
**all four** (AND):

1. **Commitment / execution tone:** 收到 / 好的 / 我来 / 马上 / 继续 / 将会 / update /
   处理 / 已安排 / 将
2. **Write-operation object:** 改 / 删 / 填 / 更新 / 写入 / 追加 / 报价单 / 行 /
   价格 / code
3. **No L2 write success in intent window** (this turn's work not done)
4. **Not** `is_clarification_message()` (see below)

Examples:

| Assistant text | Verdict |
|----------------|---------|
| 「收到，马上删 B 款并改第 9 行价格」 | promise → block (if no L2) |
| 「收到，我需要你确认 A 改价 / B 追加 / C 删除」 | clarification → pass (step 3) |
| 「好的，请问你要 A 还是 B 档价格」 | clarification → pass |

### Clarification exemption (true clarification only)

Do **not** pass merely because A/B/C appears in prose. Last assistant must match:

**Prompt phrase (any):** 请确认 / 请回复 / 需要你选择 / 请选择 / 你希望

**And one of:**

- Option structure: A/B/C or 1/2/3 (structured choice)
- Missing-info pattern: 缺少 XXX / 需要 XXX / 无法确定 XXX

Valid `Blocked-on-user` stop — no write tool required.

### N=5 + log

Count ROE `exit 2` continuations **per user intent window**; at N=5 **pass hook**
(escalate to user — not fake Done). Log path: `.claude/logs/subagent-gate-roe.log`.

Log entry should include: `escalated_max_blocks`, intent window id, block reason history.

**Block count storage (MVP spike):** session-side counter file, transcript meta scan,
or hook stdin JSON if CCB exposes turn/session fields — implementer picks simplest
that survives auto-continue; do not change `query.ts` unless spike fails.

### Stop hook block message (normative)

Blocking stderr must be actionable for the next auto-continue turn (CCB injects into
model context). Use `fail.sh` `REJECT:` prefix.

Template:

```text
REJECT: ROE — executable write not done.
User asked for a write/edit on the quotation sheet, but this turn has no successful
fill_quotation_sheet / edit_excel / excel write in the current intent window.
Do not end with text-only promises. Call the required write tool now, or ask a
structured clarification (A/B/C) if blocked on missing info.
Reason: <write-intent|promise-without-tool>
Window: user_msg_id=<id> roe_block_count=<n>/5
```

Avoid generic「Gate failed」— it causes another empty-promise turn.

### MVP SOP (quotation-agent only)

Add one section to `ccb-installer/config/agents/quotation-agent.md` (MVP does **not**
require orchestrator or `ccb-wanding-quotation.md` changes):

- **修改已有报价单：** 改价/追加 → `fill_quotation_sheet` + `file_path` +
  `fill_items` + `require_exact_codes=true`；删行/清空 → `edit_excel` or
  `mcp__excel__write_data_to_excel`；多步同轮链式 tool，不得空话 `end_turn`。
- Reframe「必须出结果 / 少调用」：**对用户可见回复可早出；对用户承诺的写操作必须
  tool 完成后再 end_turn**。

Full-plan SOP items (orchestrator, `data/ccb-wanding-quotation.md`) remain in
§Requirements below — deferred post-MVP.

### MVP gate fixtures (5 cases)

| # | Fixture | User / assistant shape | Expected |
|---|---------|------------------------|----------|
| 1 | **改单** | Write intent in window + promise, no L2 success | `exit 2` block |
| 2 | **空话** |「收到，将继续 update」+ write object, no L2 | `exit 2` block |
| 3 | **查价** | Price lookup + `match_quotation` success, no write intent | pass (step 4) |
| 4 | **澄清** |「请确认 A 改价 / B 追加 / C 删除」— true clarification | pass (step 3) |
| 5 | **tool-failed** | Write intent + `fill_quotation_sheet` called but `is_error: true` in window | `exit 2` block |

**Regression case (manual / optional fixture):** prior turn L2 success + new user write
intent + assistant promise only → must **block** (proves window scoping, not full scan).

Fixtures live under `ccb-subagent-gate/tests/fixtures/transcripts/`; run via existing
`tests/run-tests.sh`.

### MVP vs full scope

| Area | MVP | Full plan (below, unchanged) |
|------|-----|------------------------------|
| Agent | `quotation-agent` only | + orchestrator, accurate, global SOP files |
| Done evidence | L2 tool success only | L3 artifact read-back optional |
| Validator | `quotation-roe.sh` + `roe-common.sh` | + `accurate-roe.sh` |
| modes.json | `quotation-agent:roe: block` | P1 accurate, P2 orchestrator spec |
| Spec | SKILL.md stub + minimal note | Full `agents-unified-model.md` § ROE |
| Research | Inline in PRD + 5 fixtures | `research/roe-architecture.md`, eval doc |
| Deploy | gate skill + seed quotation-agent | hot path smoke matrix |
| Second LLM verifier | **No** | **No** (full plan also excludes) |

### MVP implementation plan

Condensed from full PR0–PR4; **one logical ship unit**, may still land as 2 PRs:

| Step | Deliverable |
|------|-------------|
| M1 | `scripts/lib/roe-common.sh` (window, L2, clarification, promise helpers) + `scripts/validators/quotation-roe.sh` (fixed 6-step order) |
| M2 | `subagent-gate.sh` route + `parse-transcript.sh` window-scoped L2 helpers |
| M3 | `modes.json` → `quotation-agent:roe: "block"` |
| M4 | 5 transcript fixtures + `run-tests.sh` cases |
| M5 | `quotation-agent.md` ROE / edit-existing-quotation section |
| M6 | `deploy-subagent-gate-skill.ps1` + `deploy-seed-agents.ps1` on dev machine |
| M7 | Manual smoke: Guid 万鼎报价专家 — 改单场景不再需用户「继续完成」 |

**MVP explicitly skips:** PR0 research files, L3 read-back, accurate-roe, orchestrator
SOP, full spec § ROE, AionUI nudge, `query.ts` changes (unless N=5 counting fails in
practice).

### MVP acceptance criteria

- [x] `quotation-roe.sh` follows fixed 6-step judgment order (clarification before block)
- [x] Intent window scoped to recent write-intent user msg (not full transcript)
- [x] L2 Done requires tool name **and** successful result in window
- [x] promise-without-tool uses 4-condition AND (not isolated「收到」)
- [x] True clarification (prompt + A/B/C or missing-info) → pass
- [x] write-intent without L2 write tool success → block
- [x] Pure price/inventory lookup → pass (no false block)
- [x] N=5 escalation pass + `.claude/logs/subagent-gate-roe.log` with `escalated_max_blocks`
- [x] Block message uses structured `REJECT:` template (not generic「Gate failed」)
- [x] `quotation-agent.md` contains edit-existing-quotation + no empty-promise rule + Stop hooks
- [x] 7 gate cases green in `test_roe_gate.py` (incl. n5)
- [x] M6 deploy + M7 `smoke-roe-deploy.ps1` PASS on dev machine (2026-06-27)
- [ ] Manual Guid 万鼎报价专家 edit-order smoke (user confirm in live chat)

### Design influence (loop-design.md)

**Adopted for MVP:** Goal + Validation as two pillars; maker-checker via Stop hook
(not model self-grade); MAX iterations N=5; no agent stacking for verification.

**Deferred (not deleted from full vision):** Automations/worktrees, seven dev loops,
`/goal` LLM judge, L3 proof, macro loop runner — see full Requirements when expanding
past MVP.

---

## Requirements

### ROE core (ccb-subagent-gate)

- Extend `ccb-installer/config/skills/ccb-subagent-gate/` with **ROE Stop validator**
- REJECT via existing `scripts/lib/fail.sh` `exit 2`; reuse CCB auto-continue; **no**
  `query.ts` semantic change unless eval proves continuation counting is needed
- Detect **promise-without-tool**: last assistant satisfies commitment tone **and** write
  object **and** no L2 in intent window **and** not true clarification
- Detect **write-intent-without-evidence**: user write intent in intent window; no
  successful L2 (tool + result) in same window
- **Intent window**: from most recent write-intent user message (or last user message
  for promise fallback) to transcript end — **never** scan full transcript for L2
- **Clarification exemption**: prompt phrase + (A/B/C or 1/2/3 or missing-info pattern)
  → PASS; evaluated at step 3 before block rules
- **Block message**: structured `REJECT:` stderr for auto-continue quality (see MVP section)
- **Continuation cap**: max N gate continuations per user intent (default N=5); pass hook
  and log `escalated_max_blocks` — user takes over, not fake Done
- Log: `.claude/logs/subagent-gate-roe.log`

### Agent SOP (global)

- Update `ccb-installer/config/agents/quotation-agent.md`,
  `wande-orchestrator.md`, `data/ccb-wanding-quotation.md`
- Reframe「必须出结果 / 少调用」: early **user-visible** replies OK; **promised writes**
  must complete via tools before `end_turn`
- Add **edit existing quotation** flow: price/append → `fill_quotation_sheet`; clear
  rows → `edit_excel` or excel MCP; chain in same turn when possible
- Orchestrator: do not claim Done before subagent Done

### Config rollout (phased)

| Phase | Agent | modes.json key | Validator |
|-------|-------|----------------|-----------|
| P0 | quotation write path | `quotation-agent:roe` → `block` | `quotation-roe.sh` |
| P1 | accurate write path | `accurate-agent:roe` → `block` | `accurate-roe.sh` |
| P2 | orchestrator delegate | spec only | no Done until subagent returns |

Keep `quotation-agent:knowledge` warn. Do **not** re-enable legacy MCP-only gate
(2026-06-18 false REJECT).

### Spec updates (Definition of Done)

- `.trellis/spec/integration/agents-unified-model.md` — new § Result-Oriented Execution
- `.trellis/spec/backend/mcp-business.md` — write/edit Done evidence (if needed)
- `ccb-subagent-gate/SKILL.md` — ROE validator docs + ops runbook

### Eval / smoke

- `research/roe-eval-cases.md`: fixed cases + expected transcript shapes
- Required scenarios:
  - Multi-step edit (delete rows 14/18 + update row 9 price) → Done without user「继续」
  - Completion claim without write tool → block + auto-continue
  - Pure price lookup → no false block
  - Clarification A/B/C → allow end_turn
- Smoke: Guid direct `quotation-agent` + orchestrator delegate

## Implementation Plan

> **Track A (recommended):** [MVP Boundary](#mvp-boundary-recommended-first-ship) steps
> M1–M7 only.  
> **Track B (full):** PR0–PR4 below — execute after MVP is green or when expanding to
> accurate / orchestrator / L3 / full spec.

### PR0 — Research + spec stub (blocker)

- `research/roe-architecture.md`
- `research/roe-eval-cases.md`
- ROE stub in `agents-unified-model.md`

### PR1 — ROE validator core

- `scripts/validators/quotation-roe.sh` + `scripts/lib/roe-common.sh`
- Extend `subagent-gate.sh` routing
- Extend `parse-transcript.sh`: intent window extraction, window-scoped L2 (tool + result),
  write intent, promise-without-tool (4-condition), clarification patterns
- `modes.json`: `quotation-agent:roe: "block"`
- Gate tests + fixtures under `tests/fixtures/transcripts/`

### PR2 — Agent SOP + deploy

- SOP updates + `deploy-subagent-gate-skill.ps1` / seed / hot path

### PR3 — Eval + smoke + accurate P1

- Run eval; tune false positives; optional `accurate-roe.sh`

### PR4 — Spec finalize + rollout notes

- Full `agents-unified-model.md` § ROE
- Ops: read `subagent-gate-roe.log`; downgrade mode to `warn`

**Dependencies:** PR1 ← PR0; PR2 ← PR1; PR3 ← PR2; PR4 last.

**Out of this task:** AionUI promise-without-tool UI nudge (follow-up); `query.ts`
changes unless eval requires continuation counting.

## Acceptance Criteria

### MVP (Track A)

See [MVP acceptance criteria](#mvp-acceptance-criteria) above.

### Full (Track B)

- [ ] Executable write tasks do not end with text-only promises before Done
- [ ] Stop gate REJECT auto-continues without user「继续完成」
- [ ] Clarification (A/B/C) allows end_turn
- [ ] Pure price/inventory lookup not false-blocked
- [ ] Multi-step edit eval: write tool chain or L3 read-back passes
- [ ] Continuation cap + observable log
- [ ] `agents-unified-model.md` ROE §; gate SKILL updated
- [ ] Post-deploy Guid + delegate smoke PASS

## Out of Scope

- Replace entire agentic loop or new orchestration framework
- LLM-based Done judgment (rules + transcript + optional artifact read-back only)
- Remote price library task (`06-27-remote-shared-price-library`) — no dependency
- AionUI Tool Interrupt Banner extension (optional follow-up)

## Related Spec / Code

| Topic | Path |
|-------|------|
| Delivery gate precedent | `.trellis/spec/integration/agents-unified-model.md` |
| Auto-continue | `D:/claude-code-B/src/query.ts` L1558–1581 |
| Stop hook entry | `ccb-installer/config/skills/ccb-subagent-gate/scripts/subagent-gate.sh` |
| Legacy quotation MCP gate | `.../validators/quotation-mcp.sh` |
| Fill tool schema | `python/quotation/tool_schema.py` |
| Layer boundary | `.trellis/spec/outline.md` Rule 0 |

## Status

**Task created 2026-06-27.** MVP Track A M1–M7 shipped on dev machine 2026-06-27 (automated smoke PASS; manual Guid edit-order pending).

**Recommended path:** MVP (Track A) first — quotation Stop hook + SOP + 5 fixtures;
normative rules: 6-step order, intent window, L2 tool+result, narrow promise, true
clarification, structured block message.
**Full path (Track B):** PR0–PR4 below — expand after MVP green or when scope grows.
