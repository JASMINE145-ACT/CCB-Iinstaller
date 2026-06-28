# ROE Universal In-Process Self-Check — Phase 1 MVP

> **2026-06-28 architecture:** Stop hook runs **rules only** (no external LLM/API).
> On block → `exit 2` + `reject_prompt` → CCB `stop_hook_blocking` auto-continue →
> **same in-process model** performs semantic self-check on next turn.

## Goal

Ship **one universal ROE gate** for all WanD Stop-hook agents. On `end_turn`,
rule-detect likely incompleteness in intent window; if blocked, inject structured
REJECT so the **main model** verifies completeness and continues in the same session.

**Code is agent-agnostic** (`generic-roe-judge.sh` + `parse_transcript_roe_judge.py`).
**Pilot:** all 5 Stop-hook agents at `modes.json` `{agent}:roe-judge: warn`.

Parent: `.trellis/tasks/06-27-result-oriented-execution/`

## Problem

Rule-based ROE (L2 tool success in window) passes when:

- A write tool succeeded but only partially satisfied the user request (e.g. user asked
  for N products, assistant answered K).
- Assistant reply looks complete in natural language but omits items, rows, or files.
- Tool ran with weak args but returned `is_error: false`.

Users still see **technically gated but semantically incomplete** stops. A judge layer
can ask: *given the user's original ask, is this turn's output complete and valid?*

## Naming (avoid PRD collision)

| Term in this task | Meaning |
|-------------------|---------|
| **L2 judge** | LLM semantic completeness / validity check (this MVP) |
| **L1 rules** | Structural tool-layer gates (Phase 2 — not in Phase 1) |
| **PRD L2** (parent ROE) | `tool_success` evidence — remains until Phase 2 merge |

In spec, prefer **Gate-J (semantic)** vs **Gate-R (structural)** when both exist.

## Architecture

```
User message(s) in intent window
        │
        ▼
   Model turn (text + tools)
        │
        ▼
   end_turn → Stop hook
        │
        ▼
   Existing ROE pre-checks (keep)
   • clarification pass (step 3)
   • no ROE scope / readonly (step 4)
   • N=5 escalation (step 5)
        │
        ▼
   ┌─────────────────────────────────────┐
   │  L2 Semantic Judge (NEW — Phase 1)   │
   │  Input: user_intent + output_bundle  │
   │  Output: PASS | FAIL + gaps[]        │
   └──────────────┬──────────────────────┘
                  │
         PASS ────┴──── FAIL
          │              │
       exit 0        exit 2 REJECT
                      → query.ts auto-continue
```

**Layer:** `ccb-subagent-gate` skill — same deploy path as parent ROE. **No**
`claude-code-B` / AionUI renderer changes in Phase 1 unless eval proves hook timeout
pressure.

**Not in scope:** nested `claude --continue` subprocess (new session). Judge is a
**single synchronous API call** inside Stop hook; continuation stays **exit 2** on
main session.

## L2 Judge contract

### Trigger (when to call judge)

Call L2 judge **only when all are true:**

1. `modes.json` → `{agent}:roe-judge` is `block` or `warn` (quotation first).
2. Intent window has **executable work scope** (not pure readonly lookup exempt).
3. Not true clarification (step 3 pass).
4. Not escalated at N=5 (step 5).
5. Phase 1: **no L1 hard gate** — judge runs even when parent rule ROE would also
   evaluate tool success (see §Interaction with parent ROE).

**Phase 1 simplification:** judge may run on every in-scope `end_turn` attempt (subject
to profile `readonly_exempt`). Optimize later.

### Input bundle (`output_bundle`)

Built from intent window transcript (not full session):

| Field | Source |
|-------|--------|
| `user_intent_text` | Most recent write-scoped user message(s) in window |
| `assistant_text` | Last assistant visible text in window |
| `tool_summary` | Tool names, key args (file_path, codes), success/fail one-liners |
| `file_artifacts` | Optional: paths/extensions mentioned or written in window |
| `agent_profile` | `quotation-agent` rubric snippet (optional Phase 1) |

Truncate for token budget; log hash of full window for audit.

### Judge prompt (normative intent)

> Based on the user's **original request** in this turn, review the assistant's
> **text output and file/tool outputs** in the intent window. Assess:
> **completeness** (all requested items/actions covered?), **integrity** (no obvious
> omissions or contradictions?), **validity** (outputs plausibly address the ask?).
> Respond with structured JSON only.

### Judge output (structured)

```json
{
  "verdict": "PASS" | "FAIL" | "UNCERTAIN",
  "completeness_score": 0.0,
  "gaps": ["用户要求 5 个品，仅回复 3 个", "未改第 9 行价格"],
  "evidence_refs": ["assistant_table_rows", "fill_quotation_sheet:ok"],
  "recommended_action": "continue" | "clarify"
}
```

| verdict | Phase 1 `block` mode | `warn` mode |
|---------|----------------------|-------------|
| PASS | exit 0 | exit 0 |
| FAIL | exit 2 + gaps in REJECT | exit 0 + warn log |
| UNCERTAIN | exit 2 (prefer false continue) | warn log only |

### Block message template (exit 2)

