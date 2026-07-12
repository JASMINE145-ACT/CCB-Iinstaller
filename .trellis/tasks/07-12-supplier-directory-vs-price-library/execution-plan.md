# Execution Plan — `07-12-supplier-directory-vs-price-library`

| Field | Value |
|-------|--------|
| **Status** | **in_progress** — Phase 7b **done** + Phase 7 live smoke + Phase 8 fidelity (pending approval) |
| **Approved** | 2026-07-12 (v1); Phase 8 **awaiting user 执行** |
| **Scenario** | **A** (v1) + **A/G** (Phase 8) + **C/A6** (Phase 7b Guid incident class) |
| **Plan depth** | Full |
| **Verification profile** | Cross-repo + UI |
| **Active phase** | Phase 7 live smoke; Phase 8 fidelity on approval |
| **Storage** | Org structured tables (`suppliers` + `logistics_vehicles`); not md/Grep SoT |
| **RBAC** | Read: any org user · Write: `SUPPLIER_DIR_ADMIN_USERNAMES` (empty=deny) |
| **Write safety** | `confirmed=false` preview; `confirmed=true` + CSRF |
| **Agent** | Dedicated `supplier-directory-agent` + own MCP |
| **Repos** | both |
| **Spec entry** | `.trellis/spec/integration/supplier-directory.md` (create in Phase 1/gate) |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | Phase 7b agent parity + Phase 8 fidelity doctrine |
| trellis-before-dev | Read: | `get_context.py --mode packages` → backend/frontend/integration layers |
| agent parity audit | — | package vs peers vs live `%LOCALAPPDATA%` vs `staging/seed` (this session) |
| source HTML analysis | — | WXWork `index.html` FIELD_KEYS + `buildCard`/`splitProductsGrouped`; `research/fidelity-gap.md` |
| ui-ux-pro-max | Read: | `research/ui-form.md` (dense ops table, no emoji) |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | done | Full scope locked |
| Phase 0a contract pack | **done** | seed/match/confirmed/jsonl/agent-path/storage |
| Phase 0b approve | **done** | 2026-07-12 approved |
| Phase 1 schema+read+seed | **done** | migration 022 + REST + parse; code-reviewer PASS; `p1-schema-read-seed-done.md` |
| Phase 2 match | **done** | scorer + `/api/suppliers/match`; Fixture A/C/D GREEN; `p2-match-done.md` |
| Phase 3 MCP+agent | **done** | read MCP + agent + routing; `p3-mcp-agent-done.md` |
| Phase 4 confirmed write | **done** | upsert tools + preview gate; `p4-confirmed-write-done.md` |
| Phase 5 UI | **done** | aionui-src `#/suppliers` 三模式; `p5-ui-done.md` |
| Phase 6 registry/health | **done** | mcp-health + package registry + build-wanding copy |
| Phase 7 finish | pending | live seed + Agent/UI smoke; finish-work |
| **Phase 7b agent parity** | **done** | seed sync + vendor MCP + ccb-mcp.json + deploy; code-reviewer Layer A PASS |
| **Phase 7c NL query + MCP** | **done** | normalize q + CSRF retry + agent q contract; `p7c-nl-query-mcp-hardening-done.md` |
| **Phase 8 fidelity** | **pending approval** | 18列+距离+产品展示；见 §Phase 8 |

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Requirements | trellis-brainstorm | available | prd.md |
| Research | research/*.md | available | — |
| Implementation | trellis-implement / inline | available after approve | — |
| TDD | superpowers:test-driven-development | on 执行 | cmds below |
| Review | code-reviewer | available | — |
| Verify | §Step 5 + UI/Agent smoke | available | — |

## Contract map

| Contract | Behavior protected | Primary code | Tests / eval / smoke | Risk |
|----------|--------------------|--------------|----------------------|------|
| `WANd.SUPPLIER.DIR.001` | Org suppliers ≠ price_products | migration + `/api/suppliers*` | seed ≥27 | migration |
| `WANd.SUPPLIER.SEED.001` | Idempotent upsert; preserve edits | seed CLI | seed-contract repeat-run | migration |
| `WANd.SUPPLIER.MATCH.001` | Shared scorer; fixture A/B; **NL q normalize** | `/match` + MCP | match-fixtures + NL tests | — |
| `WANd.SUPPLIER.VEHICLE.001` | Shared editable vehicle catalog | `/api/logistics-vehicles*` | ≥10 + edit smoke | migration |
| `WANd.SUPPLIER.SYNC.001` | Fleet-visible after writes | Org GET | two-account | cross-repo |
| `WANd.SUPPLIER.CRUD.001` | Whitelist + CSRF + **confirmed** | POST/PUT + MCP | preview no POST; 403 cases | security |
| `WANd.SUPPLIER.AGENT.001` | **Dedicated** `supplier-directory-agent` owns MCP; write via confirm | agent md + MCP | fixtures A/B/C + edit smoke | ui |
| `WANd.ROUTING.SUPPLIER_DIR.001` | Directory intents → supplier agent; **not** quotation/price/Accurate | orchestrator | 找厂/改地址/用什么车 | ui |
| `WANd.SUPPLIER.REG.001` | Guid + delegation + mcp-health | package + manifest | health entry | packaging |
| **`WANd.AGENT.GUID_VISIBLE.001`** | **Authoring ≠ Guid card:** agent md+sidecar in **live** `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\` with `guid_primary:true` | deploy-seed + build seed merge | Guid card count + restart smoke | ui |
| **`WANd.AGENT.MCP_VENDOR.001`** | MCP stdio files under **live** `vendor/mcp-servers/supplier-directory/` | build-wanding + route-b | `test-mcp-health -Probe` | packaging |
| **`WANd.SUPPLIER.FIDELITY.001`** | **HTML seed → Org/UI: no field loss; distance column; clean product display** | parse + migration 023 + API + UI | fidelity unit tests + manual GSMI/凌威/双林 | ui |

**Explicit non-goals (locked 2026-07-12):** do **not** mount supplier write MCP on `quotation-agent`; do **not** use org-knowledge md as source of truth for directory/vehicles.

### Contract: WANd.SUPPLIER.FIDELITY.001

**Behavior protected:** Every HTML `FIELD_KEYS` column is seeded and visible; distance shown as dedicated column; products never display raw `;;` delimiters; multi-address overlays preserved; match fixtures still GREEN.

**Primary code:** `supplier_directory_parse.py`, migration `023`, `aionui-supplier-directory` service/DTO, `aionui-src/.../SuppliersPage`

**Tests:** `scripts/org-phase0/test_supplier_directory_parse.py` + `cargo test -p aionui-supplier-directory`

**Eval / smoke:** GSMI 17km column; 凌威 7km+10km locations; 双林 products accordion without `;;`; Fixture A 土工布 unchanged

**Risk if broken:** procurement users lose logistics context; product match confusion from mangled display

### Contract cards (key)

### Contract: WANd.SUPPLIER.SEED.001
**Behavior protected:** Re-seed does not duplicate; does not clobber post-seed edits.  
**Primary code:** seed script + unique keys (`name_zh` / `lalamove:{no}`)  
**Tests:** per `research/seed-contract.md`  
**Risk if broken:** duplicate factories; lost admin edits  

### Contract: WANd.SUPPLIER.MATCH.001
**Behavior protected:**「土工布」→ at least HAKUNA + 三信 with snippets; shared UI/MCP scorer.  
**Primary code:** shared scorer module  
**Tests:** `research/match-fixtures.md` Fixture A  
**GREEN:** unit test file asserting Fixture A/B (path set at implement; must exist before match PR merge)  
**Risk if broken:** unstable Agent answers  

### Contract: WANd.SUPPLIER.CRUD.001
**Behavior protected:** Whitelist only; empty env deny; `confirmed=false` never mutates; CSRF on true.  
**Primary code:** AionCore gate + MCP write tools  
**Tests:** 403; CSRF; confirmed false/true  
**Risk if broken:** Agent silent fleet corruption  

## Workstreams (serial)

| Phase | Priority | Workstream | touches | Risk | Required output | Profile |
|-------|----------|------------|---------|------|-----------------|---------|
| 0 | P0 | Approve plan | docs | — | Status=approved | Fast |
| 1 | P0 | Schema + **read** API + idempotent seed | DIR, SEED, VEHICLE, SYNC | migration | GET + seed twice OK | Cross-repo |
| 2 | P0 | Scorer + `/match` | MATCH | — | Fixture A/B GREEN | Standard |
| 3 | P0 | MCP **read** + agent + routing (+ REG stubs) | AGENT, ROUTING | ui | Read smokes A/B/C | UI |
| 4 | P0 | MCP **write** confirmed + CSRF + whitelist | CRUD | security | preview/confirm tests | Security |
| 5 | P0 | AionUI `#/suppliers` 三模式 | SYNC + Layer A/B | ui | Manual 3 modes | UI |
| 6 | P1 | Registry/health/runbook complete | REG | packaging | mcp-health + deploy | Release |
| 7 | — | Spec promote + finish | all | — | `supplier-directory.md` | — |
| **7b** | **P0** | **Agent consumer-plane parity (A6)** | GUID_VISIBLE, MCP_VENDOR, REG | ui/packaging | seed sync + vendor MCP + Guid/MCP smoke | Release |
| **8a** | **P0** | **Sync HTML + gap research** | FIDELITY | docs | Copy WXWork `index.html` → research; `fidelity-gap.md` | Fast |
| **8b** | **P0** | **Parse: 18 fields + distance + products_json + overlays** | FIDELITY, SEED | — | pytest RED→GREEN | Standard |
| **8c** | **P0** | **Migration 023: wire dead cols + distance_km + locations_json** | FIDELITY, DIR | migration | GET returns all cols | Cross-repo |
| **8d** | **P0** | **Re-seed VPS (preserve edits)** | SEED | — | bootstrap exit 0 | Release |
| **8e** | **P0** | **UI: browse columns + detail product table** | FIDELITY, SYNC | ui | Manual screenshots | UI |
| **8f** | **P1** | **Match regression + MCP field parity** | MATCH, AGENT | — | Fixture A/C/D GREEN | Standard |

**Do not** parallelize write UI with unfinished confirmed contract.

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| Phase 1 seed | SEED.001 | duplicate on 2nd run | seed script + GET counts stable | same |
| Phase 1 API | DIR/VEHICLE | 404 | GET suppliers≥27 vehicles≥10 | same |
| Phase 2 match | MATCH.001 | Fixture A fails | `node --test` or `pytest` on scorer (path at implement) asserting HAKUNA+三信 | same |
| Phase 4 write | CRUD.001 | confirmed=false still POSTs | MCP/API tests: false=no mutate; true=ok; non-wl=403 | same |
| Phase 5 UI | SYNC | modes missing | vitest + manual | same |
| **Phase 7b deploy** | **GUID_VISIBLE.001** | Guid list lacks card | `deploy-seed-agents.ps1 -ForceMd` + card visible after AionUI restart | same |
| **Phase 7b vendor** | **MCP_VENDOR.001** | probe 404 / MCP spawn fail | `build-wanding` or hot seed + `test-mcp-health.ps1 -Probe` suppliers_list | same |
| **Phase 8b parse** | **FIDELITY.001** | GSMI `distance_km` missing; 双林 products show `;;` | `python -m unittest scripts/org-phase0/test_supplier_directory_parse.py` | same + match tests |
| **Phase 8c API** | **FIDELITY.001** | GET omits spec/moq/distance | `cargo test -p aionui-supplier-directory` | same |
| **Phase 8e UI** | **FIDELITY.001** | no distance column | vitest column helper + manual `#/suppliers` | same |

## Contract Verification

| Contract | Verification | Required evidence | Status |
|----------|--------------|-------------------|--------|
| SEED.001 | seed×2 + edit-preserve | log per seed-contract | pending |
| MATCH.001 | Fixture A/B unit | PASS + names/snippets | **PASS** (Fixture A/C/D + NL `土工布谁有货？`) |
| VEHICLE.001 | GET≥10 + edit | two-account | pending |
| CRUD.001 | confirmed + CSRF + empty-env deny | PASS log | **PASS** (preview unit + backend RBAC; MCP CSRF retry 2026-07-12) |
| AGENT.001 | 3 prompt smokes | transcript | pending live |
| ROUTING.001 | intent routes | checklist | **PASS** (orchestrator md + ACP guard); live pending |
| REG.001 | mcp-health + Agent() | manifest + smoke | **PASS** (manifest/registry/build); health probe pending live |
| **GUID_VISIBLE.001** | live agents dir + Guid card | deploy-seed -ForceMd; card after AionUI restart | **PASS** (live md+sidecar; user restart for UI) |
| **MCP_VENDOR.001** | vendor path + probe | `D:\CCB-Wanding\vendor\mcp-servers\supplier-directory\` + ccb-mcp.json entry | **PASS** (2026-07-12; lazy probe SKIP ok) |
| plan lint | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-12-supplier-directory-vs-price-library/execution-plan.md` | PASS | **PASS** |
| **FIDELITY.001** | parse unit + GET field audit + UI smoke | GSMI 17km; 凌威 2 addr; 双林 no `;;` | pending |

## Phase 7b — Agent parity audit (2026-07-12)

**User request:** Compare `supplier-directory-agent` vs peer agents; confirm conventional config; avoid repeating Guid/deploy incidents (A6).

### Parity matrix (package SoT vs peers)

| Check | supplier-directory | work-tasks (peer) | price-library (peer) | Verdict |
|-------|-------------------|-------------------|----------------------|---------|
| `.md` `name` = sidecar `agent_id` | yes | yes | yes | **PASS** |
| `mcpServers` ↔ `mcp_allowlist` | `supplier-directory` | `work-tasks-agent` | `price-library`, `excel` | **PASS** |
| `guid_primary` + `delegatable` | true / true | true / true | true / true | **PASS** |
| `model: minimax-m3` | yes | yes | yes | **PASS** |
| `package.json` agent + MCP runtime | yes | yes | yes | **PASS** |
| `mcp-health-manifest.json` profile | yes | yes | yes | **PASS** |
| `package-registry.snapshot.json` | yes | yes | yes | **PASS** |
| `LEGACY` keep + routerDelegatable | yes | yes | yes | **PASS** |
| orchestrator forbid + delegate route | yes | yes | N/A | **PASS** |
| `build-wanding.ps1` MCP copy | yes | yes | yes | **PASS** (source); **live vendor FAIL** |
| Stop `subagent-gate` hook | **no** | yes | yes | **ACCEPT** (read-heavy; same as pre-hook accurate pattern) |
| Pre/Post write hooks | **no** (MCP preview) | no | yes | **ACCEPT** (confirmed in MCP) |
| `requires_*` sidecar gate | none (backend RBAC) | none | `requires_price_admin` | **ACCEPT** |
| `config/agents/README.md` row | yes | yes | yes | **PASS** |

### A6 consumer-plane status (this machine)

| Plane | Expected | Observed | Status |
|-------|----------|----------|--------|
| Authoring | `packages/.../agents/supplier-directory-agent.*` | present | **PASS** |
| Registration | registry + health + package.json | present | **PASS** |
| Install/sync — agents | live `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\` | md + sidecar deployed (manual `--force-md`) | **PARTIAL** |
| Install/sync — MCP vendor | `vendor/mcp-servers/supplier-directory/` | **missing** | **FAIL** |
| Session/UI — Guid | card visible after restart | pending user restart + smoke | **pending** |

### Repeated incident class (yes — same root cause as Guid miss)

1. **A6 authoring-only delivery:** Agent existed in git before live Guid showed it — classic「写了 package ≠ 用户能选」.
2. **`staging/seed/agents` git drift:** Repo folder lacks `supplier-directory-agent*` (and `work-tasks-agent*`); `build-wanding.ps1` merges `config/agents` + `packages/.../agents` at **build** time — devs editing only `staging/seed` will miss new agents until rebuild.
3. **deploy-seed skip policy:** Without `-ForceMd`, existing user `.md` wins — new agent sidecar can deploy while `.md` stays absent on older machines.
4. **Vendor MCP not synced:** Agent card without `vendor/.../supplier-directory` → session MCP spawn fails (worse than invisible card).

**Not repeated:** BOM mojibake (UTF-8 OK); retired prune (not in `retired-agent-ids.json`); orchestrator direct MCP block (tests in `agentSessionProfile.test.ts`).

### Phase 7b fix workstream (await **执行 Phase 7b**)

| Step | Command / action | touches |
|------|------------------|---------|
| 1 | Sync `staging/seed/agents/` from package (or document build-only path) | GUID_VISIBLE |
| 2 | `.\ccb-installer\scripts\build-wanding.ps1` (or hot `seed`+`dist` component) → vendor MCP | MCP_VENDOR |
| 3 | `.\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd` | GUID_VISIBLE |
| 4 | Restart AionUI; Guid → **供应商名录** card | GUID_VISIBLE |
| 5 | `.\ccb-installer\scripts\test-mcp-health.ps1 -Probe -Session` incl. `suppliers_list` | MCP_VENDOR, REG |
| 6 | Agent smokes A/B/C (土工布/双林/管材车) | AGENT.001 |
| 7 | Extend `config/agents/README.md` health expected lines for supplier + work-tasks | REG |

## Phase 8 — Data fidelity (HTML → Org, 零信息损失)

**User request (2026-07-12):** 对照 WXWork `index.html` — (1) 缺少距离列 (2) 多余 `;;` 符号与产品展示 (3) 尽可能多列，求同存异。

**Root cause (evidence):**

- Parse `FIELD_MAP` only 11/18 HTML fields; migration `022` has `spec`/`moq`/… columns but **service/API never read/write them**.
- Distance lives in `备注` (`距仓库约17km`) — stored in `notes`, not surfaced as column.
- UI renders raw `products_text` including `;;` grouping tokens.
- HTML-only multi-address: 凌威 (7km+10km), 奎鑫 (双地址) hardcoded in `buildCard()` — not in `allData`.

**Column target (browse table + detail drawer):**

| Column | Source |
|--------|--------|
| 工厂 / 品类 | existing |
| **距离(km)** | `distance_km` extracted from 备注; min km for multi-location |
| 产品摘要 | grouped flat count, no `;;` |
| 地址 | primary; drawer shows `locations_json[]` |
| 联系人 / 电话 / WA / 邮箱 | all exposed |
| 编码 / 等级 / 资质 | full FIELD_KEYS |
| 规格 / 材质 / 单价 / MOQ / 交期 | row-level cols (empty OK, show `—`) |
| 备注 | **non-distance** remainder only |

**Implementation sketch (serial):**

1. **8a** — Copy user HTML to `research/index-supplier-directory.html`; finalize `research/fidelity-gap.md` + `research/seed-overlays.json`.
2. **8b** — Extend parse:
   - Full 18-field `FIELD_MAP`
   - `extract_distance_km(notes) → (km, notes_clean)`
   - `parse_products_grouped()` port of HTML `splitProductsGrouped` → `products_json`
   - Keep raw `products_text` for MATCH hash compatibility
   - Merge overlays for 凌威/奎鑫
3. **8c** — Migration `023_supplier_fidelity.sql`:
   - `distance_km INTEGER` (nullable)
   - `locations_json TEXT` (JSON array: `{type,address,distance_km,phone,contact}`)
   - Wire existing `spec, tech_params, material, price_note, moq, lead_days, qualification` in service + DTO + upsert
   - Bump `seed_version` → 2; re-seed updates unlocked rows
4. **8d** — VPS re-bootstrap after deploy; verify 27 suppliers.
5. **8e** — `SuppliersPage`: add distance + grade + WA/email columns; detail drawer product sub-table (6 cols, `—` when empty); locations list for multi-addr.
6. **8f** — Confirm `flat_products()` still matches Fixture A; update spec `WANd.SUPPLIER.FIDELITY.001`.

**Out of scope Phase 8:** Indonesian translation dictionary (`ID_TRANS`); emoji; per-product SKU price library sync.

**Approval gate:** User says **执行 Phase 8** before coding.

## Verification profile and gate

**Selected:** Cross-repo + UI (+ Security on Phase 4)

1. Contract Verification  
2. **code-reviewer** each code phase  
3. trellis-update-spec → `supplier-directory.md` (§1: 禁止与价格库/Accurate 互相替代)  
4. jsonl + prd AC  
5. commit only if asked  
6. finish-work  

## Manual steps (human)

- [x] RBAC + full 3-mode + dedicated agent + Org tables SoT  
- [x] Contract pack + plan **approved**  
- [x] 「执行」→ Phase 1 (schema + read + seed)  
- [x] Phase 2 match scorer GREEN  
- [ ] Env: `SUPPLIER_DIR_ADMIN_USERNAMES=admin`  
- [ ] Smokes: fixtures A/B/C + whitelist edit + other account + 403  
- [x] **Phase 7b:** vendor MCP + ccb-mcp.json + deploy-seed -ForceMd (restart AionUI + Agent smokes A/B/C still pending)
- [x] **Phase 7c:** NL query normalize + MCP CSRF retry + agent `q` contract (`p7c-nl-query-mcp-hardening-done.md`)  

## Recovery and re-approval

| Trigger | Return to | Re-approval? |
|---------|-----------|--------------|
| Glossary deferred (zh-only match) | Phase 2 note | no if Fixture A still passes |
| Live Lalamove API | new task | yes |
| Skip confirmed writes | **blocked** | must re-approve (safety) |

## Defer / out of scope

- HTML pixel skin / emoji  
- Live Lalamove pricing  
- Auto-link ↔ price `supplier` column  
- Accurate vendor sync  

## Locked defaults

| Topic | Decision |
|-------|----------|
| Source of truth | **Org SQLite tables** (`suppliers` + `logistics_vehicles`); see `research/storage.md` |
| UI | `#/suppliers` 三模式（AionUI-native） |
| Agent shape | Dedicated `supplier-directory-agent` + own MCP (not quotation; not knowledge md/Grep SoT) |
| Agent write | confirmed preview like price-library |
| Quotation | Delegate directory questions; O-column stays price-library `supplier` |
| Empty whitelist env | deny writes |
| Fixtures | `research/match-fixtures.md` |
| Seed | `research/seed-contract.md` |
| implement/check context | filled jsonl (2026-07-12) |
