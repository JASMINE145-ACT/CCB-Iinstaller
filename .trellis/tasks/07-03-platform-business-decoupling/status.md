# Status — `07-03-platform-business-decoupling`

**Epic status:** review
**Lifecycle:** automated implementation complete · awaiting_human_verification
**Last updated:** 2026-07-04
**Active phase:** closure audit and human handoff

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

- None. `07-04-platform-decoupling-closure-audit` completed automated closure;
  parent remains in human review.

## Blockers

- P0-A 凭据轮换（人工 ops，见 `07-03-p0-security-boundary/research/p0-credential-rotation-runbook.md`）
- P2–P5 真实环境、生产切换和业务验收（见
  `manual-verification-checklist.md`）。
- §20 ADR 已逐项 accepted/deferred；deferred 决策按触发条件阻塞对应生产动作，
  不阻塞自动化实现收口。

## Next action

1. 由用户/运维按 `manual-verification-checklist.md` 完成人工项。
2. 重启 AionUI，使已同步的 Route-B runtime 在新进程中生效。
3. 人工证据齐全后，才可将 parent task 从 `review` 改为 `completed`。

## Current runtime evidence

- Cross-phase Node regression: PASS 16/16.
- Package health split: PASS 2/2.
- Live MCP stdio probe: PASS 5/5.
- Route-B runtime drift was repaired by the scoped sync script; bundled,
  AionUI, and AionUI-Dev runtime targets now contain the required marker.
