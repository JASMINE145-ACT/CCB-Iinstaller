# 全项目系统审查 — 主规划

> Task: `06-30-full-system-review` · 创建: 2026-06-30 · 主台账更新: 2026-07-12
> 方法: `$system-review` 只读分层审计 + Trellis spec 对照 + backlog 驱动修复

---

## 0. 任务定位

`06-30-full-system-review` 是 AionUI + CCB-Wanding 的持续系统审查总台账。它不替代功能开发 task，也不在审查过程中顺手大改产品代码；它负责建立系统地图、发现跨层风险、维护 P0/P1 backlog，并把需要动手的事项拆成独立修复任务或明确的 Phase。

历史 task `06-25-architecture-business-system-boundaries` 已并入本任务，作为架构/业务边界 baseline 使用：

- `../06-25-architecture-business-system-boundaries/boundary-map.md` — system / business / app / UI / generated / vendor 边界地图
- `../06-25-architecture-business-system-boundaries/prd.md` — Python / MCP business vs system adapter 拆分历史
- `../06-25-architecture-business-system-boundaries/cleanup-audit.md` — generated/vendor/runtime payload 与 workspace cleanup 证据

后续所有新的系统审查入口统一从本任务开始；06-25 只作为 evidence，不再扩展成并行主线。

---

## 1. 项目四层/七层心智模型

```text
                    ┌─────────────────────────────────────┐
                    │  Step 5: Ship/Ops                   │
                    │  build / NSIS / hot-update / CI     │
                    └──────────────────┬──────────────────┘
                                       │
┌──────────────┐  ┌──────────────┐  ┌─┴────────────┐  ┌──────────────┐
│ Step 3       │  │ Step 1       │  │ Step 2       │  │ Step 4       │
│ Frontend     │◄─┤ Integration  ├─►│ Backend      │  │ Business     │
│ AionUI       │  │ ccb-installer│  │ claude-code-B│  │ python/data  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │                 │
       └─────────────────┴──────────────────┴─────────────────┘
                              runtime chain
```

典型运行时链：

```text
AionUI renderer
  -> aioncore / org service
  -> route-b patch / CCB launcher glue
  -> CCB-Wanding --acp / claude-code-B
  -> MCP server
  -> Python/data/vendor payload
  -> user-visible result + logs + persistence
```

Rule 0：

