# Platform Business Decoupling — Phased Implementation

## Goal

将 CCB-Wanding 从「平台 + 万鼎业务焊接发行」演进为 **Platform Core + Tenant + Vertical Package + Connector** 的可装配架构，同时 **保留** 四层运行链 `AionUI → aioncore → route-b → CCB Runtime`，不推倒重来。

**权威设计：** [`docs/platform-system-business-decoupling-optimization.md`](../../../docs/platform-system-business-decoupling-optimization.md)  
**ADR 基础：** [`.trellis/spec/integration/platform-vertical-packages.md`](../../spec/integration/platform-vertical-packages.md)

## Non-goals

- 重写 ACP / Route B / CCB Runtime 内核
- 第一阶段即多租户共享数据库
- 允许未签名业务包任意 UI/脚本执行
- 在 registry 与配置编译器就绪前继续堆业务专用安装脚本

## Success metrics（摘自设计文档 §22）

| 指标 | 目标 |
|------|------|
| 平台核心客户硬编码 | 0 |
| Agent/MCP/Skill 关键关系 | 单一权威源 |
| 新业务包接入 | 不改平台核心 |
| 配置来源 | 100% 可追踪 provenance |
| secret 入库 | 0 |
| 平台空载启动 | 不装垂直包仍可健康运行 |
| 第二垂直验证 | ≥1 个非报价/非贸易业务 |

## Phase 总览

```text
P0  Phase 0 — 冻结边界与安全红线
P1  Phase 1 — 元模型 + 只读 Registry
P2  Phase 2 — 配置编译器 + 单一权威源
P3  Phase 3 — 抽取 com.wanding.trade
P4  Phase 4 — 控制面 + 租户治理
P5  Phase 5 — 第二家公司试点
```

**依赖链：** P0 → P1 → P2 → P3 → P4 → P5（P3 可与 P2 尾部重叠，但不可在 P1 前做 P3）

---

## Phase 0 — 冻结边界与处理安全风险

**目标：** 在继续扩业务前建立红线；安全债务优先于平台扩展。

### Workstreams

| ID | Workstream | 交付物 |
|----|------------|--------|
| P0-A | 凭据轮换与暴露评估 | 轮换记录；Git 历史/分发包扫描结论 |
| P0-B | Secret scanning 门禁 | CI/pre-commit 规则；禁止新 secret 入库 |
| P0-C | 平台禁止清单 | spec：`platform-forbidden-coupling.md` 或 ADR — 客户名/Agent ID/MCP 名/路径 |
| P0-D | 命名与 schema 策略 | `tenant_id` / `package_id` / `capability_id` / `schemaVersion` 约定文档 |
| P0-E | 四层链不重写声明 | 更新 `platform-vertical-packages.md` 或 outline — 明确 platform core 边界 |

### Acceptance

- [ ] 已知暴露凭据已轮换（有证据，不写入 spec）
- [ ] CI 或等效 gate 拦截 secret 模式入库
- [ ] 平台目录新增代码 review 清单：禁止万鼎固定身份
- [ ] P0 完成记录写入 `p0-security-boundary-done.md`

### Spec entry

- `.trellis/spec/integration/platform-vertical-packages.md`
- `GOVERNANCE` 等价：设计文档 §12.3、§21

### 注意

- **阻塞 P1–P5** 中所有涉及多公司与凭据的工作
- 与进行中的 feature task（如价库 Agent）并行时：**新代码不得新增平台层万鼎硬编码**

---

## Phase 1 — 元模型与只读 Registry

**目标：** 建立统一描述层；**不改变**现有运行方式（只读 snapshot + lint）。

### Workstreams

| ID | Workstream | 交付物 |
|----|------------|--------|
| P1-A | Package manifest JSON Schema | `openspec/` 或 `.trellis/spec/integration/package-manifest-schema.md` + 示例 |
| P1-B | Descriptor 类型 | Agent / Skill / MCP / Knowledge / Contribution / Capability 描述结构 |
| P1-C | Legacy ID aliases | 映射表：`wande-orchestrator` → `com.wanding.trade/...` |
| P1-D | Registry snapshot 生成器 | 脚本：从现有 `ccb-installer/config/*` 生成只读 registry JSON |
| P1-E | Registry lint | 引用完整性、重复声明、orphan MCP/Agent 检测 |
| P1-F | 能力 ID 初版 | `platform.*` / `business.*` 命名表 |

