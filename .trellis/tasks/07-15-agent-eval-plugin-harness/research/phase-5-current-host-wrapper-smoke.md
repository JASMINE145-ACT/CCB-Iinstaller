# Phase 5 Current-Host Wrapper Smoke

Date: 2026-07-16
Versioned raw data: none
External artifact directory: `D:\tmp\agent-eval-current-host-fixture`

## Automated wrapper E2E

The internal host script was exercised through real child processes:

1. `run` executed three isolated sanitized CCB ACP fixture trials.
2. The script persisted private state, a randomized anonymous Judge Packet, JSON report, and Markdown report.
3. `review` validated one batch containing all three `eval.judgment/v1` records.
4. A separate missing-tool fixture produced hard `FAIL` with `MISSING_REQUIRED_ACTION`.

The full plugin suite passed 46 tests, and the official plugin validator passed.

## Current Codex host judgment

The active Codex conversation ran the same three-trial fixture flow without a second judge API. The Packet identified the current Judge as:

- host: `codex`
- model: `gpt-5`
- version: `unavailable`
- rubric hash: `sha256:6bc5ba409535d584d1d00100ce970652b3e0812c878f5783589dc1539481f591`

For each anonymous Trial, the current AI submitted:

- requirement satisfaction: 98
- selection reasoning: 95
- clarity: 92
- confidence: 0.98
- needs human review: false

The Core-calculated weighted score was 95.45. The final report was `PASS` with `pass_at_1=1`, `pass_at_3=1`, `pass_power_3=1`, `flaky_rate=0`, and `independent_trials=false`.

This smoke uses the sanitized deterministic fixture; it is not represented as a passing live production Agent run. The Phase 3 live Route B run remains a genuine hard `FAIL` because the target session exposed zero business tool calls and the default router persona.

## Decision

The embedded wrapper contract and same-process judgment loop are accepted for P5. Human conversational host smokes and the current production persona/runtime correction remain explicit P6/target-project work; no deterministic grader was weakened.
