# Execution Plan — `07-20-learn-by-data-select-first`

| Field | Value |
|-------|--------|
| **Status** | **completed** — Guid AC4 PASS 2026-07-20 |
| **Active phase** | closeout |
| **Parent** | `07-19-quotation-agent-prompt` |
| **Scenario** | **C** (bug / dual-doctrine + path thrash) with clear fix shape |
| **Plan depth** | **Standard** |
| **Verification profile** | **UI** (Guid smoke) + Standard contract tests |
| **Risk tags** | `ui` · `migration`(deploy skill/seed) |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| Phase -1 bootstrap | Shell: | `task.py current` → was `07-20-inventory-batch-multi-code`; `list --mine in_progress` → 49; `get_context --mode packages` → agent-eval/backend/frontend/integration; `git status -sb` → main ahead 34, dirty |
| trellis-before-dev | Read: | `.trellis/spec/integration/index.md` → agents-unified-model (learn-by-data §621+) · org-knowledge · agent-team |
| skill-selection | Read: | Scenario **C** → systematic-debugging first; TDD via Superpowers discipline at implement; no OpenSpec explore needed |
| systematic-debugging | Read: | Iron law Phase 1 → `research/root-cause-2026-07-20-learn-by-data.md` (R1 dual doctrine, R2 KB path, R3 select payload, R4 DIY) |
| trellis-task-execution | Read: | Contract→TDD→Verification; this plan |

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Spec inject | trellis-before-dev (Read) | available | inline |
| Debug | superpowers:systematic-debugging (Read) | available | inline research |
| TDD | node --test + optional pytest | available | Guid smoke only |
| Review | Agent: code-reviewer | available | Layer A N/A (no picker); Layer B N/A |
| Test gate | vitest/node --test (user gate: test-agent after review) | available | manual node --test |
| Deploy | deploy skill / seed scripts | available | manual copy to `%LOCALAPPDATA%\CCB-Wanding\.claude\skills\` |

**Plan depth rationale:** Two provisional contracts + existing SELECT_WIRE alignment; skill + contract test + Guid smoke — multi-workstream single-repo → **Standard** (not Full: no parallel D, no release J).

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | done | capability matrix + scenario C |
| Phase 0 | done | root-cause research + prd + plan |
| Phase 1 | **done** | skill select-first + KB path pin |
| Phase 2 | **done** | contract tests RED→GREEN; 7/7 PASS |
| Phase 3 | **done** | L1 `/learn-by-data` row updated + deploy-seed `-ForceMd` |
| Phase 4 | **PASS** | Guid PT. Jinse7.1：「按数据学习」→ parse → match → select → tiers；无 Bash；用户「这次还不错」 |
| Phase 5 | **done** | `agents-unified-model.md` learn-by-data § select-first note |
| code-review | **PASS** | Layer A N/A · Layer B N/A · Overall PASS |
| test gate | **PASS** | `node --test …quotation-agent-output-contract.test.mjs` → 7 pass |

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.QUOTE.SELECT_WIRE.001` | Normal + learn paths stay API-first; Read only on unable | `quotation-agent.md` · `quotation-learn-by-data/SKILL.md` | `quotation-agent-output-contract.test.mjs` + Guid | Dual doctrine regresses price lookup |
| `WANd.LEARN.SELECT_FIRST.001` | After successful `match_quotation_batch`, **1×** `select_quotation_candidates` with full `results`; `agent_pick_code` = select code when ok | `quotation-learn-by-data/SKILL.md` | skill string contract test + Guid View Steps | Partial select / rematch thrash |
| `WANd.LEARN.KB_PATH.001` | Fallback Read = `D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md` or `selection_context.knowledge_source`; forbid `.claude\vendor` invent + Bash find | skill + optional L1 learn row | contract anchors + Guid (0 Bash, 0 wrong path) | Read miss → DIY |
| `WANd.QUOTE.NO_DIY.001` | No Bash/find on learn surface | skill Hard rules | Guid smoke | Tool thrash |

### Contract cards

#### `WANd.LEARN.SELECT_FIRST.001`

**Behavior protected:** learn-by-data selection equals quotation select-API path; one select per successful batch with full `results`.
**Primary code:** `ccb-installer/packages/vertical/com.wanding.trade/skills/quotation-learn-by-data/SKILL.md`
**Tests:** extend `ccb-installer/scripts/__tests__/quotation-agent-output-contract.test.mjs` (or sibling skill contract test) to require select-first language and forbid 「第一次 batch 前 Read」.
**Eval / smoke:** Guid「按数据学习」on VANTSING filled sheet (user file or `data/smoke/learn-by-data-vantsing-filled.xlsx`).
**Risk if broken:** 21-tool thrash / blocked session / wrong agent_pick vs live quote.

#### `WANd.LEARN.KB_PATH.001`

