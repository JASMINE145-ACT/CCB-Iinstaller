# Execution Plan — `07-14-kb-business-completeness`

| Field | Value |
|-------|--------|
| **Status** | **done** |
| **Approved** | 2026-07-14 — **K + Foundation**；2026-07-14b — **absorb system-review** |
| **Scenario** | **A** + contract-first |
| **Plan depth** | Standard |
| **Verification profile** | Standard + UI（**test slug only**） |
| **Active phase** | — (MVP closed 2026-07-15) |
| **Repos** | admin/org_knowledge* · quotation MCP · specs · L1 · registry |
| **Parent** | `07-13-trade-sourcing-knowledge-consolidation` |
| **MVP** | K + Foundation |
| **Commit split** | **C0** specs/registry/docs only → **C1** delete+budget code → **C2** L1/vendor/smoke |

## Skills invoked (this planning / absorb session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | K+Foundation plan shape; lint gates |
| System-review 2026-07-14 | Read: | P0 locator/RBAC/jsonl/meta absorbed into prd+plan |
| task.py validate | Shell: | implement/check **11 entries** each PASS |
| Agent: explore (prior) | Agent: | `research/org-mutate-mcp-family.md` |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Hygiene | **done** | task.json + jsonl curated |
| Phase 0a | **done** | `org-mutate-ux.md` + registry 3 IDs |
| Phase 0b | **done** | `research/max-token-700.md` — no MCP 700 knob |
| Phase 1–2 | **done** | delete + envelope + budget；22 unit OK；review **PASS** |
| Phase 3 | **done** | L1 + org-knowledge.md；vendor python/MCP synced |
| Phase 4 | **done** | Guid smoke **test slug** — `smoke-evidence.md` **验收成功** 2026-07-15 |
| code-reviewer | **PASS** | round 2 after locator fix |
| unit tests | **PASS** | 22 tests OK |

## Design spine

```text
preview → confirm → apply → audit/history → shadow/cache sync
```

| Actor | May | Must not |
|-------|-----|----------|
| Agent MCP | preview / apply（确认后 + RBAC） | 无确认或无权限写 |
| Precipitation | **Proposal only** (`lane=business_rule`) | 直写 KB |
| Inbox approve | 触发同一 mutate apply | 旁路写路径 |

## Contract map

| Contract | Behavior | Primary | Tests / smoke | Risk |
|----------|----------|---------|---------------|------|
| `WANd.ORG.MUTATE.UX.001` | 统一 envelope；knowledge 先落地；price/supplier **别名兼容** | `org-mutate-ux.md` + registry | schema unit | 硬切破坏价库 |
| `WANd.KB.MCP.DELETE.001` | 去块+history；locator 兼容旧块；**RBAC apply gate** | org_knowledge_* + ListTools | unit + **test slug** smoke | 任意 JWT 可删 |
| `WANd.KB.MCP.APPEND_BUDGET.001` | LIMIT_EXCEEDED；禁拆；NEAR_DUPLICATE | client + L1 | unit | 切碎规则 |
| `WANd.LEARNING.PROMOTION.001` | precip→Proposal→approve→mutate | cross-task cite precip plan | docs +（可选）负向一句 | 双写 |
| Backlog | Phase S / P1-GET/UPD/HIST/RBAC-product | plan section | N/A | — |

### Envelope（knowledge MVP）

必有：`action`,`domain`,`requires_confirmation`,`applied`,`target`,`changes`,`preview_before`,`preview_after`,`version`,`error_code`  
兼容旧 append：`rule_text`,`section`,`message` 仍返回。

### Delete RBAC（MVP — P0 absorb）

Apply (`confirmed=true`) allowed only if:

1. `is_admin` **or** manager-equivalent role **or** capability `org_knowledge.write`, **or**
2. env/feature `ORG_KNOWLEDGE_MCP_DELETE=1` **and** slug ∈ allowlist, **or**
3. slug is **`wanding_business_knowledge_test`** (or equivalent test slug)

Otherwise preview OK, apply → `FORBIDDEN`.  
Default production slug without flag → **preview-only delete**.

### Delete locator（P0 absorb）

