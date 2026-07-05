# Scenario eval: orchestrator delegation vs Guid direct

> **Scenario ID:** `orchestrator-delegation-vs-direct-20260704`  
> **Task:** [`.trellis/tasks/07-04-orchestrator-dispatch-hardening/`](../../.trellis/tasks/07-04-orchestrator-dispatch-hardening/)  
> **Purpose:** Quantify gap between **default `wande-orchestrator` → `Agent()`** and **Guid specialist direct MCP** on identical prompts.

---

## 1. Setup

| Variant | How to start | Expected session profile |
|---------|--------------|--------------------------|
| **Direct** | AionUI Guid card 万鼎报价专家 / 万鼎账务专家 | `quotation-agent` / `accurate-agent` |
| **Delegate** | Default chat (no Guid card) | `wande-orchestrator` |

**Environment:** `D:\CCB-Wanding` deployed dist + production settings; log `[ACP] agent session profile applied: <id>`.

---

## 2. Prompt pairs (≥3)

Run each pair in **fresh sessions**. Record: turns to first useful answer, tools called, guard errors, placeholder text.

### Pair A — quotation price

| Step | User message | Direct pass | Delegate pass |
|------|--------------|-------------|---------------|
| A1 | `查直接50价格` | `mcp__quotation__match_quotation` in turn 1; SKU + B档价 in reply | `Agent` with `subagent_type=quotation-agent` in turn 1; child calls `match_quotation`; orchestrator forwards price **same turn** (no「请稍候」) |

**Fail signals:** `AskUserQuestion` only; orchestrator calls `mcp__quotation__*` directly (guard); `TaskOutput`; empty delegation.

### Pair B — accurate sales

| Step | User message | Direct pass | Delegate pass |
|------|--------------|-------------|---------------|
| B1 | `1-5月销售额` | `mcp__accurate__*` table in turn 1 | `Agent(accurate-agent)` → table same turn |

**Fail signals:** orchestrator answers from memory; multi-turn clarification before delegate.

### Pair C — office doc

| Step | User message | Direct pass | Delegate pass |
|------|--------------|-------------|---------------|
| C1 | `帮我做一个 Word，标题是测试委派` | N/A (office Guid optional) | `Agent(word-creator)` accepted (not delegatable:false reject); docx path in reply same turn |

**Fail signals:** permission deny on `Agent(word-creator)`; `run_in_background: true` on Agent.

---

## 3. Scoring rubric

| Metric | Direct | Delegate | Notes |
|--------|--------|----------|-------|
| Time to first price/table | baseline | ≤ 2× direct | wall clock |
| Tool turns | 1 | 1–2 | delegate adds Agent hop |
| Guard errors | 0 | 0 | orchestrator must not hit business MCP |
| Verbatim forward | — | child output visible | no summary-only placeholder |
| Profile log | specialist id | `wande-orchestrator` | ACP stderr |

**Overall pass:** All three pairs meet pass column; no P2 idle-resume regression on direct path.

---

## 4. Machine-assist (optional stub)

```text
# Future: extend eval/agent_eval_cases.jsonl
# category: orchestrator_dispatch
# cases: orch-deleg-quotation-a1, orch-deleg-accurate-b1, orch-deleg-word-c1
```

Compare transcripts under `eval/runs/<date>/` with golden tool sequences.

---

## 5. References

- [`.trellis/spec/integration/agents-unified-model.md`](../../.trellis/spec/integration/agents-unified-model.md)
- [`delivery-smoke-matrix.md`](../../.trellis/tasks/07-04-orchestrator-dispatch-hardening/delivery-smoke-matrix.md) — CLI baseline 2026-07-04
- [`quotation-ppr-image-sheet-20260619.md`](./quotation-ppr-image-sheet-20260619.md) — direct-path regression (no Agent)
