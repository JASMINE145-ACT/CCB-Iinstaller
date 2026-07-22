# Execution Plan — `07-20-generic-dev-profile-template`

| Field | Value |
|-------|--------|
| **Status** | draft · **r2** (conditional-approval gaps closed 2026-07-20) |
| **Scenario** | B + A |
| **Plan depth** | Full |
| **Verification profile** | Cross-repo |
| **Active phase** | Phase 0 contracts **r2** · await 批准执行 |
| **Maturity** | Internal **dev harness** |
| **User priority** | Primary: agent 能力替换 · Secondary: 隔离 |
| **Router mode** | **B** — `platform-router` + `Agent()` |
| **Fleet authority** | **方案 A** — profile-scoped env (`PACKAGE_REGISTRY_PATH` + `AGENT_FLEET_DEFAULTS_PATH`) |
| **Exact-mirror** | Compiled **enabled-package** `agents.json` projection（非写死 core） |
| **Cold-start packages** | `["com.platform.core"]`（禁止 `[]`） |
| **Execution** | deferred until 执行 |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-before-dev | Read: | integration specs |
| openspec-explore | Read: | split blueprint |
| Feasibility r1 | Read: | isolation / empty agents / aionrs smoke |
| Conditional-approval r2 | Read: | fleet not consuming agents.json; global `primaryPackageId=com.wanding.trade`; exact-mirror too narrow |
| Code evidence | Read: | `agent-fleet.defaults.json:7`, `compile-runtime-config.mjs:198`, `packageRegistry.ts` `PACKAGE_REGISTRY_PATH` + `AGENT_FLEET_DEFAULTS_PATH` already exist |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | done | explore |
| Feasibility r1 | done | Top 10 → locked |
| Feasibility r2 | done | P0-1 fleet chain + P0-2 projection mirror locked |
| Phase 0 contracts | **r2 revised** | this plan + PRD |
| Phase 0b baseline | pending | green tests before feature |
| Phase 1–4 | pending | see workstreams |
| plan structure | **PASS** | lint_execution_plan.py PASS (2026-07-20) |

---

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| Explore | openspec-explore | available | this plan |
| Implementation | trellis-implement | available | after approval |
| Review | code-reviewer | available | trellis-check |
| TDD | explicit RED/GREEN | available | — |
| UI smoke | CCB ACP smoke (incl. default-route case) | required | not aionrs |

---

## Scenario

**B** + **A** · Risks: `cross-repo`, `ui`, `migration`, `external-api`

---

## Locked decisions (r2 supersedes r1)

| # | Decision | Locked value |
|---|----------|--------------|
| 1 | Maturity | CCB internal harness only |
| 2 | Cold-start packages | `["com.platform.core"]` — no `[]` |
| 3 | Agent ID | `platform-router` |
| 4 | Router | Mode B + Agent() |
| 5 | Isolation | Generic-Dev AppData + `profiles\Generic-Dev\.claude` |
| 6 | Auth | Generic bypass; Mixing org-idp |
| 7 | Compiler | `--tenant-config` explicit |
| 8 | **Fleet (P0-1)** | **方案 A**：compile → profile `agents.json` + `agent-fleet.defaults.json` + filtered `package-registry.snapshot.json` → launcher sets `PACKAGE_REGISTRY_PATH` + `AGENT_FLEET_DEFAULTS_PATH`. Do **not** rely on reading global WanD defaults. (方案 B「只读 ConfigDir 隐式」**否决**，以免双路径。) |
| 9 | **Mirror (P0-2)** | Exact-mirror = **ids in compiled agents.json** (enabled projection), not hard-coded core-only list |
| 10 | UI default | **fleet-policy IPC/projection** supplies `defaultSessionAgentId` — no “single agent ⇒ default” heuristic |
| 11 | Smoke | ≥1 case **without** explicit `ccb_agent_id` |
| 12 | Extensions | Generic default **NoExtensions** |
| 13 | Isolation proof | Hash Mixing ConfigDir **and** `%APPDATA%\AionUi-Dev` |
| 14 | Platform MCP | Allowed from defaults; assert no **biz** MCP |
| 15 | `com.platform.core` under vertical/ | **Harness debt** — document; not final platform boundary |
| 16 | Baseline | Green before Generic feature merge |

### Profile matrix

