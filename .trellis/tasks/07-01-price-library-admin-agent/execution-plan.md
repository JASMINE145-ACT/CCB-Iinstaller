# Execution Plan — `07-01-price-library-admin-agent`

> **Purpose:** Stable source of truth for phased execution. Agents read/update **this file**, not chat memory.  
> **Skill:** `.agents/skills/trellis-task-execution/SKILL.md`  
> **PRD:** [`prd.md`](./prd.md) · **Spec:** [`.trellis/spec/integration/price-library.md`](../../spec/integration/price-library.md)

| Field | Value |
|-------|--------|
| **Status** | `in_progress` |
| **Approved** | 2026-07-02（用户确认「按思路执行」） |
| **Scenario** | A + D-lite |
| **Repos** | `claude-code-best`（主）+ `aionui-src`（P1 catalog） |
| **Active phase** | **P3** — VPS E2E smoke（需用户） |

---

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|--------|---------------------|
| P-1 Fleet org-primary | ✅ | [`p1-fleet-org-primary-done.md`](./p1-fleet-org-primary-done.md) |
| P0A Design / audit | ✅ | [`research/audit-plan-review-2026-07-02.md`](./research/audit-plan-review-2026-07-02.md) |
| **P0B** MCP read + preview | ✅ | [`p0b-mcp-read-preview-done.md`](./p0b-mcp-read-preview-done.md) · pytest 10/10 · code-review PASS |
| **P0C** publish + 409 | ✅ | [`p0c-publish-done.md`](./p0c-publish-done.md) · pytest 14/14 · code-review PASS |
| **P0D** import/revert + path security | ✅ | [`p0d-import-revert-done.md`](./p0d-import-revert-done.md) · unittest 19/19 · code-review PASS |
| **P1** Guid agent + catalog gate | ✅ | [`p1-guid-agent-catalog-done.md`](./p1-guid-agent-catalog-done.md) · deploy-seed 16 files · health PASS |
| P1.5 Orchestrator delegate | ⬜ | optional |
| P2 Bulk SOP | ⬜ | — |
| P3 E2E | ⬜ | [`p3-e2e-pending.md`](./p3-e2e-pending.md) — admin Guid smoke |

**Child task done:** [`07-03-price-library-supplier-ui-column`](../07-03-price-library-supplier-ui-column/)

---

## Architecture (target)

```
price_admin user
      │
      ├─ P1: Guid 直连 ──► price-library-agent (delegatable: false)
      │
      └─ P1.5: orchestrator ──► price-library-agent (after CCB gate)
                    │
                    ▼
              price-library MCP (独立进程)
                    │
                    ▼
              org AionCore API (draft → publish → active)
```

**Write contract:** `confirmed=false` → preview only · `confirmed=true` → POST · publish 绑定 `revision` · 409 → 停、重读、禁止 auto-replay

---

## Phase 0 — Activate & read

| Step | Tool / skill | Output | Done |
|------|--------------|--------|------|
| Activate task | `task.py start 07-01-price-library-admin-agent` | `in_progress` | ✅ |
| Pre-dev | `trellis-before-dev` → integration + org-knowledge + agents-unified-model | spec paths | ⬜ |
| Read precedent | `06-28-org-knowledge-agent-write-path` | confirmed + CSRF pattern | ✅ |
| Read API | `vps-price-library-runbook.md` §3–4 | curl templates | ✅ |

---

## Phase 1…N — Workstreams

