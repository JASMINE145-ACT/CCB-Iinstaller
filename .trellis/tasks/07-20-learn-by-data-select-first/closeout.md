# Closeout — `07-20-learn-by-data-select-first`

**Completed:** 2026-07-20  
**Parent:** `07-19-quotation-agent-prompt`

## Problem

「按数据学习」 thrash: dual doctrine (Read-before-batch vs select-first), wrong KB path under `.claude\vendor`, Bash DIY, mangled/partial select.

## Fix

| Contract | Change |
|----------|--------|
| `WANd.LEARN.SELECT_FIRST.001` | Skill + L1: batch → **1×** `select_quotation_candidates`(full `results`) → table; Read only on `unable_to_select` |
| `WANd.LEARN.KB_PATH.001` | Pin `D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md` / `knowledge_source`; forbid Bash + `.claude\vendor` invent |
| `WANd.QUOTE.SELECT_WIRE.001` | learn path aligned with quotation API-first |

## Evidence

| Gate | Result |
|------|--------|
| code-reviewer | **PASS** (Layer A/B N/A) — [Review](82645ce9-8912-4546-9529-5084cb4291f7) |
| Contract tests | `node --test ccb-installer/scripts/__tests__/quotation-agent-output-contract.test.mjs` → **7/7 PASS** |
| Deploy | `deploy-quotation-learn-by-data-skill.ps1` + `deploy-seed-agents.ps1 -ForceMd` |
| Guid AC4 | **PASS** 2026-07-20 — user: PT. Jinse7.1 +「按数据学习」；View Steps: parse → 查价 MCP → **select** → price_tiers；**无 Bash / 无错路径**；9 行 8 match + 1 Section B（行14 Elbow 3" 0 候选）；用户确认「这次还不错」 |

## Residual (out of scope)

- Row 14 Elbow 3" AW：0 候选但码在 PL → matcher recall / 人工核查，非本任务
- Section A 业务规则追加：本次无 mismatch，无需落库

## Files

- `ccb-installer/packages/vertical/com.wanding.trade/skills/quotation-learn-by-data/SKILL.md`
- `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md`
- `ccb-installer/scripts/__tests__/quotation-agent-output-contract.test.mjs`
- `.trellis/spec/integration/agents-unified-model.md` (learn-by-data §)
