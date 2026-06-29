# 全项目系统审查 — 分模块 spec↔代码审计

## Goal

对整个 AionUI + CCB-Wanding 项目做**分步、分模块**的系统审查：每一步只专注一层，对照 Trellis spec 与实际代码/脚本，产出成熟度评分、差距表、风险与可执行改进路线。

**不是**一次性大 refactor；**是**可追踪的审计 backlog + 按优先级落地的修复计划。

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
Step 2  Backend       ⏳ CCB-Wanding / claude-code-B / ACP / MCP
Step 3  Frontend      ⏳ AionUI desktop / IPC / chat / Guid / Settings
Step 4  Business      ⏳ python/ + mcp_servers/ + data/
Step 5  Ship/Ops      ⏳ build-wanding / internal-update / Phase 4 冷构建
```

每步完成后：

1. 写入 `reviews/step-0N-<layer>.md`
2. 更新 `status.md` 子任务状态
3. 若发现跨层 P0，挂到 `backlog.md` 并标注 owner layer

## Step 1 结论摘要（Integration）

- **成熟度：** 7.5/10（spec 自评 9/10，实际有 doc/script 漂移与 Phase 4 未 ship）
- **P0：** route-b 同步目标数不一致；dev 未自动 vendor sync；Phase 4 `1.1.3-dev` 冷构建未闭环
- **详情：** [`reviews/step-01-integration.md`](./reviews/step-01-integration.md)

## Step 2–5 预审范围（待 system-reviewer 填充）

### Step 2 — Backend

**Spec 入口：** `.trellis/spec/backend/index.md`、`acp-session-flow.md`、`route-b-status.md`、`build-deploy-verify.md`、`mcp-business.md`

**重点：**

- `D:\claude-code-B\src\` ACP session / MCP 注册 / permission 事件
- `agent.ts` `resolveSessionMcpConfigs`、greeting、tool loop
- `route-b-status.md` 快照滞后（仍 2026-06-12）vs 当前 MCP 29/29 基线
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

- `python/system/tool_dispatch.py` 与各 dispatch 模块边界（对照 task `06-25-architecture`）
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
| 1 | `route-b-sync.md` 对齐 `sync-aionui-ccb-route-b.ps1`（3 targets）；doc sweep `start-aionui-dev` → `start-dev-full` | P0 |
| 2 | `start-dev-full.ps1` 增加 `-SyncVendor` 或 hash preflight | P0 |
| 3 | 修 `verify-installer.ps1` 默认路径；新增 `integration-smoke.ps1` | P1 |
| 4 | ACP 版本 `0.39.0` 探测/helper | P1 |
| 5 | 刷新 `route-b-status.md` + `AIONUI-BACKEND-STATUS.md` | P1 |

## Acceptance

- [x] Trellis task + `review-plan.md` + Step 1 完整审查 artifact
- [ ] Step 2–5 各有一份 `reviews/step-0N-*.md`（含成熟度、差距表、风险、MVP 路线）
- [ ] `backlog.md` 汇总全项目 P0/P1，按 layer 标注 owner
- [ ] 五步完成后更新 `.trellis/spec/index.md` 成熟度表与 refresh policy
- [x] Integration Phase 1 doc 对齐（`delivery-phase-01-integration-docs.md`）

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
| `06-25-architecture-business-system-boundaries` | Business 层边界已完成 refactor；审查验证是否 hold |
| `06-18-quotation-runtime-stability-audit` | 报价路径专项审计；与本 task 互补 |