**Behavior protected:** fallback knowledge Read hits the install shadow file, not a fabricated `.claude\vendor` path.
**Primary code:** same SKILL.md (+ L1 only if learn row lists path).
**Tests:** assert absolute path string present; assert forbid Bash / `.claude\vendor` wording.
**Eval / smoke:** Guid View Steps — Read path (if any) matches canonical; else select-only with no Read.
**Risk if broken:** Bash find DIY; empty knowledge; false Section A.

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 1 | P0 | Align skill §选型一致性 + per-row algo to select-first; pin KB path; reinforce No Bash | `WANd.LEARN.SELECT_FIRST.001` · `WANd.LEARN.KB_PATH.001` · `WANd.QUOTE.SELECT_WIRE.001` | ui · migration | trellis-implement after TDD | `quotation-learn-by-data/SKILL.md` (+ staging seed if separate) | Dual doctrine removed; path + select rules | Standard |
| 2 | P0 | Contract tests for skill/L1 anchors | `WANd.LEARN.SELECT_FIRST.001` · `WANd.LEARN.KB_PATH.001` | — | TDD | `quotation-agent-output-contract.test.mjs` (or new skill test) | RED then GREEN | Standard |
| 3 | P1 | L1 `/learn-by-data` row only if still Read-first / missing path | `WANd.QUOTE.SELECT_WIRE.001` | ui · migration | implement | `quotation-agent.md` packages+staging | Decision-table row consistent | Standard |
| 4 | — | Deploy skill (+ seed agents if L1) + Guid smoke | all above · `WANd.QUOTE.NO_DIY.001` | migration | deploy scripts | live `%LOCALAPPDATA%\…\skills\` | AC4 evidence | UI |
| 5 | P2 | Spec note in `agents-unified-model.md` learn-by-data § | docs-only after verify | — | trellis-update-spec | `.trellis/spec/integration/agents-unified-model.md` | select-first + path | Fast |

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| Skill contract test | `WANd.LEARN.SELECT_FIRST.001` | New asserts fail on current skill text (Read-before-batch / dual table) | `node --test ccb-installer/scripts/__tests__/quotation-agent-output-contract.test.mjs` (or dedicated skill test path recorded at implement) | existing learn-by-data / select_wire asserts still PASS |
| KB path asserts | `WANd.LEARN.KB_PATH.001` | Missing path / missing Bash forbid → fail | same GREEN | no false positive on `unable_to_select` Read allowance |
| Optional L1 | `WANd.QUOTE.SELECT_WIRE.001` | only if Phase 3 needed | same + deploy-seed | price-stock cases unchanged |

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| `WANd.LEARN.SELECT_FIRST.001` | Guid「按数据学习」+ View Steps: ≥1 batch then **1×** `select_quotation_candidates` (full results); comparison table | screenshot / step list | **PASS** Guid 2026-07-20 |
| `WANd.LEARN.KB_PATH.001` | same smoke: 0 Read under `.claude\vendor`; if Read, path = `D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md` | View Steps | **PASS**（无错路径 / 无 Bash） |
| `WANd.QUOTE.SELECT_WIRE.001` | contract test PASS; optional one normal price lookup still select-first | test log 7/7 | **PASS** |
| `WANd.QUOTE.NO_DIY.001` | Guid: 0 Bash/find on learn turn | View Steps | **PASS** |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-20-learn-by-data-select-first/execution-plan.md` | PASS | **PASS** (2026-07-20) |

**Gate order after「批准，执行」:** implement → **code-reviewer PASS** → test-agent / `node --test` PASS → deploy → Guid smoke → docs/spec.

## Parallel split

None (Scenario C, single owner). Do not parallel skill edit and unrelated parent L1 slim.

## Conditional recovery

| Trigger | Action |
|---------|--------|
| Guid still Read-first after skill deploy | Verify live skill file hash vs repo; re-run deploy; if needed add PostToolUse learn nudge (new child task — re-approve) |
| Select still partial payload | Strengthen skill JSON example + optional ROE/nudge; re-approve if new hook code |
| User wants Section A rule append | Separate confirmation; not this plan |
| Contract test cannot Read skill from packages path | Add small fixture reader; keep asserts in installer tests |

## Manual steps (UI)

1. Restart / reload Guid if needed after skill deploy.
2. Quotation Guid (or orch → quotation): attach VANTSING filled xlsx (user `PT. Jinse7.1` or smoke fixture).
3. Send「按数据学习」or `/learn-by-data`.
4. Confirm View Steps: `parse_excel_smart` → `match_quotation_batch` → **one** `select_quotation_candidates` → tables; no Bash; no `.claude\vendor` Read.
5. Spot-check 1–2 rows: agent_pick matches select code when status ok.

## Explicit non-goals

- Auto `append_business_rule` for Elbow/Tee preference
- Matcher zero-candidate recall
- Parent orch relay / L1 slim epic workstreams

## Approval gate

说 **「批准，执行」** 后再改 skill / tests / L1 / deploy。
