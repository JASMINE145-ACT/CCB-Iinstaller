# Execution Plan — `07-05-platform-business-architecture-separation`

| Field | Value |
|-------|--------|
| **Status** | draft |
| **Scenario** | E（探索/审计，零代码行为变更） |
| **Plan depth** | Standard |
| **Verification profile** | Fast |
| **Active phase** | — (awaiting approval) |
| **Repos** | claude-code-best（主）；aionui-src 只读参照 |
| **Spec entry** | `.trellis/spec/integration/platform-vertical-packages.md` · `docs/platform-system-business-decoupling-optimization.md` |

## Progress snapshot

| Phase | State | Delivery / evidence |
|-------|-------|---------------------|
| P0 前情对齐 | pending | — |
| P1 残留耦合审计（A1 行级 + A2 归属表） | pending | — |
| P2 边界地图 + 决策树 | pending | — |
| P3 分离 backlog | pending | — |
| P4 门禁 | pending | — |

---

## Phase -1 — Capability matrix

| Capability | Preferred tool | Status | Fallback |
|------------|----------------|--------|----------|
| 读规范/前情 | `trellis-before-dev` | available | 主会话直接读 spec index |
| 审计扫描 | `trellis-research` sub-agent | available | 主会话 Grep/Glob，结果仍落 `research/` |
| Spec 落盘 | `trellis-update-spec` | available | 主会话直接写 spec md |
| 合规复核 | `trellis-check` sub-agent | available | 主会话逐条对 AC 自查（须贴证据） |
| 零行为验证 | 现有 registry lint + 平台健康脚本 | available（07-03 P1/P3 产物） | `git status` 证明无源码 diff |

## Phase 0 — 激活与前情对齐

| Step | Tool / skill | Output |
|------|--------------|--------|
| 激活任务 | `task.py start 07-05-...` | status → in_progress |
| 读规范 | `trellis-before-dev`（integration 包） | spec 路径清单 |
| 前情摘要 | 读 `07-03/status.md`、`07-04` closure audit、`06-25` 结论、设计文档 §3/§17 | `research/prior-work-summary.md`：07-03 已定边界 vs 本次要补的代码级缺口 |

## Phase 1…4 — Workstreams

| Phase | Priority | Workstream | Risk | Tool / agent | Files | Required output | Profile | Notes |
|-------|----------|------------|------|--------------|-------|-----------------|---------|-------|
| 1 | P0 | A1 平台路径行级审计：扫描万鼎/报价/库存等业务标识出现在平台目录的位置，**含 aionui-src（只读）**；每条含路径+行号+证据 | — | `trellis-research` sub-agent | 只读 claude-code-best 全仓 + aionui-src；写 `research/residual-coupling-audit.md` | 行级证据表：路径+行号+分类+理由 | Fast | 以 07-03 P0-C 禁止清单与设计文档 §17 抽取边界为判据 |
| 1 | P0 | A2 全目录归属表：对每个一级目录（ccb-installer、aionui-src 到二级）标注 platform / business / mixed | — | 主会话汇总（基于 A1 证据） | 写 `research/residual-coupling-audit.md` §归属表 | 目录归属总表（100% 覆盖） | Fast | A2 依赖 A1；争议目录留给用户拍板（manual step） |
| 2 | P0 | B 边界地图 + 改动归类决策树 | — | 主会话撰写 + `trellis-update-spec` | 新增 `.trellis/spec/integration/platform-business-boundary-map.md`；更新 `integration/index.md`（AC6） | 目录归属总表 + 分层图 + 3–5 问决策树 | Fast | 依赖 A2 结论；决策树用 **5 类 curated commit**（平台脚本/业务 Agent/UI/配置 manifest/文档 各 1）实测（AC3） |
| 3 | P1 | C 分离 backlog：每个 mixed 项 → 目标位置 / 成本 S-M-L / 风险 / **priority（P0-P2）/ transition-ok** / 建议 task 切分 | — | 主会话 | `research/separation-backlog.md` | 可直接开后续 task 的排期清单 | Fast | 只列不搬；与 07-03 人工验收项去重 |
| 4 | P1 | D 门禁与收尾 | — | `trellis-check` 主审 | jsonl / prd AC | AC1–AC6 逐条证据 | Fast | 见下方 gate |

## TDD contract

| Workstream | Test level | RED evidence | GREEN command | Regression target |
|------------|------------|--------------|---------------|-------------------|
| A1/A2/B/C（docs-only） | N/A — 无代码变更 | N/A（理由：交付物为审计/spec 文档） | 现有 registry lint + 平台健康脚本照常 PASS；`git status` 显示仅 `.trellis/` 与 `docs` 类新增 | 现有平台/万鼎全部功能零变化（AC5） |

> 决策树的「测试」替代物：挑 5 类 curated commit（平台脚本 / 业务 Agent / UI / 配置 manifest / 文档 各 1）的 diff 逐一走决策树，记录归类结果（AC3 证据）。

## Verification profile and gate

**Selected:** Fast

1. `trellis-check` sub-agent（主审，对照 prd AC1–AC6）
2. 证据：审计表、boundary-map 全目录覆盖核对、5 类 curated-commit 决策树实测记录、registry lint 输出、index.md 入口行 diff
3. `trellis-update-spec` → `platform-business-boundary-map.md` 即 spec 本体；同步 `integration/index.md`
4. `implement.jsonl` + `check.jsonl` + prd AC 勾选
5. `git commit` — 仅用户明确要求时
6. `/trellis:finish-work`

## Parallelization

单流程即可（审计 → 地图 → backlog 有依赖链）；不启用 Scenario D。

## Manual steps (human)

- [ ] 用户审阅 boundary-map 的目录归属表，对争议目录拍板（platform vs business）
- [ ] 用户从 separation backlog 中挑选要开的后续迁移 task（本 task 不搬代码）

## Recovery and re-approval

| Trigger | Return to | Evidence / artifact update | Re-approval? |
|---------|-----------|----------------------------|--------------|
| 审计发现与 07-03 结论冲突（如「已解耦」项仍有硬编码） | Phase 1 | 冲突记录进 audit 文档，并回写 07-03 `open-questions.md` | no |
| 决策树对某 commit 无法归类 | Phase 2 | 补问题分支后重测 5 commit | no |
| 用户要求本 task 内直接搬代码 | 重新规划 | prd Non-goals 变更 + 计划升级为 Scenario A（需 TDD 契约） | **yes** |

## Defer / out of scope

- 实际代码迁移/重命名（→ 按 backlog 另开 task）
- 边界 lint/CI 门禁实现（→ backlog，可挂到 07-03 P0-B/P1-E 产物上扩展）
- 07-03 的人工验收项（credential 轮换、生产切换等，仍归 07-03）
