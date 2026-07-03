# 全项目审查 — 优先级 Backlog

> 从 Step 1 Integration 审查衍生；Step 2–5 完成后追加并重新排序。

---

## P0

| ID | 项 | Layer | 状态 |
|----|-----|-------|------|
| INT-P0-1 | route-b-sync 4 vs 3 目标不一致 | integration | **closed** (doc 2026-06-30) |
| INT-P0-2 | start-dev-full 未自动 vendor sync | integration | **closed** (2026-06-30) |
| SHIP-P0-1 | Phase 4 冷构建 1.1.3-dev 未闭环 | ship | open |
| FE-P0-1 | App startup readiness gate（06-28） | frontend + integration | **closed** (2026-07-03 P2 smoke) |
| BE-P0-1 | 刷新 route-b-status.md（2026-06-12 → 当前） | backend + integration | **closed** (2026-07-02) |
| BE-P0-2 | AskUserQuestion spec↔code 契约统一（deny vs handleAskUserQuestion） | backend + frontend | **closed** (2026-07-03 spec sync) |

## P1

| ID | 项 | Layer | 状态 |
|----|-----|-------|------|
| INT-P1-1 | dev-runtime-layers 旧 launcher 引用 | integration | **closed** (doc sweep 2026-06-30) |
| INT-P1-2 | verify-installer 默认路径错误 | integration | open |
| INT-P1-3 | ACP 0.39.0 硬编码 | integration | open |
| INT-P1-4 | route-b-status.md 滞后 | backend + integration | **closed** (2026-07-02 → BE-P0-1) |
| BE-P1-1 | modes.json 补 research-agent:roe-judge block | backend + integration | **closed** (2026-07-02) |
| BE-P1-2 | 验证/实现 registerSessionGateHooks 或更新 agents-unified-model | backend | **closed** (spec 2026-07-02) |
| BE-P1-3 | overlay 增加 resolveSessionMcpConfigs 回归单测 | backend | **closed** (2026-07-02) |
| BE-P1-4 | sync-claude-code-b-mcp-prefetch 扩展文件清单 + upstream-only 文档 | backend + integration | **closed** (2026-07-02) |
| BE-P1-5 | mcp-health.md Session 探针与 manifest 对齐 | backend + integration | **closed** (2026-07-02) |
| INT-P1-5 | VPS manifest ops pending | ship | open |

## P2

| ID | 项 | Layer | 状态 |
|----|-----|-------|------|
| INT-P2-1 | 缺 integration-smoke.ps1 | integration | open |
| INT-P2-2 | CI 未覆盖 build-wanding v2 | ship | open |
| FE-P2-1 | TODO(defensive) 可审计性 | frontend | open |
| FE-P2-2 | Guid startup banner repair CTA (AC4 optional) | frontend | open |
| BE-P2-1 | 从上游同步 agent.test.ts / bridge.test.ts 或 CI 指向上游 | backend | open |
| BE-P2-2 | acp-session-flow greeting 职责写清（Backend vs Frontend） | backend + frontend | **closed** (2026-07-02) |
| BE-P2-3 | price-library-agent ROE/Stop hook 策略评估 | backend | **closed** (2026-07-02 doc) |

## Integration Phase 2 修复 backlog（探索完成 2026-06-30）

详见 [`reviews/phase-02-vendor-sync-exploration.md`](./reviews/phase-02-vendor-sync-exploration.md)。

| 决策 | 内容 |
|------|------|
| 推荐方案 | **Option C** — 默认跑 `sync-dev-wanding-vendor.ps1`；`-SkipVendorSync` 供纯 UI dev |
| 插入点 | `route-b sync` 之后、`sync-dev-aioncore` 之前 |
| 不默认 | `-Smoke`、`-UpdateSettings`（可选 flag 透传） |
| INT-P0-2 | **closed** (2026-06-30) |

## Integration Phase 2.1 优化 backlog（复审 2026-06-30）

详见 [`reviews/phase-02-vendor-sync-optimization-review.md`](./reviews/phase-02-vendor-sync-optimization-review.md)、[`reviews/phase-02-1-exploration-2026-07-02.md`](./reviews/phase-02-1-exploration-2026-07-02.md)（2026-07-02 探索）。  
结构评分 **7.5/10** — Phase 2 够用；以下为可选增强。

| ID | 项 | 优先级 | 状态 |
|----|-----|--------|------|
| INT-P1-7 | dev data 对齐 build glob（md denylist + 全 xlsx） | **P0†** | **closed** (2026-07-02) |
| INT-P1-6 | `-Strict` fingerprints + `-VendorStrict` 透传 | P1 | **closed** (2026-07-02) |
| INT-P1-8 | Spec 补全（outline、dev-test-ship、playbook §4.3/4.5） | P1 | partial (playbook §4.3 2026-07-02) |
| INT-P1-9 | `data.Md` dev vendor sync（sync whitelist） | P1 | **closed** (2026-06-30) |
| INT-P1-10 | `start-dev-full` 默认 VendorUpdateSettings + skills/hooks deploy | P1 | **closed** (2026-06-30) |
| INT-P2-4 | Warn `-SkipVendorSync` + smoke/settings 组合 | P2 | **closed** (2026-07-02) |
| INT-P2-3 | Option E: drift-only skip robocopy | P2 | open (deferred — risk) |
| INT-P2-7 | Python robocopy `/XD tools` 对齐 | P2 | **closed** (2026-07-02) |
| INT-P2-5 | `ensure-wanding-settings` exit 检查 | P2 | **closed** (2026-07-02) |
| INT-P2-8 | Vendor sync 写入 bootstrap log | P2 | open |
| INT-P2-6 | `Invoke-ChildScript` helper（可选） | P3 | open |
| INT-P2-9 | Preflight vs sync 顺序 | P3 | open |

推荐顺序: INT-P1-7 → INT-P1-6 → INT-P2-4 → INT-P2-3 → INT-P1-8。  
† Phase 2.1 子域 P0，非全项目 P0。

## Step 2–5 待填充

审查完成后在此追加。
