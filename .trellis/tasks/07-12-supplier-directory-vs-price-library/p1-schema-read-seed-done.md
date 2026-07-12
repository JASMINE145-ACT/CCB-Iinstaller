# Phase 1 done — schema + read API + seed parse

**Date:** 2026-07-12  
**Contracts:** DIR.001, VEHICLE.001, SEED.001 (parse + upsert preserve logic)

## Delivered

| Item | Path |
|------|------|
| Migration 022 | `AionCore/crates/aionui-db/migrations/022_supplier_directory.sql` |
| Crate | `AionCore/crates/aionui-supplier-directory/` |
| Routes | `GET/POST /api/suppliers`, `GET /api/suppliers/{id}`, `GET/POST /api/logistics-vehicles` |
| RBAC | `SUPPLIER_DIR_ADMIN_USERNAMES` (empty=deny, case-insensitive) |
| HTML parse + tests | `scripts/org-phase0/supplier_directory_parse.py` + `test_supplier_directory_parse.py` |
| Bootstrap (HTTP) | `scripts/org-phase0/bootstrap-supplier-directory.py` |

## GREEN evidence

```text
python -m unittest test_supplier_directory_parse.py -v
→ 5 passed (suppliers≥27, vehicles=10, 双林 address, unique name_key)

cargo test -p aionui-supplier-directory --lib
→ 3 passed (RBAC empty deny, case-insensitive, normalize_name_key)

cargo check -p aionui-app
→ Finished ok
```

## Notes

- Seed **HTTP** bootstrap needs running aioncore + admin on whitelist + CSRF; not run in this phase against VPS.
- Match scorer / Agent / UI = later phases.
- Upsert `from_seed` preserves rows when `updated_at > seeded_at`.
