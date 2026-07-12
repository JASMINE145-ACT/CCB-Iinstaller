# Phase 8 fidelity — done (2026-07-12)

## Delivered

- Parse: full 18 HTML `FIELD_KEYS` + `distance_km` + `products_json` / `locations_json` overlays; `SEED_VERSION=2`
- Migration `023_supplier_fidelity.sql` on VPS Org DB
- AionCore service/DTO wiring; `#/suppliers` distance + products_summary + detail tables (aionui-src 1.1.9)
- Bootstrap: 27 suppliers / 10 vehicles on VPS; GSMI `distance_km=17`; 凌威 dual locations
- Spec: `WANd.SUPPLIER.FIDELITY.001` + seed fidelity principles in `supplier-directory.md`
- Hotfix: `supplier-directory-agent.md` UTF-8 mojibake restored + redeployed (`deploy-seed-agents -ForceMd`)

## Evidence

| Check | Result |
|-------|--------|
| `test_supplier_directory_parse.py` | 13/13 PASS |
| `cargo test -p aionui-supplier-directory` | 7/7 PASS |
| code-reviewer | PASS (Layer A/B N/A for md; fidelity code earlier PASS) |
| VPS migration 023 | PRAGMA columns present |
| Bootstrap | insert=0 update=27 / vehicles 10 |

## Residual (non-blocking)

- Full Guid Agent smokes A/B/C (土工布/双林/管材车) — operator spot-check after restart
- Duplicate `SUPPLIER_DIR_ADMIN_USERNAMES` lines on VPS `/etc/aionorg/env` — optional cleanup
