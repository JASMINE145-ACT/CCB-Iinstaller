# Execution Plan — `07-08-platform-agent-registry-acp-lint`

| Field | Value |
|-------|--------|
| **Status** | completed |
| **Approved** | 2026-07-05 — user 执行 |
| **Scenario** | A（标准功能，单仓） |
| **Plan depth** | Standard |
| **Verification profile** | Standard |
| **Active phase** | closed |
| **Repos** | claude-code-best only |
| **Spec entry** | `.trellis/spec/integration/platform-forbidden-coupling.md` · `package-manifest-schema.md` · `platform-business-boundary-map.md` |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| P0 激活 + spec | done | trellis-before-dev |
| P1 Registry loader (SB-01a) | done | `packageRegistry.ts` + tests 4/4 |
| P2 agentSessionProfile 迁移 (SB-01b) | done | registry-driven exports |
| P3 Forbidden-coupling lint (SB-13) | done | lint script + CI + baseline 50 |
| P4 门禁 + spec | done | `test-records/sb01-sb13-20260705.md` |

---

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Spec read | `trellis-before-dev` (integration + backend) | available | Read spec index manually |
| Research | `trellis-research` | available | Grep registry + agentSessionProfile |
| Implementation | `trellis-implement` | available | Main session TDD |
| Review | `code-reviewer` agent | available | `trellis-check` |
| Spec update | `trellis-update-spec` | available | Direct edit spec md |
| CI | `.github/workflows/` | available | Local script only first |

## Scenario classification

**Scenario A** — single repo, two dependent workstreams (loader → consumer → lint).  
**Risk tags:** `migration` (agent ID behavior), `packaging` (CI only).

**Not Scenario D** — aionui Task B is explicitly out of scope.

---

## Phase 0 — Activate & read

| Step | Tool / skill | Output |
|------|--------------|--------|
| User approves plan | — | `Status: approved` |
| Activate task | note in `task.json` → `in_progress` | active task |
| `trellis-before-dev` | integration + backend index | checklist done |
| Read baseline | `07-05/.../residual-coupling-audit.md` §A1 | line refs for allowlist |
| Read registry | `package-registry.snapshot.json`, `platform.defaults.json` | derivation rules confirmed |

---

## Phase 1…N — Workstreams

| Phase | Priority | Workstream | Risk | Tool / agent | Files | Required output | Profile | Notes |
|-------|----------|------------|------|--------------|-------|-----------------|---------|-------|
| **P1** | P0 | **SB-01a — Registry loader** | migration | TDD | `packageRegistry.ts`, `__tests__/packageRegistry.test.ts`, fixture JSON | `resolveDefaultRouterAgentId()`, `resolveFleetAgentIds()`, etc. | Standard | Resolve snapshot path from install dir + repo dev fallback |
| **P2** | P0 | **SB-01b — Wire agentSessionProfile** | migration | TDD → trellis-implement | `agentSessionProfile.ts`, `__tests__/agentSessionProfile.test.ts`, `claude-code-b-src/` mirror | Hardcoded Sets replaced; exports preserved; fallback parity | Standard | Do **not** move orchestrator guard strings (SB-05 defer) |
| **P3** | P1 | **SB-13 — Forbidden-coupling lint** | packaging | TDD | `scripts/lint-platform-forbidden-coupling.mjs`, `scripts/__tests__/`, `.github/workflows/forbidden-coupling.yml`, baseline allowlist | CI job; local `node scripts/lint-...` exit 0 on clean tree | Standard | Baseline file pins existing violations; new hits fail |
| **P4** | P1 | **Gate + spec** | — | code-reviewer → tests | spec changelog, jsonl, test-records | AC1–AC8 evidence | Standard | route-b deploy **manual** |

---

## TDD contract

| Workstream | Test level | RED evidence | GREEN command | Regression target |
|------------|------------|--------------|---------------|-------------------|
| SB-01a loader | unit | Test expects router from fixture registry ≠ hardcoded default before impl | `bun test packageRegistry.test.ts` (or project test runner for acp) | Default session = orchestrator for WanD fixture |
| SB-01b profile | unit | Existing `agentSessionProfile.test.ts` updated; new registry mock cases | Same test file + full acp test glob | Orchestrator blocks TaskOutput; specialist MCP allowlist |
| SB-13 lint | script unit | Test fixture file with forbidden string → lint exits 1 | `node scripts/lint-platform-forbidden-coupling.mjs` + `node scripts/__tests__/lint-platform-forbidden-coupling.test.mjs` | Clean tree exit 0 |

---

## Verification profile and gate

**Selected:** Standard

1. **code-reviewer** agent (primary) — diff scope SB-01 + SB-13 only
2. **Commands + evidence:**
   - `node ccb-installer/scripts/build-package-registry.mjs` → 0 errors
   - ACP unit tests: `agentSessionProfile.test.ts`, `packageRegistry.test.ts` PASS
   - `node ccb-installer/scripts/lint-platform-forbidden-coupling.mjs` PASS
3. **trellis-update-spec** → `platform-forbidden-coupling.md` §8 + optional boundary-map backlog note
4. `implement.jsonl` + `check.jsonl` + prd AC `[x]`
5. `git commit` — only if user asks
6. `/trellis:finish-work`

### Manual steps (human)

- [ ] After route-b/dist deploy (if testing live): Guid card → default orchestrator session; open quotation specialist — MCP allowlist unchanged
- [ ] Confirm CI workflow green on PR

---

## Parallelization

**None** — serial: P1 → P2 → P3 → P4. Lint baseline should be captured **after** P2 so moved strings don't false-positive.

---

## Recovery and re-approval

| Trigger | Return to | Evidence update | Re-approval? |
|---------|-----------|-----------------|--------------|
| Registry derivation wrong (wrong default agent) | P1 | Fixture + rule doc in `research/` | no |
| Lint baseline too noisy (>50 existing hits) | P3 | Switch to allowlist-per-file from audit | no |
| Need manifest schema change (`guidOnly` field) | P0 | PRD + plan amendment | **yes** |
| User wants SB-02 in same task | Re-plan | Split rejected — Task B separate | **yes** |

---

## Defer / out of scope

- SB-02 aionui `ccbAgentCatalog.ts` → Task B
- SB-04 route-b MCP inject → Task C
- SB-05 orchestrator prompt / delegation index text
- SB-06 session policy engine
- dist deploy / `route-b-sync` (manual unless user requests)

---

## Merge rules

Single repo — no parallel agent merge. **`claude-code-b-src/` must mirror `src/`** in same commit.
