# Phase 3 CCB ACP Adapter Live Run

Date: 2026-07-15
Case: `quotation-direct50-price-stock`
Mode: hard-only, one isolated child trial
Versioned raw data: none
Local report: `D:\tmp\agent-eval-live-hard-only.json`

## Deterministic fixture result

The sanitized 11-update ACP fixture normalized into five standard Events:

1. `knowledge.read`
2. `quotation.match`
3. `inventory.query`
4. `assistant.table`
5. `session.completed`

All six hard graders passed. Because this Case requires current-host soft judgment and no judgment was submitted, the orchestration result was `NEEDS_REVIEW` with `judgment_status: pending` rather than a false `PASS`.

## Live result

The live Route B child completed in 44.17 seconds and was classified as business `FAIL`, not infrastructure `ERROR` or `BLOCKED`.

- Standard Events: one `assistant.table`; zero tool calls.
- `tool_presence`: `FAIL` (`MISSING_REQUIRED_ACTION`).
- `tool_forbidden`: `PASS` (`FORBIDDEN_ACTIONS_ABSENT`).
- `sequence`: `FAIL` (`SEQUENCE_MISSING_ACTION`).
- `tool_args`: `FAIL` (`TOOL_ARGS_MISMATCH`).
- `evidence_link`: `FAIL` (`EVIDENCE_LINK_MISMATCH`).
- `structured_output`: `FAIL` (`STRUCTURED_OUTPUT_MISSING_COLUMNS`).

The returned table reported that the expected business-data directory and quotation tools were unavailable and identified the session as the default router persona. The harness correctly refused to treat this explanation as proof that Read, quotation matching, or inventory lookup occurred.

## Adapter findings

- Route B must receive explicit `CCB_INSTALL_DIR` and `CCB_WANDING_CONFIG_DIR` child-process environment values.
- Missing `dist/cli.js` or bundled Bun is now caught by `validateEnvironment` and returns `BLOCKED` before process launch.
- The complete local Route B runtime for this verification was `D:\Projects\claude-code-best\ccb-installer`; the current `D:\CCB-Wanding` directory contained a backup dist but not a runnable root.
- Child work directories were removed after both successful collection and execution faults; the live report remained outside Git.

## Decision

P3 adapter/orchestration behavior is accepted. The fixture proves the intended golden evidence path can pass deterministically, while the live run exposes the current target-runtime/persona mismatch as a genuine failing evaluation to address separately. No grader was weakened to accommodate the live response.