See `research/delete-locator-compat.md`. Summary: stamp new blocks; legacy via hash+version+snippet; multi → `AMBIGUOUS_MATCH`.

### Budgets

| Item | Rule |
|------|------|
| Soft | Phase 0b pin ~700 then raise usable window |
| Hard | e.g. 16000 chars → `LIMIT_EXCEEDED` |
| Near-dup | `research/near-duplicate-append.md` threshold 0.88 → `NEAR_DUPLICATE` |

## Workstreams

| Phase | Pri | Workstream | touches | Risk | Required output | Profile | Commit |
|-------|-----|------------|---------|------|-----------------|---------|--------|
| 0a | P0 | Foundation spec + registry + alias-compat note | UX.001 | docs | `org-mutate-ux.md` | Fast | **C0** |
| 0b | P0 | Pin ~700 | BUDGET | — | `max-token-700.md` | Fast | C0 or C1 |
| 1a | P0 | RED delete + RBAC + locator | DELETE | backend | failing tests | Standard | C1 |
| 1b | P0 | GREEN delete MCP | DELETE | backend | ListTools + units | Standard | C1 |
| 1c | P0 | Append preview → envelope + legacy fields | UX.001 | backend | compat unit | Standard | C1 |
| 2 | P0 | Budget hard rules + NEAR_DUPLICATE | BUDGET | backend | units | Standard | C1 |
| 3 | P1 | L1 SOP + ForceMd note + precip Proposal cross-ref | docs | docs | agent md | Fast | **C2** |
| 4 | P0 | Verify | all | ui | smoke-evidence **test slug** | UI | C2 |

## TDD contract

| WS | RED | GREEN | Guard |
|----|-----|-------|-------|
| DELETE | no tool; contains-only apply; any-JWT apply on prod slug | hash locator; no-confirm no PUT; FORBIDDEN without gate; AMBIGUOUS; 409; history version++ | section header fail |
| UX append | preview missing envelope keys | keys present + old fields | price tools untouched |
| BUDGET | silent truncate | LIMIT_EXCEEDED; near-dup | happy append |

## Contract Verification

| Contract | Command / smoke | Status |
|----------|-----------------|--------|
| UX.001 | spec + envelope unit | **PASS** (unit) |
| DELETE.001 | unit FORBIDDEN/locator + Guid test-slug | **PASS** |
| BUDGET | LIMIT/NEAR unit | **PASS** (unit) |
| PROMOTION | L1 docs Proposal-only | **docs** |
| plan lint | lint_execution_plan.py | optional post-close |
| task validate | validate | PASS earlier |

## Delete tool shape

```text
delete_business_rule
  target: { block_id? } | { content_hash, doc_version, snippet }
  slug: default prod | test slug for smoke
  confirmed=false → envelope (applied=false)
  confirmed=true → RBAC gate → remove block → PUT expected_version
  returns removed_text, actor, version before/after
  NOT wipe history; NOT contains-only sole locator
```

## Backlog

| ID | Item |
|----|------|
| Phase S | suppliers_delete @ UX.001 |
| P1-GET / HIST / UPD | get + list/revert MCP + update_business_rule |
| P1-RBAC-product | fleet-wide `org_knowledge.write` beyond MVP gate |
| Price alias | progressive envelope mapping |

## Recovery

- AMBIGUOUS_MATCH → return candidates  
- CONFLICT → re-get + re-preview  
- FORBIDDEN → show need admin/flag/test slug  
- 700 UI-only → document + still raise MCP/L1 budgets  

## Manual smoke（隔离）

1. Use **`wanding_business_knowledge_test`** (seed if needed) — **not** production slug.  
2. Append → delete by hash → confirm → content gone; history has prior version.  
3. Long append once; over-cap → LIMIT_EXCEEDED.  
4. Prod slug delete apply without flag → FORBIDDEN.  

## Lock

- ✅ K + Foundation  
- ✅ Delete RBAC in MVP（preview-only if ungated）  
- ✅ Legacy locator compat  
- ✅ Commit split C0/C1/C2  
- ❌ Phase S  
- ✅ Phase 4 Guid smoke 验收成功（2026-07-15）
- Backlog remains: Phase S / P1-GET/UPD/HIST；child `07-15-kb-mutate-conversation-ux`