### Acceptance

- [x] 可从单一 manifest **图**回答：「某租户（模拟）有哪些 Agent/Skill/MCP 及依赖」
- [x] Lint 对当前万鼎资产运行通过或输出可追踪 WARN 清单
- [x] 现有安装/运行脚本 **仍可工作**（本阶段无行为变更）
- [x] `p1-registry-snapshot-done.md` 含样例输出路径与命令

### Spec entry

- `.trellis/spec/integration/agents-unified-model.md`
- `.trellis/spec/integration/mcp-health.md`
- `ccb-installer/config/mcp-health-manifest.json`（输入源）

---

## Phase 2 — 配置编译与单一权威源

**目标：** 消除 Agent-MCP-Skill 多份手工镜像；`settings.json` 降为编译产物。

### Workstreams

| ID | Workstream | 交付物 |
|----|------------|--------|
| P2-A | 配置分层与 merge policy | platform → env → package → tenant → user → session |
| P2-B | Secret reference 模型 | `secret://tenant/...`；禁止 value 进入 manifest |
| P2-C | Desired / observed state | 控制面数据模型草案或 SQLite schema spike |
| P2-D | 配置编译器 v1 | manifest + tenant → `ResolvedRuntimeConfig` |
| P2-E | 投影适配器 | 生成 CCB `settings.json`、Agent sidecar、health plan |
| P2-F | Provenance + drift | 字段级来源；手工改生成物可检测 |
| P2-G | 迁移适配 | 现有 `ensure-wanding-settings.ps1` 等变为薄包装或 deprecated 路径 |

### Acceptance

- [ ] **同一 Agent–MCP 关系只声明一次**（在 manifest 或 generated 源）
- [ ] 生成 `settings.json` 与当前手工结果 **diff 可解释**（允许过渡期 alias）
- [ ] Drift 检测：改生成文件 → lint 失败
- [ ] 单测覆盖 merge、secret ref 解析、invalid schema 拒绝
- [ ] `p2-config-compiler-done.md` 含编译命令与样例 provenance

### Spec entry

- `.trellis/spec/backend/config-layer.md`
- `.trellis/spec/integration/aionui-config-inventory.md`

### 风险

- 与活跃 feature 并行时：约定「新 Agent/MCP 只进 manifest，禁止再抄三份」

---

## Phase 3 — 抽取 `com.wanding.trade`

**目标：** 万鼎成为第一个正式可装卸垂直业务包。

### Workstreams

| ID | Workstream | 交付物 |
|----|------------|--------|
| P3-A | 包目录结构 | `packages/vertical/com.wanding.trade/` 或 ADR 选定路径 |
| P3-B | 迁移 Agent / Skill / MCP | 报价、库存、Accurate、价库、orchestrator 路由 |
| P3-C | 知识 schema + 种子 | 自固定 8 slug 转为 collection 声明 |
| P3-D | Connector 抽象 | Accurate / 价库等 secret requirements + health |
| P3-E | 平台健康拆分 | `install-health-manifest` 不再 **要求** 万鼎文件即可启动 |
| P3-F | Legacy 适配层 | 旧路径、旧 Agent ID alias 过渡期 |
| P3-G | 包 lifecycle smoke | install / enable / disable / upgrade / rollback 脚本或测试 |
| P3-H | Eval + fixtures | 万鼎 Agent eval 归入包内 |

### Acceptance

- [ ] **空平台**（不装万鼎包）可启动并通过 **平台级** 健康检查
- [ ] 安装 `com.wanding.trade` 后恢复 **现有万鼎能力**（回归 smoke）
- [ ] 平台代码无 `quotation-agent` / `wanding_business_knowledge` 等 **硬编码分支**（允许 registry alias）
- [ ] `p3-wanding-package-done.md` 含装卸命令与证据

### Spec entry

- 设计文档 §17 抽取边界清单
- `.trellis/spec/integration/org-knowledge.md`
- `.trellis/spec/backend/mcp-business.md`

