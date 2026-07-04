# P5 manufacturing scheduling pilot — done

**Date:** 2026-07-03
**Package:** `com.example.manufacturing-scheduling`
**Result:** automated acceptance complete; production/UI acceptance remains
human-gated.

## Delivered

- Package-owned scheduling agent, skill, knowledge, policy, eval, health, and
  declarative UI contribution.
- Deterministic stdio MCP with capacity, work-order, and scheduling tools.
- Strict JSON-RPC/MCP notification and error behavior.
- Earliest-due-date finite-capacity fixture with explicit
  `CAPACITY_EXCEEDED`.
- Dual-package registry/compiler/lifecycle/control-plane acceptance.
- Operator case, platform feedback, and human checklist.

## TDD evidence

RED:

- Connector test: server absent; both protocol tests failed before response.
- P5 integration: 1/5 passed (core-path guard only); 4/5 failed because the
  manufacturing package was absent.

GREEN:

- Connector contract: 3/3, including the bundled Bun runtime.
- P5 integration: 5/5.

## Review evidence

- Design review: initial FAIL on seven evidence gaps; plan/ADR corrected;
  re-review PASS.
- Implementation review: initial FAIL with two high, two medium, and one low
  finding; all fixed; re-review PASS with no remaining actionable finding.

## Final automated gate

```text
node ccb-installer/scripts/build-package-registry.mjs
  2 packages, 9 agents, 9 MCP servers, 3 skills, 0 errors

node ccb-installer/scripts/build-package-registry.mjs --check
  0 errors (known orphan warnings only)

node --test \
  connector.test.mjs \
  p5-manufacturing-pilot.test.mjs \
  build-package-registry.test.mjs \
  runtime-config-compiler.test.mjs \
  package-lifecycle.test.mjs \
  control-plane.test.mjs \
  jwks.test.mjs
  PASS 13/13, fail 0, cancelled 0

python .trellis/scripts/task.py validate \
  07-03-p5-manufacturing-scheduling-pilot
  implement.jsonl 3 entries PASS
  check.jsonl 3 entries PASS
```

The first combined final command timed out only after the 13/13 test result,
while entering Trellis validation. Validation was rerun independently with
exit code 0; the timeout is not counted as a passing command.

## Boundary proof

Baseline commit:
`16cff83f4305a102103459bfb2a671c5fd456353`.

During P5 execution, the integration gate combined committed diff and
untracked worktree paths, subtracted the captured pre-P5 dirty-tree set, and
rejected paths outside the documented allowlist. At epic closure the durable
regression was stabilized to compare the immutable commit range
`16cff83f..a73c43cf`, so later legitimate work cannot be misattributed to P5.
Production implementation under registry, compiler, lifecycle, control-plane,
ACP, route-b, and AionUI was unchanged.

The only existing-file code changes are test corrections:

- control-plane catalog test selects WanD by package ID rather than position;
- JWKS negative fixture mutates a significant signature character.

## Human gate

Pending items are in the parent
`manual-verification-checklist.md`, under “P5 — Second vertical pilot”. They
cover an isolated dual-package install, live CCB session, infeasible-operation
UX, and manufacturing-stakeholder review. No production rollout was performed.