| 项目 | Mixing | Generic cold start |
|------|--------|--------------------|
| AppData | `AionUi-Dev` | `Generic-Dev` |
| ConfigDir | `...\CCB-Wanding\.claude` | `...\profiles\Generic-Dev\.claude` |
| Tenant | `tn_wanding_prod` | `tn_generic_dev` |
| Packages | `com.wanding.trade` | `com.platform.core` (+ manufacturing for loop test) |
| Fleet defaults | global WanD primary | **profile-scoped** core primary, `legacyFleetAgentIds: []` |
| Auth | org-idp | bypass |
| Seed | WanD merge | **projection exact-mirror** |
| Extensions | on | **off** |

### Target run chain

```text
-Profile Generic
  → isolated AppData + ConfigDir
  → compile --tenant-config tn_generic_dev
  → write agents.json + agent-fleet.defaults.json + filtered registry
  → apply settings.json
  → exact-mirror agents from projection sources
  → PACKAGE_REGISTRY_PATH + AGENT_FLEET_DEFAULTS_PATH
  → SKIP vendor / WanD / org / extensions
  → start AionUI
  → defaultSessionAgentId from fleet (= platform-router)
  → CCB ACP (default-route smoke + optional explicit id)
  → isolation hash Mixing ConfigDir + AionUi-Dev
```

### Fleet authority diagram（P0-1）

```text
GLOBAL (Mixing — unchanged)
  config/generated/package-registry.snapshot.json
  config/runtime/agent-fleet.defaults.json  ← primaryPackageId=com.wanding.trade

GENERIC (override via env — scheme A)
  profiles/Generic-Dev/.claude/
    agents.json                    ← enabled projection (consumed by mirror)
    agent-fleet.defaults.json      ← primaryPackageId=com.platform.core
    package-registry.snapshot.json ← agents ⊆ enabled packages only
    settings.json
    agents/*.md                    ← exact-mirror of agents.json

  env:
    PACKAGE_REGISTRY_PATH  → …/package-registry.snapshot.json
    AGENT_FLEET_DEFAULTS_PATH → …/agent-fleet.defaults.json
    CCB_WANDING_CONFIG_DIR → …/profiles/Generic-Dev/.claude
```

### Vertical loop（P0-2）

```text
core-only → {platform-router} · delegatable ∅ · default platform-router
enable manufacturing → +scheduling-agent in live/Guid/Agent() · default still platform-router · no WanD
disable manufacturing → scheduling-agent gone · no stale
```

---

## Feasibility gaps → fixes

| Gap | Fix |
|-----|-----|
| Shared ConfigDir | Isolated Generic profile dirs |
| `[]` → 0 agents | Cold-start `[com.platform.core]` |
| Hardcoded tenant | `--tenant-config` |
| Auth WanD SSO | bypass + skip org preflight |
| aionrs smoke | new CCB smoke |
| **agents.json unused / global WanD fleet** | **P0-1 方案 A env authority** |
| **mirror only core → vertical never live** | **P0-2 projection mirror + enable/disable AC** |
| listAgents lacks default | fleet-policy IPC (WS-6) |
| Smoke always passes explicit id | default-route case (WS-7) |
| WeCom residue | Generic NoExtensions |
| Isolation only `.claude` | also hash AionUi-Dev |
| vertical/com.platform.core | mark harness debt |

---

## Contract map

