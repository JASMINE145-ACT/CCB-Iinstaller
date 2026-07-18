# Execution Plan — Price library UI hang (root cause + fix)

| Field | Value |
|-------|--------|
| **Status** | **cancelled** — 2026-07-15 用户确认当时为**网络问题**，非产品缺陷；不作代码修复 |
| **Scenario** | **C**（Bug）兼 **I**（性能：5.4MB payload） |
| **Plan depth** | **Full** |
| **Verification profile** | **UI** + Cross-repo（aionui-src + AionCore VPS） |
| **Repos** | aionui-src `#/price-library`；Org `GET /api/price-library/active` |
| **Active phase** | **cancelled** — 无实现 |
| **OpenSpec** | `fix-price-library-load-hang` **搁置不 apply** |

---

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-before-dev | Read: | packages single-repo；`.trellis/spec/integration/price-library.md`；`.trellis/spec/frontend/index.md` |
| trellis-task-execution | Read: | Contract→TDD→Verify；Scenario C |
| skill-selection §6 | Read: | Debug → systematic-debugging first |
| superpowers:systematic-debugging | Read: | Phase 1 → `research/root-cause.md` |
| openspec-propose (prior) | Read:/CLI | change `fix-price-library-load-hang` artifacts complete |
| Live probe | — | `/active` **Content-Length=5648952** (~5.4MB)；headers 200 |

---

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| -1 | **done** | capability matrix below |
| 0 Root cause | **done** | `research/root-cause.md` — 5.4MB full `/active` + no UI timeout |
| 1 P0 timeout/error UI | pending | need approval |
| 2 P1 paged/slim API | pending | AionCore + UI wire |
| 3 Verify + spec | pending | UI smoke + price-library.md triage |
| lint | **done** | `lint_execution_plan.py` **PASS** |

---

## Phase -1 — Capability matrix

| Capability | Status | Fallback |
|------------|--------|----------|
| Org `/active` full dump | **available** (too large) | MCP keep; UI leave |
| UI client timeout | **unavailable** | Add AbortSignal |
| Paged/slim list API | **unavailable** | Build `active/items` or `?fields=slim` |
| OpenSpec change pack | **available** | apply after approval |
| VPS deploy AionCore | **available** | deploy script |

**Plan depth:** Full · **Risk tags:** `ui` · `external-api` · `performance`

---

## Product spine

```text
Symptom: #/price-library infinite Spin
  → Root: GET /api/price-library/active ≈ 5.4MB, no client timeout
  → P0: timeout + Alert/Retry
  → P1: UI uses paged/slim; MCP keeps full /active
```

---

## Locked decisions

| # | Decision | Locked |
|---|----------|--------|
| D1 | Root cause | Full `/active` ~**5.4MB** + unbounded fetch → spinner |
| D2 | Not root | JWT / CSRF / CORS / LKG |
| D3 | P0 | Client timeout ≤30s + Retry (exe + WebUI) |
| D4 | P1 | Prefer paged `/active/items` **or** slim fields; full dump retained for MCP |
| D5 | OpenSpec | Reuse `fix-price-library-load-hang` for apply |

---

## Contract map

| Contract | Behavior protected | Primary code | Tests / smoke | Risk |
|----------|--------------------|--------------|---------------|------|
| **WANd.PRICE.UI_LOAD.001** | `#/price-library` exits loading within bound; never infinite Spin | `PriceLibraryPage`, `usePriceLibrary`, orgHttpBridge / web-host forwarder | unit timeout mock + UI smoke ≤30s | ui |
| **WANd.PRICE.ACTIVE_SCALE.001** | UI first paint does not require multi‑MB full dump | AionCore routes + desktop page | API page/slim + UI first page &lt; few seconds @≥3k | performance |
| **WANd.PRICE.ACTIVE_FULL.001** | Quotation/MCP full `/active` still works | `get_active` + `org_price_client` | smoke product count | external-api |

### Contract: WANd.PRICE.UI_LOAD.001

