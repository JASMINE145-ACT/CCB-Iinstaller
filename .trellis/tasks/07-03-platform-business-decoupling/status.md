# Status — `07-03-platform-business-decoupling`

**Epic status:** completed
**Lifecycle:** automated + agent manual verification complete · P0 credential rotation deferred (ops)
**Last updated:** 2026-07-05
**Active phase:** closed

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

1. ~~人工验收~~ — agent CLI + P3 lifecycle + Platform install-health **PASS** (2026-07-05).
2. **Deferred ops:** P0 凭据轮换仍按 runbook 由运维执行（不阻塞 epic close）。
3. **Optional:** P4 生产 OIDC cutover、P5 制造试点 UI — 按 ADR deferred 触发条件再开 task。

## Current runtime evidence

- Cross-phase Node regression: PASS 16/16.
- Package health split: PASS 2/2.
- Live MCP stdio probe: PASS 5/5.
- Route-B runtime drift was repaired by the scoped sync script; bundled,
  AionUI, and AionUI-Dev runtime targets now contain the required marker.
