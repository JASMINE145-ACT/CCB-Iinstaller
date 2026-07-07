# PRD — CCB-Wanding 1.1.8 Release

## Goal

Ship **CCB-Wanding-1.1.8.exe** (Full NSIS) containing all dev-verified quotation/mapping changes since 1.1.7, with 1.1.7 release gates and **no VPS database side effects**.

## In scope

- Org-primary historical quotation mapping (Python + MCP + SKILL §D)
- drat → 丝扣弯头 matcher fix
- AionUI rebuild (`aionui-src` ≥ `6c65cce`)
- `config_generation` 5 → 6
- delivery + build log + sha256 + agent eval smoke ≥7/15

## Out of scope

- VPS manifest publish (unless user requests after package)
- Re-bootstrap VPS mapping / price / knowledge DB
- Local aioncore quotation-mapping crate embed (VPS already serves API)

## Acceptance

- [ ] `CCB-Wanding-1.1.8.exe` built; `Test-NsisPayloadCoverage` PASS (gen 6)
- [ ] Post-install: `dist/VERSION = 1.1.8`
- [ ] New Guid session: `match_quotation` uses org `历史报价` (803 rows on VPS)
- [ ] `delivery-1.1.8-*.md` with feature matrix signed off
- [ ] Agent eval smoke ≥7/15 (Guid path green)
