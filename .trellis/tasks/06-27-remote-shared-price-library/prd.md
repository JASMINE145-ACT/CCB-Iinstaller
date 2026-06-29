# Remote Shared Price Library and AionUI Price Management

## Goal

Replace the install-local Excel price authority with a remotely managed shared price
library so authorized users can update prices centrally and all CCB-Wanding/AionUI
clients consume consistent pricing. Add an AionUI management UI for safe price search
and modification.

## What I Already Know

- Quotation matching currently reads a bundled Excel file from the installed WanD
  data directory. Production defaults to `price_library_cleaned_2026_05_15.xlsx`; the
  legacy `wanding_price_lib.xlsx` remains in smoke and compatibility paths.
- Real-time inventory is a separate AOL API/database concern and must remain
  independent from price-library ownership.
- The quotation MCP and Python quotation/inventory modules own business behavior.
- AionUI is the shell UI; CCB-Wanding remains runtime authority for quotation.
- Price changes must be shared across installations instead of copied into every
  installer or hot update.
- Organization knowledge already demonstrates the target pattern: org JWT, org HTTP
  bridge, API-first reads with local fallback, optimistic concurrency, history, and
  revert — see `.trellis/spec/integration/org-knowledge.md`.

## Assumptions (Temporary)

- Existing Excel columns and product codes remain the migration source of truth.
- The remote service needs authenticated reads and role-restricted writes.
- Price changes need validation, audit history, and rollback.
- Quotation lookup must have an explicit behavior when the remote service is down.
- Bundled install Excel becomes a **bootstrap seed**, not runtime authority, after
  rollout. First-ship offline behavior is preserved through seed → LKG snapshot
  promotion, not through live Excel reads.
- Price-library content updates deploy through the **organization service**, not
  through CCB-Wanding hot-update manifest (same boundary as org knowledge).

## Open Questions

- **Resolved in this PRD:** fresh-install bootstrap, bundled seed role, offline
  fallback duration, and delivery split (NSIS vs hot). See §Bootstrap and Offline
  Contract and §Delivery Split.
- **Deferred (document behavior, spike if needed):** long ACP session with expired
  org JWT — quotation runtime should attempt one re-read of the org token file before
  falling back to LKG; if token refresh is unavailable in-process, stale snapshot +
  visible warning is acceptable for MVP.
- **Deferred (MVP default):** AionUI read-only table refresh uses fetch-on-mount and
  manual refresh; org WS push for price-library updates is optional follow-up (org
  knowledge already has `org-knowledge.updated` precedent).

## Requirements (Evolving)

### Authority and access

- Central shared price authority on the existing organization AionCore service.
- The price API uses the organization base URL, JWT validation, user directory, and
  deployment boundary. No separate price-service account system.
- Price mutation requires a dedicated `price_admin` authorization. Existing `manager`
  status alone does not grant price-write access.
- Non-price-admin managers and employees may receive read access but cannot create,
  update, import, revert, or publish price data.
- `price_admin` assignments are maintained only in server configuration. AionUI does
  not expose grant or revoke controls.
- Every authenticated organization user may read the active remote price library.
- Only identities listed as `price_admin` in server configuration may access drafts
  or perform mutations.
- Unauthenticated or expired sessions cannot read the remote API; quotation may use
  the local last-known-good snapshot with the required stale warning.

### Draft, publish, and audit

- Price edits are isolated in a draft and do not affect active quotation reads.
- A price administrator explicitly publishes the whole draft atomically. One
  successful publish creates one immutable active library version.
- Publication validates all changed rows before activation; partial publication is
  not allowed.
- The AionUI MVP supports full product-master editing: all product fields and price
  levels, adding products, deleting products, and changing material/product codes.
- Each product has an immutable internal ID. The editable material/product code is a
  versioned business field, not the database primary key.
- Product-code uniqueness is validated within each published library version.
- Historical quotation and audit records retain the product identity and values that
  were active when they were created.
- Product deletion is soft deletion. Deleted products are excluded from new
  quotation matching after publication but remain in version history and audit data.
- Restoring a deleted product creates a new draft change and a new published version;
  it never rewrites an older version.
- Operations assume one designated price administrator. The MVP does not implement
  multi-admin presence, row locks, draft merging, or separate change sets.
- Optimistic version checks still protect against accidental overwrite from multiple
  windows or stale browser state using the same administrator account.
