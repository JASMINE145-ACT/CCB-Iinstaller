# Status — `07-03-platform-business-decoupling`

**Epic status:** approved · in_progress  
**Last updated:** 2026-07-03  
**Active phase:** paused after P5 (per user request)

## Phase tracker

| Phase | Name | Status | Evidence |
|-------|------|--------|----------|
| P0 | Security & boundary freeze | ✅ done (ops rotation pending) | `6d81848f` · `07-03-p0-security-boundary` |
| P1 | Meta-model & read-only registry | ✅ done | `p1-registry-snapshot-done.md` · tests 3/3 · lint 0 errors |
| P2 | Config compiler & single source | ✅ done | `2ab9fdb2` · tests 6/6 · MCP 5/5 · staging PASS |
| P3 | Extract `com.wanding.trade` | ✅ done | `37b12091` · lifecycle 3/3 · platform 2/2 · MCP 5/5 |
| P4 | Control plane & tenant governance | ✅ done (cutover human-gated) | `8588abf0` · control 2/2 · JWKS 2/2 · MCP 5/5 |
| P5 | Second vertical pilot | ✅ done | `07-03-p5-manufacturing-scheduling-pilot` · automated gate PASS · independent review PASS |

## Active subtasks

- `07-03-p5-manufacturing-scheduling-pilot` — completed; commit pending final gate.

## Blockers

- P0-A 凭据轮换（人工 ops，见 `07-03-p0-security-boundary/research/p0-credential-rotation-runbook.md`）
- §20 ADR 部分项未决议（见 `open-questions.md`）— 不阻塞 P1 开工

## Next action

1. 完成 P0 凭据轮换（独立 ops blocker，不影响 P1 artifact）。
2. Stop after P5 as requested; do not begin epic closure until the user resumes.
3. Keep P2–P5 production cutovers opt-in until the human checklist is completed.
