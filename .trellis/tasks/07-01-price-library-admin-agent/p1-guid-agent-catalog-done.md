# P1 — Guid agent + catalog `price_admin` gate

**Date:** 2026-07-02  
**Task:** `07-01-price-library-admin-agent`

## Delivered (repo-local)

| Repo | Change |
|------|--------|
| `claude-code-best` | `ccb-installer/config/agents/price-library-agent.md` + `.aionui.json` (`delegatable: false`, `requires_price_admin: true`) |
| `claude-code-best` | `CCB_WANDING_KEEP_AGENT_IDS` + `CCB_GUID_ONLY_AGENT_IDS` — not in router delegation index |
| `aionui-src` | `requires_price_admin` on `CcbAgentRecord`; `filterGuidCatalogAgents(agents, { isPriceAdmin })` |
| `aionui-src` | `resolveIsOrgPriceAdmin()` — probes `GET /api/price-library/draft` (200 ⇒ show card) |
| `aionui-src` | `ccbAgentCatalog.test.ts` — 3/3 bun pass |

## Verification

- `bun test tests/unit/common-config/ccbAgentCatalog.test.ts` → 3 pass
- code-reviewer → **PASS**
- `deploy-seed-agents.ps1 -ForceMd` → `price-library-agent.md` + `.aionui.json` in `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\`
- `sync-dev-wanding-vendor.ps1 -UpdateSettings` + `test-mcp-health.ps1` → price-library PASS

## User follow-up (P3)

1. ~~**Deploy agents to install dir**~~ ✅ 2026-07-02
2. **aionui-src build** — ship desktop with catalog gate (non-admin card hidden)
3. **Guid smoke:** admin upsert → publish → `version_number++`; report 409 if any

## Deferred (P1.5)

- Orchestrator delegate + CCB runtime gate for `Agent(price-library-agent)`
