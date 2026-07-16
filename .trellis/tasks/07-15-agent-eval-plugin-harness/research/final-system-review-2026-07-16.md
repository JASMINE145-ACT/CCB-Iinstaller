# Agent Eval Plugin Final System Review

Date: 2026-07-16
Review type: implementation review and system audit
Classification: **Internal MVP**

## 1. Overall judgment

The shared Plugin/Core/Adapter/Eval-Pack architecture is executable and its deterministic fixture path is complete. Case locking, six hard graders, current-host batch Judgment, hard-only operation, status separation, reporting, baseline comparison, legacy coexistence, and three-host contract parity have automated evidence. It is not yet a deliverable product because the real CCB Route B target has not completed the golden business path, and the required Claude Code/Cursor human conversational smokes remain outstanding.

## 2. System map

| Module | Responsibility | Evidence | Judgment |
| --- | --- | --- | --- |
| `agent-eval-plugin/skills/agent-eval/` | Natural-language embedded host workflow | `SKILL.md`, three plugin manifests | Shared contract; not a user Agent CLI |
| `agent-eval-plugin/core/` | Case lock, orchestration, Judgment, metrics, Report, Baseline | Core modules and 56-test suite | Executable MVP authority |
| `agent-eval-plugin/graders/` | Six deterministic Case-specific hard gates | Positive golden fixture plus six named negative tests | Complete for first Case |
| `agent-eval-plugin/adapters/ccb-acp/` | Isolated CCB ACP execution and Event normalization | Fixture, native runner, live run | Adapter works; production target remains unhealthy |
| `.agent-eval/` | Project-local locked Case and pack configuration | Locked quotation Case | Correct Read-first source of truth |
| `eval/` | Legacy CCB eval assets | 80/80 schema validation; 16/16 smoke selection | Preserved non-destructively |

## 3. Main business flow

`Real user request -> current host drafts Case -> user confirms locked hash -> Adapter runs isolated target Trials -> ACP updates normalize to Events/Trace -> six hard graders -> optional current-host batch Judgment -> Report/Baseline -> user review`

The deterministic golden fixture closes this flow. The live target breaks at target-runtime execution: the earlier live run emitted zero business tool calls and returned a default-router explanation; the final 90-second run exited with code 1 and was correctly reported as infrastructure `ERROR` without a Judge Packet.

## 4. Review fixes implemented

| Priority | Confirmed finding | Fix and evidence |
| --- | --- | --- |
| P0 | No-Judge execution attempted to build a Packet and the script fabricated default Judge identity | Hard-only now emits `NEEDS_REVIEW`, keeps `judgment_pending`, creates no Packet, and never invents host/model/version; Core and child-process tests pass |
| P1 | Baseline compare existed only in Core; null fingerprints could compare equal | Shared host operation now compares or explicitly promotes, persists JSON/Markdown deltas, rejects missing target fingerprints, and separates unavailable/mismatched Judge fingerprints |
| P1 | Trace omitted required reproducibility metadata | Trace records Adapter version and Prompt Hash; unknown Agent/model/Skill/knowledge/tool/environment values are `null` with reasons |
| P1 | `ERROR/BLOCKED` reasons disappeared from Report | Report now includes per-Trial outcomes and bounded stable error codes without stdout/stderr |
| P1 | Reused hard-only output directories could retain a stale Judge Packet | `saveRun` removes the scoped stale Packet when current state has none |
| P1 | Mixed pending and infrastructure-fault Trials could become permanently unreviewable | Only pending evidence Trials enter the batch; fault Trials retain their Verdict and the Run completes |
| P1 | Judge evidence lacked an injection boundary | Packet and Skill mark evidence as untrusted data and require embedded instructions to be ignored |

## 5. Remaining risks

| Priority | Risk | Evidence | Required next step |
| --- | --- | --- | --- |
| P0 | Real quotation Agent has not passed Read -> match -> inventory -> table | `phase-3-ccb-adapter-live-run.md`; `D:\tmp\agent-eval-final-live2-20260716` is `ERROR/CHILD_EXIT(1)` | Fix target profile/runtime/tool availability, then rerun the locked Case without weakening graders |
| P1 | Claude Code and Cursor conversational host smokes are not complete | PRD and execution-plan checkboxes remain open | Load the plugin in each host and record natural-language create/confirm/run/review/report evidence |
| P1 | `write_file` and `external_side_effect` Cases have no second execution-approval boundary | Case schema accepts the risk levels; only `read_only` CCB is verified | Before adding such Adapters, require explicit execution approval and Adapter capability policy |
| P1 | Business PII/tool-output sanitization is not configurable | ACP recorder redacts named secret keys; raw/private traces are only protected by ignored storage | Add project redaction policy before using customer-bearing production traces |
| P2 | Native target fingerprints are often unavailable and Baseline inputs remain externally supplied | Trace now reports honest nulls; promotion rejects incomplete target fingerprints | Add Adapter-owned hash collection for Agent, knowledge, tools, and environment |
| P2 | One parent conversation judges the whole batch | Reports correctly set `independent_trials:false` | Keep limitation visible; use human/independent review when statistical independence matters |

## 6. Verification evidence

| Gate | Result |
| --- | --- |
| Plugin unit/contract/E2E | 57/57 PASS |
| ACP complete-output recorder | 3/3 PASS |
| Legacy eval schema | 80/80 PASS |
| Legacy smoke selection | 16/16 PASS |
| Official plugin validator | PASS |
| Trellis context | implement 8 entries; check 7 entries; validation PASS |
| Real Route B hard-only | Harness PASS as failure classifier/cleanup; target result `ERROR`, no Packet, no residue |

## 7. Delivery decision

Keep the Trellis task `in_progress`. The automated Internal MVP is ready to commit, but task closeout and product-ready claims are blocked by the real target-Agent golden run and the outstanding human host smokes.
