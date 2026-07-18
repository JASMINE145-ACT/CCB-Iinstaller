# Execution Plan — `07-14-web-1-1-9-apple-access`

| Field | Value |
|-------|--------|
| **Status** | in_progress |
| **Approved** | 2026-07-14 |
| **Supplemented** | 2026-07-14 — system-review Phase 1 (option B): AC / smoke / runbook |
| **Scenario** | A |
| **Plan depth** | Full |
| **Verification profile** | UI (+ Security: Tailscale-only) |
| **Repos** | claude-code-best (ops/docs) · aionui-src only if WebUI enable bug |
| **Spec entry** | `web-version-ios-access-todo.md` · `wanding-release-standard.md` |
| **Active phase** | P2 Tailscale login + Enable WebUI（人工）→ 再 Apple smoke |
| **Network lock** | **Tailscale**（非同网；禁裸公网 `:25808`） |
| **Baseline release** | CCB-Wanding **1.1.9** |
| **Runbook** | `docs/wanding-web-apple-access-1.1.9.md` |
| **Smoke** | `.trellis/tasks/07-14-web-1-1-9-apple-access/smoke.md` |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | plan + approve + Phase 1 supplement |
| trellis-before-dev | Read: | integration + web-version todo |
| system-review (user paste) | Review: | adopted B — host lock / dual smoke / reboot AC / runbook path |
| research persist | Write: | `research/existing-web-apple-assets.md` |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | done | capability matrix |
| Phase 0 | done | browser + Tailscale locked; plan approved |
| Phase 0.5 | done | **Review B supplement** — prd AC, `smoke.md`, `docs/wanding-web-apple-access-1.1.9.md` |
| Phase 1 | done | Host **JASMINE** · VERSION 1.1.9 · install-health PASS · mcp config PASS · launcher up — `p1-host-parity-done.md` |
| Phase 2 | partial | Tailscale **Connected** `100.93.152.114` (`jasmine` / JASMINE145-ACT@github)。分享 URL：`http://100.93.152.114:25809`。重启 launcher 后 WebUI 端口当前未监听 — 需 Settings 再开 Enable WebUI |
| Phase 3 | pending | Mac **and** iPhone Safari smoke (`smoke.md`) |
| Phase 4 | pending | Fill runbook TBD fields; rebase todo → 1.1.9 |
| Contract Verification | pending | after smoke |

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Requirements | trellis-brainstorm | available | PRD edit |
| Research | research/*.md | available | — |
| Implementation | ops + docs (MVP) | available | aionui fix if enable broken |
| Review | trellis-check (docs) · code-reviewer (if code) | available | — |
| TDD | smoke.md as acceptance RED/GREEN | available | — |
| Security | Tailscale-only checklist | available | block public expose |
| Release/ops | install-health + mcp-health | available | — |

## Contract map

| Contract | Behavior protected | Primary code / ops | Tests / eval / smoke | Risk |
|----------|--------------------|--------------------|----------------------|------|
| `WANd.WEB.IOS_HOST.001` | Apple browsers use host WebUI over Tailscale; reboot restores WebUI | Settings `webui.desktop.*` + launcher | `smoke.md` Matrix A+B + reboot row | `ui` `security` |
| `WANd.WEB.PARITY_119.001` | Target host is live **1.1.9** (not delivery SHA alone) | Install dir `dist/VERSION` | install-health + mcp-health transcripts | `packaging` |
| docs runbook | 「远程宿主 WanD」措辞 + Tailscale + gaps | `docs/wanding-web-apple-access-1.1.9.md` | runbook fields filled | — |

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 1 | P0 | **Host lock**（机器 / owner / install dir / Tailscale 名 / 账号模式） | `WANd.WEB.PARITY_119.001` | — | human + prd | `prd.md` Host lock | table filled | Fast |
| 1 | P0 | Install/upgrade **1.1.9** + health | `WANd.WEB.PARITY_119.001` | packaging | ops scripts | install dir | VERSION + 2 health transcripts | Release |
| 2 | P0 | Enable WebUI + Tailscale URL | `WANd.WEB.IOS_HOST.001` | ui security | Settings | host + runbook URL | reachable login | UI |
| 2 | P0 | **Reboot restore** smoke | `WANd.WEB.IOS_HOST.001` | ui | manual | `smoke.md` preflight | same URL after reboot | UI |
| 3 | P0 | Mac browser smoke | `WANd.WEB.IOS_HOST.001` | ui | manual | `smoke.md` A | all A rows | UI |
| 3 | P0 | iPhone Safari smoke | `WANd.WEB.IOS_HOST.001` | ui | manual | `smoke.md` B | all B rows | UI |
| 4 | P1 | Fill employee runbook + shared-account risk note | docs-only | security | docs | `docs/wanding-web-apple-access-1.1.9.md` | no TBD left for launch | Fast |
| 5 | P1 | Rebase `web-version-ios-access-todo.md` → 1.1.9 | docs-only | — | trellis-update-spec | integration todo | checkboxes | Fast |
| 6 | P2 | Promote `WANd.WEB.*` to registry/spec | docs-only | — | trellis-update-spec | registry optional | formal IDs | Fast |

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| Host lock | `WANd.WEB.PARITY_119.001` | Host lock still `_TBD_` | PRD table complete | — |
| Host 1.1.9 | `WANd.WEB.PARITY_119.001` | VERSION≠1.1.9 or health fail | install-health + mcp-health PASS + transcripts saved | same after config change |
| WebUI + reboot | `WANd.WEB.IOS_HOST.001` | post-reboot connection refused | `smoke.md` reboot row PASS | re-test after settings change |
| Dual Apple smoke | `WANd.WEB.IOS_HOST.001` | only one device tested | Matrix A **and** B PASS | re-run after host update |

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| `WANd.WEB.PARITY_119.001` | VERSION + install-health + mcp-health | transcripts under task or linked | pending |
| `WANd.WEB.IOS_HOST.001` | `smoke.md` preflight reboot + A + B | filled smoke.md | pending |
| runbook | URL / owner / gaps filled | `docs/wanding-web-apple-access-1.1.9.md` | pending |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-14-web-1-1-9-apple-access/execution-plan.md` | PASS | pending |
| security | Tailscale-only; no public :25808 | runbook + smoke fail rule | N/A until live |

## Verification profile and gate

**Selected:** UI · Release · Security (Tailscale-only)

1. Contract Verification rows  
2. Primary review: **trellis-check** (docs); **code-reviewer** only if WebUI bugfix  
3. Dual Apple smoke non-skippable  
4. `trellis-update-spec` → rebase todo  
5. jsonl + prd AC  
6. commit only if asked  
7. `/trellis:finish-work`

**Guid hand-smoke:** Apple device smoke is the human gate (cannot substitute with host-only MCP probe).

## Manual steps (human)

- [ ] Fill Host lock in `prd.md`
- [ ] Confirm account mode (default shared) + owner risks
- [ ] Install/verify 1.1.9 on host; save health transcripts
- [ ] Enable WebUI; record Tailscale URL in runbook + smoke
- [ ] Reboot host; confirm URL restores
- [ ] Run Matrix A (Mac) and Matrix B (iPhone)
- [ ] Finish runbook TBD fields

## Recovery and re-approval

| Trigger | Return to | Evidence | Re-approval? |
|---------|-----------|----------|--------------|
| No host designated | Phase 1 | Host lock | no if only fill table |
| WebUI dies after reboot | Phase 2 ± aionui fix | research + smoke | yes if code AC |
| Public internet required | Phase 4 / security | written review | yes |
| Want native Mac pkg | new task | `mac-support-plan.md` | yes |

## Defer / out of scope

- Named multi-user isolation, HTTPS reverse proxy, center MCP (Phase 3 productization)
- Native Mac/iOS; `ccb-wanding-web/` production
- Claiming delivery SHA alone as host proof
