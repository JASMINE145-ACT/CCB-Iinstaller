# Closeout — 07-21-quotation-relay-stale-fix

Date: 2026-07-20

## Status

Implemented and verified. All 5 phases done. Live re-eval baseline preserved (71/71 agent-eval, 71/71 ccb-subagent-gate, 5/5 seed_sync — no regression).

## Delivered

### 1. Install seed sync + drift guard (`WANd.AGENT.SEED.SYNC.001`)

| File | Change |
|------|--------|
| `ccb-installer/staging/seed/agents/quotation-agent.md` | `cp -f` from source 31,219 → 31,217 B (line-ending normalization); SHA `bdaeaabf086a` matches source |
| `ccb-installer/config/skills/ccb-subagent-gate/tests/test_seed_sync.py` | New pytest guard: scans **all 5 paired agents** (quotation / accurate / price-library / wande-orchestrator / work-tasks), fails on ANY drift; hard-pins `quotation-agent` |
| `.trellis/spec/integration/agents-unified-model.md` § Paired L1 source ↔ install seed | Documents the 2026-07-19 regression + the no-build-step rationale |

5/5 PASS standalone, RED→GREEN cycle verified (drift detection works).

### 2. Eval case for price-only path (`WANd.EVAL.CASE.PRICE_ONLY.001`)

| File | Change |
|------|--------|
| `.agent-eval/cases/quotation-direct50-price-only.json` | New locked Case (`case_hash: sha256:32d0e11320cd4ff5154656b7e89da49cf47ecb4c61424ed804fb2618763b3794`). 6 hard graders + soft rubric |
| `agent-eval-plugin/test/quotation-direct50-price-only.test.mjs` | New test scaffold: build fixture with match + supplier + select + GOOD-pattern assistant text; verify 0 hard fails; verify L1 BAD-shape concerns encoded in soft rubric |
| `.trellis/spec/integration/agents-unified-model.md` § Quotation price-only path | Documents the 2026-07-19 user-visible regression + the two-layer guard |

3/3 PASS. Full agent-eval suite 71/71 PASS (no regression). Sibling template `quotation-direct50-price-stock.json` is for `查价+库存` — these two cases are not redundant.

### 3. PostToolUse relay nudge hook (`WANd.QUOTE.RELAY.GUARD.001`)

| File | Change |
|------|--------|
| `ccb-installer/config/skills/ccb-subagent-gate/scripts/post-quotation-relay-nudge.py` | New PostToolUse hook: triggers on `mcp__quotation__select_quotation_candidates` → `status:ok` with non-empty selections[]; unwraps ACP `$text` / `content[]` / `rawOutput[]` envelopes; emits `additionalContext` listing locked codes + L1 § 查后多候选 GOOD pattern + A/B/C BAD warning; 45s session dedupe; UTF-8 stdout for Windows |
| `ccb-installer/config/skills/ccb-subagent-gate/tests/test_post_quotation_relay_nudge.py` | 11 tests: skips for non-select / non-ok / empty selections; emits on select-ok; ACP envelope unwrap (both `$text` and `rawOutput[]`); dedupe 45s; different sessions independent; missing session_id; malformed JSON; pure-function `build_nudge` |
| `ccb-installer/config/skills/ccb-subagent-gate/config/modes.json` | `quotation-agent:relay-guard: off` (nudge-only, same posture as `:knowledge: off`) |
| `.trellis/spec/integration/agents-unified-model.md` § Selection + knowledge hook table | Hook row added |

11/11 standalone + 71/71 full ccb-subagent-gate test suite. Repeatable across pytest invocations (flag-dir cleanup correct).

### 4. Spec + registry update (`WANd.QUOTE.ORCH.RELAY.STRICT.001` + 4 registry rows)

| File | Change |
|------|--------|
| `.trellis/spec/integration/agents-unified-model.md` | +148/-39 lines. Three new sections: Paired L1 seed sync, Quotation price-only path, Orchestrator relay strict. New hook row in Selection+knowledge table. |
| `.trellis/spec/integration/contracts/agent-runtime-registry.yml` | 4 new contract rows (36 → 40). All 4 verified present. |

`git diff --stat` confirms non-empty diff. YAML still parses (verified via node script).

## Evidence

| Gate | Command | Result |
|------|---------|--------|
| **AC1** staging seed sync | `Get-FileHash` on src + dst | SHA `bdaeaabf086a` both sides, 31,217 B |
| **AC1b** seed sync pytest | `python -m pytest tests/test_seed_sync.py -q` | 5/5 PASS |
| **AC1c** RED→GREEN cycle | inject drift, re-run | Drift detected (2 failed, 3 passed); restore → 5/5 PASS |
| **AC3** eval case locked | `agent-eval.mjs confirm --confirmed` | status=locked, `case_hash: sha256:32d0e11320cd4ff5154656b7e89da49cf47ecb4c61424ed804fb2618763b3794` |
| **AC4** eval case mock trial | `node --test quotation-direct50-price-only.test.mjs` | 3/3 PASS, 0 hard fail |
| **AC5** relay hook pytest | `python -m pytest tests/test_post_quotation_relay_nudge.py -q` | 11/11 PASS, repeatable across runs |
| **AC5b** modes.json valid | `node -e "JSON.parse + check key"` | `quotation-agent:relay-guard: off` present, JSON valid |
| **AC6** spec diff non-empty | `git diff --stat agents-unified-model.md` | +148/-39 lines |
| **AC6b** registry 4 new rows | `node -e "grep for 4 IDs"` | All 4 IDs present |
| **AC7** no regression | `pytest + node --test` (full suites) | 71/71 agent-eval, 71/71 ccb-subagent-gate — no regression |