- Every mutation records actor, time, previous value, new value, and reason.
- A prior published library version can be restored through the history/revert flow.

### Excel import and migration

- Excel import supports both initial migration and ongoing bulk updates.
- Import always targets the draft. It never mutates or publishes the active library
  directly.
- Before applying an import to the draft, AionUI shows validation results and a
  create/update/delete/error summary.
- Routine Excel import uses merge/upsert semantics. Rows present in the workbook are
  created or updated; products absent from the workbook remain unchanged.
- Import never infers deletion from a missing row. Products are soft-deleted only by
  an explicit administrator action in AionUI.

### Quotation runtime and cache

- Existing quotation matching remains compatible with product codes and customer
  price levels.
- Multiple clients observe updates without reinstalling CCB-Wanding.
- Inventory lookup remains a separate integration.
- Before every quotation operation, the runtime performs a lightweight active-version
  check.
- If a newer version exists, the runtime downloads and validates it, atomically
  replaces the last-known-good snapshot, and uses it for that quotation.
- Therefore a newly published version is used by another online client on its next
  quotation query. If the version check fails, the runtime uses the existing snapshot
  and marks the quote stale.
- One quotation operation pins one snapshot version; it must not mix remote and
  cached versions across line items.
- When the remote price service is unavailable, quotation may use the last-known-good
  local snapshot.
- The last-known-good snapshot has no hard expiration. Quotation remains available
  regardless of snapshot age while the remote service is unavailable.
- Offline fallback must never be silent: responses and AionUI must show that the
  price may be stale, plus snapshot version and last synchronization time.
- The stale warning must also be persisted into generated quotation metadata/output,
  not only shown transiently in AionUI.
- Remove path-only process caching as the authority; cache by published version and
  call `invalidate_wanding_cache()` when the active snapshot version changes.

### AionUI

- AionUI adds a dedicated sidebar `Price Library` route/page.
- The page uses a dense searchable table. Authenticated non-admin users get a
  read-only view; `price_admin` additionally gets draft editing, Excel import,
  publish, history, and revert actions.
- Read-only users see active published data fetched through the org HTTP bridge
  (fetch on mount; manual refresh in MVP).

### Bootstrap and packaging

- Canonical production workbook for migration:
  `price_library_cleaned_2026_05_15.xlsx`.
- Legacy `wanding_price_lib.xlsx` is removed from smoke, E2E, and runtime default
  paths before rollout (PR0).
- Bundled install Excel remains shipped as **bootstrap seed only** until the client
  has a promoted LKG snapshot from the organization service.
- On first successful authenticated sync, the runtime promotes the remote active
  version into the LKG snapshot store and stops treating bundled Excel as authority.
- When org is unreachable and no LKG snapshot exists yet, quotation may use the
  bundled seed with an explicit `source=bundled_seed` stale warning — preserving
  first-ship offline quotation capability.
- When org is unreachable and an LKG snapshot exists, quotation uses LKG regardless
  of snapshot age with the required stale warning.
- Price content changes do not require CCB hot-update or NSIS reinstall. AionUI Price
  Library UI requires NSIS (or dev build) like `/org-knowledge`; runtime remote
  client may ship earlier via hot-update components (`python`, `quotation-mcp`).

## Bootstrap and Offline Contract

