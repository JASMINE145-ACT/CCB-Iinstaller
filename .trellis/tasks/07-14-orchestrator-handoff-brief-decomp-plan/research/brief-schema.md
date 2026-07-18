# Research — Handoff Brief schema

| Field | Value |
|-------|--------|
| **Task** | `07-14-orchestrator-handoff-brief-decomp-plan` |
| **Contract** | `WANd.RUN.EXECUTION.003` |
| **Date** | 2026-07-14 |

## Decision

**Carrier:** Markdown sections with a stable HTML comment marker (Agent tool `prompt` stays a string — no AgentTool zod change in MVP).

```text
<!-- WANd.HANDOFF.BRIEF.001 -->
## Goal
…
## Inputs
…
## Expected output
…
## Prohibitions
…
## Effort
low|medium|high
```

**Normalize path:** `sanitizeOrchestratorAgentInput` (orchestrator top-level only) wraps free-text `prompt` into Brief; already-marked prompts are parsed/revalidated.

**Why not JSON field on Agent input:** avoids CCB AgentTool schema / deploy churn; L1 + normalize peer keep EXECUTION.001 sync spawn unchanged.

## Defaults when wrapping free text

| Field | Default |
|-------|---------|
| goal | original prompt trimmed |
| inputs | `(none)` |
| expected_output | 可直接展示给用户的结果… |
| prohibitions | 不做额外查询；不擅自加码… |
| effort | `low` |

## Preserve

`WANd.ROUTING.FIDELITY.001` content moves into Brief `goal`/`inputs`/`prohibitions` + default prohibitions; fixed tail can live inside prohibitions.
