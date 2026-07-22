# Execution plan: 07-19-selection-api-and-evidence-harness

**Status:** in_progress — implementation gates passed; live eval r3 optional  
**Active phase:** Contract Verification / optional live eval r3  
**Scenario:** D (two independent workstreams: harness vs selection API; serial merge at L1 + live eval)  
**Repos:** claude-code-best  
**Spec entry:** `.trellis/spec/agent-eval/index.md` · `.trellis/spec/integration/agents-unified-model.md` · `.trellis/spec/backend/quotation-matching-engine.md`  
**Plan depth:** Standard  
**Verification profile:** Standard (+ live eval smoke)

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| Phase -1 bootstrap | Shell: | `task.py current` → was `07-19-eval-case-50-50-price-and-stock`; packages → agent-eval/backend/frontend/integration; git ahead 34 with dirty tree |
| trellis-before-dev | Read: | `.cursor/skills/trellis-before-dev/SKILL.md` → packages mode; read `.trellis/spec/agent-eval/index.md` (evidence_link / CCB golden path); `.trellis/spec/guides/index.md` entry pointers |
| trellis-task-execution | Read: | `.cursor/skills/trellis-task-execution/SKILL.md` + `skill-selection.md` §一/§二 (TDD=superpowers; Review=code-reviewer; Parallel=D merge rules) |
| openspec-explore | deferred | User deferred explore; requirements already locked in chat + r2 evidence — not Scenario E |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | done | capability matrix; task created |
| Phase 0 | done | MCP tool confirmed by user |
| Phase 1 | done | evidence_link aggregate + normalizer; unit GREEN |
| Phase 2 | done | `select_quotation_candidates` + coverage validation; unit GREEN |
| Phase 3 | done | L1 API-first + both Cases re-locked + deploy/sync |
| Contract Verification | mostly done | code-reviewer PASS; test-agent PASS; spec updated; live r3 pending |

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Requirements | trellis-brainstorm / this PRD | available | Main-session PRD (done in `prd.md`) |
| Research | trellis-research | available | Persist under `research/` if model/host choice unclear |
| TDD | superpowers:test-driven-development discipline | available (Read/Skill) | Inline RED→GREEN in main session |
| Implementation | trellis-implement / inline | available (inline on Cursor) | Main session after before-dev |
| Review | Superpowers `code-reviewer` subagent | available | Inline Layer A N/A check |
| Verify | agent-eval unit tests + live `agent-eval.mjs run` | available | — |
| Parallel | dispatching-parallel-agents + § merge | available | Serial Phase 1 then 2 if one operator |

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| WANd.EVAL.EVIDENCE_LINK.001 | evidence_link aggregates all events for an action; singular inventory/match shapes normalize to batch paths; over-query (inventory ⊄ table) still FAIL | `agent-eval-plugin/graders/shared.mjs`, `evidence-link.mjs`, `adapters/ccb-acp/event-normalizer.mjs` | `node --test agent-eval-plugin/test/graders.test.mjs agent-eval-plugin/test/ccb-acp-normalizer.test.mjs` | — |
| WANd.QUOTE.SELECT_API.001 | One structured selection call: candidates+knowledge → `{status, selections[]}` with codes+reasons; `unable_to_select` is a first-class status; code ∈ candidates; no ACP runtime / no inventory side effects | TBD MCP/HTTP under `mcp_servers/quotation-server/` or thin `python/` + tool registry | unit/contract: ok schema, out-of-candidate reject, unable_to_select payload | `external-api` |
| WANd.QUOTE.SELECT_WIRE.001 | L1 **API-first**: match → select API → (ok → lock) \|\| (unable_to_select/error → agent Read knowledge + §选型 fallback → lock) → inventory batch → table; no probe-then-drop; do **not** remove knowledge Read tool | `quotation-agent.md` + deploy seed | `quotation-agent-output-contract.test.mjs` (API-first + fallback clauses) + live Case tee50 | — |

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|--------|
| 0 | P0 | Activate + resolve open Qs (MCP vs HTTP; model key; knowledge size) | docs-only/no-runtime-contract | external-api | main session | `prd.md`, optional `research/selection-host.md` | answers written in plan notes | Fast |
| 1 | P0 | Harness evidence_link + normalizer | WANd.EVAL.EVIDENCE_LINK.001 | — | TDD → implement → code-reviewer | `shared.mjs`, `event-normalizer.mjs`, tests | unit GREEN; r2 Trial3 empty-array class of bug gone | Standard |
| 2 | P0 | Selection structured API | WANd.QUOTE.SELECT_API.001 | external-api | TDD → implement → code-reviewer | MCP/python module + registry | schema + reject tests GREEN; smoke one call | Standard |
| 3 | P1 | L1 wire + lock-code + live eval r3 | WANd.QUOTE.SELECT_WIRE.001 | — | implement → deploy-seed → eval run | `quotation-agent.md`, Case if needed | hard pass_at_3 ↑ vs r2; report path | Standard |

