# Quotation MCP Warmup Standardization Blueprint

> Status: proposed. This is a decision record; it does not approve runtime changes.

## Decision

This is a budget-contract defect, not a quotation matching defect or a generic CPU incident.

```text
quotation warm completes: 90,696 ms (PASS)
desktop wrapper deadline: 90,000 ms (kills child)
user result: soft_ready + "MCP warm exceeded 90s"
```

The fixed main line is:

1. Close the outer/inner timeout race.
2. Establish and test a reusable warmup-budget contract.
3. Optimize cold start only when measurement shows the new contract is still insufficient.

Never hide the banner, turn a real failure into PASS, or change quotation matching in P0.

## Three-timer contract

| Timer | Meaning | Owner | Quotation initial value |
|---|---|---|---|
| `work_budget_ms` | Child may initialize and complete its required warm call. | warm script/capability | 120,000 ms |
| `wrapper_deadline_ms` | Electron waits for the child result, including output-drain and scheduler grace. | AionUI readiness wrapper | 130,000 ms |
| `probe_timeout_ms` | Deep health probe waits for the equivalent cold path. | health manifest | 120,000 ms |

`grace_ms=10,000` is not extra MCP work time. It prevents a parent from killing a child that has completed its work but has not emitted or drained its PASS line.

### Required invariants

1. `wrapper_deadline_ms >= work_budget_ms + grace_ms`.
2. `probe_timeout_ms >= work_budget_ms` when the probe calls the same cold path.
3. Result rows always retain `server`, `ok`, `ms`, and a non-empty failure detail.
4. Parent timeout preserves already emitted PASS rows; only unfinished servers become timeout failures.
5. PASS produces `mcp_ok=true`; genuine quotation failure produces `soft_ready` with precise detail.

## Execution lanes

| Lane | Outcome | Ownership | Evidence |
|---|---|---|---|
| P0: correctness | Healthy quotation warm does not become `soft_ready`. | AionUI wrapper, warm script, vertical manifest | targeted tests, deep probe, cold Guid smoke |
| P1a: recurrence prevention | Named three-timer contract and drift test. | installer + AionUI + `mcp-health.md` | documented invariant and test |
| P1b: durable sharing | Packaged generated runtime budget artifact consumed by script and app. | installer packaging + AionUI | build/installed-runtime closure |
| P2: performance | Faster p95 only when attribution justifies it. | quotation source | five-run p50/p95 and phase trace |

P1b is intentionally separate from P0. The installed CCB-Wanding script is deployed independently of the repository manifest; a generated artifact must be packaged beside `lib/warm-wanding-mcp.mjs`, never resolved from a development-only config path.

## Blocking ledger

| ID | Blocker / risk | Evidence | Unblock action | Exit condition | Priority |
|---|---|---|---|---|---|
| B1 | Parent deadline is 90s while child work budget is 120s. | Live PASS at 90,696ms; desktop constant is 90,000. | Set/test wrapper deadline with explicit grace. | Cold PASS is not converted to timeout. | P0 |
| B2 | Quotation deep probe is also 90s. | Vertical manifest `probe_timeout_ms=90000`. | Raise it to at least 120,000 and test deep path. | Probe cannot fail earlier than equivalent work. | P0 |
| B3 | Literal values can drift. | 90s desktop, 120s script, 90s probe. | P1a contract/docs/test; P1b shared artifact. | Drift test and packaging closure. | P1 |
| B4 | Source and installed warm scripts may differ. | AionUI selects installer root before install dir. | Record selected paths and hashes; sync before smoke if different. | Tested script hashes agree. | P0 gate |
| B5 | One cold run is not a latency baseline. | Only one 90.696s sample. | Capture five fully cold runs with host context. | Raw data plus p50/p95 persisted. | P1 |
| B6 | App-open and session/new may duplicate warm. | Existing debt, no correlated timeline. | Add PID/timestamp correlation after P0. | Dedup proposal or no-overlap evidence. | P2 |
| B7 | User state needs real validation. | Guid is the affected surface. | Full exit, cold start, test healthy and forced-failure paths. | No banner on PASS; useful detail on FAIL. | P0 gate |

## P0 gate

1. RED: add a relation test proving `wrapper_deadline < work_budget + grace` is invalid, plus existing PASS/timeout merge coverage.
2. GREEN: wrapper 130s, child work budget 120s, quotation probe 120s.
3. Compare source/live warm-script hashes before integrated smoke; synchronize if necessary.
4. Run targeted tests, quotation deep probe, five cold CLI warm samples, and one cold Guid smoke.

**P0 exit:** quotation PASS gives `mcp_ok=true` and no persistent yellow banner. A forced real failure remains `soft_ready` with server-specific detail.

## P1 and P2 gates

P1a records the timer contract in `mcp-health.md` and adds a regression test. P1b is a separately approved packaging change that adds per-core-MCP metadata such as:

```json
"warmup": {
  "work_budget_ms": 120000,
  "wrapper_grace_ms": 10000,
  "required_call": "match_quotation"
}
```

P2 only starts when P0 shows p95 is unacceptable or exceeds 120s. Instrument spawn, initialize, `tools/list`, `match_quotation`, and response drain; optimize only the dominant phase.

## Approval needed

Approve P0 as the narrow cross-repo repair: wrapper 130s, work/probe 120s, regression tests, hash parity, five cold samples, and Guid smoke. Decide separately whether P1b's packaged shared artifact is required immediately or follows P0 stability.