### 依赖

- **强依赖 P1**（manifest）；**强依赖 P2**（生成投影，至少 v1）

---

## Phase 4 — 控制面与租户治理

**目标：** 可管理多公司环境（建议物理分租户部署）。

### Workstreams

| ID | Workstream | 交付物 |
|----|------------|--------|
| P4-A | Package catalog + lock | 租户环境 lock 文件（平台版本、包 hash、config revision） |
| P4-B | 配置发布 / 灰度 / 回滚 | 控制面 API 或 admin CLI |
| P4-C | OIDC / JWKS | 替代客户端对称 JWT 签发秘密 |
| P4-D | 服务端 secret store | 按 tenant/environment 隔离 |
| P4-E | TenantContext 贯穿 | org 服务、审计、知识 API 带 `tenant_id` |
| P4-F | 管理 UI 容器 | 包管理、健康、drift、审计（可 MVP） |
| P4-G | 审计事件 | 登录、包变更、MCP 调用、配置发布（§12.4） |
| P4-H | 分租户部署模板 | 每公司独立实例文档/IaC 草案 |

### Acceptance

- [ ] 管理员可查看 **desired vs observed** 与 drift
- [ ] 业务凭据 **不落** 员工机器（仅 secret ref）
- [ ] Token 验证走 JWKS；客户端无签发秘密
- [ ] `p4-control-plane-done.md`

### 依赖

- P0 安全；P3 包格式稳定

---

## Phase 5 — 第二家公司试点

**目标：** 证明平台通用性（非「万鼎换目录」）。

### Workstreams

| ID | Workstream | 交付物 |
|----|------------|--------|
| P5-A | 选型 ADR | 制造排产 / 物流异常等非报价域 |
| P5-B | 新业务包 `com.*` | 独立 Agent 图、MCP、知识 schema、UI contribution |
| P5-C | Connector 对接 | 不同 ERP/数据源 |
| P5-D | 全链验收 | 安装 → 运行 → 升级 → 卸载 |
| P5-E | 平台反哺清单 | 试点中发现的通用需求 → platform backlog |

### Acceptance

- [x] **零修改** platform core 即可交付第二包
- [x] 第二包与 `com.wanding.trade` 可同时安装或互斥（按设计）
- [x] 全链 smoke + 简短案例文档
- [x] 设计文档 §22「第二垂直验证」指标达成

### 依赖

- P3 + P4 最低可用

---

## P0 / P1 / P2 Backlog 优先级（跨 Phase）

摘自设计文档 §19，映射到本 task 的 **执行顺序**：

| 优先级 | 内容 | Phase |
|--------|------|-------|
| P0 | 凭据、secret scanning、manifest 基础、tenant 贯穿、单一描述源、平台/万鼎健康拆分、OIDC 方案、万鼎边界清单 | 0–2 头部 |
| P1 | package lifecycle、drift、管理 UI、审计、动态知识、connector 抽象、签名/SBOM | 3–4 |
| P2 | 包仓库、灰度、配额、SDK、UI contribution 扩展 | 4–5 后 |

---

## 与现有 Task 的关系

| 现有 Task | 关系 |
|-----------|------|
| `06-25-architecture-business-system-boundaries` | Python/目录边界；**本 task 上层产品装配** |
| `06-30-full-system-review` | 审计 backlog 可并入 P0/P1 输入 |
| `07-01-price-library-admin-agent` | 新功能应 **按 P1 manifest 或 P3 包边界** 落地，避免新增平台硬编码 |
| `07-02-mcp-health-coverage-expansion` | health 最终应收口到 P2 生成 + P3 包声明 |

---

## Out of scope（本 epic 不一次性完成）

- 微服务拆分
- 共享多租户数据库
- 完整包仓库商业化
- 所有 UI 动态插件

---

## Epic acceptance

- [ ] Phase 0–5 各有 `pN-*-done.md` 证据文件
- [ ] `.trellis/spec/integration/platform-vertical-packages.md` 与实现对齐更新
- [ ] 设计文档 §20 待确认 ADR 逐项有记录或明确 defer
- [ ] §21 强制规则写入 spec + 至少一条 CI/lint  Enforcement
