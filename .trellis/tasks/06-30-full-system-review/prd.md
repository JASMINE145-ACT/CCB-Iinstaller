# 全项目系统审查 — 分模块 spec↔代码审计

## Goal

对整个 AionUI + CCB-Wanding 项目做**分步、分模块**的系统审查：每一步只专注一层，对照 Trellis spec 与实际代码/脚本，产出成熟度评分、差距表、风险与可执行改进路线。

**不是**一次性大 refactor；**是**可追踪的审计 backlog + 按优先级落地的修复计划。

## Consolidated Architecture Baseline

本 task 是持续系统 review 的主台账。历史 task
`06-25-architecture-business-system-boundaries` 已并入本 task，作为 Step 4/Step 5 之前的架构地图与边界基线使用，不再作为并行的系统审查入口。

并入内容：

- 架构/业务/UI/App 分层模型：`../06-25-architecture-business-system-boundaries/boundary-map.md`
- Python / MCP business vs system adapter 拆分记录：`../06-25-architecture-business-system-boundaries/prd.md`
- generated / vendor / runtime payload 边界与 cleanup audit：`../06-25-architecture-business-system-boundaries/cleanup-audit.md`

使用规则：

1. 做新的 `$system-review` 时，从本 task 进入。
2. 涉及业务层、Python、MCP、vendor、generated/runtime payload 时，先引用 06-25 的 boundary map 作为 evidence。
3. 新发现的风险、缺口、改进项统一写回本 task 的 `backlog.md` / `reviews/step-0N-*.md`，不要再扩展 06-25 为新的主线。

## Operating Model

详细执行逻辑见 [`review-plan.md`](./review-plan.md)。本 task 的工作方式是：

```text
架构边界基线 -> 分层 system-review -> backlog 增量 -> 独立修复 task -> spec 回写 -> 周期性复审
```

审查默认只读；修复必须单独进入修改模式或拆成子 task。
## 审查方法论

| 维度 | 每步必查 |
|------|----------|
| 系统地图 | 该层在 4/7 层链中的位置 |
| 业务流 | 关键用户/运维流程是否 spec↔代码一致 |
| 数据流 | 配置权威、handoff、API 边界 |
| 模块边界 | 改哪里（Rule 0）是否清晰 |
| 执行契约 | 脚本、smoke、deploy gate 文档 vs 实际 |
| 测试 | 现有覆盖 + 缺口 |
| 部署/运维 | 打包、更新、dev 摩擦 |
| 用户可运维性 | 常见误操作、support 模式 |

**工具：** system-reviewer 子代理（只读）+ Trellis spec 入口 + 实仓文件证据。

## 五步审查计划

```text
Step 1  Integration   ✅ 已完成 — reviews/step-01-integration.md
Step 2  Backend       ✅ 已完成 + 复审 — reviews/step-02-backend.md + reviews/step-02-backend-rereview-2026-07-12.md
Step 3  Frontend      ✅ 已完成 — reviews/step-03-frontend.md + delivery-step-03-closure.md
Step 4  Business      ⏳ 下一步 — python/ + mcp_servers/ + data/（以 06-25 boundary-map 为基线）
Step 5  Ship/Ops      ⏳ 待 Step 4 后或发版链前 — build-wanding / internal-update / Phase 4 冷构建（含 generated/vendor/runtime 边界复核）
```

每步完成后：

1. 写入 `reviews/step-0N-<layer>.md`
2. 更新 `status.md` 子任务状态
3. 若发现跨层 P0，挂到 `backlog.md` 并标注 owner layer

## Step 1 结论摘要（Integration）

- **成熟度：** 7.5/10（spec 自评 9/10，实际有 doc/script 漂移与 Phase 4 未 ship）
- **P0：** route-b 同步目标数不一致；dev 未自动 vendor sync；Phase 4 `1.1.3-dev` 冷构建未闭环
- **详情：** [`reviews/step-01-integration.md`](./reviews/step-01-integration.md)

## Step 2–5 审查范围（Step 2/3 已完成，Step 4/5 待执行）

### Step 2 — Backend

**结论：** 初审 7/10（2026-07-02），P0/P1 修复交付后复审 8/10（2026-07-12）。Backend ACP 合同已足够支撑内部工具；live dist / CI / release proof 归入 Step 5 Ship/Ops。

**Spec 入口：** `.trellis/spec/backend/index.md`、`acp-session-flow.md`、`route-b-status.md`、`build-deploy-verify.md`、`mcp-business.md`

**重点：**

