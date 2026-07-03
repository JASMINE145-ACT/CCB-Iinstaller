# Execution Plan — `07-02-mcp-health-coverage-expansion`

> **Retroactive backfill:** 2026-07-03 — synthesized from `implement.jsonl`, `check.jsonl`, `task.json`, and `prd.md` after task completed 2026-07-02. Original session did not persist this file before coding (pre–Step 3b discipline). Evidence chain: jsonl timestamps + commit `a83358b4` + `.trellis/spec/integration/mcp-health.md` §2026-07-02.

| Field | Value |
|-------|--------|
| **Status** | `completed` |
| **Approved** | 2026-07-02 (implicit — work started same day) |
| **Scenario** | D-lite (two repos) |
| **Plan depth** | Standard |
| **Verification profile** | UI + Cross-repo |
| **Repos** | `claude-code-best` (manifest/CLI) + `aionui-src` (panel/TS) |
| **Active phase** | Closed |

**PRD:** [`prd.md`](./prd.md) · **Spec:** [`.trellis/spec/integration/mcp-health.md`](../../spec/integration/mcp-health.md) · **Done:** [`mcp-health-coverage-expansion-done.md`](./mcp-health-coverage-expansion-done.md)

---

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|--------|---------------------|
| P0 Activate + read | **done** | `task.py start`; `mcp-health.md` + prd |
| P0 Workstream A — UI agents + coverage | **done** | `implement.jsonl` 2026-07-02T14:00Z |
| P1 Workstream C — manifest deep probe | **done** | `mcp-health-manifest.json`, probe scripts |
| P1 Workstream E — diagnosis + MiniMax | **done** | `ccbMcpHealthDiagnosis.test.ts` |
| P1 Workstream B — Session probe UI | **done** | IPC + panel button; ~30s serial |
| P2 Workstream D — exa / ppt optional | **done** | `implement.jsonl` 2026-07-02T18:00Z; WARN semantics |
| Gate | **done** | `check.jsonl` 18:00Z; bun 12/12; CLI `-Probe -Session` |
| Spec sync | **done** | `mcp-health.md` §2026-07-02 expansion |
| This plan (retroactive) | **done** | 2026-07-03 backfill |

---

## Phase -1 — Capability matrix (as executed)

| Capability | Preferred tool | Status | Fallback used |
|------------|----------------|--------|----------------|
| Requirements | `trellis-brainstorm` / explore | available | session explore → prd |
| Implementation | `trellis-implement` + inline | available | main session + sub-agents |
| Review | `code-reviewer` | available | — |
| TDD | unit tests first | available | `ccbMcpHealth*.test.ts` |
| Spec update | `trellis-update-spec` | available | `mcp-health.md` direct edit |

---

## Phase 0 — Activate & read

| Step | Tool | Output |
|------|------|--------|
| Create task | `task.py create` | task dir, prd, jsonl seeds |
| Read spec | `mcp-health.md` + prd | workstreams A–E scoped |
| Activate | `task.py start` | `in_progress` |

---

## Phase 1…N — Workstreams

| Phase | P | WS | Risk | Tool | Canonical files | Profile |
|-------|---|-----|------|------|-----------------|---------|
| 1 | P0 | A — UI agents + coverage matrix | ui, cross-repo | TDD → implement | `ccbMcpHealth.ts`, `CcbMcpHealthPanel.tsx`, coverage TS | UI |
| 2 | P1 | C — deep probe word/excel | packaging | `trellis-implement` | `mcp-health-manifest.json`, `test-mcp-health.ps1` | Standard |
| 2 | P1 | E — diagnosis + MiniMax prompt | ui | TDD first | `ccbMcpHealthDiagnosis.ts`, tests | Standard |
| 3 | P1 | B — Session probe UI | ui, long-running | spike → implement | `test-mcp-session-health.mjs`, panel IPC | UI |
| 4 | P2 | D — exa / ppt optional | external-api | implement | optional layer WARN; `Test-OptionalLayer` | Standard |

### TDD contract (summary)

| Workstream | Test level | GREEN command | Regression |
|------------|------------|---------------|------------|
| A, E | unit | `bun test` `ccbMcpHealth*.test.ts` (aionui-src) | panel layers + diagnosis |
| C, D | integration/smoke | `test-mcp-health.ps1 -Probe -Session` | manifest probe_tool_call |
| B | manual + CLI | Session probe button + CLI parity | Guid session MCP load |

### Parallel split (Scenario D-lite)

| Agent / stream | Owns |
|----------------|------|
| A (ccb-installer) | `mcp-health-manifest.json`, `test-mcp-health.ps1`, probe scripts |
| B (aionui-src) | `ccbMcpHealth*.ts`, `CcbMcpHealthPanel.tsx`, unit tests |

**Merge rule:** JSON manifest lands first → TS `ccbMcpHealthManifest.ts` mirror → parent runs tests.

---

## Verification gate (executed)

1. **code-review** — PASS (`check.jsonl` 14:00Z, 18:00Z)
2. **bun test** — 12/12 PASS
3. **CLI** — `test-mcp-health.ps1 -Probe -Session` PASS; optional exa HTTP → WARN exit 0
4. **trellis-update-spec** — `mcp-health.md` §2026-07-02 health coverage expansion
5. **jsonl + prd AC** — all checked (`check.jsonl` 18:00Z)
6. **commit** — `a83358b4` feat(mcp-health): expand coverage probes…

### Manual steps

- [x] UI smoke: Settings → 工具 → 健康面板（layers + session button）— user verified during task

---

## Recovery notes

| Trigger | Action taken |
|---------|----------------|
| Loading state bug mid-task | fix + re code-review (`check.jsonl` 14:00Z) |
| exa HTTP 405 | WARN semantics, non-blocking (`a83358b4`) |

---

## Defer / out of scope

- Full ROE hook health in panel (separate `smoke-roe-deploy.ps1`)
- Org price library VPS probe (manual)