This section amends the prior first-ship assumption ("local Excel is runtime
authority") documented in `.trellis/spec/integration/wanding-first-ship.md` §0.

```
┌──────────────────────────────────────────────────────────────────┐
│                     QUOTATION PRICE SOURCE                        │
└──────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   ┌───────────┐      ┌──────────────┐     ┌──────────────┐
   │ Org API   │      │ LKG snapshot │     │ Bundled seed │
   │ (fresh)   │      │ (cached)     │     │ (first boot) │
   └─────┬─────┘      └──────┬───────┘     └──────┬───────┘
         │                   │                    │
         │  version check    │  org down /        │  org down &
         │  + download       │  auth fail         │  no LKG yet
         ▼                   ▼                    ▼
   pin one version      stale warning         stale warning
   for whole quote      + version + time      source=bundled_seed
```

| State | Quotation behavior | Warning |
|-------|-------------------|---------|
| Org reachable + valid JWT | Use active version (refresh LKG if newer) | None |
| Org down / auth fail + LKG exists | Pin LKG version | Stale + version + last sync |
| Org down / auth fail + no LKG | Use bundled seed | Stale + `source=bundled_seed` |
| Publish on server | Next quotation on any online client picks up new version | None |

Bundled seed must stay in the install package for disaster recovery and first-boot
offline use. It is **not** overwritten by hot update as the live authority.

## Delivery Split

| Layer | What ships | Delivery | Spec anchor |
|-------|------------|----------|-------------|
| Org AionCore price API + SQLite | New crate, migrations, VPS deploy | Org service rollout | `org-knowledge.md`, `aioncore-work-tasks.md` |
| Python price client + matcher | `python/admin/org_price_client.py`, snapshot store | Hot: `python`, `quotation-mcp` | `wanding-packaging-whitelist.md` §16 |
| AionUI Price Library page | Route, sidebar, org HTTP adapter | **NSIS only** (like `/org-knowledge`) | `internal-update.md` |
| Bundled xlsx in `data/` | Bootstrap seed | NSIS full install; role changes in spec | `wanding-first-ship.md` §1.2.1 |

Price-library **content** updates never go through CCB manifest hot zip — same rule as
org business knowledge (`internal-update.md`).

## Spec and Packaging Updates (Definition of Done)

Update Trellis specs when implementation lands:

| Spec | Change |
|------|--------|
| `.trellis/spec/integration/wanding-first-ship.md` | Offline quotation via seed/LKG, not live Excel authority |
| `.trellis/spec/integration/wanding-packaging-whitelist.md` | xlsx = bootstrap seed; pack gate wording |
| `.trellis/spec/integration/dev-sync-playbook.md` | Snapshot path + canonical price file |
| `.trellis/spec/backend/file-map.md` | Price data boundary → org API + LKG store |
| `.trellis/spec/integration/org-knowledge.md` | Cross-reference price-library parallel |
| `.trellis/spec/integration/aioncore-work-tasks.md` | New crate, min aioncore version |
| `.trellis/spec/integration/internal-update.md` | NSIS checklist entry for Price Library UI |

## Acceptance Criteria (Evolving)

### Access and authorization

- [ ] Authorized `price_admin` users can search and update a product price in AionUI.
- [ ] Unauthorized users cannot mutate prices.
- [ ] A manager without `price_admin` receives a server-side authorization failure
  for every price mutation endpoint.
- [ ] Changing the server-side price-admin configuration changes authorization after
  the documented reload/restart procedure.
- [ ] AionUI contains no endpoint or control for granting price-admin access.
- [ ] An authenticated employee can read active prices but receives authorization
  failure for draft and mutation endpoints.
- [ ] Price endpoints authenticate with the existing organization JWT and require no
  second login.

### Outage, bootstrap, and pinning

- [ ] Remote outage falls back to the last-known-good snapshot when one exists,
  regardless of age.
- [ ] Fresh install with org unreachable and no LKG uses bundled seed with visible
  `source=bundled_seed` stale metadata.
- [ ] First successful org sync promotes remote active version into LKG and subsequent
  quotes prefer LKG/org over bundled seed.
- [ ] Cached quotation output includes a visible stale warning, snapshot version,
  and last synchronization time when not on live org data.
- [ ] All rows in one generated quotation use the same price-library version.
- [ ] A cached quotation generated from an arbitrarily old snapshot remains
  possible and auditable.
- [ ] An unauthenticated remote read is rejected and the runtime follows the explicit
  stale-snapshot or bundled-seed fallback path.
- [ ] Snapshot replacement is atomic and a failed download/validation cannot corrupt
  the prior last-known-good snapshot.
- [ ] Remote outage behavior is deterministic and visible.

### Draft, publish, and product master

- [ ] Draft edits are invisible to quotation reads until publication.
- [ ] A successful publish atomically activates every validated draft change under
  one new version.
- [ ] Any invalid row rejects the entire publish and leaves the prior active version
  unchanged.
- [ ] A price administrator can add, edit, delete, and recode a product in a draft.
- [ ] Duplicate product codes prevent publication with row-level validation errors.
- [ ] Changing a product code does not corrupt historical quotation or audit records.
- [ ] A soft-deleted product is absent from active matching but remains inspectable
  in history and can be restored through a new publication.
- [ ] Saving from a stale draft revision returns a conflict instead of overwriting a
  newer draft revision.
- [ ] Every mutation records actor, time, previous value, new value, and reason.
- [ ] A prior price version can be restored.

### Import and migration

- [ ] Initial Excel migration preserves every supported product and price field or
  reports the rejected row explicitly.
- [ ] Routine Excel import produces a reviewable diff before changing the draft.
- [ ] Importing a workbook never publishes prices automatically.
- [ ] Importing a partial workbook does not delete or deactivate products omitted
  from that workbook.
- [ ] Existing Excel data can be imported and validated without silent row loss.
- [ ] Smoke and E2E use `price_library_cleaned_2026_05_15.xlsx` (or remote snapshot),
  not legacy `wanding_price_lib.xlsx`.

### Multi-client and UI

- [ ] A successful publish is visible to another client without reinstalling.
- [ ] A second online client uses a newly published version on its next quotation
  query without restart or manual synchronization.
- [ ] Quotation MCP uses the intended remote version and reports its source/version.
- [ ] The Price Library sidebar entry opens a full-page searchable table.
- [ ] The same page is read-only for normal users and exposes editing/publish/history
  controls only for `price_admin`.
- [ ] `build-wanding.ps1` pack gate still requires bundled seed xlsx present; seed
  role documented in spec (not runtime authority).

## Definition of Done

- Backend API, storage schema, AionUI UI, and quotation runtime integration completed.
- AionCore org binary includes price-library crate; VPS deploy runbook updated.
- Unit, integration, authorization, concurrency, migration, bootstrap, and outage tests pass.
- Build/typecheck/lint pass for affected repositories.
- Operational backup, restore, rollout, and rollback notes are documented.
- Trellis specs listed in §Spec and Packaging Updates are amended.

## Delivered — MVP (2026-06-28, task closed)

**Closure doc:** [`mvp-closure-2026-06-28.md`](./mvp-closure-2026-06-28.md)

MVP scope (shared remote read + VPS publish) **done**. Full PRD acceptance above remains **open** for deferred items (admin UI, quotation stale output, fleet E2E, PR0 smoke paths).

| MVP criterion | Status |
|---------------|--------|
| Org API + VPS published active (3082 products) | ✅ |
| Employee read via org JWT (`GET /active`) | ✅ API; UI wired |
| Quotation org client in repo + vendor sync path | ✅ code; E2E deferred |
| Ops import/publish (CSRF curl) | ✅ runbook + fleet v1 |
| Read-only AionUI price library page | ✅ |
| Trellis `price-library.md` | ✅ |

## Out of Scope (Temporary)

- Replacing the existing AOL inventory service.
- General-purpose spreadsheet collaboration.
- Multi-administrator live collaboration, draft merge, and row locking.
- Editing unrelated business knowledge documents from AionUI.
- Removing Excel export/import as an administrative migration tool.
- Org WS push for price-library updates (optional follow-up).

## Technical Notes

### Spec cross-references

| Topic | Path |
|-------|------|
| Backend file map | `.trellis/spec/backend/file-map.md` |
| Config authority | `.trellis/spec/integration/aionui-config-inventory.md` |
| Org knowledge pattern (closest analog) | `.trellis/spec/integration/org-knowledge.md` |
| AionCore crate / RBAC / HTTP bridge | `.trellis/spec/integration/aioncore-work-tasks.md` |
| Unified org SSO / JWT | `.trellis/spec/integration/unified-org-sso-rollout.md` |
| First-ship / offline contract | `.trellis/spec/integration/wanding-first-ship.md` |
| NSIS vs hot-update boundary | `.trellis/spec/integration/internal-update.md` |
| Packaging whitelist / data/ | `.trellis/spec/integration/wanding-packaging-whitelist.md` |

### Current data and code anchors

| Item | Path |
|------|------|
| Canonical production workbook | `data/price_library_cleaned_2026_05_15.xlsx` |
| Legacy (remove from defaults) | `data/wanding_price_lib.xlsx` |
| Installed seed | `D:\CCB-Wanding\vendor\wanding\data\*.xlsx` |
| Matcher + cache | `python/inventory/services/wanding_fuzzy_matcher.py` |
| Config default | `python/inventory/config.py` → `PRICE_LIBRARY_PATH` |
| Org knowledge client (pattern) | `python/admin/org_knowledge_client.py` |
| Planned price client | `python/admin/org_price_client.py` (new) |
| LKG snapshot store | `%APPDATA%/AionUi/aionui/price-library/` (planned) |
| AionCore crate (planned) | `AionCore/crates/aionui-price-library/` |
| AionUI org HTTP | `packages/desktop/src/common/adapter/orgHttpBridge.ts` |

### Cross-layer flow

```
AionUI renderer
  → orgHttpBridge / ipcBridge.priceLibrary.*
  → Org AionCore /api/price-library/*
  → SQLite

quotation MCP / Python
  → org_price_client (JWT from org-session.token)
  → version check → download snapshot → LKG store
  → wanding_fuzzy_matcher (cache keyed by version, not path)
```

## Research References

- [`research/current-price-flow-and-options.md`](research/current-price-flow-and-options.md)
  - Current source path, cache behavior, reusable organization patterns, and three
    remote-storage options.

## Research Findings

- Production defaults to `price_library_cleaned_2026_05_15.xlsx`; the legacy
  `wanding_price_lib.xlsx` remains in smoke/compatibility paths. Migration must
  establish one canonical source contract first (**PR0 blocker**).
- Existing matcher caches DataFrames by file path for the process lifetime, so a
  remote update requires explicit version invalidation via `invalidate_wanding_cache()`.
- AionUI already has organization JWT and `manager/employee` roles; price writes need
  the separate `price_admin` config list.
- Existing organization knowledge APIs demonstrate optimistic concurrency, history,
  revert, and API-first/local-fallback behavior.
- Existing AionCore work-task crates demonstrate server-side RBAC and tested SQLite
  migrations. Bundled aioncore v0.1.27 lacks new routes — self-built binary required
  (same gate as work-tasks / org-knowledge).
- Research flagged separating service/read from interactive/write credentials; MVP
  uses the same org user JWT with LKG fallback when auth fails.

## Feasible Approaches

### A. Structured Remote Price API (Recommended)

Add versioned product/price/audit tables to the organization AionCore service.
AionUI manages records through authenticated APIs. Quotation runtime consumes a
versioned snapshot and uses an explicit stale-cache policy. Excel becomes
import/export and bootstrap seed rather than runtime authority.

### B. Versioned Remote Excel

Store and replace the workbook as a versioned blob. This minimizes matcher changes
but creates whole-file conflicts and weak row-level audit/search behavior.

### C. External Collaborative Spreadsheet

Use a hosted spreadsheet API. This provides familiar editing but adds external
identity, quota, schema, and availability dependencies while still requiring an
AionUI adapter.

## Recommended MVP Boundary

- Structured remote product and price-level records on organization AionCore.
- Search/filter by code and description.
- **`price_admin`-only** mutations with reason, optimistic concurrency, audit history,
  and revert. Managers and employees are read-only unless listed as `price_admin`.
- Excel import/export (draft-only import; never auto-publish).
- Quotation reads a pinned library version per operation.
- Local last-known-good snapshot with **indefinite** fallback while org is
  unavailable, always visibly marked stale when not on live data.
- Bundled install Excel as bootstrap seed when no LKG exists yet.
- No maker/checker approval workflow in the first increment unless required by the
  business owner.

## Technical Approach

### Organization Service

- Add crate `aionui-price-library` with structured product, draft, published-version,
  version-item, and audit tables to the existing organization service binary.
- Add SQLite migration (next sequence after org-knowledge migrations).
- Read `price_admin` identities from server configuration and resolve them against
  organization users.
- Expose authenticated active-version/read APIs to all organization users.
- Expose draft/import/publish/revert APIs only to configured price administrators.
- Enforce optimistic revision checks and atomic publication in the service.
- Startup/health output reports resolved `price_admin` count; reject ambiguous config;
  document recovery if zero admins resolve (prevent lockout).
- Build via extended `scripts/build-aioncore-work-tasks.cmd`; deploy via existing VPS
  org deploy scripts. Minimum org aioncore version documented in spec.

### Quotation Runtime

- Add `python/admin/org_price_client.py` modeled on `org_knowledge_client.py`.
- Persist LKG snapshots under `%APPDATA%/AionUi/aionui/price-library/` with version
  metadata (version id, synced_at, source).
- Before each quotation operation, check the active version and refresh LKG when newer.
- Pin one version for the complete quotation operation.
- Fall back to LKG on remote failure; if no LKG, fall back to bundled seed with
  explicit metadata.
- Propagate stale/source/version metadata into tool results and generated quotation
  output.
- Cache matcher DataFrames by snapshot version; invalidate on version change.
- Re-read org token file once on 401 before declaring auth failure (MVP).

### AionUI

- Add dedicated sidebar Price Library page using the existing org HTTP bridge.
- Provide dense search/filter/table behavior for all authenticated users.
- Provide draft editing, add, recode, soft-delete, restore, Excel import preview,
  publish, history, and revert only when the server reports `price_admin`.
- Do not expose price-admin grant/revoke controls.
- Fetch active library on mount; manual refresh in MVP (WS push optional follow-up).

### Migration and path normalization (PR0)

- Define one canonical schema covering every supported field in
  `price_library_cleaned_2026_05_15.xlsx`.
- Normalize `python/inventory/config.py`, `ensure-wanding-settings.ps1`, smoke, and
  E2E away from legacy `wanding_price_lib.xlsx`.
- Import the current production workbook into the initial published org version with
  a row-by-row reconciliation report.
- Keep Excel import/export for ongoing bulk maintenance.
- Update pack gate docs: bundled xlsx required as seed, not as live authority.

## Implementation Plan

0. **PR0 - Path normalization and spec stubs (blocker)**
   Canonical price file in config/smoke/E2E; document bootstrap-seed contract in spec
   stubs; add LKG snapshot path constant; remove legacy path from default smoke.
1. **PR1 - Schema, service contracts, and org deploy**
   Add AionCore crate, migrations, domain types, RBAC/config resolution,
   draft/version services, integration tests, build/deploy script updates, and
   `price_admin` config schema + health output.
2. **PR2 - Import, publish, history, and rollback**
   Excel validation/diff, atomic publish, soft delete, immutable audit history,
   export, restore tests.
3. **PR3 - Runtime remote authority**
   `org_price_client`, LKG store, version checks, atomic snapshot refresh,
   pinned-version matching, stale fallback metadata, matcher cache by version,
   quotation regression tests. May ship via hot-update before PR4.
4. **PR4 - AionUI Price Library (NSIS)**
   Route, sidebar entry, read-only table, admin draft editor, import preview,
   publish, history, revert, responsive checks, Playwright coverage (`base: 'org'`
   pattern from org-knowledge E2E).
5. **PR5 - Data migration and fleet rollout**
   Import production workbook to org service, deploy VPS, enable clients, multi-client
   publish/next-query smoke, document rollback. Split from PR0/PR3 so staging can
   validate runtime before UI ships.

**Dependency note:** PR4 depends on PR1–PR2 for APIs; PR3 can land after PR1 read APIs
and may precede PR4. PR5 follows PR2 + PR3 at minimum.

## Explicit Out of Scope

- Maker/checker approval.
- Scheduled future price activation.
- Multi-administrator live collaboration and draft merging.
- AionUI controls for assigning price administrators.
- Replacing the AOL inventory API.
- A second authentication or account system.
- Org WS `price-library.updated` push (optional follow-up).

## Decision (ADR-lite)

### Price Mutation Authorization

**Context:** Pricing is more sensitive than general work-task administration.
Granting all organization managers price-write access is too broad.

**Decision:** Use a dedicated `price_admin` authorization assignment. It is checked
server-side for all price mutations and is independent of the existing
`manager/employee` work-task role.

**Consequences:**

- A manager is not automatically a price administrator.
- UI visibility and edit controls reflect the permission, but backend enforcement is
  authoritative.
- Grant/revoke is an operations action through server configuration, not an AionUI
  workflow.
- Configuration parsing must reject malformed or ambiguous identities.
- Startup/health output must report whether at least one configured price
  administrator resolves to a valid organization user.
- The bootstrap and recovery path must prevent permanent administrative lockout.

### Bootstrap and Offline Quotation

**Context:** `wanding-first-ship.md` promises offline-capable quotation via local
price data. Moving authority to the org service must not break first install or org
outage scenarios.

**Decision:** Three-tier source precedence for quotation: (1) live org active version,
(2) local LKG snapshot, (3) bundled install seed. Stale warnings are mandatory for
(2) and (3). Bundled Excel remains in the install package as seed/disaster recovery
only. Hot update does not replace live price authority.

**Consequences:**

- First-ship spec must be amended; offline quotation remains possible but metadata
  shows when data is not live.
- Pack gate still requires seed xlsx in full NSIS builds.
- PR0 normalizes legacy path confusion before runtime migration.