| Contract | Behavior protected | Primary code | Tests / smoke | Risk |
|----------|--------------------|--------------|---------------|------|
| WANd.PLATFORM.ISOLATION.001 | No writes to Mixing ConfigDir **or** AionUi-Dev | launcher, apply | hash both trees | migration |
| WANd.AGENT.FLEET.AUTHORITY.001 | Generic runtime uses profile fleet/registry env → default=`platform-router` | compile outputs + launcher env + `packageRegistry.ts` | unit with env overrides; no global WanD primary | migration |
| WANd.AGENT.FLEET.REPLACE.001 | With Generic fleet files present, never fall back to wande-orchestrator | `deriveAgentFleetPolicy` | `packageRegistry.test.ts` | migration |
| WANd.AGENT.SESSION.NEUTRAL.001 | No WanD L0 index / quotation warm on Generic | session + warmup | unit | ui |
| WANd.AGENT.DELEGATION.GRAPH.001 | Core-only empty delegatable; after enable manufacturing, scheduling in targets | fleet + lifecycle | unit + loop smoke | migration |
| WANd.PLATFORM.COMPILE.EXPLICIT.001 | Explicit tenant; emits agents.json + fleet defaults + filtered registry; no biz MCP in settings | `compile-runtime-config.mjs` | compiler tests | migration |
| WANd.PLATFORM.SEED.MIRROR.001 | Live agent files == agents.json ids (projection); stale removed | deploy mirror | temp-dir unit + manufacturing loop | migration |
| WANd.PLATFORM.VERTICAL.LOOP.001 | Enable/disable manufacturing updates live agents without WanD | lifecycle + remirror + fleet env | loop script/smoke | migration |
| WANd.PLATFORM.GENERIC.DEV.001 | Default-route CCB turn completes | smoke | **no** explicit ccb_agent_id case | ui |
| WANd.PLATFORM.AUTH.BYPASS.001 | Generic starts without JWT/org | launcher | start smoke | external-api |
| WANd.PLATFORM.MIXING.REGRESS.001 | Mixing path unchanged | launcher Mixing branch | checklist | migration |
| WANd.PLATFORM.BASELINE.GREEN.001 | Package tests green first | existing suites | Phase 0b | — |

---

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool / agent | Files | Required output | Profile |
|-------|----------|------------|---------|------|--------------|-------|-----------------|---------|
| 0 | P0 | **WS-0** Approve r2 contracts | docs-only | — | user | prd + plan | Status → approved | — |
| 0b | P0 | **WS-0b** Baseline repair | BASELINE.GREEN | — | TDD | package tests | lifecycle/registry/compiler/p5 PASS | Standard |
| 1 | P0 | **WS-1** `com.platform.core` + `platform-router` | FLEET.REPLACE | migration | implement | `packages/vertical/com.platform.core/**` | Agent + capability; note harness debt in README | Standard |
| 1 | P0 | **WS-2** Explicit compile + **fleet projection artifacts** | COMPILE.EXPLICIT, FLEET.AUTHORITY | migration | TDD | `compile-runtime-config.mjs`, `tn_generic_dev.desired.json` | Emit `agents.json` + `agent-fleet.defaults.json` (`primaryPackageId=com.platform.core`, `legacyFleetAgentIds=[]`) + filtered registry snapshot | Standard |
| 1 | P0 | **WS-3** Projection exact-mirror | SEED.MIRROR, VERTICAL.LOOP | migration | TDD | `deploy-seed-agents.mjs` | Mirror **agents.json ids**; remirror on enable/disable; temp-dir tests | Standard |
| 1 | P0 | **WS-4** Launcher isolation + auth + **fleet env** | ISOLATION, AUTH, MIXING.REGRESS, FLEET.AUTHORITY | cross-repo | implement | `start-dev-full.ps1` | Profile Generic sets both PATH envs; NoExtensions; skip WanD/org; Mixing untouched | Cross-repo |
| 2 | P0 | **WS-5** Runtime fleet/session under env | FLEET.REPLACE, SESSION.NEUTRAL, DELEGATION.GRAPH | migration | TDD | `packageRegistry.ts`, session, warmup | Env Generic files → platform-router; no WanD warm | Standard |
| 3 | P1 | **WS-6** AionUI **fleet-policy IPC** | GENERIC.DEV | ui | TDD | aionui Guid + IPC | Expose `defaultSessionAgentId`; no single-agent heuristic | UI |
| 3 | P0 | **WS-7** CCB smoke (default route) | GENERIC.DEV, VERTICAL.LOOP | ui | TDD | new smoke script | Case A: **no** ccb_agent_id → platform-router; Case B optional explicit; Case C manufacturing loop | Cross-repo |
| 4 | P1 | **WS-8** Docs + Mixing regress | MIXING.REGRESS | — | update-spec | playbook | Matrix + harness debt note; Mixing checklist | Fast |

