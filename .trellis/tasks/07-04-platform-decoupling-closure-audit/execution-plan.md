# Execution Plan — `07-04-platform-decoupling-closure-audit`

| Field | Value |
|-------|-------|
| **Status** | completed |
| **Scenario** | A |
| **Plan depth** | Standard |
| **Verification profile** | Standard |
| **Active phase** | complete |

## Progress snapshot

| Phase | State | Evidence |
|-------|-------|----------|
| Evidence inventory | completed | P0–P5 done records, completed task JSON, and commits located |
| ADR/PRD reconciliation | completed | §20/§21/§22 matrices; parent records aligned |
| Cross-phase regression | completed | Node 16/16; health 2/2; live MCP 5/5 |
| Independent review | completed | PASS after two evidence corrections |
| Commit/handoff | completed | closure record and human checklist prepared |

## Capability matrix

| Capability | Route | Status | Fallback |
|------------|-------|--------|----------|
| Trellis execution | `trellis-task-execution` | available | main-session durable plan |
| Design review | independent subagent | available | main-session spec audit |
| TDD | N/A for docs/status-only closure | justified | parser/schema checks plus existing executable suites |
| Regression | Node tests + PowerShell package-health test | available | targeted commands run separately |
| Completion proof | exact command output and independent review | available | closure record |

## Workstreams

| Phase | Workstream | Files | Required output |
|-------|------------|-------|-----------------|
| 1 | Inventory | phase done records, commits, parent PRD | evidence matrix |
| 2 | ADR disposition | `open-questions.md` | 10 accepted/deferred decisions |
| 3 | Acceptance reconciliation | parent PRD/plan/status/task | evidence-accurate state |
| 4 | Regression | existing tests only | exact command/count/exit evidence |
| 5 | Review and handoff | closure record/manual checklist | PASS, separate commit |

## Verification contract

1. One explicit `node --test` invocation naming:
   `build-package-registry`, `runtime-config-compiler`,
   `package-lifecycle`, `deploy-seed-agents.prune`, P5 integration,
   manufacturing connector, `control-plane`, `jwks`, `secret-store`, and
   `admin-cli`.
2. `test-package-health-split.ps1` with exact exit/result evidence.
3. `test-mcp-health.ps1 -Probe -Quiet` as a read-only current live-runtime
   probe. A failure reopens the owning phase; it is not rewritten as “manual”.
4. Registry generation in `--check` mode.
5. Parse every parent/child `task.json` explicitly as UTF-8. Validate
   `implement.jsonl` and `check.jsonl` for parent/P1, P0, P2, P3, P4, P5, and
   closure via `task.py validate`.
6. Verify phase commit SHAs and done records. P1 evidence lives in the parent.
7. Produce a §22 table with one row per metric and one of:
   `automated achieved`, `design/fixture only`, `human pending`, `deferred`.
   Each row names evidence and limitation. Empty-platform *startup*, deployed
   gateway audit, and full platform-upgrade isolation remain human/unproven
   unless stronger evidence is gathered.
8. Identify §21 enforcement per rule. Secret-scan CI is executable enforcement
   for rule 5 only; review/tests are not mislabeled as CI lint, and remaining
   automation is explicitly deferred.
9. Confirm closure diff contains no runtime implementation changes.
10. Independent closure review.

## Recovery

| Trigger | Return to | Rule |
|---------|-----------|------|
| Existing evidence does not prove a checkbox | reconciliation | leave unchecked or mark human-gated |
| Regression fails | owning phase | diagnose; do not paper over with docs |
| ADR needs product/legal/ops authority | ADR disposition | defer with owner and trigger |
| Runtime code change appears necessary | planning | create a new implementation task; do not hide it in closure |

## Dirty-tree and commit isolation

- Baseline records porcelain status plus SHA-256 for every pre-existing dirty
  file, including untracked files.
- Before staging, verify every baseline hash is unchanged.
- Avoid editing pre-dirty overlap paths; if unavoidable, stage only the closure
  patch hunk and document it.
- Stage an exact allowlist; inspect `git diff --cached --name-only` and
  `git diff --cached --check`.
- After commit, inspect `git show --name-only --check HEAD` and verify all
  pre-existing dirty paths and hashes remain.

## Required reconciliation outputs

- Replace stale parent status text “P5 commit pending” with commit `a73c43cf`.
- Parent execution plan becomes automated closure complete / human verification
  pending, not “P5 planning”.
- Parent task JSON becomes `review`; closure child becomes `completed`.
- Parent PRD checks only evidence-backed automated criteria; P0 credential
  rotation and all manual checklist items remain unchecked.
- All 10 §20 ADR rows include disposition, rationale, authority/owner, concrete
  revisit trigger, and evidence.
