# Status — `07-03-platform-business-decoupling`

**Epic status:** approved · in_progress  
**Last updated:** 2026-07-03  
**Active phase:** P1

## Phase tracker

| Phase | Name | Status | Evidence |
|-------|------|--------|----------|
| P0 | Security & boundary freeze | ✅ done (ops rotation pending) | `6d81848f` · `07-03-p0-security-boundary` |
| P1 | Meta-model & read-only registry | ✅ done | `p1-registry-snapshot-done.md` · tests 3/3 · lint 0 errors |
| P2 | Config compiler & single source | ⬜ pending | — |
| P3 | Extract `com.wanding.trade` | ⬜ pending | — |
| P4 | Control plane & tenant governance | ⬜ pending | — |
| P5 | Second vertical pilot | ⬜ pending | — |

## Active subtasks

P1 was delivered in the parent epic because schema and registry projection form
one atomic, read-only change. Later runtime-changing phases remain child tasks.

## Blockers

- P0-A 凭据轮换（人工 ops，见 `07-03-p0-security-boundary/research/p0-credential-rotation-runbook.md`）
- §20 ADR 部分项未决议（见 `open-questions.md`）— 不阻塞 P1 开工

## Next action

1. 完成 P0 凭据轮换（独立 ops blocker，不影响 P1 artifact）。
2. 用户审阅 P1 WARN 清单和 manifest ownership。
3. 批准后创建 P2 child task：config compiler v1。
