# Agent Eval Plugin Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox notation for progress tracking.

**Goal:** Deliver an embedded, cross-host Agent Eval Plugin whose first end-to-end path evaluates CCB quotation behavior with deterministic evidence gates and judgment by the current host AI, without a second judge API.

**Architecture:** A dependency-light Node.js ESM Harness Core owns contracts, deterministic grading, case locking, metrics, reports, and Judge Packets. Thin host manifests/skills expose it to Claude Code, Codex, and Cursor. A CCB ACP adapter runs the target agent in an isolated child session and normalizes untruncated ACP updates into standard events. CCB-specific cases and business evidence rules live in the repository-local `.agent-eval/` pack.

**Tech Stack:** Node.js ESM, `node:test`, JSON/JSON Schema documents, ACP SDK 0.19.0 through the existing `ccb-installer` runtime, Markdown host skills, Trellis task artifacts.

**Global Constraints:** Preserve the existing `eval/` runner during migration; never allow soft judgment to override a failed hard gate; keep `FAIL`, `ERROR`, `BLOCKED`, and `NEEDS_REVIEW` distinct; keep raw traces and sensitive artifacts out of Git; use test-first RED/GREEN for every production function; do not patch the ACP bridge unless the Phase 0 live spike proves `rawOutput` is absent.

---

## Task 0: Establish the untruncated ACP evidence seam

**Files:**

- Create: `ccb-installer/lib/acp-update-recorder.mjs`
- Create: `ccb-installer/test/acp-update-recorder.test.mjs`
- Modify: `ccb-installer/test-native-acp-agent.mjs`
- Create: `.trellis/tasks/07-15-agent-eval-plugin-harness/research/phase-0-acp-raw-output-spike.md`
- Create: `agent-eval-plugin/test/fixtures/ccb-acp/tool-call-updates.jsonl`

- [x] **Step 0.1 — RED:** Add tests proving the recorder writes one complete JSON object per line, preserves `tool_call_update.rawOutput` beyond 3,000 characters, and redacts configured secret fields.
- [x] **Step 0.2 — Verify RED:** Run `node --test ccb-installer/test/acp-update-recorder.test.mjs`; expect module-not-found or missing-export failure for `acp-update-recorder.mjs`.
- [x] **Step 0.3 — GREEN:** Implement `createAcpUpdateRecorder({ filePath, redactKeys })` with `record(update)` and `close()`; write append-only UTF-8 JSONL without console truncation.
- [x] **Step 0.4 — Verify GREEN:** Run `node --test ccb-installer/test/acp-update-recorder.test.mjs`; expect all recorder tests to pass.
- [x] **Step 0.5 — Integrate:** In `test-native-acp-agent.mjs`, enable the recorder only when `CCB_TEST_EVENT_LOG` is set, record every raw `params.update` before display truncation, and close it in `finally`.
- [x] **Step 0.6 — Live spike:** Run the quotation prompt through the native ACP runner with `CCB_TEST_EVENT_LOG` targeting `$tmp`; verify completed match/inventory updates contain parseable, untruncated outputs. Persist exact command, environment fingerprint, observed keys, byte lengths, and conclusion in the research file.
- [x] **Step 0.7 — Freeze fixture:** Store a sanitized minimal JSONL fixture containing Read, match, inventory, assistant-table, and completion updates; verify no token, customer, or credential data remains.
- [x] **Step 0.8 — Contract checkpoint:** Live ACP contains complete `rawOutput`, so no bridge patch or snapshot fallback is needed; `evidence_link` remains a hard gate.

## Task 1: Scaffold the cross-host plugin and contract schemas

**Files:**

- Create: `agent-eval-plugin/package.json`
- Create: `agent-eval-plugin/.codex-plugin/plugin.json`
- Create: `agent-eval-plugin/.claude-plugin/plugin.json`
- Create: `agent-eval-plugin/.cursor-plugin/plugin.json`
- Create: `agent-eval-plugin/skills/agent-eval/SKILL.md`
- Create: `agent-eval-plugin/schemas/eval.case.v1.schema.json`
- Create: `agent-eval-plugin/schemas/eval.event.v1.schema.json`
- Create: `agent-eval-plugin/schemas/eval.trace.v1.schema.json`
- Create: `agent-eval-plugin/schemas/eval.judgment.v1.schema.json`
- Create: `agent-eval-plugin/schemas/eval.report.v1.schema.json`
- Create: `agent-eval-plugin/core/schema-validator.mjs`
- Create: `agent-eval-plugin/core/canonical-json.mjs`
- Create: `agent-eval-plugin/test/schema-contracts.test.mjs`