```text
REJECT: ROE semantic judge — output incomplete or invalid.
User intent: <preview>
Gaps: <gap1>; <gap2>
Review text and file/tool outputs in this turn; complete missing items or ask
structured clarification (A/B/C) if blocked.
Reason: l2_judge_fail
Window: <window_key> judge_block_count=<n>/5
```

## Interaction with parent ROE (Phase 1)

Parent `quotation-agent:roe` (rule-based) may remain **on** during Phase 1 pilot.

**Options (pick at implement — default A):**

| Option | Behavior |
|--------|----------|
| **A (default)** | Run **judge after** rule ROE pass only — judge adds semantic layer on top |
| **B** | Run judge **instead of** rule step-2 L2 tool pass for agents with `:roe-judge` |
| **C** | `roe-judge: block` + `roe: warn` — flip authority to judge |

Recommend **A** for Phase 1: keep rule gate for empty promises; judge catches partial
completion.

## MVP boundary (Phase 1 only)

```
Phase 1 MVP
├── `roe-judge.sh` + `parse_transcript_roe_judge.py` (or extend parse_transcript_roe.py)
├── Judge client: single API call (haiku / minimax-m3-mini — TBD in spike)
├── `config/roe-judge-profiles/quotation-agent.json` — rubric + readonly exempt
├── `modes.json` → `quotation-agent:roe-judge: "warn"` first, then `block`
├── subagent-gate.sh route for quotation-agent
├── 5+ fixtures: N/K products, partial fill, readonly exempt, clarification exempt, judge FAIL
├── Log: `.claude/logs/subagent-gate-roe-judge.log`
└── Smoke script or extend `smoke-roe-deploy.ps1`

Explicitly NOT Phase 1
├── L1 structural rules (intent→tool, required args) — Phase 2
├── L3 artifact read-back (xlsx cell proof)
├── accurate / orchestrator / office profiles
├── AionUI visible judge banner
└── Auto-generate profiles from MCP schema
```

## Phase 2 (deferred — L1 rules)

Per design discussion 2026-06-28:

- **L1 (Gate-R):** write-intent without tool, required tool args, tool failure — **hard,
  non-skippable**
- **L2 judge:** only after L1 pass
- Merge naming with parent PRD evidence levels in `agents-unified-model.md`

## Implementation plan (Phase 1)

| Step | Deliverable |
|------|-------------|
| J0 | Spike: judge API from bash hook within 120s timeout; model + env vars |
| J1 | `output_bundle` extractor from intent window (reuse `extract_intent_window`) |
| J2 | `roe_judge_evaluate()` → structured JSON verdict |
| J3 | `roe-judge.sh` + `subagent-gate.sh` routing + `modes.json` |
| J4 | Fixtures + `test_roe_judge_gate.py` |
| J5 | `quotation-agent:roe-judge: warn` deploy + smoke |
| J6 | Manual Guid smoke: multi-item price ask → judge catches K&lt;N |
| J7 | Spec stub in `agents-unified-model.md` § ROE Gate-J |

## Acceptance criteria (Phase 1)

- [ ] L2 judge runs on in-scope quotation `end_turn` (not on clarification / readonly exempt)
- [ ] Judge input includes user intent + assistant text + tool summary from intent window
- [ ] FAIL verdict → `exit 2` when mode `block`; structured REJECT with `gaps[]`
- [ ] PASS verdict → exit 0; turn ends normally
- [ ] `UNCERTAIN` policy documented and implemented consistently
- [ ] Logs to `subagent-gate-roe-judge.log` with verdict, gaps, latency_ms, model id
- [ ] N=5 escalation shared with parent ROE or separate counter (document choice)
- [ ] ≥5 automated fixtures green
- [ ] `warn` mode pilot on dev before `block`
- [ ] Parent task cross-link; no regression on existing `test_roe_gate.py`

## Known risk (Phase 1 — judge-only)

Without L1 structural gates, judge **may PASS** on「收到，马上处理」if the model
judge is lenient. Mitigations for Phase 1:

- Keep parent `quotation-agent:roe` **block** on (option A)
- Use cold/small judge model + strict JSON schema
- FAIL-biased prompt: «when in doubt, FAIL with gaps»
- Short pilot in `warn` mode with log review before `block`

## Eval scenarios (minimum)

| # | Scenario | Expected |
|---|----------|----------|
| 1 | User asks 5 products, assistant table shows 3 | judge FAIL |
| 2 | User asks 5 products, fill tool + table shows 5 | judge PASS |
| 3 | Pure price lookup, no write scope | judge skipped |
| 4 | Clarification A/B/C | judge skipped (step 3) |
| 5 | Assistant says «已完成» but no substantive output | judge FAIL |

## Related spec / code

| Topic | Path |
|-------|------|
| Parent ROE | `.trellis/tasks/06-27-result-oriented-execution/` |
| ROE § spec | `.trellis/spec/integration/agents-unified-model.md` |
| Stop hook stack | `ccb-installer/config/skills/ccb-subagent-gate/` |
| Intent window | `scripts/lib/parse_transcript_roe.py` |
| exit 2 continue | `D:/claude-code-B/src/query.ts` `stop_hook_blocking` |
| Deploy | `ccb-installer/scripts/deploy-subagent-gate-skill.ps1` |

## Status

**Task created 2026-06-28.** Phase 1 = L2 LLM judge MVP only; L1 structural rules
deferred to Phase 2 child or parent task extension.
