# Safe contract-preserving quotation-agent prompt refactor

## Problem

`ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md` is high risk because it is not only wording. It contains runtime-facing business contracts for WanD quotation behavior:

- specialist identity and direct MCP boundary
- frontmatter MCP servers, skill wiring, model, and product hooks
- quotation / inventory / quotation sheet tool routing
- knowledge Read gates and post-tool output obligations
- multi-candidate selection behavior
- `/learn-by-data` workflow
- organization knowledge preview / confirmation workflow
- ROE write-operation rules and forbidden actions

The next modification must improve maintainability or MiniMax Chinese-model adherence without losing any existing business or technical logic.

## Goal

Create a safe execution plan for modifying `quotation-agent.md` that preserves every existing behavior contract and binds the change to eval / smoke verification.

This task does not authorize immediate prompt refactoring. Implementation starts only after `execution-plan.md` is approved.

## Non-goals

- No changes to `accurate-agent.md`.
- No changes to MCP tool implementation.
- No rewrite of hook scripts unless a failing verification proves the prompt cannot preserve behavior alone.
- No broad business rule redesign.
- No removal of duplicated-looking prompt rules until they are mapped to an eval, hook, spec, or explicit obsolete decision.

## Acceptance Criteria

- [ ] AC1: `research/quotation-agent-logic-inventory.md` lists the current `quotation-agent.md` business and technical logic before edits.
- [ ] AC2: Each proposed edit workstream maps to a contract id and one or more logic inventory rows.
- [ ] AC3: Execution plan includes RED/GREEN/REFACTOR guard or explicit TDD N/A reason for every workstream.
- [ ] AC4: Contract Verification includes schema validation, targeted quotation evals, hook/read-gate checks, and live/manual smoke gates where applicable.
- [ ] AC5: Any new permanent contract id is promoted to `.trellis/spec/integration/contracts/agent-runtime-registry.yml` or explicitly marked provisional.
- [ ] AC6: No implementation happens until the draft plan is approved.

## Canonical Files

- `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md`
- `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.aionui.json`
- `eval/agent_eval_cases.jsonl`
- `eval/suites/quotation-smoke.json`
- `.trellis/spec/integration/agent-team-architecture.md`
- `.trellis/spec/integration/agent-hooks-overview.md`
- `.trellis/spec/integration/agents-unified-model.md`
- `.trellis/spec/integration/work-routing-execution-contracts.md`
- `.trellis/spec/integration/contracts/agent-runtime-registry.yml`

## Safety Principle

When unsure whether a line is redundant or obsolete, keep it. The safe default is preservation, not compression.
