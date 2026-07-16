# Agent Eval Plugin Code-Spec

> Authority for implementing or extending `agent-eval-plugin/` and project-local `.agent-eval/` packs. Product/design rationale remains in `Agent eval system/eval-harness-plugin-design.md`.

## Scenario: embedded evidence-based Agent evaluation

### 1. Scope / Trigger

Use this spec when changing Case contracts, deterministic graders, Runtime Adapters, current-host Judgment, reports, baselines, host wrappers, or legacy import. The product entry is a host Plugin/Skill, not a new user-facing Agent CLI. Core owns semantics; host wrappers and project Eval Packs do not copy them.

### 2. Signatures

Internal host operations:

```text
node scripts/agent-eval.mjs create   --input-file <json> [--output-file <json>]
node scripts/agent-eval.mjs confirm  --case-file <json> --confirmed [--output-file <json>]
node scripts/agent-eval.mjs run      --case-file <json> (--fixture <jsonl> | --runner-path ... --install-dir ... --config-dir ...) [--trials N]
node scripts/agent-eval.mjs review   --run-dir <dir> --judgments-file <json>
node scripts/agent-eval.mjs report   --run-dir <dir>
node scripts/agent-eval.mjs baseline --run-dir <dir> --fingerprints-file <json> --confirmed [--baseline-dir <dir>]
```

Core and Adapter signatures:

```js
runCase({ caseDefinition, adapter, traceId? })
runEvaluation({ caseDefinition, adapterFactory, trialCount?, runId?, judge? })
submitEvaluationJudgments({ state, caseDefinition?, judgments })

adapter = {
  id,
  validateEnvironment(context),
  startSession(context),
  sendPrompt(session, prompt, context),
  collectEvents(session, context),
  snapshotState(session, context),
  cleanup(session, context),
}
```

### 3. Contracts

- Case: only `status: locked` plus a valid canonical `case_hash` may run. Confirmation is explicit.
- Event: append-only `eval.event/v1`; raw or derived provenance is mandatory. Successful derived evidence cannot rely only on assistant claims.
- Hard graders: `tool_presence`, `tool_forbidden`, `sequence`, `tool_args`, `evidence_link`, and `structured_output`. A hard failure is final.
- CCB golden path: `knowledge.read -> quotation.match -> inventory.query -> assistant.table`. Inventory code must be in match candidates; table code, price, and inventory must equal tool evidence.
- Judge: the Core creates one anonymous randomized Packet only after target Trials finish. The current parent host submits all `eval.judgment/v1` records together. `batch.independent_trials` is always `false`; no second judge API is allowed.
- Report: `eval.report/v1` preserves deterministic grader results, Judgment records/fingerprint, Trace refs, and metrics. It cannot hide hard failures behind an aggregate score.
- Baseline: explicit promotion of a passing Report only. Hard deltas require matching target fingerprints; soft deltas additionally require the same Judge fingerprint and Rubric hash.
- Storage: `.agent-eval/runs/`, raw traces, and private reports are ignored. Confirmed Cases, Suites, Graders, and sanitized Baseline summaries may be versioned.
- Native CCB child environment: `CCB_TEST_INSTALL_DIR`, `CCB_TEST_CONFIG_DIR`, `CCB_INSTALL_DIR`, `CCB_WANDING_CONFIG_DIR`, `CCB_TEST_PROFILE`, `CCB_TEST_PROMPT`, `CCB_TEST_EVENT_LOG`, `CCB_TEST_TIMEOUT_MS`, and optional `CCB_TEST_ROUTE_ENTRY`/`CCB_TEST_ROUTE_PATH`.

### 4. Validation & Error Matrix

| Condition | Required result |
|-----------|-----------------|
| Draft, changed, or hash-mismatched Case | Reject before Adapter start |
| Agent omits/reorders/mismatches required evidence | `FAIL` with stable hard-grader reason code |
| Adapter child crashes or emits invalid trace | `ERROR`; do not count as Agent failure |
| Runtime, permission, config, or required data unavailable at preflight | `BLOCKED` |
| Hard gates pass but required current-host Judgment is absent | `NEEDS_REVIEW` + `judgment_status: pending` |
| Judgment omits rubric, exceeds 0–100, changes fingerprint, or cites unknown evidence | Reject Judgment batch |
| High soft score plus any hard failure | `FAIL`; hard gate wins |
| Target fingerprint mismatch vs Baseline | Hard and soft `NOT_COMPARABLE` |
| Judge/Rubric mismatch with matching target | Hard comparable; soft `NOT_COMPARABLE` |
| Native cleanup fails | `ERROR` with cleanup detail; never silently ignore residue |

### 5. Good / Base / Bad Cases

- Good: three isolated Trials each Read knowledge, match quotation, query a candidate code, and return an evidence-consistent table; one current-host batch Judgment completes the report.
- Base: hard gates pass in CI but no host AI is available; preserve evidence and return `NEEDS_REVIEW`, not fabricated `PASS`.
- Bad: the Agent explains that tools are unavailable and prints a status table without calling tools; this is not evidence and must fail presence, sequence, argument, link, and table graders.
- Bad infrastructure: Route B root lacks `dist/cli.js` or bundled Bun; preflight returns `BLOCKED` before spawning.

### 6. Tests Required

```powershell
npm test --prefix agent-eval-plugin
node --test ccb-installer/test/acp-update-recorder.test.mjs
node eval/run-agent-eval.mjs
node eval/run-agent-eval.mjs --suite smoke
python C:\Users\m1774\.codex\skills\.system\plugin-creator\scripts\validate_plugin.py agent-eval-plugin
```

Assertion points:

- fixture golden path passes all six hard graders; each negative mutation returns its named reason code;
- `FAIL`, `ERROR`, `BLOCKED`, and `NEEDS_REVIEW` remain distinct;
- three Trial metrics include pass@1, pass@3, pass^3, flaky, latency, tool calls, and `independent_trials:false`;
- wrapper `run -> review -> report` persists JSON/Markdown and a missing-tools wrapper run remains hard `FAIL`;
- legacy importer does not mutate JSONL and rejects `pass_if_any` instead of guessing semantics;
- all three host docs/manifests point to the same Skill/Core contract.

### 7. Wrong vs Correct

#### Wrong

```js
// Target Agent grades itself or wrapper calls another model.
const score = await judgeApi(trace)
return score > 80 ? 'PASS' : 'FAIL'
```

This loses session isolation, permits hard-failure override, and makes host results incomparable.

#### Correct

```js
const target = await runEvaluation({ caseDefinition, adapterFactory, judge })
// Current parent host reads target.state.judge_packet and submits one batch.
const final = submitEvaluationJudgments({ state: target.state, judgments })
```

Deterministic hard gates run first, the current host judges only filtered evidence, and Core validates every score, fingerprint, and evidence reference.

## Design Decisions

- One Core, thin host wrappers: avoids Cursor/Codex/Claude logic drift.
- Read-first is authoritative for the current CCB quotation contract. Legacy match-first text is retired without deleting legacy Case IDs.
- ACP `tool_call_update.rawOutput` is the evidence seam; do not patch the ACP bridge unless this field disappears in a verified target runtime.
- `candidate.confirm` is not a synthetic sequence event. Candidate selection is proven by evidence links from match output to inventory input and final table.
