# Plan audit — 2026-07-02

> External review of `07-01-price-library-admin-agent` before P0 implementation.  
> **Verdict:** Direction sound (~7/10); **do not implement** until design gaps below are in PRD.

## Blockers — verified in repo

### B1. `delegatable: false` vs orchestrator routing — **REAL**

- PRD had both orchestrator delegate (`prd.md` L70) and `delegatable: false` (L168).
- `.trellis/spec/integration/agents-unified-model.md` L1061–1062: `filterDelegatableCustomAgents` removes `delegatable: false` from **all** `Agent()` lists, including orchestrator — same failure mode as office presets (2026-06-17 revert).

**Resolution (in PRD):** Phased — **P1 Guid direct only** (`delegatable: false`, no orchestrator row). **P1.5** orchestrator delegate only after CCB role gate (`CCB_ROUTER_DELEGATABLE_AGENT_IDS` + `price_admin` check) or spec-approved bypass; sidecar `delegatable: true` at that phase.

### B2. Invalid `task.json` — **REAL**

Missing comma after `child_tasks_completed` array (L46). Fixed in task.json.

## High risks — verified

### R1. Permission model not closed — **REAL**

PRD “403 on dispatch” is server rejection, not client RBAC. Need three layers (AionUI visibility / CCB delegate gate / AionCore authority). Added PRD § Permission model.

### R2. Confirm-before-write on shared draft — **REAL**

Server `ApplyDraftItemRequest` has **no** `expected_revision` (see `AionCore/crates/aionui-api-types/src/price_library.rs`). Upsert/import/apply **mutate shared draft immediately**. Only `publish` carries `revision`.

**Resolution:** MCP tools use **`confirmed=false/true`** (org-knowledge precedent: `org_knowledge_dispatch.py`). Preview = local diff from GET draft; write only on `confirmed=true`. Publish = separate confirm + fresh revision.

### R3. Concurrency — **PARTIALLY REAL**

- Publish: 409 on revision mismatch — documented in runbook.
- Draft item POST: no optimistic lock field today — concurrent admins last-write-wins on draft rows; publish conflict is the main guard.
- MCP: on 409, **stop**, re-GET draft, re-show diff; **no auto-replay**.

### R4. Import file path security — **REAL GAP**

PRD had no path contract. Added: workspace pointer / attachment roots only; size/row caps; no arbitrary paths.

### R5. `trellis-before-dev` on business agent — **VALID**

Removed from agent skills in PRD; use Read `data/data.Md` + price-library SOP only.

### R6. Hooks too vague — **REAL**

Replaced with machine-checkable `confirmed` + revision binding (mirror org-knowledge).

## Plan hygiene — verified

| Item | Status |
|------|--------|
| `check.jsonl` empty placeholder | Was true — reset with audit entry |
| `implement.jsonl` mixed code paths | Was true — trimmed to spec/research only; P-1 code refs → `p1-fleet-org-primary-done.md` |
| Missing `agents-unified-model.md` in inject list | Fixed in PRD Related |
| Missing org-knowledge CSRF precedent | Fixed in PRD Related |
| P1 missing frontend spec paths | Fixed in PRD P1 |
| MCP health: admin vs non-admin probes | Added to P0 acceptance |

## Staged implementation (adopted)

P0A → P0B → P0C → P0D → P1 → P1.5 → P2 → P3 (see PRD §实现阶段).
