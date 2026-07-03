# P3 Execution Plan — WanD Vertical Package

| Field | Value |
|-------|-------|
| Scenario | C — multi-workstream cross-layer extraction |
| Plan depth | Full |
| Verification profile | Release + Security |
| Status | Git gate — implementation and automated verification complete |
| Parent | `07-03-platform-business-decoupling` |

## Phase -1 capability matrix

| Capability | Available | Fallback |
|------------|-----------|----------|
| Trellis specs/context | yes | direct scoped reads |
| Node TDD | yes | single-process assertions |
| PowerShell health fixture | yes | parser + isolated temp roots |
| Staging build | yes | existing `build-wanding.ps1` |
| Live MCP probe | yes | no-write probe against current install |
| Package signing/SBOM | no P3 implementation | record as P4/release follow-up |

## Workstream order

| WS | Risk | Change | Required output | Profile |
|----|------|--------|-----------------|---------|
| 1 | high: path compatibility | package-root schema and discovery | canonical manifest + boundary test | Security |
| 2 | high: deployment | move agent/skill/health declarations | no duplicate business source; legacy projection | Release |
| 3 | high: empty startup | split install/MCP health | platform-only fixture PASS | Release |
| 4 | high: state loss | lifecycle executor | atomic install/enable/disable/upgrade/rollback | Security |
| 5 | high: regression | build/bootstrap adapters | staging PASS + live 5/5 | Release |
| 6 | medium: traceability | specs, done record, checklist | commands, evidence, commit | Standard |

## TDD routes

| Workstream | Level | RED | GREEN command |
|------------|-------|-----|---------------|
| package discovery | unit | package root not discovered | `node .../build-package-registry.test.mjs` |
| lifecycle | unit/integration | no state machine or rollback | `node .../package-lifecycle.test.mjs` |
| health split | script integration | empty platform requires WanD | `pwsh -File .../test-package-health-split.ps1` |
| legacy adapter | integration | moved agents absent from seed | lifecycle/package projection test |
| runtime | system | package composition differs from live | staging + MCP 5/5 |

## Artifact contract

- Research: `research/p3-current-package-boundary-audit.md`
- Requirements: `prd.md`
- Context: `implement.jsonl`, `check.jsonl`
- Implementation: package root, platform lifecycle/health executors, adapters
- Verification: `p3-wanding-package-done.md`
- Human checks: parent `manual-verification-checklist.md`

## Recovery

- All lifecycle tests use a temporary state root.
- Package enable/disable writes state atomically and never removes data/secrets.
- Upgrade retains a previous snapshot until post-upgrade health succeeds.
- A failed projection restores the last state and returns non-zero.
- Live config remains unchanged during automated verification.

## Git gate

1. Targeted RED/GREEN evidence.
2. Registry/compiler regressions.
3. Empty-platform fixture PASS.
4. Staging build PASS.
5. Live MCP 5/5.
6. Scoped diff and credential scan.
7. Atomic implementation commit, then task-status record commit.

## Execution status

| Gate | Result |
|------|--------|
| Canonical package + registry | PASS |
| Lifecycle RED/GREEN | PASS 3/3 |
| Empty-platform health | PASS 2/2 |
| Compiler/registry regressions | PASS 6/6 + 3/3 |
| Fresh and repeat staging | PASS |
| Hot package closure | PASS |
| Live MCP runtime | PASS 5/5 |
| Git scope/credential scan | pending final staged audit |
