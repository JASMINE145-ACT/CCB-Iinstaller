# Current Price Flow and Remote Options

## Current Flow

1. `ensure-wanding-settings.ps1` injects `PRICE_LIBRARY_PATH` and
   `WANDING_PRICE_LIB_PATH` into the quotation MCP process.
2. Production configuration prefers `price_library_cleaned_2026_05_15.xlsx`.
   `wanding_price_lib.xlsx` is marked legacy/test-only in `inventory/config.py`,
   although the current E2E smoke explicitly points at it.
3. `wanding_fuzzy_matcher.py` loads all Excel sheets through pandas and caches the
   resulting DataFrame by resolved file path for the lifetime of the process.
4. Matching selects customer-level price fields and returns code, description, and
   unit price. Inventory is fetched independently through the AOL API.

## Existing Project Patterns

### Organization Knowledge

- Remote authenticated API with a local read-only fallback.
- JWT is shared between AionUI and CCB-Wanding through the org token file.
- Updates require `expected_version` and return conflict on stale writes.
- History and revert APIs already exist in the AionUI adapter.

### Work Tasks

- AionCore Rust crate owns schema, service, routes, and tests.
- JWT users have `manager` or `employee` roles.
- Server enforces RBAC; UI guards are secondary only.
- SQLite migrations and integration tests are established.

### Current Matcher Cache

- DataFrame cache is path-based and has no remote version invalidation.
- A remote design must either query structured rows directly or download a
  versioned snapshot and invalidate caches when its version changes.

## Feasible Approaches

### A. Structured Price API and Database (Recommended)

- Add an AionCore price-library crate and database tables for products, price
  levels, versions, and audit events.
- AionUI uses the existing org JWT and role model for search/edit/history/revert.
- Quotation runtime reads a versioned API snapshot and keeps a bounded local cache.
- Excel remains import/export and disaster-recovery format.

Pros:

- Correct concurrent editing, validation, filtering, audit, and rollback.
- Efficient product-code and text search.
- Clear remote authority and deterministic versioning.
- Fits existing org-knowledge/work-task architecture.

Cons:

- Largest implementation scope.
- Requires server deployment and a migration/import pipeline.

### B. Versioned Excel Blob on the Organization Service

- Upload/download the complete workbook as one versioned document.
- AionUI edits a grid then replaces the workbook using optimistic concurrency.
- Quotation runtime downloads the latest workbook and reuses the current matcher.

Pros:

- Lowest matcher migration cost.
- Preserves the workbook nearly unchanged.

Cons:

- Whole-file conflicts; poor concurrent editing.
- Harder field validation, audit diffs, search, and partial rollback.
- Large downloads and stale process caches remain.

### C. External Collaborative Spreadsheet

- Use a hosted spreadsheet as authority and sync it through its API.

Pros:

- Familiar bulk editing and collaboration UI.

Cons:

- Adds another identity, permission, API quota, and availability dependency.
- Harder to guarantee schema and atomic revisions.
- AionUI still needs a custom management surface and runtime adapter.

## Recommendation

Use Approach A. Reuse organization JWT, manager/employee roles, optimistic
concurrency, history/revert conventions, and server-side RBAC. Keep a versioned,
read-only local snapshot for temporary outages, but clearly label stale pricing and
never silently mix versions within one quotation.

## Key Risks

- Current default and smoke price-file paths disagree and must be normalized before
  migration.
- Price levels contain more than simple A/B/C/D fields, including margin and
  customer-specific variants; schema migration must preserve all supported fields.
- Remote updates must invalidate the matcher cache.
- A quote should pin one price-library version for the entire operation.
- Credentials currently available to the quotation process are user session tokens;
  service/read access and interactive/write access should be separated.