| Phase | PRD | Workstream | Tool / agent | Canonical files | Done |
|-------|-----|------------|--------------|-----------------|------|
| **P0B** | P0 | Read client + preview | TDD → implement | `org_price_admin_client.py`, `org_price_admin_preview.py`, `org_price_admin_dispatch.py`, `org_price_admin_payloads.py` | ✅ |
| **P0B** | P0 | MCP shell + registry | implement | `mcp_servers/price-library-server/`, `price_library_main.py`, `ccb-mcp.json`, `ensure-wanding-settings.ps1` | ✅ |
| **P0B** | P0 | Tests | pytest | `python/tests/test_org_price_admin_client.py` | ✅ |
| **P0C** | P0 | `publish_price_library_draft` | TDD → implement | extend client + dispatch + MCP `index.js` | ✅ |
| **P0C** | P0 | 409 revision conflict | implement + test | map `OrgVersionConflictError`; no silent replay | ✅ |
| **P0C** | P0 | Vendor sync | shell | `sync-dev-wanding-vendor.ps1 -UpdateSettings` | ✅ |
| **P0D** | P0 | import preview/apply | TDD → implement | multipart + confirmed two-phase | ✅ |
| **P0D** | P0 | revert + path guard | TDD | path whitelist ≤10MB `.xlsx` | ✅ |
| **P0D** | P0 | MCP health 四态 | manifest | `mcp-health-manifest.json`, manual matrix | ✅ |
| **P1** | P1 | Agent md + sidecar | implement | `ccb-installer/config/agents/price-library-agent.md` | ✅ |
| **P1** | P1 | Catalog `price_admin` gate | TDD → aionui-src | `ccbAgentCatalog.ts` + unit test | ✅ |
| **P1** | P1 | Deploy agents | scripts | `deploy-seed-agents.ps1 -ForceMd` | ✅ 2026-07-02 |
| **P1.5** | opt | Orchestrator delegate | spike | CCB gate + `wande-orchestrator.md` | defer |
| **P2** | P2 | Bulk SOP | doc | `prepare-price-library-import.py` refs | ⬜ |
| **P3** | P3 | E2E acceptance | manual + pytest | PRD §P3 checklist · [`p3-e2e-pending.md`](./p3-e2e-pending.md) | ⬜ user |

### Recommended order (single thread)

```
P0B ✅ → P0C → P0D → P1(ccb) → P1(aionui) → P2 → P3
                              └─ P1.5 optional spike
```

**Per-milestone mini-gate:** code-reviewer PASS → pytest → vendor sync → spec + jsonl → update **this file** Progress table.

---

## Verification gate (single chain)

```
改代码
  → code-reviewer PASS（P0–P2）/ trellis-check（P3 收口可选）
  → pytest + smoke 证据
  → sync-dev-wanding-vendor.ps1（MCP/python 变更时）
  → trellis-update-spec → price-library.md
  → implement.jsonl + check.jsonl + prd AC [x]
  → 更新 execution-plan.md Progress
  → git commit（仅用户要求）
  → /trellis:finish-work
```

| Milestone | Primary evidence |
|-----------|------------------|
| P0B | pytest 10/10; live `get_price_library_active` v3/3299 |
| P0C | publish confirmed 两阶段; 409 单测或 mock |
| P3 | admin Guid smoke; quotation 新会话 `org_api` |

---

## Parallelization (P1 only — D-lite)

| Agent | Scope | Merge rule |
|-------|-------|------------|
| **A** | `claude-code-best`: agent md + MCP + python | 先完成并 sync vendor |
| **B** | `aionui-src`: catalog `price_admin` filter | **A 的 agent id 稳定后**再改 |

**禁止并行：** 同轮改 `ccb-mcp.json` + `ensure-wanding-settings.ps1` + 手改 vendor。

---

## Manual steps (human)

**P3 smoke checklist (admin org SSO → VPS v3/3299):**

1. Login **admin** → Guid →「**价格库管理**」→ **new session**
2. `get_price_library_draft` → note `revision`
3. `upsert_price_library_item` `confirmed=false` → review diff → `confirmed=true`
4. `publish_price_library_draft` two-phase (`confirmed=false` → `confirmed=true`)
5. `get_price_library_active` → `version_number` should increment
6. *(optional)* small xlsx import preview/apply; revert with independent confirm
7. Report: `version_number`, any 409 `REVISION_CONFLICT`

- [ ] P3: admin upsert `confirmed` 两阶段 → publish → `version_number++`
- [ ] P1: non-admin（yjc）Guid **无**价格库卡片（需 aionui-src rebuild 若旧 exe）
- [ ] P1: Guid **直连**改价（不经 orchestrator）
- [ ] P3：双 admin 并发 publish 409
- [ ] P3：quotation 新会话 `get_price_data()` → `source=org_api`

---

## Defer / out of scope

- AionUI price_admin 表格编辑 UI（06-27 PR4）
- AionCore `expected_revision` on draft/items（另开 API task）
- Schema v3 / maker-checker / WS push

---

## Change log

| Date | Change |
|------|--------|
| 2026-07-02 | Plan created; P0B marked complete from delivery note |
| 2026-07-02 | P0D import/revert + MCP health manifest landed |
| 2026-07-02 | P1 deploy-seed + vendor sync + dev restart; active phase → P3 E2E |