- `D:\claude-code-B\src\` ACP session / MCP 注册 / permission 事件
- `agent.ts` `resolveSessionMcpConfigs`、greeting、tool loop
- `route-b-status.md` 快照刷新与 live dist 漂移防线
- assistant profile handoff 消费路径
- 与 Integration 契约：route-b env、seed agents、health manifest probes

### Step 3 — Frontend

**Spec 入口：** `.trellis/spec/frontend/index.md`、`file-map.md`、`chat-acp-flow.md`、`coding-rules.md`

**重点：**

- ACP 事件渲染、`turn_id`、stale replay
- Guid / 侧栏 / Team catalog（`fetchAssistantsCatalog` 统一是否全覆盖）
- CCB authority UI（MCP/settings/models）
- App startup readiness gate（task `06-28`）UI 侧
- `defensive-fix-policy` — 是否存在未标注的 frontend guard

### Step 4 — Business Python

**Spec 入口：** `.trellis/spec/backend/mcp-business.md`、`integration/price-library.md`、`integration/org-knowledge.md`

**重点：**

- `python/system/tool_dispatch.py` 与各 dispatch 模块边界（对照已并入的 task `06-25-architecture-business-system-boundaries`）
- 价库三档 fallback、`LKG_MIN_PRODUCTS`
- 并行查价+库存 `match_quotation_union`
- `quotation-agent.md` L1 硬约束 vs MCP 工具面
- `python/tests/` 8 文件覆盖 vs 缺口
- vendor sync 后 live 行为一致性

### Step 5 — Ship/Ops

**Spec 入口：** `integration/wanding-first-ship.md`、`wanding-packaging-whitelist.md`、`internal-update.md`、`guides/mixing-meta-repo.md`

**重点：**

- Phase 4 全量冷构建 `1.1.3-dev` vs 1.1.2 oracle
- `build-wanding.ps1` staging gate、`test-install-health.ps1`
- CI：`.github/workflows` 是否覆盖 v2 链
- 内网更新 VPS manifest ops 完成度
- `ccb-launch-aionui.cmd` fail-closed 路径

## Integration 层修复 backlog（审查衍生，非审查本身）

| Phase | 内容 | 优先级 |
|-------|------|--------|
| 1 | `route-b-sync.md` 对齐… | P0 | ✅ done |
| 2 | 默认 vendor sync + `-SkipVendorSync`（Option C） | P0 | ✅ `delivery-phase-02-integration-vendor.md` |
| 3 | 修 `verify-installer.ps1` 默认路径；新增 `integration-smoke.ps1` | P1 |
| 4 | ACP 版本 `0.39.0` 探测/helper | P1 |
| 5 | 刷新 `route-b-status.md` + `AIONUI-BACKEND-STATUS.md` | P1 |

## Acceptance

- [x] Trellis task + `review-plan.md` + Step 1 完整审查 artifact
- [x] 架构边界基线已并入：`06-25-architecture-business-system-boundaries/boundary-map.md`
- [x] Step 2–3 已有 `reviews/step-0N-*.md` 与 closure 证据
- [x] Step 2 Backend P0/P1 修复后复审已完成（8/10，`reviews/step-02-backend-rereview-2026-07-12.md`）
- [ ] Step 4–5 各有一份 `reviews/step-0N-*.md`（含成熟度、差距表、风险、MVP 路线）
- [ ] `backlog.md` 汇总全项目 P0/P1，按 layer 标注 owner
- [ ] 五步完成后更新 `.trellis/spec/index.md` 成熟度表与 refresh policy
- [x] Integration Phase 1 doc 对齐（`delivery-phase-01-integration-docs.md`）
- [x] Integration Phase 2 实现（Option C — `delivery-phase-02-integration-vendor.md`）

## Out of scope

- 审查过程中不主动改产品代码（修复项单独立项或用户明确要求后再做）
- 不替代各 feature task（如 `06-28-app-startup-readiness-gate`）的实现，只交叉引用并标依赖
- 不审查 Mixing meta-repo submodule 历史（除非影响当前 dev/ship 路径）

## Related tasks

| Task | 关系 |
|------|------|
| `06-26-aionui-source-level-recovery` | Phase 4 冷构建 ship 依赖 |
| `06-28-app-startup-readiness-gate` | Integration P0 竞态；Frontend 审查必查 |
| `06-27-quotation-mcp-health` | MCP 29/29 基线；Backend/Business 审查引用 |
| `06-25-architecture-business-system-boundaries` | **已并入本 task**；作为架构/业务边界 baseline，不再作为并行 review 主线 |
| `06-18-quotation-runtime-stability-audit` | 报价路径专项审计；与本 task 互补 |