- [ ] **Step 1.1 — Scaffold:** Use the plugin-creator scaffold for `agent-eval-plugin` in the repository, without a personal marketplace entry; add Claude Code and Cursor manifests using the same name/version/skills path.
- [ ] **Step 1.2 — RED:** Add contract tests for valid/invalid Case, Event, Trace, Judgment, and Report objects plus canonical JSON key ordering and stable SHA-256 hashes.
- [ ] **Step 1.3 — Verify RED:** Run `npm test --prefix agent-eval-plugin`; expect missing schemas/validator/hash exports.
- [ ] **Step 1.4 — GREEN:** Add the five schema documents and implement `validateContract(schemaVersion, value)`, `canonicalStringify(value)`, and `sha256Canonical(value)` using Node built-ins.
- [ ] **Step 1.5 — Verify GREEN:** Run `npm test --prefix agent-eval-plugin`; expect schema and canonicalization tests green.
- [ ] **Step 1.6 — Validate manifests:** Run the plugin-creator validator for the Codex manifest and parse all three manifests in the contract test.

## Task 2: Implement case confirmation, locking, and project storage

**Files:**

- Create: `agent-eval-plugin/core/case-store.mjs`
- Create: `agent-eval-plugin/core/project-store.mjs`
- Create: `agent-eval-plugin/test/case-store.test.mjs`
- Create: `.agent-eval/config.json`
- Create: `.agent-eval/cases/quotation-direct50-price-stock.json`
- Create: `.agent-eval/suites/smoke.json`
- Modify: `.gitignore`

- [ ] **Step 2.1 — RED:** Test that a draft can be normalized and previewed, but cannot run before explicit confirmation; confirmation writes `case_hash`; mutation after locking is rejected; equivalent key ordering yields the same hash.
- [ ] **Step 2.2 — Verify RED:** Run `npm test --prefix agent-eval-plugin -- --test-name-pattern="case"`; expect missing case-store behavior.
- [ ] **Step 2.3 — GREEN:** Implement `createCaseDraft`, `confirmCase`, `verifyCaseLock`, and project store path resolution under `.agent-eval/`.
- [ ] **Step 2.4 — Add CCB pack:** Encode the golden sequence `knowledge.read -> quotation.match -> inventory.query -> assistant.table`, six hard graders, required current-AI rubrics, three trials, and read-only side-effect policy.
- [ ] **Step 2.5 — Ignore runtime data:** Ignore `.agent-eval/runs/`, `.agent-eval/reports/private/`, and raw artifacts while leaving versioned cases/suites visible.
- [ ] **Step 2.6 — Verify GREEN:** Run the focused case tests and `git check-ignore .agent-eval/runs/probe.json`; both must pass.

## Task 3: Normalize events and implement the six deterministic graders

**Files:**

- Create: `agent-eval-plugin/adapter-sdk/index.mjs`
- Create: `agent-eval-plugin/core/event-log.mjs`
- Create: `agent-eval-plugin/graders/index.mjs`
- Create: `agent-eval-plugin/graders/tool-presence.mjs`
- Create: `agent-eval-plugin/graders/tool-forbidden.mjs`
- Create: `agent-eval-plugin/graders/sequence.mjs`
- Create: `agent-eval-plugin/graders/tool-args.mjs`
- Create: `agent-eval-plugin/graders/evidence-link.mjs`
- Create: `agent-eval-plugin/graders/structured-output.mjs`
- Create: `agent-eval-plugin/test/event-log.test.mjs`
- Create: `agent-eval-plugin/test/graders.test.mjs`

