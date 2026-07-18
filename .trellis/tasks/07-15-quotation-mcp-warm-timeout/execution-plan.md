# Execution Plan — `07-15-quotation-mcp-warm-timeout`

| Field | Value |
|-------|--------|
| **Status** | in_progress |
| **Scenario** | **C**（预算竞态 bug）+ **I**（冷启动时延）横切 |
| **Plan depth** | Standard |
| **Verification profile** | UI + Standard |
| **Active phase** | Phase 3 — manual Guid smoke pending |
| **Repos** | aionui-src（timeout）+ ccb-installer（warm script / health） |
| **Parent** | `06-28-app-startup-readiness-gate` |

## Skills invoked (this planning session)

| Invocation | Type | Evidence |
|------------|------|----------|
| trellis-task-execution | Read: | Contract→TDD→Verify |
| skill-selection | Read: | Scenario C first; performance = measure then fix |
| trellis-before-dev | Read: | integration `mcp-health.md` + index |
| systematic-debugging | Read: | Phase 1 → research/warm-timeout-root-cause.md |
| Live warm | Shell: | `PASS quotation 90696ms` vs outer 90_000 → race confirmed |
| Prior task | Read: | archive `07-14-startup-mcp-soft-ready-banner`（不同根因：accurate） |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| Phase -1 | **done** | H1 budget race; live 90.7s |
| Phase 0 | pending | user approve |
| Phase 1 | pending | Align CORE_WARM_TIMEOUT_MS (≥120s or shared constant) |
| Phase 2 | pending | Optional cold-start cost reduction research |
| Phase 3 | pending | Contract Verification + smoke |
| plan lint | **done** | see Contract Verification row |

## Verdict — answers to user questions

### 1) MCP 体系是否完整 / 可迁移？

**结构完整、可迁移**：platform manifest + vertical compose + CLI health + UI mirror + packaging whitelist + startup gate。加新 MCP 有清单路径。

**完善度缺口（债，非崩）：** 内外超时不一致；app/session 双重 warm；Layer 3 deferred。

### 2) 为什么热加载超时？是 CPU 吗？

**主因不是「CPU 坏了」。** 本机证据：quotation 冷预热 **真实跑通** 但用了 **~90.7s**；AionUI 在 **90.0s** 杀进程 → 误报 exceeded。  
CPU/杀软/磁盘会放大冷启动，但今日症状是 **预算压线竞态**。  
（另：07-14 的 accurate/pywin32 假 timeout 是**另一类**问题，本次 detail 已指明 quotation。）

```text
App open → L1 config → L2 spawn warm-wanding-mcp --servers=quotation
  → 内：最多 120s；等 match_quotation id=2
  → 外：90s kill → soft_ready「MCP warm exceeded 90s」
本机冷 warm ≈ 90.7s PASS → 压线失败
```

## Phase -1 — Capability matrix

| Capability | Preferred | Status | Fallback |
|------------|-----------|--------|----------|
| Debug | systematic-debugging | available | research/*.md |
| TDD | vitest readiness shared | available | — |
| Implement | inline aionui-src | available | — |
| Measure | Shell warm CLI | **done** 90696ms | remeasure after change |
| Review | code-reviewer | available | — |

## Contract map

| Contract | Behavior protected | Primary code | Tests / smoke | Risk |
|----------|--------------------|--------------|---------------|------|
| `WANd.STARTUP.MCP_WARM.001` | L2 quotation warm 预算 ≥ 实测冷启动；PASS→mcp_ok | `ccbStartupReadiness.ts`, shared | unit timeout constant; re-run warm CLI; Guid smoke | ui |
| docs-only | mcp-health.md 记录竞态 | mcp-health.md | N/A | — |

## Workstreams

| Phase | Priority | Workstream | touches | Risk | Tool | Files | Required output | Profile |
|-------|----------|------------|---------|------|------|-------|-----------------|---------|
| 0 | P0 | 批准计划 | docs-only/no-runtime-contract | — | — | prd/plan | approved | Fast |
| 1 | P0 | 外层 timeout ≥ warm-script / 建议 **120_000**；抽共享常量 | `WANd.STARTUP.MCP_WARM.001` | ui | TDD→implement | `ccbStartupReadiness.ts`, shared test | RED=90_000 expect fail；GREEN=120_000 | UI |
| 2 | P1 optional | 查清 90s 耗在 spawn 还是 match_quotation；能否轻量 warm | IDLE/perf | long-running | research | warm script / quotation | research note | Fast |
| 3 | P0 | code-reviewer + Guid cold smoke | all | ui | agents | — | PASS + no soft_ready on healthy host | UI |

## TDD contract

| Workstream | Contract | RED evidence | GREEN command | Refactor guard |
|------------|----------|--------------|---------------|----------------|
| 1 Budget | MCP_WARM | assert CORE=90000 fails new expect ≥120000 | `bun test …/ccbStartupReadinessShared.test.ts` (+timeout unit) | same |
| Live | MCP_WARM | soft_ready with 90s | warm CLI < new budget；Guid 无常驻黄条 | — |

## Contract Verification

| Contract | Verification | Evidence | Status |
|----------|--------------|----------|--------|
| `WANd.STARTUP.MCP_WARM.001` | unit + `node …/warm-wanding-mcp.mjs --servers=quotation` + Guid | ms + screenshot/banner gone | pending |
| plan structure | `python ./.trellis/scripts/lint_execution_plan.py .trellis/tasks/07-15-quotation-mcp-warm-timeout/execution-plan.md` | PASS | **PASS** |

## Verification profile and gate

**Selected:** UI

1. Contract Verification  
2. code-reviewer  
3. Manual cold-start Guid  
4. trellis-update-spec → mcp-health.md  
5. finish-work  

## P0 execution evidence (2026-07-15)

| Evidence | Result |
|----------|--------|
| AionUI readiness budget unit | `bun test tests/unit/common-config/ccbStartupReadinessShared.test.ts`: 10 pass |
| Installer budget contract | `node --test ccb-installer/scripts/__tests__/mcp-warm-budget-contract.test.mjs`: 1 pass |
| Source/live script parity | SHA-256 source and `D:\CCB-Wanding\lib\warm-wanding-mcp.mjs` matched |
| Isolated quotation warm runs | 5/5 PASS; 11,780-23,352ms; median 14,174ms |
| Quotation deep probe | PASS 25,832ms (`match_quotation+get_inventory_by_code`) |
| Manual Guid cold smoke | **pending** — fully exit AionUI, cold start, check successful warm has no persistent yellow banner |
## Manual steps (human)

- [ ] 完全退出 AionUI 冷启 → 观察是否仍「exceeded 90s」  
- [ ] 点「重试预热」后详情/状态  
- [ ] 首条报价查询是否仍可接受延迟（预算放宽后预热应在发消息前完成）  

## Recovery

| Trigger | Return | Re-approval? |
|---------|--------|--------------|
| 放宽后仍 >120s FAIL | Phase 2 挖冷启动 | yes if scope expands |
| 用户只要“关黄条”不修 warm | refuse silent lie | — |

## Defer

- Deduplicate session/new warm  
- Speed quotation first match under 30s（独立 perf 任务）  
- Warm all servers at startup  
