# PRD: Narrow selection API + evidence_link harness fix

## Goal

Fix two root causes behind flaky dual-item quotation eval (`quotation-direct50-tee50-price-stock` r2):

1. **Selection context pollution** — quotation-agent does match + semantic selection + inventory in one dirty session; selection drifts across trials.
2. **Harness evidence_link amplifier** — grader resolves only the last event per action and singular inventory/match shapes as empty arrays, so legitimate multi-call traces get mechanical FAIL.

## Problem evidence (r2)

| Trial | Hard | Real cause |
|-------|------|------------|
| 1 | FAIL evidence_provenance | Selected 2 codes, queried inventory for 3 (extra PPR tee) — true agent bug |
| 2 | All hard PASS / NEEDS_REVIEW | Clean path; proves capability exists |
| 3 | FAIL evidence_provenance with `source:[]` / `target:[]` | Second single match + single inventory; harness `.at(-1)` + path shape mismatch — harness bug amplifying agent drift |

## Requirements

### R1 — Dedicated selection structured API (primary) + agent Read fallback

- **Primary path — one structured call** (HTTP or MCP tool wrapping the same call): input = match candidates (+ keywords / customer_level) + business knowledge (path or excerpt loaded **inside** the API); output = `{ status, selections: [{ keywords, code, reason }], ... }` only.
- **Not** a second ACP/Claude Code agent session; **not** tool-looping; **not** inventory/supplier side effects.
- Selected `code` MUST be ∈ provided candidates (hard validation).
- Quotation-agent L1 **happy path**: match → **selection API** → lock codes → inventory (batch) → table; inventory codes must equal locked selection set.
- Complex semantic rules stay in knowledge + this LLM call (not re-encoded as MCP sort heuristics).

#### R1b — Conflict resolution: keep agent knowledge Read (fallback only)

**Do not remove** quotation-agent’s ability to `Read` business knowledge / selection SOP. That remains a **fallback**, not the mainstream path:

| Situation | Who selects |
|-----------|-------------|
| Selection API returns `status: ok` + codes | Use API result; **do not** re-Read knowledge for re-selection |
| Selection API returns `status: unable_to_select` (or equivalent: ambiguous / needs clarification / error) | Agent **may** Read knowledge + apply §选型准则, then lock codes |
| Selection API unavailable / timeout | Same as unable_to_select (fallback) |

Constraints on fallback:

- Fallback still ends in **锁码** before inventory; no probe-then-drop.
- Fallback must not become the default “always Read then select” habit — L1 must state **API first**.
- Eval Cases for dual-item happy path should expect selection API (or normalized action) when present; fallback path can be a separate Case later.

### R2 — Harness evidence_link fidelity

- Normalizer: lift singular `match_quotation` / `get_inventory_by_code` payloads into batch shapes (`results[0].candidates`, `input.codes`).
- `resolveEvidenceExpression`: aggregate **all** events for an action (union), not `.at(-1)` only.
- After fix: Trial-1-style over-query still FAIL (strict); Trial-3 empty-array mechanical FAIL gone; Trial-2 still PASS.
- Unit tests cover singular+batch aggregation and over-query FAIL.

## Acceptance criteria

- [x] Selection API contract documented + unit/contract tests (valid code ∈ candidates; reject out-of-candidate; `unable_to_select` status shape).
- [x] L1 / skill text: **API-first** selection; knowledge Read retained as **fallback only** when API unable/unavailable; lock-code after either path; deploy path noted.
- [x] evidence_link tests: aggregate multi inventory/match; singular `code` → `codes`; over-query still FAIL.
- [ ] Re-run locked Case `quotation-direct50-tee50-price-stock` 3 trials; hard pass_at_3 improves vs r2 (target ≥2/3 hard PASS before soft review); document residual selection fails separately from harness.
- [x] Spec updates: `.trellis/spec/agent-eval/index.md` + quotation selection note in integration agents model (API-first + fallback).

## Out of scope

- Encoding full oral-default catalog into MCP ranking (`default_selection` sort heuristics as primary fix).
- Softening Case evidence_link to allow probe-then-drop inventory codes.
- Migrating all legacy jsonl eval cases.
- Opening general `agent.delegate` for arbitrary sub-agents (selection is API, not delegate).

## Canonical files

| Area | Paths |
|------|--------|
| Harness | `agent-eval-plugin/graders/shared.mjs`, `evidence-link.mjs`, `adapters/ccb-acp/event-normalizer.mjs`, `test/graders.test.mjs`, `test/ccb-acp-normalizer.test.mjs` |
| Case | `.agent-eval/cases/quotation-direct50-tee50-price-stock.json` |
| Agent L1 | `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md` |
| Selection API (TBD in plan) | thin module under `mcp_servers/quotation-server/` **or** `python/` + MCP tool surface |
| Knowledge | `vendor/wanding/data/wanding_business_knowledge.md` (read-only input to selection) |

## Open questions (resolve in Phase 0 before implement)

1. Selection call host: MCP tool `select_quotation_candidates` vs standalone HTTP used by ACP route — prefer MCP for agent discoverability unless latency forbids.
2. Model/credentials for selection API: reuse Org/Claude key already available to quotation MCP host, or Cursor-host-only (eval vs production parity).
3. Knowledge payload: full file path Read inside API vs truncated sections — size/latency budget.

## Related tasks

- Parent context: `07-19-eval-case-50-50-price-and-stock` (Case locked; r2 FAIL)
- Eval plugin spine: `07-15-agent-eval-plugin-harness`