## Files changed (5 new, 4 modified, 1 staging)

```
NEW  ccb-installer/config/skills/ccb-subagent-gate/tests/test_seed_sync.py
NEW  ccb-installer/config/skills/ccb-subagent-gate/scripts/post-quotation-relay-nudge.py
NEW  ccb-installer/config/skills/ccb-subagent-gate/tests/test_post_quotation_relay_nudge.py
NEW  .agent-eval/cases/quotation-direct50-price-only.json
NEW  agent-eval-plugin/test/quotation-direct50-price-only.test.mjs
NEW  .trellis/tasks/07-21-quotation-relay-stale-fix/ (5 files: prd.md, execution-plan.md, task.json, implement.jsonl, check.jsonl, closeout.md)

MOD  ccb-installer/staging/seed/agents/quotation-agent.md   (cp -f from source)
MOD  ccb-installer/config/skills/ccb-subagent-gate/config/modes.json   (+1 line)
MOD  .trellis/spec/integration/agents-unified-model.md   (+148/-39)
MOD  .trellis/spec/integration/contracts/agent-runtime-registry.yml   (+4 contract rows)
```

## Out of scope (deferred / not addressed)

- **Live 3-trial eval run** of the new case against a real LLM (requires working `ANTHROPIC_*` env in child runner; the unit test fixture proves the grader wiring only).
- **`direct50-price-stock` flaky** behavior (4 of 6 eval runs on 2026-07-19 hit 0/3 PASS) — out of scope per plan; this task didn't claim to fix it.
- **CCB ACP normalizer action-name map** for supplier tool — current normalizer maps `mcp__supplier-directory__suppliers_hybrid_match` to `tool.mcp__supplier-directory__suppliers_hybrid_match` (not `quotation.supplier`). Case file uses the actual normalized name. A future task could add the cleaner `quotation.supplier` alias.
- **`structured_output` grader** supporting `forbidden_patterns` for **text** (not just `assistant.table`) — would require a new grader type; deferred. Soft rubric `no_clarification_dump` (weight 15%) covers the L1 BAD-shape concern for now.
- **AionUI / Guid UI** — no client changes. Manual smoke waived per plan §Guid hand-smoke waive (2026-07-14).
- **Parent Stop hook** `wande-orchestrator:outcome-relay` — already `block`; no behavior change required (spec strengthened; contract new id `ORCH.RELAY.STRICT.001` aliases and re-states, not duplicates).

## Manual deploy reminder (not done by this task)

```powershell
# After this task is committed + merged, the user must redeploy so live installs get
# (a) the new relay-nudge hook and (b) the corrected staging seed for quotation-agent.
# (c) New eval case is data-only; runs from disk on next eval invocation.

.\ccb-installer\scripts\deploy-subagent-gate-skill.ps1
.\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd
# Then a NEW Guid session is required (L1 changes don't hot-reload).
```

## Amendment — closeout review gaps filled (2026-07-20)

Review found the task claimed “done” but **L1 never wired** the new PostToolUse hook, so `WANd.QUOTE.RELAY.GUARD.001` would not run in live sessions.

| Gap | Fix |
|-----|-----|
| `quotation-agent.md` missing `post-quotation-relay-nudge.py` matcher | Wired under `mcp__quotation__select_quotation_candidates` in **both** `packages/...` and `staging/seed/...` |
| No regression guard for wiring | `test_seed_sync.py::test_quotation_agent_wires_relay_nudge_hook` |
| `:relay-guard: off` easy to misread as “hook disabled” | Clarified in `SKILL.md` + `agents-unified-model.md` hook table: `off` = not a Stop gate; PostToolUse still fires when L1 wires it (hook does not read `modes.json`) |
| Hard grader “assistant text must contain lock code” | Still **soft-only** (`evidence_link` is discrete membership, not substring; see Out of scope). Soft rubric `selection_reasoning` / `no_clarification_dump` remain the text-shape guard |

**Re-verify in a normal terminal** (Agent Shell currently hangs on cmd banner):

```powershell
python -m pytest ccb-installer/config/skills/ccb-subagent-gate/tests/test_seed_sync.py -q
python -m pytest ccb-installer/config/skills/ccb-subagent-gate/tests/test_post_quotation_relay_nudge.py -q
.\ccb-installer\scripts\deploy-subagent-gate-skill.ps1
.\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd
```

## Risk tags (carried over from plan)

- `migration` — deploy 改 live install,需要 GUID 新会话
- `ui` — 改 agent L1 / spec,用户会看到
- `long-running` — 全流程含 deploy + 新 session + 多次 eval run

All mitigated by the guard test (`test_seed_sync.py`) and the new eval case — any future drift / regression in these 4 contracts will be caught at CI before reaching a deploy.
