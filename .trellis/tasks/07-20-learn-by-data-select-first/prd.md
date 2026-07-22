# PRD — learn-by-data select-first + KB path

| Field | Value |
|-------|--------|
| **Task** | `07-20-learn-by-data-select-first` |
| **Parent** | `07-19-quotation-agent-prompt` |
| **Priority** | P1 (user P0 for learn-by-data quality) |
| **Status** | planning — await「批准，执行」 |

## Problem

「按数据学习」 thrash: wrong knowledge Read path, Bash DIY, mangled select, rematch loops. Skill text still teaches Read-first while quotation-agent / Step 2 teach select-API-first.

## Goal

learn-by-data uses the **same selection contract** as normal quotation lookup: `match_quotation_batch` → **one** `select_quotation_candidates` with full batch `results` → lock codes → compare to human col F. Agent `Read` of `wanding_business_knowledge.md` **only** on `unable_to_select`. Canonical shadow path only; **no Bash/find**.

## Product locks

1. **Select-first** for learn-by-data — identical to `WANd.QUOTE.SELECT_WIRE.001`.
2. **KB path** = `D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md` (or `selection_context.knowledge_source`); never under `%LOCALAPPDATA%\CCB-Wanding\.claude\vendor\`.
3. **No Bash** on learn path (already in skill hard rules — enforce in text + smoke).
4. **Do not** auto-append Section A org rules in this task unless user later confirms draft text.

## Acceptance criteria

| ID | Criterion |
|----|-----------|
| AC1 | Skill §选型一致性 + per-row algorithm no longer require pre-batch Read; select-first + unable → Read |
| AC2 | Skill (and L1 `/learn-by-data` row if needed) pin canonical KB absolute path + forbid path DIY |
| AC3 | Contract test asserts skill/L1 anchors: `select_quotation_candidates`, full `results`, path string, no Read-before-select mandate |
| AC4 | Guid smoke: VANTSING filled sheet +「按数据学习」→ View Steps show parse → batch(es) → **1× select** with batch results → comparison table; **0** Bash; **0** Read under `.claude\vendor` |
| AC5 | Deploy seed skill (+ agents if L1 touched) via existing deploy scripts |

## Non-goals

- Section A business-rule append for Elbow/Tee preference
- Matcher recall fixes
- Parent L1 slim / orch relay epic

## Contracts

| ID | Behavior |
|----|----------|
| `WANd.QUOTE.SELECT_WIRE.001` | API-first selection (existing) — learn path must not diverge |
| `WANd.LEARN.SELECT_FIRST.001` (provisional) | learn-by-data: after each successful batch, **one** select on full `results`; agent pick = select `code` when `ok` |
| `WANd.LEARN.KB_PATH.001` (provisional) | fallback Read uses canonical shadow path / `knowledge_source` only; forbid Bash find and `.claude\vendor` invent |
| `WANd.QUOTE.NO_DIY.001` (parent provisional) | no Bash/find/xlsx DIY on quotation surfaces — reinforce on learn skill |
