# Platform decoupling automated closure — done

**Date:** 2026-07-04
**Parent:** `07-03-platform-business-decoupling`
**Parent lifecycle:** `review` / `awaiting_human_verification`

## Outcome

P0–P5 automated implementation is reconciled and regression-tested. The parent
epic is intentionally not `completed`: credential rotation, real-environment
runtime/UI workflows, production OIDC/gateway/secret-store cutover, and
stakeholder acceptance remain in the human checklist.

## Evidence reconciliation

- P0–P5 completed task/done records and reachable commits were verified.
- P1 commits are `fe464f77` (implementation/spec) and `51419106` (runtime
  evidence).
- Architecture §20 has ten accepted/deferred rows with rationale, authority,
  trigger, and evidence.
- Architecture §21 enforcement is classified rule by rule; only secret scanning
  is claimed as repository CI enforcement.
- Architecture §22 metrics are classified as automated achieved,
  design/fixture only, human pending, or deferred.
- Parent PRD, execution plan, status, task JSON, manual checklist, and P5
  evidence were reconciled.

## Regression evidence

### Node cross-phase gate

Explicitly named ten test files covering registry, compiler, lifecycle, seed
projection, P5 integration, manufacturing connector, control plane, JWKS,
secret store, and admin CLI:

```text
tests 16
pass 16
fail 0
cancelled 0
skipped 0
exit 0
```

The first sandbox run failed before test logic with ten `spawn EPERM` errors.
The authorized unsandboxed run then exposed one real regression:
the P5 changed-path guard compared its baseline to the current future tree.
The guard now compares the immutable P5 range
`16cff83f..a73c43cf`; targeted P5 tests passed 5/5 and the full gate passed
16/16.

### Package and registry

```text
test-package-health-split.ps1
PASS 2/2

build-package-registry.mjs --check
2 packages · 9 agents · 9 MCP servers · 4 skills · 0 errors
known ownership warnings only
```

The first package-health attempt was blocked from creating its isolated
`D:\tmp` directory by the sandbox. The authorized rerun passed.

### Live MCP/runtime

The first authorized live probe passed all five MCP servers but found the
AionUI Route-B runtime marker missing. With user authorization, the scoped
`sync-aionui-ccb-route-b.ps1` copied only Route-B `index.js` and
`acp-agent.js` to AionUI and AionUI-Dev runtimes; it did not restart processes.

Final result:

```text
bundled Route-B marker: PASS
AionUI runtime Route-B marker: PASS
office-word: PASS
excel: PASS
quotation: PASS
accurate: PASS
price-library: PASS
MCP probe: PASS 5/5
overall exit 0
```

AionUI restart remains an explicit human handoff item.

### Trellis data integrity

Parent/P1, P0, P2, P3, P4, P5, and closure tasks:

```text
task.json UTF-8 parse: PASS 7/7
implement.jsonl/check.jsonl validation: PASS 7/7 task directories
```

## Review evidence

- Design review: initial FAIL (status semantics, validation scope, evidence
  calibration, dirty-tree isolation, stale records); all corrected; PASS.
- Closure implementation review: initial FAIL on missing concrete P1 commits
  and stale P5 guard documentation; both corrected; PASS with no remaining
  actionable finding.

## Dirty-tree isolation

The baseline records porcelain state and SHA-256 for fourteen pre-existing
dirty/untracked files. Thirteen remained byte-identical. One unrelated file,
`ccb-installer/packaging-backlog-1.1.6.md`, changed concurrently from
`eb0831…` to `cce187…`; it was preserved and excluded from closure staging.

No pre-existing dirty spec/tool/vendor/interview file is part of this closure.
The closure commit allowlist is limited to:

- parent epic reconciliation files;
- closure task artifacts;
- platform vertical-package spec;
- P5 done record and test-only immutable-range correction.

## Human handoff

Use the parent `manual-verification-checklist.md`. Do not set the parent task to
`completed` until applicable P0/P2/P3/P4/P5 and final operator items have
private evidence and explicit user approval.
