# Execution Plan - `07-11-safe-quotation-agent-prompt-refactor`

| Field | Value |
|-------|-------|
| **Status** | in_progress |
| **Scenario** | G - behavior-preserving refactor |
| **Plan depth** | Full |
| **Verification profile** | Standard + live/manual quotation smoke |
| **Active phase** | P3 verification pending live/manual smoke |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| P0 | completed | PRD + baseline inventory + draft plan created; schema-only eval `node eval/run-agent-eval.mjs` -> loaded=80 selected=80 schema ok |
| P1 | completed | Characterization matrix retained from existing evals; manual gaps recorded and accepted for untouched sections |
| P2 | completed | Minimal P2B intro + one parse-only Excel route row; frontmatter SHA unchanged; see `research/p2b-edit-map.md` |
| P3 | in_progress | Static/schema verification passed; live ACP/manual smoke not run |

## Skills Invoked This Planning Session

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | `.agents/skills/trellis-task-execution/SKILL.md` read; plan uses Contract -> TDD -> Contract Verification and persists this file before implementation. |
| trellis-task-execution selection guide | Read: | `.agents/skills/trellis-task-execution/skill-selection.md` read; classified as Scenario G because this is behavior-preserving prompt refactor. |
| trellis-before-dev | Read: | `.agents/skills/trellis-before-dev/SKILL.md` read; `get_context.py --mode packages` returned single-repo with backend/frontend/integration layers. |
| integration specs | Read: | Read `agent-team-architecture.md`, `agent-hooks-overview.md`, `agents-unified-model.md`, `work-routing-execution-contracts.md`, and `contracts/agent-runtime-registry.yml`. |
| codebase inspection | Shell: | Inspected current `quotation-agent.md` headings/hooks and quotation eval ids in `eval/agent_eval_cases.jsonl`. |

## Task

**Task:** `07-11-safe-quotation-agent-prompt-refactor` - Safe contract-preserving quotation-agent prompt refactor

**Repos:** `claude-code-best`

**Spec entry:** `.trellis/spec/integration/agent-team-architecture.md`, `.trellis/spec/integration/agent-hooks-overview.md`

**Primary file:** `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md`

## Phase -1 - Capability Matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Task planning | `trellis-task-execution` | available | Inline plan in this file |
| Spec injection | `trellis-before-dev` | available | Read relevant `.trellis/spec/integration/**` manually |
| Characterization safety net | Existing eval runner + inventory | available | Manual transcript smoke and semantic checklist |
| Prompt implementation | Main-session scoped edits | available | No subagent split because one high-risk file |
| Review | `trellis-check` or inline contract review | available as skill/read path | Manual contract checklist against inventory and evals |
| Verification | `node eval/run-agent-eval.mjs` + targeted live cases | available; live run depends on local ACP/API | Schema-only plus manual smoke if live env unavailable |

