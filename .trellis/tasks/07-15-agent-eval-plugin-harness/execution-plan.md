# Execution Plan — `07-15-agent-eval-plugin-harness`

| Field | Value |
|-------|-------|
| **Status** | in_progress |
| **Approved** | 2026-07-15 — user said “提交 执行” |
| **Scenario** | A — standard feature |
| **Plan depth** | Standard |
| **Verification profile** | Standard, with Claude Code live E2E and three manual host smokes at v1 closeout |
| **Active phase** | P4 — current-host judgment, reports, metrics, and baselines |
| **Detailed TDD plan** | `docs/superpowers/plans/2026-07-15-agent-eval-plugin-harness.md` |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Design | completed | `Agent eval system/eval-harness-plugin-design.md`; commit `ad4ec09e` |
| P0 ACP evidence | completed | Recorder RED/GREEN 3/3; full match output 5,301 chars; inventory output captured; sanitized 11-line fixture; `research/phase-0-acp-raw-output-spike.md` |
| P1 contracts/storage | completed | 12/12 tests; three host manifests; five schemas; stable Case lock; CCB golden Case; plugin validator PASS |
| P2 events/graders | completed | 22/22 tests; append-only provenance; six positive/negative hard graders; locked evidence paths |
| P3 CCB adapter | completed | 32/32 tests; fixture six-gate pass; live hard-only business FAIL with zero tool calls |
| P4 judgment/reporting | in_progress | Current-host Judge Packet contracts, decision, metrics, baseline, and reports |
| P5 Claude Code MVP | pending | Pending three-trial E2E |
| P6 migration/cross-host | pending | Pending legacy import and Codex/Cursor contract plus smoke |
| Gate | pending | Pending primary review, contract verification, spec update, PRD closeout |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-before-dev | Read: | Loaded `.trellis/spec/index.md`, workflow, backend/frontend/integration entries, and task PRD before design/planning |
| trellis-task-execution | Read: | Classified Scenario A/Standard and produced this contract/TDD execution artifact |
| superpowers:writing-plans | Read: | Produced the self-contained task checklist at the detailed TDD plan path |
| superpowers:test-driven-development | Read: | Every implementation workstream has explicit RED, observed-failure, minimal GREEN, and regression commands |
| plugin-creator | Read: | Plugin scaffold/manifest validation is bound to P1; no personal marketplace mutation is planned |
| superpowers:executing-plans | Read: | Phased execution, checkpoints, and stop-on-blocker rules are encoded here |
| superpowers:using-git-worktrees | Read: | Main is dirty; execution is isolated on a feature worktree before production edits |
| superpowers:systematic-debugging | Read: | Traced the lone evidence-link failure to three locked Case paths missing the standard Event `output` segment; regenerated and re-locked the Case without weakening the grader |

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Executable fallback |
|------------|----------------|--------|---------------------|
| Requirements/design | Trellis brainstorm + approved design | available/completed | Main-session design artifact |
| Planning | Trellis task execution + writing-plans | available/completed | N/A |
| Implementation | Inline executing-plans | available | Inline work is required because no subagent delegation was requested |
| TDD | superpowers:test-driven-development | available | N/A |
| Plugin scaffold | plugin-creator scripts | available | Hand scaffold only if generator cannot target this repository, followed by the same validator |
| Review | Trellis check | available | Inline spec review plus exact verification commands |
| Finish verification | verification-before-completion | available | Trellis contract verification evidence |

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.EVAL.CASE_LOCK.001` | Only an explicitly confirmed, hash-locked Case can run. | `agent-eval-plugin/core/case-store.mjs` | `case-store.test.mjs` | Wrong criteria evaluated or mutated mid-run |
| `WANd.EVAL.HARD_GATE.001` | Six deterministic graders are evidence-based and cannot be overridden by soft judgment. | `agent-eval-plugin/graders/`, `core/decision.mjs` | `graders.test.mjs`, `judgment.test.mjs` | False PASS for broken business behavior |
| `WANd.EVAL.TRACE.001` | Adapter events are append-only, attributable, complete enough for evidence links, and sanitized. | `adapter-sdk/`, `adapters/ccb-acp/`, recorder | recorder, event-log, normalizer tests; live ACP spike | Missing/truncated evidence or sensitive-data leak |
| `WANd.EVAL.CCB_QUOTE.001` | CCB quotation follows Read → match → inventory → evidence-consistent table. | `.agent-eval/cases/...`, CCB adapter | golden and six negative-path tests; live E2E | Incorrect quote/inventory response |
| `WANd.EVAL.JUDGE.001` | Current-host judgment is fingerprinted, batched, schema-checked, and subordinate to hard gates. | `core/judge-packet.mjs`, `judgment.mjs` | judgment tests; Claude Code E2E | Biased/untraceable soft score or hard-gate override |
| `WANd.EVAL.STATUS.001` | Agent failures remain distinct from adapter errors, blocks, and pending review. | `core/run-case.mjs`, `decision.mjs` | orchestration and hard-only tests | Misdiagnosis and invalid metrics |
| `WANd.EVAL.METRIC.001` | Three-trial reliability and baselines use correct comparability rules. | `core/metrics.mjs`, `baseline.mjs` | metrics/baseline tests | Misleading regression claims |
| `WANd.EVAL.HOST.001` | Claude/Codex/Cursor expose one Core contract through thin wrappers. | plugin manifests and skill | manifest/host contract tests; recorded smokes | Host-specific logic drift |

## Phase workstreams

| Phase | Priority | Workstream | touches | Risk | Execution | Required output |
|-------|----------|------------|---------|------|-----------|-----------------|
| P0 | P0 | ACP raw event recorder and live spike | `WANd.EVAL.TRACE.001` | evidence completeness | TDD inline | Full JSONL recorder, sanitized fixture, written spike verdict |
| P1 | P0 | Plugin scaffold, schemas, case lock, storage | `WANd.EVAL.CASE_LOCK.001`, `WANd.EVAL.HOST.001` | contract drift | TDD inline + plugin validator | Three manifests, five schemas, stable hash, CCB pack skeleton |
| P2 | P0 | Event model and six hard graders | `WANd.EVAL.HARD_GATE.001`, `WANd.EVAL.TRACE.001` | false PASS | TDD inline | Positive and negative deterministic test matrix |
| P3 | P0 | CCB ACP adapter and golden Case | `WANd.EVAL.CCB_QUOTE.001`, `WANd.EVAL.STATUS.001` | runtime integration | TDD inline | Fixture pass, negative failures, live hard-only report |
| P4 | P1 | Judge Packet, decision, metrics, baseline, report | `WANd.EVAL.JUDGE.001`, `WANd.EVAL.METRIC.001` | soft-score comparability | TDD inline | Batch judgment and three-trial reports |
| P5 | P1 | Claude Code wrapper E2E | `WANd.EVAL.HOST.001` | host integration | executing-plans checkpoint | Natural-language create/confirm/run/review/report flow |
| P6 | P2 | Legacy import and cross-host v1 | `WANd.EVAL.HOST.001`, `WANd.EVAL.CCB_QUOTE.001` | migration | TDD inline + manual smoke | Non-destructive importer and three host smoke records |

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| ACP recorder | `WANd.EVAL.TRACE.001` | Missing recorder module/export | `node --test ccb-installer/test/acp-update-recorder.test.mjs` | Same command plus live JSONL parse |
| Schemas/case lock | `WANd.EVAL.CASE_LOCK.001` | Invalid contracts accepted or no stable hash | `npm test --prefix agent-eval-plugin` | Full plugin test suite |
| Events/graders | `WANd.EVAL.HARD_GATE.001` | Six named negative fixtures do not fail correctly | `npm test --prefix agent-eval-plugin` | Full plugin test suite |
| CCB adapter | `WANd.EVAL.TRACE.001`, `WANd.EVAL.CCB_QUOTE.001` | Fixture updates cannot normalize/grade | `npm test --prefix agent-eval-plugin` | Fixture plus live hard-only run |
| Judgment/status | `WANd.EVAL.JUDGE.001`, `WANd.EVAL.STATUS.001` | High soft score overrides hard failure or hard-only returns PASS | `npm test --prefix agent-eval-plugin` | Full plugin test suite |
| Metrics/baseline | `WANd.EVAL.METRIC.001` | Incorrect pass^3/comparability | `npm test --prefix agent-eval-plugin` | Full plugin test suite |
| Host wrappers/import | `WANd.EVAL.HOST.001` | Manifests diverge or importer mutates legacy file | `npm test --prefix agent-eval-plugin` | Plugin validation + legacy eval validation |

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| `WANd.EVAL.CASE_LOCK.001` | `npm test --prefix agent-eval-plugin` | Stable hash, explicit confirmation, mutation rejection, safe path, locked CCB Case | complete |
| `WANd.EVAL.HARD_GATE.001` | `npm test --prefix agent-eval-plugin` | Six hard graders PASS golden evidence; six focused negative reason codes | grader layer complete; decision precedence pending |
| `WANd.EVAL.TRACE.001` | recorder, normalizer, native transport, and live hard-only run | 32/32 plugin tests; full tool inputs/outputs normalized; child cleanup verified | P3 complete |
| `WANd.EVAL.CCB_QUOTE.001` | fixture golden test + live quotation run | Fixture passes all six hard gates; live run correctly FAILS with zero tool calls | P3 complete; target runtime/persona remains a product issue |
| `WANd.EVAL.JUDGE.001` | judgment tests + one batch host judgment | Fingerprint/rubric hash and `independent_trials:false` | pending |
| `WANd.EVAL.STATUS.001` | orchestration/hard-only tests | FAIL/ERROR/BLOCKED/NEEDS_REVIEW matrix | pending |
| `WANd.EVAL.METRIC.001` | metrics/baseline tests | pass@1/pass@3/pass^3/flaky and comparability | pending |
| `WANd.EVAL.HOST.001` | manifest contract tests + host smoke records | Three manifests share name/version/Skill; official Codex validator PASS | contract complete; host smokes pending |

## Verification gate

1. Run recorder and complete plugin unit/contract/integration tests.
2. Run the existing eval validation/smoke path to prove non-destructive migration.
3. Run one live Claude Code/CCB ACP golden three-trial E2E and one hard-failure E2E.
4. Validate Codex, Claude Code, and Cursor manifests; record the three host smokes.
5. Use Trellis check as the primary spec-compliance review.
6. Invoke `superpowers:verification-before-completion`; attach fresh command results here.
7. Update `.trellis/spec/` with permanent contracts and complete `implement.jsonl`, `check.jsonl`, and PRD checkboxes.
8. Commit only the task-scoped files, as already authorized by the user.
9. Finish the Trellis task only when all required evidence is present.

## Manual steps

- [ ] Claude Code: install/load plugin and complete natural-language create → confirm → run → batch review → report.
- [ ] Codex: load the same plugin/skill and confirm Case/Report contract visibility.
- [ ] Cursor: load the same plugin/skill and confirm Case/Report contract visibility.

## Recovery and re-approval

| Trigger | Return to | Evidence/artifact update | Re-approval? |
|---------|-----------|--------------------------|--------------|
| Live ACP does not expose complete `rawOutput` | P0/design | Spike report and revised bridge/snapshot design | Yes, architecture changes |
| A hard grader cannot be expressed from raw evidence | P2/design | Testability gap and proposed event/adapter change | Yes, if criteria weaken |
| Same implementation/test failure occurs twice | Owning phase | Root-cause record using systematic debugging | No if scope/contract unchanged |
| Existing legacy eval breaks | P6 | Compatibility failure and rollback diff | Yes if migration approach changes |
| Host cannot load shared skill contract | P5/P6 | Host-specific limitation and wrapper proposal | Yes if wrapper gains business logic |

## Defer / out of scope

- Web dashboard, cloud service, production trace sampling, and public benchmark packs.
- A second LLM Judge API.
- Runtime adapters other than CCB ACP.
- Automated conversational E2E claims for Codex/Cursor.
- Automatic baseline overwrite or bulk deletion/migration of `eval/`.