### Parallel / merge rules (Scenario D)

| Agent | Scope | Merge rule |
|-------|-------|------------|
| A | Phase 1 harness only (`agent-eval-plugin/**`) | Merge first; no L1 dependency |
| B | Phase 2 selection API (`mcp_servers/**` / `python/**`) | Independent of A; merge after or parallel |
| Main | Phase 3 L1 + live eval | **Serial after A+B green** — do not deploy L1 until both contracts unit-green |

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| Harness | WANd.EVAL.EVIDENCE_LINK.001 | Add failing tests: (1) two `inventory.query` events — singular `code` + batch `codes` — expression union non-empty; (2) last event singular must not wipe earlier batch; (3) over-query still FAIL | `node --test agent-eval-plugin/test/graders.test.mjs agent-eval-plugin/test/ccb-acp-normalizer.test.mjs` | same |
| Selection API | WANd.QUOTE.SELECT_API.001 | Failing contract test: out-of-candidate code rejected; response schema required fields | project test for new module (exact cmd recorded at implement) | same |
| L1 wire | WANd.QUOTE.SELECT_WIRE.001 | Contract test expects selection tool / step in multi-item SOP text | `node --test ccb-installer/scripts/__tests__/quotation-agent-output-contract.test.mjs` | same |

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| WANd.EVAL.EVIDENCE_LINK.001 | `node --test agent-eval-plugin/test/graders.test.mjs agent-eval-plugin/test/ccb-acp-normalizer.test.mjs` | PASS output | pending |
| WANd.QUOTE.SELECT_API.001 | unit/contract + one live smoke call with fixture candidates | PASS + sample JSON `{selections, reasons}` | pending |
| WANd.QUOTE.SELECT_WIRE.001 | deploy L1 → `node agent-eval-plugin/scripts/agent-eval.mjs run --case-file .agent-eval/cases/quotation-direct50-tee50-price-stock.json ... --trials 3 --run-id ...-r3` | report.md hard outcomes; compare to r2 | pending |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-19-selection-api-and-evidence-harness/execution-plan.md` | PASS | pending |

## Verification profile and gate

**Selected:** Standard

1. Contract Verification rows above (unit → API smoke → live eval)
2. Primary review: Superpowers `code-reviewer` after each implementation workstream (Phase 1, 2, 3)
3. Test agent / `node --test` only after code-reviewer PASS (user verification gate)
4. `trellis-update-spec` → agent-eval index + agents-unified-model selection note
5. `implement.jsonl` / `check.jsonl` curated; prd AC checked
6. `git commit` — only if user asks
7. `/trellis:finish-work`

## Manual steps (human)

- [ ] Confirm Open Questions (Phase 0): MCP tool vs HTTP; which model/key; knowledge size budget
- [ ] Optional UI smoke: one dual-item query in AionUi after L1 deploy (not blocking harness unit GREEN)

## Recovery and re-approval

| Trigger | Return to | Evidence / artifact update | Re-approval? |
|---------|-----------|----------------------------|--------------|
| Selection host choice changes (MCP↔HTTP) | Phase 0 | update `research/` + this plan Workstream 2 files | yes |
| Live eval still FAIL only on selection quality after harness GREEN | Phase 2/3 | do not re-open Case soften; fix select prompt/schema | no if within SELECT_API contract |
| Live eval FAIL due to evidence_link empty arrays again | Phase 1 | regression test from failing trace | no |
| Want to soften Case evidence bijection | stop | new task — out of scope here | yes |

## Defer / out of scope

- MCP ranking `default_selection` as primary selection engine
- Softening Case to allow inventory probe-then-drop
- General `agent.delegate` whitelist
- Soft Judgment for r2 Trial 2 alone (can run after harness+select land)

## Design notes (locked from chat)

- Selection = **structured API**, not second agent runtime; output = selection result + reason only.
- Complex rules stay LLM+knowledge; goal is **clean context**, not rule encoding into match sort.
- Harness fix must not loosen over-query FAIL (Trial 1 class).
- **API-first + agent fallback (2026-07-19):** quotation-agent **keeps** knowledge `Read` / 选型准则. Mainstream = selection API. Only when API returns `unable_to_select` (or unavailable) may agent Read + self-select, then lock codes. Happy path must not double-select after API ok.
