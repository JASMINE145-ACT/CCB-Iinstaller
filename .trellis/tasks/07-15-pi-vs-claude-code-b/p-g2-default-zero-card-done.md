# p-g2 — Guid zero-card default ON

**Date:** 2026-07-15  
**Phase:** G2  
**Repo:** `D:\Projects\aionui-src`

## Delivered

| Item | Detail |
|------|--------|
| Default | **on** — `isGuidZeroCardEnabled()` → `true` when `ccb_guid_zero_card` unset |
| Opt-out | `localStorage.ccb_guid_zero_card=0` restores Guid assistant cards |
| Scope | Unchanged from G1 — Guid-only via `useCustomAgentsLoader` + `applyGuidZeroCardList` |
| Shared catalog | `fetchAssistantsCatalog` / Team / Settings **untouched** |
| Admin escape | `#/price-library` route + `orgDatabaseNavRegistry` sider entry — static tests PASS |

## Evidence

- `vitest run tests/unit/common-config/ccbAgentCatalog.test.ts tests/unit/common-assistants/fetchAssistantsCatalog.test.ts` → **12 pass**
- `bun test tests/unit/renderer/orgDatabaseNavRegistry.test.ts` → **3 pass** (price-library registered)
- code-reviewer **PASS** (Layer A PASS · Layer B PASS) — [G2 review](14421615-1786-49ae-ad69-33edc83173eb)

## Opt-out (manual)

```js
localStorage.setItem('ccb_guid_zero_card', '0'); location.reload()
```

## Files touched (G2 scope)

- `packages/desktop/src/common/config/guidZeroCard.ts`
- `packages/desktop/src/common/config/storageKeys.ts`
- `tests/unit/common-config/ccbAgentCatalog.test.ts`
- `tests/unit/common-assistants/fetchAssistantsCatalog.test.ts`

## Remaining (not G2)

- Manual UI smoke: open app → Guid shows no cards → sider 数据库 → 价格库 loads `PriceLibraryPage`
- Reopen session identity drift (PRD Guid AC)