- [ ] **Step 3.1 — RED events:** Test append-only sequence numbers, raw/derived provenance, valid event references, and rejection of derived success based only on assistant claims.
- [ ] **Step 3.2 — RED graders:** For each hard grader, add one passing fixture and at least one focused failure: missing tool, forbidden tool, wrong order, wrong args, inventory code outside match candidates, and malformed/inconsistent table.
- [ ] **Step 3.3 — Verify RED:** Run `npm test --prefix agent-eval-plugin`; expect missing event/grader implementations.
- [ ] **Step 3.4 — GREEN events:** Implement `createEventLog(traceId)` with `appendRaw`, `appendDerived`, and `snapshot`.
- [ ] **Step 3.5 — GREEN graders:** Implement the six registry entries returning `{ grader_id, severity, status, evidence_refs, reason_code, details }` without throwing for an Agent business failure.
- [ ] **Step 3.6 — Verify GREEN:** Run `npm test --prefix agent-eval-plugin`; expect all negative and positive grader cases green.

## Task 4: Build the CCB ACP adapter and golden deterministic run

**Files:**

- Create: `agent-eval-plugin/adapters/ccb-acp/index.mjs`
- Create: `agent-eval-plugin/adapters/ccb-acp/event-normalizer.mjs`
- Create: `agent-eval-plugin/adapters/ccb-acp/native-runner.mjs`
- Create: `agent-eval-plugin/test/ccb-acp-normalizer.test.mjs`
- Create: `agent-eval-plugin/test/ccb-golden-case.test.mjs`
- Create: `agent-eval-plugin/core/run-case.mjs`

- [ ] **Step 4.1 — RED normalizer:** Using the sanitized fixture, test mapping of Read, match input/output, inventory input/output, assistant text, raw refs, parent spans, failure updates, and completion.
- [ ] **Step 4.2 — RED orchestration:** Test adapter `validateEnvironment`, `startSession`, `sendPrompt`, `collectEvents`, `snapshotState`, and `cleanup` boundaries with a fixture transport; adapter faults must map to `ERROR`/`BLOCKED`, not `FAIL`.
- [ ] **Step 4.3 — Verify RED:** Run `npm test --prefix agent-eval-plugin -- --test-name-pattern="CCB|golden"`; expect missing adapter/orchestrator behavior.
- [ ] **Step 4.4 — GREEN:** Implement the normalizer, child-process transport, trace construction, cleanup reporting, and deterministic grading pipeline.
- [ ] **Step 4.5 — Golden negative matrix:** Prove each omitted/reordered/mismatched step fails with the intended reason code; prove the fixture golden path passes every hard grader.
- [ ] **Step 4.6 — Verify GREEN:** Run all plugin tests, then one live hard-only run against the isolated `quotation-agent` child session and save its report outside Git.

## Task 5: Add current-host judgment, reports, metrics, and baselines

**Files:**

- Create: `agent-eval-plugin/core/judge-packet.mjs`
- Create: `agent-eval-plugin/core/judgment.mjs`
- Create: `agent-eval-plugin/core/decision.mjs`
- Create: `agent-eval-plugin/core/metrics.mjs`
- Create: `agent-eval-plugin/core/baseline.mjs`
- Create: `agent-eval-plugin/core/report.mjs`
- Create: `agent-eval-plugin/report-templates/report.md`
- Create: `agent-eval-plugin/test/judgment.test.mjs`
- Create: `agent-eval-plugin/test/metrics-baseline.test.mjs`

- [ ] **Step 5.1 — RED judgment:** Test anonymized randomized batch packets, complete rubric coverage, score ranges, valid evidence refs, judge fingerprint, and hard-gate precedence.
- [ ] **Step 5.2 — RED hard-only:** Test that required soft rubrics without a judgment produce `NEEDS_REVIEW` plus `judgment_pending`, while hard-only cases can pass.
- [ ] **Step 5.3 — RED metrics/baseline:** Test pass@1, pass@3, pass^3, flaky rate, latency quantiles, explicit baseline promotion, and `NOT_COMPARABLE` soft deltas when fingerprints differ.
- [ ] **Step 5.4 — Verify RED:** Run focused judgment/metrics tests; expect missing implementations.
- [ ] **Step 5.5 — GREEN:** Implement packet generation, judgment validation, verdict decision, three-trial aggregation, Markdown/JSON reports, and explicit baseline promotion.
- [ ] **Step 5.6 — Verify GREEN:** Run all plugin tests and confirm a forced hard failure cannot be changed to PASS by a high soft score.

