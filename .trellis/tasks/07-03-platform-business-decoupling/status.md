# Status — `07-03-platform-business-decoupling`

**Epic status:** approved · in_progress  
**Last updated:** 2026-07-03  
**Active phase:** P1

## Phase tracker

| Phase | Name | Status | Evidence |
|-------|------|--------|----------|
| P0 | Security & boundary freeze | ✅ done (ops rotation pending) | `6d81848f` · `07-03-p0-security-boundary` |
| P1 | Meta-model & read-only registry | 🟡 next | create `07-03-p1-*` child task |
| P2 | Config compiler & single source | ⬜ pending | — |
| P3 | Extract `com.wanding.trade` | ⬜ pending | — |
| P4 | Control plane & tenant governance | ⬜ pending | — |
| P5 | Second vertical pilot | ⬜ pending | — |

## Active subtasks

_尚无子 task；Phase 开工时用 `task.py create --parent 07-03-platform-business-decoupling` 创建。_

## Blockers

- P0-A 凭据轮换（人工 ops，见 `07-03-p0-security-boundary/research/p0-credential-rotation-runbook.md`）
- §20 ADR 部分项未决议（见 `open-questions.md`）— 不阻塞 P1 开工

## Next action

1. 完成凭据轮换 + smoke（`verify-sso-jit.ps1`、`test-mcp-health.ps1 -Probe`）
2. 创建子 task：`07-03-p1-package-manifest-schema` 或 `07-03-p1-registry-snapshot-lint`
3. P1-Explore：扫描 `ccb-installer/config/*` 多份镜像关系
