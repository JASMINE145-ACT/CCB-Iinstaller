# Phase 5 done — AionUI `#/suppliers` three modes

**Date:** 2026-07-12  
**Repo:** `aionui-src` (`packages/desktop`)

## Delivered

| Item | Path |
|------|------|
| Route | `#/suppliers` in `Router.tsx` |
| Sider | `SiderSuppliersEntry` after 价格库 |
| Page | browse / product-match / vehicles |
| Bridge | `ipcBridge.supplierDirectory.*` → Org REST |

## Manual smoke (human)

- [ ] Open `#/suppliers` after Org login
- [ ] Browse `双林` → address has KITIC / Bekasi
- [ ] Match `土工布` → HAKUNA + 三信
- [ ] Vehicles table ≥10 rows
- [ ] Non-whitelist save → 403 message