## Task 6: Deliver the Claude Code end-to-end wrapper

**Files:**

- Modify: `agent-eval-plugin/skills/agent-eval/SKILL.md`
- Create: `agent-eval-plugin/scripts/agent-eval.mjs`
- Create: `agent-eval-plugin/hosts/claude-code/README.md`
- Create: `agent-eval-plugin/test/host-wrapper-contract.test.mjs`
- Create: `agent-eval-plugin/test/e2e/claude-code-golden.test.mjs`
- Create: `agent-eval-plugin/README.md`

- [ ] **Step 6.1 — RED wrapper contract:** Test that the skill exposes create, confirm, run, review, report, and baseline operations and always delegates deterministic work to the same Core entry point.
- [ ] **Step 6.2 — GREEN wrapper:** Implement the internal script interface and skill instructions for natural-language Case drafting, explicit confirmation, isolated trials, Judge Packet submission, and report rendering.
- [ ] **Step 6.3 — E2E:** Run the golden quotation Case through Claude Code/CCB ACP with three trials; complete one batch current-AI judgment; save sanitized JSON and Markdown reports.
- [ ] **Step 6.4 — Failure E2E:** Run at least one deliberately invalid fixture/Case and verify a stable hard `FAIL` reason and evidence references.
- [ ] **Step 6.5 — Documentation:** Document install, create/confirm/run/review/report/baseline, hard-only behavior, privacy, troubleshooting, and the distinction between Plugin entry and internal script.

## Task 7: Migrate safely and complete cross-host v1 contracts

**Files:**

- Create: `agent-eval-plugin/core/legacy-import.mjs`
- Create: `agent-eval-plugin/test/legacy-import.test.mjs`
- Modify: `eval/agent_eval_cases.jsonl`
- Modify: `eval/README.md`
- Create: `agent-eval-plugin/hosts/codex/README.md`
- Create: `agent-eval-plugin/hosts/cursor/README.md`
- Create: `.trellis/tasks/07-15-agent-eval-plugin-harness/research/host-smoke-claude-code.md`
- Create: `.trellis/tasks/07-15-agent-eval-plugin-harness/research/host-smoke-codex.md`
- Create: `.trellis/tasks/07-15-agent-eval-plugin-harness/research/host-smoke-cursor.md`

- [ ] **Step 7.1 — RED importer:** Test non-destructive conversion of one legacy quotation Case and explicit retirement/translation of match-first assertions.
- [ ] **Step 7.2 — GREEN importer:** Implement read-only import producing new drafts without mutating source JSONL.
- [ ] **Step 7.3 — Align legacy assets:** Update only factually conflicting Read-first descriptions while preserving old runner compatibility; run its offline/smoke validation commands.
- [ ] **Step 7.4 — Cross-host contracts:** Validate all manifests, one shared Case/Report contract, and thin wrapper documentation for Codex/Cursor.
- [ ] **Step 7.5 — Human host smoke:** Record one Claude Code, Codex, and Cursor smoke. Do not claim automated conversational E2E for Cursor/Codex.
- [ ] **Step 7.6 — Full gate:** Run `npm test --prefix agent-eval-plugin`, recorder tests, legacy eval validation, plugin manifest validation, live golden E2E, secret scan of versioned fixtures/reports, and Trellis context validation.
- [ ] **Step 7.7 — Spec and closeout:** Update durable Trellis contracts, check PRD acceptance criteria, fill execution evidence, request the canonical code review, and only then finish the task.

---

## Plan self-review

- Every PRD acceptance criterion maps to Tasks 0–7.
- Every production function begins with a named RED test and an exact GREEN command.
- The ACP output uncertainty is resolved before evidence-link implementation.
- Claude Code is the only first-path automated host E2E; Codex/Cursor claims remain contract plus recorded human smoke.
- No task deletes or bulk-migrates the existing `eval/` assets.
- No placeholder markers are allowed in manifests, schemas, cases, tests, or documentation.