| 场景 | 归属层 | 常见证据 |
| --- | --- | --- |
| ACP session / permission / greeting / MCP config merge | Backend | `.trellis/spec/backend/*`, `D:\claude-code-B\src\`, route-b status |
| UI / IPC / chat rendering / settings / page state | Frontend | `.trellis/spec/frontend/*`, `aionui-src/.../renderer` |
| route-b / seed agents / sync / launcher / install glue | Integration | `.trellis/spec/integration/*`, `ccb-installer/scripts/*` |
| quotation / price-library / inventory / org knowledge / business MCP semantics | Business | `python/`, `mcp_servers/`, `data/`, business agent md |
| installer / NSIS / hot update / manifest / rollback / CI | Ship/Ops | `build-wanding.ps1`, NSIS, update docs, workflows |

---

## 2. 五步审查执行表

| Step | 模块 | 当前状态 | Artifact | 成熟度 | 下一步 |
| --- | --- | --- | --- | --- | --- |
| 1 | Integration | completed + rereviewed | `reviews/step-01-integration.md` + `reviews/step-01-integration-rereview-2026-07-11.md` | 8.0/10 | 修 P1/P2 backlog；CI/release 归入 Step 5 |
| 2 | Backend | completed + rereviewed | `reviews/step-02-backend.md` + `reviews/step-02-backend-rereview-2026-07-12.md` | 8/10 | P0/P1 已关闭；live dist / CI proof 归入 Step 5 |
| 3 | Frontend | completed | `reviews/step-03-frontend.md` + closure docs | 7/10 | 已收口；剩余 P2 保持 backlog |
| baseline | Architecture boundary | completed | 06-25 boundary map / cleanup audit | baseline | Step 4/5 必读 evidence |
| 4 | Business | pending | `reviews/step-04-business.md` | TBD | **下一步启动** |
| 5 | Ship/Ops | pending | `reviews/step-05-ship-ops.md` | TBD | 发版链/冷构建前启动 |
| final | Cross-layer roadmap | pending | `cross-layer-roadmap.md` 或等价章节 | TBD | Step 4/5 后汇总 |

---

## 3. 每步审查固定输出

每个 `reviews/step-0N-*.md` 必须包含：

1. Overall judgment：成熟度评分、可交付级别、核心结论。
2. System map：模块/目录、责任、关键文件、初步判断。
3. Main flow：用户输入或运维动作到结果确认的端到端链路。
4. Data flow：关键数据对象、来源、处理位置、输出位置、风险。
5. Execution stability：失败场景、当前行为、影响、MVP 修复机制。
6. Safety boundaries：权限、写入、外部 API、secrets、vendor/generated 边界。
7. Testing and verification：已有测试、缺口、建议测试或 smoke。
8. Top risks：P0/P1/P2 排序，不把所有问题都标 P0。
9. Backlog delta：要追加到 `backlog.md` 的条目，带 owner layer。
10. Spec delta：需要回写或刷新到 `.trellis/spec/*` 的文档。

审查默认只读。只有用户明确说“进入修改模式 / 执行修复 / 直接改”时，才进入修复阶段。

---

## 4. Step 4 Business 审查计划（下一步）

### 4.1 审查目标

验证 06-25 边界拆分是否在业务层继续成立：MCP transport、Python dispatch、报价/库存/价库/组织知识业务规则、agent prompt、vendor payload 是否各在正确层，且 live 行为可验证。

### 4.2 必读 evidence

| 类型 | 文件 / 目录 |
| --- | --- |
| 架构基线 | `../06-25-architecture-business-system-boundaries/boundary-map.md` |
| Backend business spec | `.trellis/spec/backend/mcp-business.md` |
| Price library spec | `.trellis/spec/integration/price-library.md` |
| Org knowledge spec | `.trellis/spec/integration/org-knowledge.md` |
| Agent model spec | `.trellis/spec/integration/agents-unified-model.md` |
| MCP health baseline | `.trellis/spec/integration/mcp-health.md` |
| Python system/business code | `python/system/`, `python/quotation/`, `python/inventory/`, `python/admin/` |
| MCP adapters | `mcp_servers/`, `ccb-installer/vendor/mcp-servers/` |
| Business data | `data/`, vendor-synced data payloads |
| Agent prompts | `ccb-installer/packages/vertical/com.wanding.trade/agents/*.md` |

### 4.3 Business 子域

| 子域 | 要回答的问题 |
| --- | --- |
| Quotation | 报价匹配、Excel 填充、模板路径、error_code、候选解释是否仍是业务层，不泄到 system dispatch |
| Inventory | 库存查询、批量 payload、搜索 fallback 是否和报价组合流稳定 |
| Price Library | draft/publish/import/rollback、agent write/read、revision conflict 是否有确认与回滚边界 |
| Org Knowledge | append preview/confirmed flow、shadow read-only、org session、历史展示是否避免静默写入 |
| MCP Adapters | MCP stdio/http 工具是否只是薄适配，是否有重复业务逻辑 |
| Agent Prompts | L1 硬约束、预览确认、工具选择、失败恢复是否和 MCP 工具面一致 |
| Vendor Sync | repo source 与 live vendor 是否有可证明一致性，是否存在 generated/vendor 永久改动风险 |
| Tests/Evals | Python tests、MCP health、agent eval 是否覆盖关键成功/失败/权限路径 |

### 4.4 Step 4 输出

- `reviews/step-04-business.md`
- `backlog.md` 追加 `BUS-P0/P1/P2-*`
- `status.md` Business 成熟度评分
- 如有必要，提出独立修复 task，不在审查中直接改业务代码

---

## 5. Step 5 Ship/Ops 审查计划

Step 5 只有在准备发版、冷构建、安装包链路或热更新链路前才应启动。它关注“能不能可重复地交付到用户机器”。

| 子域 | 要回答的问题 |
| --- | --- |
| Build | `build-wanding.ps1` 是否覆盖 source sync、vendor sync、AionUI build、NSIS、manifest |
| Packaging | `wanding-packaging-whitelist.md` 与 staging 实际是否一致，generated/runtime payload 是否清楚 |
| Installer | NSIS full/lite、install-health、repair/reinstall、JWT reset、rollback 是否闭环 |
| Internal update | VPS manifest、hot update、version gate、requiresFullInstall 是否可运维 |
| CI | workflows 是否覆盖关键 build/test/smoke，哪些仍是手动 gate |
| Smoke | `test-mcp-health.ps1`、installer smoke、native ACP smoke 是否能证明用户路径 |
| Docs/Ops | support 手册、故障恢复、日志路径、版本矩阵是否足够一线排障 |

输出：`reviews/step-05-ship-ops.md`、`SHIP-*` backlog、最终 release readiness 判断。

---

## 6. 开发中如何使用这个任务

### 6.1 开发 task 的局部 review

当你正在做一个功能 task 时，不需要启动全量 Step 4/5。使用局部模式：

```text
$system-review
审查当前 task 是否破坏 06-30-full-system-review 的系统边界。
范围：<task path>
重点：架构边界、数据流、权限、安全、测试、spec 更新。
只读，不改代码。
```

输出只追加到该功能 task；如果发现跨层 P0/P1，再同步一条到本任务 `backlog.md`。

### 6.2 全局周期性 review

当系统连续开发了一批功能，或准备 release，使用全局模式：

```text
$system-review
继续 06-30-full-system-review 的 Step N。
先建立系统地图，再审主流程、数据流、执行稳定性、安全边界、测试、部署。
输出 reviews/step-0N-*.md + backlog 增量。
只读。
```

---

## 7. Backlog 规则

`backlog.md` 是全项目风险队列，不记录普通 TODO。进入 backlog 的条目必须满足至少一个条件：

- 跨层契约不一致，可能导致修错层或行为漂移。
- 用户主流程可能失败、数据错误、权限泄漏、静默写入、无法恢复。
- dev/live/vendor/generated 之间有不可证明的一致性风险。
- 测试或 smoke 缺失导致 release 证据不足。
- spec 与代码冲突，导致后续 agent 误判。

命名建议：

| 前缀 | 含义 |
| --- | --- |
| `INT-*` | Integration / route-b / sync / launcher |
| `BE-*` | Backend / ACP / MCP runtime |
| `FE-*` | Frontend / renderer / IPC / UI state |
| `BUS-*` | Business Python / MCP tools / data / prompts |
| `SHIP-*` | Build / packaging / update / install / CI |
| `XL-*` | Cross-layer roadmap / spec consistency |

---

## 8. 完成定义

本任务完成不是“没有问题”，而是达到可治理状态：

1. Step 1-5 review artifacts 齐全。
2. `backlog.md` 汇总全项目 P0/P1/P2，状态可追踪。
3. `.trellis/spec/index.md` 成熟度表与 refresh policy 更新。
4. 每个 P0/P1 都有 owner layer、建议修复路径、是否需要独立 task。
5. `cross-layer-roadmap` 完成：给出 MVP、内部工具、可交付产品三个阶段的系统改进路线。
6. 后续新功能 task 能引用本任务判断“改哪里、怎么验、是否越界”。

---

## 9. 当前下一步

1. 启动 Step 4 Business 只读审查。
2. 产出 `reviews/step-04-business.md`。
3. 追加 `BUS-*` backlog。
4. 更新 `status.md` 的 Business 成熟度。
5. 再决定是否进入 Step 5 Ship/Ops，或先拆 Business P0/P1 修复 task。
