# PRD — Quotation match ranking fix (learn-by-data rows 9–10)

## Goal

Make **`match_quotation_union` → `candidates[0]`** match the same correct SKU that a knowledgeable quotation session already picks (user screenshot 2026-07-06: row 10 → `8030020808` 波纹管 PVC 电工套管 dn20 50M).

Fix must **not regress** row 8 (`PVC线管 20` → `8030050068`).

## Observed (learn-by-data batch, `show_candidates=true`)

| Row | keywords | actual | candidates[0] (wrong) | expected [0] |
|-----|----------|--------|----------------------|--------------|
| 8 | PVC线管 20 | 8030050068 | 8030050068 ✓ | — |
| 9 | PVC直接 20 | 8030020288 | 8010024410 (AW给水直接头) | 8030020288 (电工套管直通, **共同**) |
| 10 | 50卷波纹管 DN20 | 8030020808 | 8010062265 (PPR冷给水直管, **历史报价**) | 8030020808 (波纹管 PVC 电工套管 50M) |

## Root cause (planning session)

1. **MCP path** (`match_dispatch` → `build_selection_payload`) — **no** Python `llm_select_best`; learn-by-data compares **`candidates[0]`**.
2. **`_rank_compatible_candidates`** sorts by **semantic `compat_bonus` first**, `source` only third → **共同** and **字段正确** lose to higher fuzzy bonus on wrong family (给水直管 / AW直接头).
3. **Tokenization**: `50卷波纹管` → token `卷波纹管` fails substring match on `…波纹管…50M/卷`.
4. **Category gaps**: `波纹管` not in `_query_fitting` / pre-filter; `llm_selector` only boosts `双壁波纹管`.

## Acceptance criteria

- [ ] `candidates[0].code` for three keywords above matches table (live or fixture price lib).
- [ ] Row 9: if `8030020288` is `共同`, it ranks **before** any `字段匹配`-only AW 给水件.
- [ ] Row 10: `8030020808` ranks before PPR/HDPE `dn20 50M` water pipes.
- [ ] `append_business_rule`: reject **duplicate** rule text (normalized) — no double-append on learn-by-data reruns.
- [ ] Python unit tests RED→GREEN; `code-reviewer` + test gate per project contract.
- [ ] Spec touch: `.trellis/spec/backend/quotation-matching-engine.md` § ranking contract.

## Out of scope (initial)

- Re-enable internal LLM selector on MCP surface.
- Full mapping-table cleanup (wrong 历史 rows) — only ranking dampening.
- learn-by-data skill compare field change (optional follow-up if engine [0] still insufficient).

## References

- Spec: `.trellis/spec/backend/quotation-matching-engine.md`
- Skill: `ccb-installer/.../skills/quotation-learn-by-data/SKILL.md`
- Prior debug: user session rows 8–10 + screenshot 选型理由
