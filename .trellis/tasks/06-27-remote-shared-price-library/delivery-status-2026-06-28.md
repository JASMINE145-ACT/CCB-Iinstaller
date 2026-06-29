# Org API parity + price library — delivery status (2026-06-28)

## Milestone summary

| Area | Result |
|------|--------|
| AionCore router | work_tasks + org_knowledge + price_library merged |
| Local dev | `start-dev-full.ps1` + 3-route smoke **401** |
| VPS org API | build ~18 min → 3-route smoke **401** |
| VPS price data | **active v2, 3082 products, 41 fields** (2026-06-28) |
| AionUI | org knowledge error state; price library read-only |
| Quotation | `org_price_client` in repo + vendor sync script |
| Deploy fix | `deploy-org-aioncore-vps.ps1` extract `&&` + grep gate |

---

## Phase 2: full schema (2026-06-28)

| Item | Status |
|------|--------|
| Migration `017` + API/UI 41 columns | ✅ Code merged (AionCore + aionui-src) |
| `cargo test -p aionui-price-library` | ✅ 21 pass |
| Code review | ✅ PASS |
| VPS deploy + publish **v2** | ✅ version **2** / 3082; RUCIKA `product_type` + prices verified |
| Local import_ready + dev binary | ✅ 3082×41 col xlsx; bundled aioncore synced |
| Employee verify full columns in UI | ⏳ Deferred — optional sign-off |

See [`full-schema-2026-06-28.md`](./full-schema-2026-06-28.md).

---

## Documented pitfalls (→ `price-library.md`)

| Pitfall | Correct path |
|---------|----------------|
| `cp` to `/opt/aionorg/bin/aioncore` | systemd uses `AionCore/target/release/aioncore` |
| ExtractOnRemote silent fail (pre-2026-06-27) | grep `org_knowledge_routes` after extract |
| Crate on disk, router 404 | redeploy wired `aionui-app` + rebuild |
| POST import/publish without CSRF | cookie jar + `x-csrf-token` |
| Raw cleaned xlsx import | `prepare-price-library-import.py` → `import_ready` |
| Misread `3082` without `version_number` | validate `GET /active` with JWT |

---

## Task gap (remaining)

**Task status: `completed` (full schema v2, 2026-06-28).** MVP: [`mvp-closure-2026-06-28.md`](./mvp-closure-2026-06-28.md). v2: [`full-schema-2026-06-28.md`](./full-schema-2026-06-28.md).

| Item | Status |
|------|--------|
| Employee E2E `#/price-library` + quotation `org_api` | **Deferred** — user verify later |
| AionUI price_admin UI | Deferred — VPS curl |
| Quotation stale metadata in output files | Deferred — PRD |
| Full PRD acceptance checkboxes | Open — out of MVP scope |

---

## Spec / runbook updates (2026-06-28)

- `.trellis/spec/integration/price-library.md` — full code-spec
- `scripts/org-phase0/vps-price-library-runbook.md` — CSRF §3
- `scripts/org-phase0/minimal-shared-price-closure.md` — CSRF B1
- `scripts/org-phase0/vps-org-api-deploy-checklist.md` — verified banner
- `scripts/deploy-org-aioncore-vps.ps1` — extract fix (code)
- `.trellis/spec/integration/dev-sync-playbook.md` — recorded pitfall