---

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| WS-0b | BASELINE | current FAIL | lifecycle+registry+compiler+p5 PASS | same |
| WS-2 | FLEET.AUTHORITY / COMPILE | compile omits fleet defaults or still points WanD primary | compiler test writes Generic fleet with core primary | same |
| WS-3 | SEED.MIRROR | after enable manufacturing, live dir lacks scheduling-agent | mirror unit + loop fixture | same |
| WS-3 | VERTICAL.LOOP | disable leaves stale scheduling-agent.md | same suite | same |
| WS-5 | FLEET.REPLACE | with Generic env still resolves wande-orchestrator | `packageRegistry.test.ts` env override | same |
| WS-6 | GENERIC.DEV | Guid uses hardcode or single-agent heuristic | aionui unit | same |
| WS-7 | GENERIC.DEV | only explicit-id smoke exists | default-route smoke exit 0 | same |
| WS-4 | ISOLATION | AionUi-Dev mutated | hash both trees | same |

---

## Contract Verification

| Contract | Verification command / smoke | Required evidence | Status |
|----------|------------------------------|-------------------|--------|
| WANd.PLATFORM.BASELINE.GREEN.001 | lifecycle+registry+compiler+p5 | all PASS | pending |
| WANd.AGENT.FLEET.AUTHORITY.001 | compile emits Generic fleet; launcher env; registry resolves platform-router | unit + env | pending |
| WANd.PLATFORM.SEED.MIRROR.001 | mirror == agents.json | temp-dir PASS | pending |
| WANd.PLATFORM.VERTICAL.LOOP.001 | enable/disable manufacturing | scheduling appears/clears; no WanD | pending |
| WANd.PLATFORM.GENERIC.DEV.001 | CCB smoke **without** ccb_agent_id | platform-router + turn.completed | pending |
| WANd.PLATFORM.ISOLATION.001 | hash Mixing ConfigDir + AionUi-Dev | unchanged | pending |
| WANd.PLATFORM.AUTH.BYPASS.001 | Generic start w/o JWT | starts | pending |
| WANd.PLATFORM.MIXING.REGRESS.001 | Mixing checklist | PASS | pending |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-20-generic-dev-profile-template/execution-plan.md` | PASS | **PASS** |

**Gate:** code-reviewer → Contract Verification → trellis-update-spec → finish-work

---

## Verification profile

**Selected:** Cross-repo

1. Baseline green  
2. Compile fleet artifacts + env authority  
3. Projection mirror + manufacturing loop  
4. Default-route CCB smoke  
5. Isolation hashes (ConfigDir + AionUi-Dev)  
6. Mixing regress + code-reviewer  

---

## Parallelization

```text
WS-0 → WS-0b → WS-1 → WS-2 (fleet artifacts) → WS-3 (projection mirror)
  → WS-4 (env+isolation) → WS-5 → WS-6 (fleet IPC) → WS-7 → WS-8
```

Merge rule: **fleet artifacts + env wiring before** AionUI default-agent / smoke.

---

## Manual steps (human)

- [ ] Approve r2 plan  
- [ ] Generic: default Guid chat (no card) = platform-router  
- [ ] Enable manufacturing → see scheduling; disable → gone  
- [ ] Confirm Mixing ConfigDir + AionUi-Dev unchanged  
- [ ] Mixing checklist  

---

## Recovery and re-approval

| Trigger | Return to | Re-approval? |
|---------|-----------|--------------|
| Runtime still reads global WanD fleet | WS-2/WS-4/WS-5 | no |
| Vertical enable does not remirror | WS-3 | no |
| Smoke only explicit id | WS-7 | no |
| Single-agent heuristic in UI | WS-6 | no |
| Scope → product greenfield | WS-0 | yes |
| Baseline red | WS-0b | no |

---

## Defer / out of scope

- Greenfield product OS  
- 「换公司即可交付」  
- Full dynamic package UI  
- Scheme B implicit ConfigDir fleet load (dual path)  
- Mode A / empty packages / aionrs acceptance  

---

## Quick answer

**P0-1 锁定方案 A：** profile-scoped `PACKAGE_REGISTRY_PATH` + `AGENT_FLEET_DEFAULTS_PATH`（env 钩子已存在）；compile 必须写出 Generic fleet（`primaryPackageId=com.platform.core`）。  

**P0-2 锁定：** exact-mirror = **agents.json 投影**；manufacturing enable/disable 闭环验收。  

**假成功防住：** 默认 Guid 路由 + 无显式 id 的 CCB smoke + fleet env，避免「显式 platform-router 过、默认仍 wande」。  

**状态：** r2 计划已补齐 · **仍不执行**，等你批准。
