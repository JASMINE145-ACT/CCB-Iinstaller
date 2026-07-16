# Codex host smoke

Date: 2026-07-16
Status: PASS
Host mode: current conversational host plus internal deterministic script

The active Codex conversation ran three sanitized CCB ACP fixture trials, read one anonymous randomized Judge Packet, and submitted all three `eval.judgment/v1` records together. No second judge API was called.

Result: `PASS`; soft score 95.45; `pass_at_1=1`; `pass_at_3=1`; `pass_power_3=1`; `flaky_rate=0`; `independent_trials=false`. External artifacts are under `D:\tmp\agent-eval-current-host-fixture` and are not versioned.

This verifies the Codex host loop and fixture evidence contract. It does not claim the current production quotation Agent passes; the live Route B target remains hard `FAIL` with zero business tool calls.
