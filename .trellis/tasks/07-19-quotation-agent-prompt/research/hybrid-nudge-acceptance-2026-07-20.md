# Hybrid nudge acceptance (2026-07-20)

Lightweight fix under this parent (not a separate task): extend `post-match-knowledge-nudge.py` so every successful `match_quotation` nudges same-turn `suppliers_hybrid_match`; strengthen relay nudge 货源段.

## User smoke (accepted)

「查询 直接 50 价格」→ Orchestrator → quotation · **3 tools** including `suppliers_hybrid_match` + `select_quotation_candidates`.

User: 「没事 可以验收」

## Residual (not blocking close of sibling Accurate task)

- Primary lock sometimes PPR `8010071381` instead of PVC-U `8020020755`
- 货源（名录）段 may still be omitted from reply text despite hybrid tool call

Parent `07-19-quotation-agent-prompt` remains **planning** (L1 slim / full relay still open).