## Contract Map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.ROUTING.ASSIGNMENT.001` | Router delegates quotation work; quotation specialist direct session uses MCP itself. | `wande-orchestrator.md`, `quotation-agent.md`, `agentSessionProfile.ts` | `orchestrator-quote-delegates`, `direct-quotation-card-no-delegation` | Wrong agent boundary, direct MCP leak, or specialist delegation loop |
| `WANd.ROUTING.REVIEWER.001` | Specialist Stop runs ROE delivery gate. | `quotation-agent.md`, `subagent-gate.sh` | ROE Stop hook smoke; eval semantic `must_not` rows | Tool succeeds but final answer is empty/non-compliant |
| `WANd.RUN.HOOK.001` | Knowledge Read gate before quotation match and subagent transcript parity. | `quotation-agent.md`, `hook_transcript.py`, subagent gate scripts | `quote-direct50-post-hook-golden`, `quote-tee50-post-hook-golden`, knowledge effectiveness offline cases | Ungrounded selection or infinite Read deny loop |
| `WANd.QUOTE.TOOL_ROUTE.001` provisional | Quotation, inventory, tiers, fill, and learn-by-data select the intended MCP/skill path. | `quotation-agent.md`, `eval/agent_eval_cases.jsonl` | targeted quote/inventory/fill/learn evals | Nonexistent tool calls, slow chains, broken quote sheets |
| `WANd.QUOTE.REPLY_SHAPE.001` provisional | Multi-candidate, tiers, org-rule preview, fill and price+stock responses remain usable and same-turn. | `quotation-agent.md`, Stop/PostToolUse hooks | golden quote cases, manual tiers/org preview smoke | Empty reply, A/B menu regression, missing confirmation |

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile | Notes |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|-------|
| P0 | P0 | Baseline logic inventory | docs-only/no-runtime-contract | high-risk prompt | Main session | `research/quotation-agent-logic-inventory.md` | Inventory rows covering frontmatter, hooks, tool routing, reply rules | Fast | Completed before any prompt edit |
| P1 | P0 | Characterization matrix | all contracts | eval coverage | Existing eval runner | `eval/agent_eval_cases.jsonl`, `eval/suites/quotation-smoke.json` | Chosen minimal eval set + gaps | Standard | Add missing eval only if a critical behavior lacks coverage |
| P2A | P0 | Frontmatter preservation check | `WANd.RUN.HOOK.001`, `WANd.ROUTING.REVIEWER.001` | runtime hooks | Manual diff + schema | `quotation-agent.md` | No frontmatter semantic changes unless separately approved | Standard | Keep no-BOM UTF-8 |
| P2B | P0 | Body structure cleanup | `WANd.QUOTE.TOOL_ROUTE.001`, `WANd.QUOTE.REPLY_SHAPE.001` | prompt behavior | Main session | `quotation-agent.md` | Chinese-first sections; no removed inventory rows | Standard | Small chunks; compare inventory rows after each chunk |
| P2C | P1 | Contract labels and eval anchors | all touched contracts | maintainability | Main session | `quotation-agent.md`, maybe specs | Inline `touches:`/contract wording if useful | Standard | Avoid overloading prompt with implementation metadata if it harms MiniMax adherence |
| P3 | P0 | Contract verification | all touched contracts | regression | Eval + hook tests + manual smoke | eval/scripts | Evidence table updated | Standard + smoke | Live cases require installed WanD/API |
| P4 | P1 | Spec/registry update | provisional contracts | traceability | trellis-update-spec / manual | `.trellis/spec/integration/**` | Promote or mark provisional no-op | Fast | Only if contracts become permanent |

## P2B Cleanup Boundary

P2B is a preservation refactor, not a rewrite. Allowed changes:

- Reorder sections so MiniMax sees identity, tool route, hard gates, then examples.
- Convert mixed English/Chinese wording into clearer Chinese while preserving code ids, tool names, paths, parameters, and forbidden clauses exactly.
- Move duplicate constraints closer to their relevant route table row if the duplicate remains represented in either the route row, hard-forbid summary, or reply-shape section.
- Add short contract/eval anchors only when they help future maintainers and do not distract the model.

Forbidden without separate approval:

- Deleting a hard constraint because it appears duplicated.
- Removing any tool name, hook implication, full path, parameter name, default, forbidden tool, or same-turn reply obligation.
- Merging two rules when their trigger conditions differ, such as pre-match vs post-match clarification, Path A vs Path C, org KB vs personal memory, or price-only vs price+stock.
- Changing frontmatter, MCP servers, hooks, skill list, or model pin.
- Compressing examples if the example guards a known regression case.

Implementation rule: every edited paragraph must map back to one or more rows in `research/quotation-agent-logic-inventory.md`. If a row cannot be mapped after cleanup, restore the wording or stop for re-approval.

## Manual Gap Register

These inventory rows currently have no strong automated eval anchor. They are accepted as manual-check gaps for this task unless P1 finds a cheap eval that can be added safely.

| Inventory row | Gap | Acceptance for this task |
|---------------|-----|--------------------------|
| B6 | Multi-tier `get_product_price_tiers` same-turn table/source behavior is mainly hook/manual covered. | Manual tiers smoke required if touched. |
| B11 | Image/screenshot quotation extraction depends on multimodal runtime. | Manual image smoke required if touched; no prompt edit may remove image-reading capability. |
| B20 | Candidate truncation/user-reject recovery has partial eval coverage only. | Manual candidate recovery checklist accepted. |
| B22 | >10-row quotation sheet insertion is tool/template behavior. | Manual large-sheet smoke accepted if fill section touched. |
| B23 | Excel post-fill read/verify/single-cell patch boundary is manual/tool-behavior heavy. | Manual sheet inspection accepted if excel section touched. |
| B14/B15 | Org KB preview/confirmation has offline knowledge-effectiveness support but limited live semantic assertion. | Manual org-rule preview smoke required if append_business_rule wording is touched. |

P3 may not mark these rows green from schema-only eval. It must either record the manual evidence or explicitly record that the relevant section was untouched.

