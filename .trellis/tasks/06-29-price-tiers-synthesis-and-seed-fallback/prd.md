# Price tiers — synthesis after tool + seed full-tier fallback

## Problem

User asked「可以告诉我全部的价格么」in **quotation-agent** direct session. Agent called `get_product_price_tiers` for `8020020755` (直通 dn50). **Tool succeeded** (Output JSON visible in UI) but assistant follow-up was:

> 你最后一条消息没有内容，请告诉我你需要什么帮助？

User did **not** send a second message. This is not MCP hard failure.

### Repro Output (2026-06-29)

```json
{
  "code": "8020020755",
  "material_code": "8020020755",
  "description": "直通(管箍)PVC-U排水配件白色 dn50",
  "product_type": "国标",
  "tier_count": 1,
  "tiers": [{ "field": "price_b", "label": "B档报单价", "price": 1519 }],
  "price_source": "bundled_seed",
  "price_stale": true
}
```

### Two layered gaps

| Layer | Gap |
|-------|-----|
| **A. Agent synthesis** | After valid `tool_result`, agent must Read `data.Md` + output tier table; must **not** claim empty user message. No PostToolUse / ROE gate on `get_product_price_tiers` (unlike `match_quotation`). |
| **B. Data completeness** | `org_price_client._load_bundled_seed()` exposes only `price_b` per SKU. `get_product_price_tiers` uses org path first → **tier_count=1** even when full xlsx has factory / price_e / etc. User request「全部价格」is under-delivered offline. |
| **B1. Stale Prod token (fixed 2026-06-29)** | `%APPDATA%/AionUi/.../org-session.token` (expired, HTTP 401) was chosen before `%APPDATA%/AionUi-Dev/...` (fresh). UI `#/price-library` used Dev JWT; MCP Python fell back to `bundled_seed`. **Fix:** `_org_session_token_candidates()` + `_api_get` tries each unique JWT until GET 200. |

### B1 closure (2026-06-29) ✅

- **Code:** `python/admin/org_price_client.py` — multi-candidate token probe on 401
- **Tests:** `tests.test_org_price_client.TestApiGet` — 401 all fail / second succeeds / dedupe
- **Spec:** `.trellis/spec/integration/price-library.md` § Org JWT for quotation MCP
- **Live:** `get_price_data(force_refresh=True)` → `source=org_api`, `products=3082` (no `ORG_SESSION_TOKEN_FILE` override)
- **Vendor sync:** `sync-dev-wanding-vendor.ps1` run 2026-06-29

### A closure — Agent synthesis nudge (2026-06-29) ✅

- **Hook:** `post-price-tiers-nudge.py` — PostToolUse on `get_product_price_tiers` success
- **Seed:** `quotation-agent.md` frontmatter restores `PostToolUse` (match + tiers) + L1 硬约束
- **Tests:** `test_knowledge_read_gate.py` `TestPostPriceTiersNudge`

### B2 closure — bundled_seed xlsx supplement (2026-06-29) ✅

- **Code:** `price_tiers.py` — `_should_supplement_tiers` + `_merge_tier_lists` + df-row local lookup
- **Tests:** `test_price_tiers.py` — `test_bundled_seed_supplements_from_local_xlsx`

## Goals

1. **P0 — Tool result → user-visible table**  
   Agent reliably synthesizes tier reply in the same turn after successful `get_product_price_tiers`.

2. **P0 — Full tiers on degraded source**  
   When org product dict is sparse (`bundled_seed` / thin LKG), merge or fall back to `_lookup_local_tiers` from full `price_library` xlsx so non-zero columns appear.

3. **P1 — Hooks**  
   PostToolUse nudge (Read `data.Md` + format `tiers[]`); extend ROE / Stop so tier query cannot end without price table when tool succeeded.

4. **P1 — Stale honesty**  
   When `price_stale` / `bundled_seed`, assistant states data source and suggests org login for center v2.

## Non-goals

- Replacing MiniMax model (may still need prompt + gate mitigation).
- Full duplicate of `06-28-quotation-tool-interrupted-repeat` unless repro shows `[Tool use interrupted]` (this incident had **complete Output**).

## Proposed approach

### Python (`price_tiers.py`)

```
get_product_price_tiers(code)
  org product from get_price_data()
  if product dict has fewer quotable fields than local xlsx row:
      merge tiers from _lookup_local_tiers OR prefer local when source in (bundled_seed, lkg_snapshot) and tier_count thin
  attach price_source, price_stale, tier_count
```

Consider threshold: e.g. if org path yields `tier_count < 2` but local xlsx has more non-zero fields → supplement.

### Agent + gate (`ccb-subagent-gate`)

- New `post-price-tiers-nudge.py` (mirror `post-match-knowledge-nudge.py`) on `mcp__quotation__get_product_price_tiers` success.
- Nudge text: Read `data_md_path`; output markdown table; forbid「没有内容」/ empty-user deflection.
- Optional: `quotation-tiers-synthesis.sh` Stop validator when last msg lacks tier table after successful tier tool.

### Prompt (`quotation-agent.md`)

- Explicit: after `get_product_price_tiers` **success**, next assistant text **must** include tier table — never respond as if user sent empty message.
- If `tier_count=1` and `price_source=bundled_seed`, say so and mention login for full center library.

## Acceptance criteria

| # | Check | Pass |
|---|--------|------|
| 1 | Unit: `8020020755` via bundled_seed path returns **>1** tier when xlsx has factory/price_e (or documents explicit merge rule) | `tests.test_price_tiers` |
| 2 | Unit: registry unchanged | `tests.test_quotation_mcp_tool_registry` |
| 3 | Code review PASS | trellis-check / code-reviewer |
| 4 | E2E manual: new quotation session, ask「8020020755 全部价格」 | Read data.Md + tier table; **no**「没有内容」 |
| 5 | E2E with org login | `price_source=org_api`, tier_count matches `#/price-library` spot-check |
| 6 | Spec updated | `price-library.md` § Multi-tier + seed fallback |

## Operator checklist (post-fix)

| Step | Status (2026-06-29) |
|------|------------------------|
| `sync-dev-wanding-vendor.ps1 -RepoRoot d:\Projects\claude-code-best` | ✅ |
| `deploy-subagent-gate-skill.ps1` | ✅ |
| `deploy-seed-agents.ps1 -ForceMd` | ✅ |
| Restart dev + **new** quotation conversation | ⏳ user |
| E2E「8020020755 全部价格」→ tier table, no「没有内容」 | ⏳ user |

```powershell
.\ccb-installer\scripts\sync-dev-wanding-vendor.ps1 -RepoRoot d:\Projects\claude-code-best
.\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd
.\ccb-installer\scripts\deploy-subagent-gate-skill.ps1
# restart dev + NEW quotation conversation
```

## References

- Parent: [`06-28-product-price-tiers-tool`](../06-28-product-price-tiers-tool/)
- Parent: [`06-28-price-tiers-data-md-read-hook`](../06-28-price-tiers-data-md-read-hook/)
- Related ACP: [`06-28-quotation-tool-interrupted-repeat`](../06-28-quotation-tool-interrupted-repeat/) (orphaned tool_use — different symptom)
- Spec: `.trellis/spec/integration/price-library.md` § Multi-tier query + data.Md read hook
