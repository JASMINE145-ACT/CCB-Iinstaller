# Closeout: 07-19-selection-api-and-evidence-harness

## Status

Implemented (code-reviewer PASS → test-agent PASS → spec updated). Live eval r3 optional follow-up.

## Delivered

### 1. Harness (WANd.EVAL.EVIDENCE_LINK.001)
- `resolveEvidenceExpression` aggregates all events per action
- Normalizer: `select_quotation_candidates` → `quotation.select`; singular match/inventory → batch shapes
- Unit tests green (graders / normalizer / golden / case-store)

### 2. Selection MCP (WANd.QUOTE.SELECT_API.001)
- Tool: `select_quotation_candidates`
- Python: `quotation/select_dispatch.py` + `tool_dispatch` wiring
- Validates code ∈ candidates + keyword coverage; `unable_to_select` first-class
- Uses Anthropic-compatible API (same credential family as precipitation); mock via `QUOTATION_SELECT_MOCK_JSON`

### 3. L1 + evals (WANd.QUOTE.SELECT_WIRE.001)
- `quotation-agent.md`: API-first + Read fallback + lock-code
- Cases re-locked:
  - `quotation-direct50-price-stock` hash `sha256:950f4120…`
  - `quotation-direct50-tee50-price-stock` hash `sha256:0736b34f…`
- Deployed seed agents; MCP/Python synced to `D:\CCB-Wanding\vendor`

## Evidence

| Gate | Result |
|------|--------|
| code-reviewer | PASS (`9fb58e0d-e6b0-4204-8c37-5a5a1e0c3794` re-review) |
| test-agent | PASS (`688cf718-2a7b-4dc7-8aaf-9d9d0b4b923b`) — 30+3 node, 7 python |
| Spec | `.trellis/spec/agent-eval/index.md`, `integration/agents-unified-model.md` |

## Residual / follow-up

- Live 3-trial eval r3 for tee50 (needs working `ANTHROPIC_*` for select MCP in child env)
- PreToolUse knowledge gate / Stop `quotation-agent:knowledge` **removed/off** (2026-07-19) — happy path can omit agent Read; selection via MCP API