Contract registry note: `WANd.QUOTE.*.001` ids stay provisional through P2. Decide promote vs keep provisional only after implementation and verification evidence exists.
## TDD Contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| P0 inventory | docs-only/no-runtime-contract | N/A - planning artifact; baseline is current source inspection | Inventory file exists and maps all major sections | Recheck `quotation-agent.md` headings and inventory rows |
| P1 characterization | `WANd.QUOTE.TOOL_ROUTE.001` | Existing evals are characterization tests; optional RED only if a missing behavior is discovered | `node eval/run-agent-eval.mjs` and targeted `--case` / `--suite quotation-smoke` when live env is available | Same eval commands after P2 |
| P2 prompt refactor | all touched contracts | Baseline schema/eval results before edit; if live unavailable, mark environment gap | `node eval/run-agent-eval.mjs` plus live targeted cases | Repeat exact command set after cleanup |
| P3 verification | all touched contracts | Any failing targeted eval blocks completion | All required commands PASS or environment gap recorded | No further prompt edits after green without rerun |

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| `WANd.ROUTING.ASSIGNMENT.001` | `node eval/run-agent-eval.mjs --run --case direct-quotation-card-no-delegation`; optional `--case orchestrator-quote-delegates` | Specialist direct uses MCP; router delegates via Agent | pending |
| `WANd.ROUTING.REVIEWER.001` | Live quote/fill smoke and Stop hook logs, or `subagent-gate.sh` test if available | ROE gate does not block valid output and blocks empty write promises | pending |
| `WANd.RUN.HOOK.001` | `node eval/run-agent-eval.mjs --run --case quote-direct50-post-hook-golden`; offline knowledge effectiveness cases | Read happens as required; no repeated/infinite deny loop | pending |
| `WANd.QUOTE.TOOL_ROUTE.001` | `node eval/run-agent-eval.mjs --run --case price-and-stock-single`; `--suite quotation-smoke` | Intended tools used; forbidden tools absent | pending |
| `WANd.QUOTE.REPLY_SHAPE.001` | Manual review of golden outputs for one recommendation + bullets, tiers table, org preview text | Same-turn usable response, no empty output | pending |

Schema-only baseline command:

```powershell
node eval/run-agent-eval.mjs
```

Recommended targeted live set:

```powershell
node eval/run-agent-eval.mjs --run --case direct-quotation-card-no-delegation
node eval/run-agent-eval.mjs --run --case quote-direct50-post-hook-golden
node eval/run-agent-eval.mjs --run --case quote-tee50-post-hook-golden
node eval/run-agent-eval.mjs --run --case price-and-stock-single
node eval/run-agent-eval.mjs --run --case quote-fill-output-requires-project-workspace
node eval/run-agent-eval.mjs --run --suite quotation-smoke
```

## Verification Gate

1. Contract Verification for every touched contract.
2. Primary review path: `trellis-check` or inline contract review against inventory.
3. Update this execution plan Progress snapshot with commands and results.
4. Promote new permanent contracts to registry/spec, or record `spec: no update`.
5. Update `implement.jsonl` and `check.jsonl`.
6. Do not commit unless the user explicitly asks.
7. Finish via Trellis only after verification evidence exists.

## Manual Steps

- [ ] Inspect final diff against `research/quotation-agent-logic-inventory.md`.
- [ ] Confirm no frontmatter hook/MCP/model/skill was removed accidentally.
- [ ] Live Guid card smoke: open WanD quotation specialist and ask direct price.
- [ ] Live sheet smoke: generate a quotation draft after a matched SKU.
- [ ] Live org-rule smoke if prompt changes touch `append_business_rule` wording.

## Recovery and Re-approval

| Trigger | Return to | Evidence / artifact update | Re-approval? |
|---------|-----------|----------------------------|--------------|
| Any inventory row has no home after refactor | P2B | Add mapping note or restore wording | No if behavior unchanged; yes if dropping behavior |
| Targeted eval fails after prompt edit | P2B | Record failing case and restore last chunk | No unless changing contract |
| Live ACP/API unavailable | P3 | Mark environment gap; run schema/offline checks; request user live run decision | Yes before declaring complete |
| New contract needed | P4 | Update registry/spec or keep provisional | Yes if behavior surface changes |
| Frontmatter diff appears | P2A | Explain exact hook/MCP/model/skill change | Yes |

## Defer / Out of Scope

- `accurate-agent.md` safe refactor.
- Runtime hook implementation changes.
- New MCP tools or tool descriptions.
- Prompt compression that sacrifices explicit business constraints.
