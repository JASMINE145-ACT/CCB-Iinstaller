# Execution Plan — `07-03-p2-config-compiler-v1`

| Field | Value |
|-------|-------|
| **Status** | in_progress — implementation and verification complete; commit pending |
| **Scenario** | C/D-lite — security-sensitive config refactor with separable adapters |
| **Plan depth** | Full |
| **Verification profile** | Security |
| **Active phase** | Git gate |
| **Approved** | 2026-07-03 — continuous phase execution authorized by user |

## Phase -1 capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Context/spec | `trellis-before-dev` | available | direct spec reads completed |
| TDD | Node single-process tests | available | exact CLI assertions |
| JSON schema | local schemas + structural validator | available | no network dependency |
| Secret review | `security-review` guidance | available | explicit leakage assertions and grep |
| Runtime regression | `test-mcp-health.ps1 -Probe` | available | isolated config smoke |

## Workstreams

| Phase | WS | Risk | Canonical files | Required output | Profile |
|-------|----|------|-----------------|-----------------|---------|
| 1 | P2-A/B | security | `config/runtime/`, compiler library | merge policy + secret refs | Security |
| 2 | P2-D/F | concurrency, security | compiler + tests | deterministic resolution/provenance/drift | Security |
| 3 | P2-E | cross-layer | projection adapters + registry | settings/agent/health projections | Security |
| 4 | P2-G | packaging | `ensure-wanding-settings.ps1` | opt-in bridge, legacy default | Security |
| 5 | Record | — | task/spec/done record | evidence + human checklist | Security |

## TDD contract

| Workstream | Test level | RED evidence | GREEN command | Regression target |
|------------|------------|--------------|---------------|-------------------|
| Merge/policy | unit | compiler import missing | targeted Node test | precedence/locks/allowlists |
| Secret refs | security unit | literal accepted or leaked | targeted Node test | reject literal, redact provenance |
| Projections | integration | no registry adapter | targeted Node test + fixture CLI | manifest-derived relations |
| Drift | integration | edited output not detected | targeted Node test + CLI | hash mismatch fails |
| Legacy bridge | script smoke | compiled input unsupported | isolated-config PowerShell test | legacy default remains unchanged |

## Gate

1. RED → GREEN targeted tests.
2. Determinism and drift CLI evidence.
3. Secret leakage scan of tracked/generated artifacts.
4. Isolated bootstrap/parity test.
5. Existing MCP probe 5/5.
6. Update specs, PRD, task JSONL, done record.
7. Scoped review and atomic Git commit.

## Recovery

| Trigger | Return to | Action | Re-approval |
|---------|-----------|--------|-------------|
| Compiler needs live secret in tracked input | P2-B | stop; use reference/resolver | no |
| Compiled projection differs behaviorally | planning | document diff; retain legacy default | yes before default switch |
| MCP health regresses | owning adapter | revert bridge/output use | no |
| Runtime requires schema breaking change | parent planning | version/migration design | yes |

## Manual gate

The compiler remains opt-in until the user completes the P2 manual checklist.

## Progress snapshot

| Step | State | Evidence |
|------|-------|----------|
| Explore/current-state audit | done | `research/p2-current-config-audit.md` |
| RED/GREEN compiler tests | done | 6/6 PASS |
| Registry regression | done | 3/3 PASS; lint 0 errors |
| Determinism/clean drift | done | all projection hashes OK |
| Manual-edit drift | done | settings drift detected; exit 2 |
| Live parity | done | 0 differences |
| Legacy bootstrap regression | done | source guard + profile preservation |
| MCP runtime probe | done | 5/5 PASS |
| Scoped Git commit | pending | — |
