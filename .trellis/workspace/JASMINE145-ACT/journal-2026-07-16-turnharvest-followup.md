# Journal — 2026-07-16 TurnHarvest follow-up

## Done (agent)

- Outbound D7: `outbound_redaction.py` — tenant allow / session deny / business-field redact / fail-closed wired in precipitation worker before MiniMax.
- TurnHarvest: same-turn coalesce 1s; `reclaimExpiredLeases` on acquire.
- Prompt/gates: multi-proposal business recall (max 5, conf≥0.55, `knowledgeObject`).
- Tests: pytest 15 PASS; vitest turnHarvest 7 + effectiveness/funnel.
- Deploy: skill → `%LOCALAPPDATA%\CCB-Wanding\.claude\skills\ccb-session-precipitation`.
- Registry: `WANd.LEARNING.TURN_HARVEST.001` (shipping).

## Still needs human / Mixing

- Session-bind smoke (real ACP UUID).
- Labelled ≥50 precision/recall; E2E 5-turn or force FullReview on live app.
- Restart Mixing / `start-dev-full` to pick up aionui TurnHarvest UI path.
