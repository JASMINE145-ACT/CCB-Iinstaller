# System Review — accepted (2026-07-13)

**Verdict:** Agree with Overall Judgment. Direction correct; harden Phase 1 gates before/at execution.

**Incorporated into plan:**

| Review item | Plan change |
|-------------|-------------|
| submodule local path | Locked in PRD |
| sample-ccb read-only | README + `git status --short` empty smoke |
| scanner self-scan allowlist | Both check-*.mjs + `__fixtures__` excluded by default; documented in inventory |
| forbidden WanD terms | `check-no-wanding-core-terms.mjs` + list |
| docs copy vs link | MVP = snapshot copy + `source-map.md` |
| commit confusion | README where-to-commit + 3× git status |
| contract prefix | Rename `WANd.*` → `AGENTCO.*` for this task |
| meta .trellis | Required lightweight (not optional) |
| no app runtime yet | README baseline note |

**Deferred (Phase 2–3 of review roadmap):** full retarget automation polish; `com.wanding.trade` extract task; ClaudeCodeBRuntimeAdapter skeleton task.
