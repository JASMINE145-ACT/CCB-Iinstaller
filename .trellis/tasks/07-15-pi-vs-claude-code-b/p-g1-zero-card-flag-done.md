# p-g1 — Guid zero-card flag (default off)

**Date:** 2026-07-15  
**Phase:** G1  
**Repo:** `D:\Projects\aionui-src`

## Delivered

| Item | Detail |
|------|--------|
| Flag | `localStorage.ccb_guid_zero_card=1` → Guid assistants + custom agents empty |
| Default | **off** (`isGuidZeroCardEnabled()` → false) |
| Scope | Guid-only via `useCustomAgentsLoader` + `applyGuidZeroCardList` |
| Shared catalog | `fetchAssistantsCatalog` / Team / Settings **untouched** |
| Filter API | `filterGuidCatalogAgents(..., { zeroCard: true })` → `[]` |

## Evidence

- `vitest run tests/unit/common-config/ccbAgentCatalog.test.ts` → **6 pass**
- code-reviewer **PASS** (Layer A PASS · Layer B PASS) — [G1 review](b978d0ce-3549-49f0-8f2c-86ca8b13ad1f)

## Enable (manual)

```js
localStorage.setItem('ccb_guid_zero_card', '1'); location.reload()
```

## Next

**G2** — default零卡 + 验 `#/price-library` 仍可达（需再批）。