**Behavior protected:** Authenticated open of price library MUST resolve to table **or** timeout error ≤30s.  
**Primary code:** `aionui-src/.../priceLibrary/PriceLibraryPage/index.tsx`, `usePriceLibrary.ts`, org HTTP proxy.  
**Tests:** fetcher AbortSignal unit; manual hang→Alert.  
**Risk:** Ops blocked from browsing shared catalog.

### Contract: WANd.PRICE.ACTIVE_SCALE.001

**Behavior protected:** Table UI first paint for ≥3k SKUs without full-body download dependency.  
**Primary code:** `AionCore/.../aionui-price-library/src/routes.rs` (+ new list endpoint).  
**Smoke:** timed page load with version badge + first rows.  
**Risk:** regress growth → hang again.

### Contract: WANd.PRICE.ACTIVE_FULL.001

**Behavior protected:** Full active dump remains for non-UI consumers.  
**Primary code:** existing `GET /api/price-library/active`.  
**Smoke:** org_price_client / curl product count.  
**Risk:** silent empty quotation prices.

---

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool | Files | Required output | Profile |
|-------|----------|------------|---------|------|------|-------|-----------------|---------|
| 0 | P0 | Root-cause write-up | docs-only | — | systematic-debugging | research/ | root-cause.md | Fast |
| 1 | **P0** | Client/proxy timeout + Alert/Retry | UI_LOAD.001 | ui | TDD | aionui-src desktop + web-host | error within 30s | UI |
| 2 | **P0** | Slim or paged active items API | ACTIVE_SCALE.001 | external-api | TDD | AionCore price-library | endpoint + VPS deploy | Cross-repo |
| 2 | **P0** | Wire UI to paged/slim | ACTIVE_SCALE.001 | ui | TDD | PriceLibraryPage | first paint | UI |
| 2 | P1 | Compat full `/active` for MCP | ACTIVE_FULL.001 | — | smoke | routes unchanged | count OK | Standard |
| 3 | P0 | Spec triage + OpenSpec apply close | docs-only | — | update-spec | price-library.md | hang vs 401 vs LKG | Fast |

**Close rule:** P0 timeout green + P1 UI first paint green + full `/active` smoke + lint PASS.

---

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| timeout UX | UI_LOAD.001 | hang forever / no Alert | unit: AbortError → Alert path; UI smoke | same |
| paged/slim API | ACTIVE_SCALE.001 | only full `/active` | rust/API test page size; curl time≪full | same |
| MCP full dump | ACTIVE_FULL.001 | omit check | curl/org client product count | same |

---

## Contract Verification

| Contract | Verification | Evidence | Status |
|----------|--------------|----------|--------|
| UI_LOAD.001 | open `#/price-library` ≤30s end-state | screenshot / log | pending |
| ACTIVE_SCALE.001 | ≥3k first page few seconds | timing note | pending |
| ACTIVE_FULL.001 | `/active` still returns full set | product count | pending |
| Root cause | Content-Length probe | **5648952** recorded | **PASS** |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-15-price-library-load-hang/execution-plan.md` | PASS | **PASS** |

---

## Parallel / merge

- Phase 1 (UI timeout) can land before Phase 2 API.
- Phase 2 API must deploy VPS **before** UI hard-switches off `/active`.
- Merge: AionCore first → UI → smoke.

## Conditional recovery

- If VPS localhost `/active` is fast but WAN slow → prioritize WebUI proxy streaming + timeout (still need slim for Tailscale).
- If Content-Length shrinks after strip `raw_json` alone to &lt;1MB → optional defer pagination (lock D4 revisit).

## Manual steps

1. Admin login → `#/price-library` → expect table or error &lt;30s (never forever Spin).
2. After P1: search + pager works; edit drawer still OK for price_admin.
3. Quotation match still hits org prices.

---

## Approval gate

**Do not implement until user says「执行 task」.** Root-cause phase is complete and attached.
