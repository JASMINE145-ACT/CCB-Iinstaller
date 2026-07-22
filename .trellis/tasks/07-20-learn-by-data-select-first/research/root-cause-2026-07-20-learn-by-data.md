# Root cause — learn-by-data thrash + wrong KB path (2026-07-20)

## Symptom (user Guid)

Uploaded `PT. Jinse7.1报价单.xlsx` +「按数据学习」. Trace showed:

1. **Wrong knowledge Read path** — attempted `%LOCALAPPDATA%\CCB-Wanding\.claude\vendor\...` (missing); match `selection_context.knowledge_source` correctly pointed at `D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md`.
2. **Bash / find DIY** after Read miss — violated skill hard rule「No Bash」and parent `WANd.QUOTE.NO_DIY.001`.
3. **Mangled / partial `select_quotation_candidates`** — not one full-batch `results` payload.
4. **Tool thrash** — rematch loops instead of serial parse → batch → select → compare; session blocked ~21 tools.
5. **Business deltas still real** (out of P0): row9 Elbow ½" 内丝 vs 普通 90°; row14 Elbow 3" 0 candidates; row15 Tee 3" RUCIKA vs LESSO — Section A draft only after path/select fixed.

## Phase 1 — reproduce / evidence

- Live ACP View Steps (user session 2026-07-20 evening).
- Skill dual text in `quotation-learn-by-data/SKILL.md`:
  - §选型一致性 table:「Step 2 第一次 batch 前 **Read**」+「已 Read 知识库前提下」全文列表自选.
  - Step 2 line ~138:「Before first `match_quotation_batch`: call `select_quotation_candidates` … Read only if `unable_to_select`」.
- Quotation L1 already normative **API-first**: `WANd.QUOTE.SELECT_API.001` / `WANd.QUOTE.SELECT_WIRE.001` (`quotation-agent.md` §选型 — match → select → Read only on unable).
- Spec note (`agents-unified-model.md` ~1191): historical path doubling / bash probe on Windows — same failure mode reappeared under learn-by-data.

## Root cause (not symptoms)

| # | Cause | Why it produces the symptom |
|---|--------|------------------------------|
| R1 | **Dual doctrine in skill** | Model oscillates between Read-first self-select and select-API-first; often does both badly (partial select + failed Read). |
| R2 | **KB path not pinned for learn path** | Skill says「同文件」but does not paste the canonical absolute shadow path + forbid re-concat under `.claude\`. Agent invents `%LOCALAPPDATA%\...\vendor\...`. |
| R3 | **Select payload discipline missing for learn** | No hard rule「batch 成功后 **一次** `select_quotation_candidates` 传入完整 `results`」; model sends mangled items / rematches. |
| R4 | **DIY escape after Read miss** | No explicit「Read 失败 → 用 selection_context.knowledge_source / 固定路径重试一次；禁止 Bash find」. |

## Non-causes

- Select MCP itself broken (normal price lookup path works with select).
- Excel parse path (user later confirmed fill/parse OK on other flows).
- Need to append Section A business rules before fixing R1–R4 (product priority: path+select first).

## Fix direction (P0 only)

1. Align `quotation-learn-by-data/SKILL.md` §选型一致性 + per-row algorithm to **select-first** (same as quotation-agent).
2. Pin KB path + forbid Bash/find; Read only on `unable_to_select`.
3. Contract-test skill/L1 text for select-first + path anchors.
4. Guid smoke: parse → ≤N batch → 1× select(full results) → comparison table; zero Bash; zero wrong `.claude\vendor` Read.

## Out of scope (this task)

- Append Elbow ½" / Tee LESSO preference rules to org KB (needs user confirm after smoke).
- Matcher recall for Elbow 3" zero-candidate.
- Orchestrator NO_DIY broader epic (parent `07-19-quotation-agent-prompt`).
