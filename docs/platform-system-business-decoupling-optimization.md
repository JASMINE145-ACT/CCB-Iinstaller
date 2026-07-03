# CCB 普适性平台：系统体系完善与业务框架解耦优化方案

> 状态：架构探索与优化建议（不含代码修改）  
> 日期：2026-07-03  
> 目标：把当前“可用的 CCB-Wanding 产品”演进为“可为不同公司装配不同业务的通用平台”，同时把万鼎业务收敛为首个垂直业务包。  
> 范围：平台核心、租户、Agent、Skill、MCP、知识、配置、权限、安装更新、健康检查、可观测性、治理与业务包开发规范。

## 1. 结论摘要

当前系统不是“没有体系”，而是处于一个典型的中间阶段：

> 已有稳定的平台运行内核和大量可靠的工程能力，但配置、产品装配、运行治理和万鼎业务仍通过脚本、固定名称、固定路径及重复清单焊接在一起。

现有四层运行链 `AionUI → aioncore → route-b → CCB Runtime` 应继续作为平台核心，不建议为了解耦而重写。ACP 边界、Agent 会话、MCP 调用、健康探测、更新和本地任务等能力，也都具备平台资产价值。

真正需要补齐的是运行链之上的“平台控制体系”：

1. 统一的租户、业务包和能力模型；
2. Agent、Skill、MCP、知识及 UI 扩展点的统一注册表；
3. 配置的分层、合并、校验、来源追踪和安全存储；
4. 业务包的安装、升级、迁移、回滚、卸载和兼容性契约；
5. 从业务包声明自动生成运行配置、健康检查、权限和 UI；
6. 用第二家公司、不同业务域证明平台没有隐藏的万鼎耦合。

现有 `.trellis/spec/integration/platform-vertical-packages.md` 已经提出正确的“Platform Core + Tenant + Vertical Package + Connector”方向。本文件在此基础上补全体系规范、能力清单、目标数据模型、装配机制、治理门禁和迁移顺序。

## 2. 本次探索证据范围

本次结论主要基于以下当前权威资料与运行配置：

- `.trellis/spec/index.md`
- `.trellis/spec/outline.md`
- `.trellis/spec/backend/index.md`
- `.trellis/spec/backend/config-layer.md`
- `.trellis/spec/backend/mcp-business.md`
- `.trellis/spec/backend/runtime-architecture.md`
- `.trellis/spec/integration/index.md`
- `.trellis/spec/integration/aionui-config-inventory.md`
- `.trellis/spec/integration/agents-unified-model.md`
- `.trellis/spec/integration/mcp-health.md`
- `.trellis/spec/integration/org-knowledge.md`
- `.trellis/spec/integration/platform-architecture.md`
- `.trellis/spec/integration/platform-vertical-packages.md`
- `docs/ccb-wanding-platform-architecture.md`
- `docs/ccb-wanding-agent-engineering-maturity.md`
- `ccb-installer/config/agents/`
- `ccb-installer/config/skills/`
- `ccb-installer/config/mcp-health-manifest.json`
- `ccb-installer/config/research-capability-manifest.json`
- `ccb-installer/resources/install-health-manifest.json`
- `ccb-installer/seed/config-ship-manifest.json`
- `ccb-installer/scripts/ensure-wanding-settings.ps1`
- 仓库根 `.mcp.json`

说明：仓库当前存在大量其他未提交改动。本次只新增本文档，不修改、整理或覆盖任何既有代码和配置。

## 3. 现有体系成熟度审计

评分含义：5 表示已有明确规范、单一权威源、完整生命周期和自动验证；1 表示主要依赖约定或人工维护。

| 领域 | 现状评分 | 已有资产 | 主要缺口 |
|---|---:|---|---|
| 平台运行内核 | 4.0 | 四层链、ACP、source-first、Route B、部署 smoke | 产品身份仍叫 Wanding；平台能力与业务发行物未独立版本化 |
| Agent | 3.5 | Markdown + sidecar、直接会话、委派、MCP allowlist、健康校验 | 同一事实分布在 frontmatter、sidecar、健康 manifest 和脚本；固定 Agent ID |
| Skill | 2.5 | `SKILL.md`、部署脚本、部分测试和 gate | 无统一 manifest、依赖声明、权限、兼容范围、版本和升级/卸载模型 |
| MCP | 3.0 | stdio/http、探测、路径检查、Agent allowlist | 注册、spawn、health、权限、凭据和业务包归属分散；无统一 registry |
| 配置 | 2.5 | 已明确 CCB authority；有 bootstrap 和迁移 | `settings.json` 过载；多源重复；无 schema 驱动的分层合并与 provenance |
| 业务包 | 1.5 | 已有 `com.wanding.trade` ADR | 尚无真正可安装业务包、包仓库、依赖解析、生命周期和签名 |
| 多租户 | 1.5 | org 登录、RBAC、知识 API、Phase A 思路 | 单组织语义；数据、配置、审计和凭据未系统性带 `tenant_id` |
| 身份与秘密 | 1.5 | JWT、org session profile | 多公司前不能继续共享对称签名秘密；仓库/客户端仍出现业务凭据 |
| 知识 | 2.5 | org knowledge、历史、回滚、业务读取 gate | 固定 slug；集合、可见范围、包归属、发布状态和同步策略未通用化 |
| 安装与更新 | 3.0 | NSIS、whitelist、hot update、health gate | 一个安装包同时交付平台和万鼎业务；不能独立升级/回滚业务包 |
| 健康与可观测性 | 3.5 | MCP health、session probe、startup readiness、错误码 | 健康清单绑定固定业务名；缺少统一事件、指标、审计和租户维度 |
| 测试与评估 | 3.0 | 单测、smoke、Agent eval、gate fixtures | 缺少业务包合规测试套件、跨版本兼容矩阵和第二垂直验证 |
| 治理与文档 | 3.5 | Trellis spec、ADR、发布/同步手册 | “声明—生成—验证—发布”未闭环，文档与多份运行镜像容易漂移 |

总体判断：工程运行体系约为 3.5/5，平台产品体系约为 2/5。下一阶段重点不应是继续增加单点功能，而应建立统一元模型和装配链。

## 4. 当前最关键的耦合与风险

### 4.1 万鼎业务跨层硬编码

以下内容本应属于 `com.wanding.trade`，当前却进入平台或安装器通用层：

- `wande-orchestrator`、`quotation-agent`、`accurate-agent` 等固定 ID；
- `quotation`、`accurate`、`price-library` 等固定 MCP 名称；
- `wanding_business_knowledge` 等固定知识 slug；
- `vendor/wanding/`、`D:\CCB-Wanding\` 和 Wanding 环境变量；
- 安装健康清单中的报价、万鼎知识和报价 Agent 必需文件；
- bootstrap、部署、探测和发布脚本里的业务特例；
- 前端 Agent 卡片、保留集合、排序和迁移逻辑里的业务身份。

只把这些文件移动到一个目录并不能完成解耦。平台代码必须只认识通用描述符，不认识“报价”“Accurate”或“万鼎”。

### 4.2 配置事实重复

一个 Agent 的工具权限目前至少可能同时存在于：

1. Agent Markdown frontmatter；
2. `*.aionui.json` sidecar；
3. `mcp-health-manifest.json.agent_profiles`；
4. 部署脚本和运行目录；
5. 前端 catalog 或迁移保留集合。

同类重复也存在于 MCP 的启动配置、必需文件、探测调用、Agent 权限和安装清单。当前已有“保持对齐”的规则，但没有一个模型自动生成其余投影，因此漂移是结构性风险。

### 4.3 Skill 仍是文件分发，不是平台能力

当前 Skill 主要通过目录、`SKILL.md` 和专用 PowerShell 脚本部署。平台尚不能统一回答：

- Skill 属于平台、业务包还是租户自定义？
- 版本、兼容的 Runtime/API 版本是什么？
- 依赖哪些 MCP、二进制、Python 包、权限和网络域？
- 哪些 Agent 可用，默认启用还是按租户启用？
- 安装失败、升级失败如何回滚？
- Skill 是否可信、是否签名、是否经过评估？
- 是否允许执行脚本、访问本地文件或读取秘密？

### 4.4 MCP 配置、健康和权限未统一

`mcp-health-manifest.json` 已经接近一个注册表，但它主要服务健康检查，并同时包含：

- Server 类型和启动依赖；
- 探测调用；
- Agent 工具映射；
- 可选能力；
- 业务语义备注。

与此同时，实际 spawn 配置仍由 `settings.json` 和脚本生成。健康注册表不是运行注册表，二者容易不一致。MCP 还缺少统一的认证方式、敏感参数引用、工具级权限、数据分类、速率限制、审计和远端降级策略。

### 4.5 安全债务优先级高于平台扩展

探索中发现，仓库配置文件存在真实业务凭据材料。无论仓库是否私有，都应视为已暴露并执行轮换；Git 历史中的值也应按泄露处理。本文不记录具体值。

多公司版本还必须停止向客户端分发可用于签发 Token 的共享对称秘密。客户端只能持有公开验证材料或短期访问令牌，业务系统凭据应保留在服务端秘密库。

### 4.6 “配置平台”与“业务平台”尚未形成控制面

现在大部分装配发生在安装时脚本中。平台缺少一个可查询的期望状态：

> 某租户在某环境安装了哪些包、各是什么版本、启用了哪些 Agent/Skill/MCP、配置从哪里继承、哪些秘密引用有效、实际运行状态是否与期望一致。

没有控制面，就很难稳定支持多公司差异、灰度发布、审计、回滚和远程治理。

## 5. 目标架构与边界

### 5.1 五层模型

```text
Platform Core
  Runtime / ACP / identity client / registry / config engine
  package lifecycle / policy / health / audit / update

Platform Capability Packages
  Office / research / local files / generic knowledge / common UI

Tenant
  company identity / members / roles / policy / feature flags
  installed package set / environment / secret references / quotas

Vertical Business Packages
  e.g. com.wanding.trade
  agents / skills / MCP / knowledge schemas / UI / policies / evals

Connectors
  ERP / CRM / OA / database / object storage / local desktop
```

### 5.2 平台核心必须保持业务无知

平台核心允许认识：

- package、capability、agent、skill、mcp、knowledge collection；
- tenant、environment、policy、permission、secret reference；
- contribution、migration、health check、eval suite；
- install、enable、disable、upgrade、rollback、uninstall。

平台核心禁止认识：

- 万鼎、报价、VANTSING、Accurate、AOL；
- 某个固定业务 Agent ID 或 MCP server name；
- 某公司固定知识 slug、价格表字段或业务 SOP；
- 某公司固定磁盘目录和凭据名称。

### 5.3 初期隔离策略

建议先采用“逻辑统一、物理分租户部署”：

- 平台接口、manifest 和数据模型从第一天包含 `tenant_id`；
- 每家公司独立控制面实例、数据库、密钥域和业务 MCP；
- 平台代码和包格式统一；
- 运营能力成熟后，再评估共享控制面。

这比立即把多家公司数据和 ERP 凭据放入一个共享中心风险更低，也能避免以后重写接口。

## 6. 统一元模型：一份声明生成多个运行投影

### 6.1 业务包 manifest

建议把现有 ADR 中的简版 manifest 扩展为以下逻辑结构：

```json
{
  "schemaVersion": "1.0",
  "id": "com.wanding.trade",
  "version": "1.0.0",
  "display": {},
  "compatibility": {},
  "dependencies": [],
  "capabilities": [],
  "agents": [],
  "skills": [],
  "mcpServers": [],
  "knowledgeCollections": [],
  "uiContributions": [],
  "permissions": [],
  "configuration": {},
  "secretRequirements": [],
  "healthChecks": [],
  "migrations": [],
  "evalSuites": [],
  "artifacts": [],
  "lifecycle": {},
  "integrity": {}
}
```

必须具备的契约：

| 契约 | 要求 |
|---|---|
| 身份 | 全局稳定 package ID，语义化版本 |
| 兼容性 | 最低/最高平台、Runtime、manifest schema 版本 |
| 依赖 | package/capability 依赖、可选依赖和冲突 |
| 权限 | 声明 Agent、Skill、MCP 和 UI 所需权限 |
| 配置 | JSON Schema、默认值、是否可由平台/租户/用户覆盖 |
| 秘密 | 只声明 secret key 和用途，不包含 secret value |
| 生命周期 | install/enable/disable/upgrade/rollback/uninstall |
| 完整性 | artifact hash、签名、发布者和来源 |
| 验证 | 健康检查、契约测试和 Agent eval |

### 6.2 Capability ID

业务包之间不应直接依赖另一个包内部的 MCP 名称，应优先依赖稳定能力：

```text
platform.office.word.create
platform.office.excel.edit
platform.research.web
business.pricing.quote
business.inventory.read
business.accounting.summary
```

一个 capability 可由本地 MCP、远端 MCP 或其他 connector 实现。这样万鼎包可以要求 `business.inventory.read`，但不必硬编码具体 ERP。

### 6.3 Registry 集合

平台至少需要以下统一注册表：

| Registry | 负责内容 |
|---|---|
| PackageRegistry | 已安装包、版本、来源、状态、完整性 |
| CapabilityRegistry | 能力定义、实现者和选择策略 |
| AgentRegistry | Agent 描述、可见性、委派、模型和能力需求 |
| SkillRegistry | Skill 版本、依赖、权限、兼容性和入口 |
| McpRegistry | transport、tools、auth、health、data policy |
| KnowledgeRegistry | 集合、文档 schema、可见范围和同步策略 |
| ContributionRegistry | 前端菜单、卡片、设置页和状态面板 |
| PolicyRegistry | 租户策略、功能开关和强制限制 |

这些 Registry 不应各自维护重复事实。它们都应从已安装包 manifest、平台内建包和租户覆盖中解析而来。

## 7. 配置体系规范

### 7.1 分层

建议使用固定优先级：

```text
platform defaults
  < environment policy
  < package defaults
  < tenant policy
  < tenant package config
  < user preferences（仅允许 user-overridable 字段）
  < session overrides（仅允许 session-overridable 字段）
```

系统安全策略和包声明为“不可被低层覆盖”的字段必须在 schema 中明确，而不是依赖脚本顺序。

### 7.2 配置编译器

短期仍需生成 CCB 兼容的 `settings.json`，但它应是编译产物，不再是人工权威源：

```text
package manifests
+ tenant desired state
+ environment config
+ user-safe overrides
+ secret resolver
        ↓ validate / merge / policy
ResolvedRuntimeConfig
        ↓ adapters
CCB settings.json / Agent files / AionUI projections / health plan
```

每个输出字段应能报告：

- 最终值；
- 来源层；
- 被哪些策略限制；
- 是否包含秘密引用；
- 上次生成时间和配置 revision。

### 7.3 配置 schema 与版本

所有平台、租户和业务包配置必须：

- 有 JSON Schema；
- 有 `schemaVersion`；
- 拒绝未知关键字段；
- 支持 migration；
- 在安装前和启动前验证；
- 区分错误、警告和可选能力缺失；
- 对秘密字段只接受引用，如 `secret://tenant/erp/token`。

### 7.4 期望状态与实际状态

控制面保存 desired state，客户端/服务端上报 observed state：

| Desired | Observed |
|---|---|
| 已安装包和目标版本 | 实际包版本、hash |
| 启用的 Agent/Skill/MCP | 实际注册和可调用能力 |
| 配置 revision | 当前应用 revision |
| 健康策略 | 最近健康结果 |
| 秘密引用要求 | 引用是否可解析，不回传秘密值 |

两者不一致时显示 drift，并支持重新调和，而不是继续堆叠修复脚本。

## 8. Agent 体系

### 8.1 单一描述源

建议保留 Agent Markdown 作为 Prompt 载体，但把运行元数据收敛到 manifest 的 `AgentDescriptor`。AionUI sidecar、CCB frontmatter、健康 allowlist 应由描述源生成或严格验证。

核心字段应包括：

- `id`、`version`、`packageId`；
- `display`、`visibility`、`sortOrder`；
- `sessionMode`：default/direct/delegated；
- `delegatable`、允许的父/子 Agent；
- `requiredCapabilities`，而不是只写 MCP 名；
- `skills`、模型策略和权限；
- `promptArtifact` 及 hash；
- hooks/gates；
- eval suite；
- legacy aliases。

### 8.2 Orchestrator 通用化

平台默认 Orchestrator 不应包含万鼎路由表。它应根据 AgentRegistry 的 intent/capability 元数据选择专家。业务包可以提供：

- intent examples；
- routing priority；
- 冲突解决规则；
- 必须直达的专家；
- 禁止主会话直接调用的能力。

### 8.3 Agent 发布门禁

每个 Agent 发布至少验证：

1. descriptor schema；
2. 引用的 Skill 和 capability 存在；
3. 权限不超出业务包声明；
4. MCP/tool allowlist 可解析；
5. Prompt 不引用不存在的路径和工具；
6. direct 与 delegated 两种会话契约；
7. 最小 eval 通过；
8. 敏感信息扫描通过。

## 9. Skill 体系

### 9.1 SkillDescriptor

每个 Skill 除 `SKILL.md` 外，应有机器可读描述：

```json
{
  "id": "com.wanding.trade.quotation-learn-by-data",
  "version": "1.0.0",
  "packageId": "com.wanding.trade",
  "entry": "SKILL.md",
  "compatibility": {},
  "requiredCapabilities": [],
  "requiredPermissions": [],
  "dependencies": [],
  "artifacts": [],
  "configurationSchema": {},
  "evalSuites": [],
  "integrity": {}
}
```

### 9.2 Skill 分类

| 类型 | 示例 | 所有权 |
|---|---|---|
| Platform Skill | 通用任务分解、文档生成规则 | 平台 |
| Capability Skill | Word/PPT/研究工作流 | 通用能力包 |
| Vertical Skill | 报价学习、特定公司 SOP | 业务包 |
| Tenant Skill | 某公司内部审批流程 | 租户 |
| User Skill | 个人偏好和快捷流程 | 用户，受租户策略限制 |

### 9.3 生命周期与安全

Skill 安装和执行前应检查：

- 来源和签名；
- 脚本/二进制 hash；
- 文件系统、网络、进程和秘密权限；
- 依赖是否满足；
- 是否允许租户或用户覆盖；
- 升级 migration；
- 禁用和回滚；
- 评估结果及风险等级。

当前“一项 Skill 一个部署脚本”的方式可作为过渡适配器，但不应成为长期扩展机制。

## 10. MCP 与 Connector 体系

### 10.1 McpServerDescriptor

统一描述应覆盖：

- package 和 capability；
- `stdio` / `http` / `sse` transport；
- artifact 或 endpoint；
- 参数 schema；
- secret references；
- tools 与工具级权限；
- 数据敏感等级；
- timeout、retry、concurrency、rate limit；
- health checks；
- offline/failure policy；
- audit policy；
- 平台/租户/用户可见范围。

### 10.2 MCP 和 Connector 的区别

MCP 是 Agent 调用协议；Connector 是连接业务系统的产品抽象。一个 Connector 可以暴露一个或多个 MCP Server。

例如：

```text
AccurateConnector
  auth / tenant mapping / rate limit / audit
  ├─ accounting MCP
  ├─ inventory MCP
  └─ customer master MCP
```

这样凭据、连接测试、限流和审计不会散落在每个工具实现里。

### 10.3 本地与远端边界

| 适合本地 | 适合远端 |
|---|---|
| Office 文件、用户本地文件、隐私型个人处理 | ERP/CRM、库存、价格主数据、组织知识 |
| 可离线执行且不持有企业共享秘密 | 持有企业秘密、需实时一致或集中审计 |

平台应支持同一 capability 在不同租户采用不同实现。例如有的公司使用 Accurate，有的公司使用 SAP，但 Agent 依赖的是 `business.accounting.summary`。

### 10.4 健康检查生成

现有 `mcp-health-manifest.json` 的探测能力应保留，但拆成：

- 包内声明的 health check；
- 平台统一 health executor；
- 租户环境参数；
- 生成的执行计划和状态。

平台健康引擎不应维护 `quotation-agent` 或 `accurate` 的固定分支。

## 11. 知识体系

知识不应继续以固定 8 个 slug 作为平台模型。目标模型：

```text
KnowledgeCollection
  tenantId
  packageId
  collectionId
  schemaVersion
  visibility / roles
  publishState
  syncPolicy
  retention

KnowledgeDocument
  collectionId
  documentId
  version
  contentType
  metadata
  checksum
  createdBy / reviewedBy
```

需要补充的产品能力：

- draft/review/published 生命周期；
- 历史、diff、回滚；
- 按部门/角色可见；
- 包提供 schema 和默认种子，租户拥有业务内容；
- 安装包升级不得覆盖租户已修改内容；
- 搜索/读取均带 tenant 和 permission filter；
- Agent 引用 collection capability，不硬编码本地路径；
- 本地缓存有 revision、过期标记和离线策略。

## 12. 权限、身份、秘密与审计

### 12.1 权限模型

建议采用 `RBAC + capability permission + resource scope`：

```text
role: quotation_specialist
permission: capability.business.pricing.quote.execute
resource: tenant/{tenantId}/package/com.wanding.trade
condition: department in [...]
```

Agent 允许调用某 MCP 只是第一层；每次远端工具调用仍须服务端重新校验用户、租户、权限和资源范围。

### 12.2 身份

第二家公司上线前必须完成：

- OIDC/OAuth2 登录；
- 非对称签名；
- JWKS 验证；
- Token 中包含 tenant、audience、roles/permissions；
- 短期访问令牌和可撤销 refresh/session；
- 不再把可签发组织 Token 的共享秘密放到客户端。

### 12.3 秘密管理

原则：

- manifest、日志、健康结果和客户端配置都不得包含 secret value；
- 使用服务端 secret store，并按 tenant/environment 隔离；
- 本地必要秘密使用 OS credential vault；
- 支持轮换、过期、撤销和审计；
- 健康检查只报告“可解析/不可解析”，不回显内容；
- CI 必须进行 secret scanning；
- 当前仓库中出现过的业务凭据应立即轮换，并检查 Git 历史和分发包。

### 12.4 审计事件

统一事件至少包括：

- 登录、租户切换、权限拒绝；
- 包安装/升级/回滚/卸载；
- 配置变更与发布；
- Agent 委派；
- Skill 执行；
- MCP 工具调用及结果等级；
- 知识发布/读取；
- 秘密引用和轮换；
- 管理员操作。

审计记录必须包含 `tenant_id`、actor、package/capability、correlation ID、时间、结果和策略 revision，且不得记录秘密和不必要的业务正文。

## 13. UI 扩展与管理面

平台 UI 应提供通用容器：

- 包管理；
- Agent/Skill/MCP 能力目录；
- 租户配置；
- 权限和角色；
- 知识集合；
- 健康与诊断；
- 更新、回滚和 drift；
- 审计。

业务包通过 contributions 声明：

- Agent 卡片；
- 导航入口；
- 设置 schema 表单；
- 状态卡；
- 知识编辑器类型；
- 业务页面或安全的 remote/module artifact。

第一阶段不必立即实现任意动态前端插件。可先用受控 contribution 类型和 schema 驱动表单，避免过早引入远端代码执行和复杂插件沙箱。

## 14. 安装、升级与发布体系

### 14.1 发行物拆分

```text
Platform Distribution
  AionUI + aioncore + route-b + CCB Runtime + registry/config engine

Platform Capability Packages
  Office / research / common knowledge

Vertical Package
  com.wanding.trade

Tenant Deployment Bundle
  package lock + tenant config + secret references
```

### 14.2 Package Lock

每个租户环境保存锁文件：

- 平台版本；
- manifest schema 版本；
- 已安装包精确版本和 hash；
- 依赖解析结果；
- migration revision；
- 配置 revision；
- 上一个可回滚版本。

### 14.3 生命周期

标准流程：

```text
resolve → verify signature → preflight → stage
→ migrate → activate → health/eval → commit
                                ↘ failure: rollback
```

卸载需明确：

- 业务数据保留还是删除；
- 知识文档归档；
- Agent/Skill/MCP 注销；
- secrets refs 撤销；
- migrations 是否可逆；
- 审计和法定保留期。

### 14.4 从清单生成，不再人工枚举

长期应由 package manifest 生成：

- staging 文件列表；
- CCB runtime 配置；
- Agent/Skill 部署投影；
- MCP health plan；
- 安装完整性检查；
- UI contributions；
- 发布物 SBOM；
- 测试矩阵。

现有 whitelist、health manifest 和专用脚本在迁移期继续存在，但需逐步变成生成物或薄适配器。

## 15. 可观测性与可靠性

统一使用 correlation ID 串联：

```text
UI request → ACP session → Agent delegation → Skill → MCP tool
→ Connector → business system
```

最低平台指标：

- session 成功率和延迟；
- Agent 委派成功率；
- MCP/tool 调用成功率、P95、超时和拒绝；
- 各租户/包健康；
- 配置 drift；
- package update 成功和回滚；
- knowledge revision 延迟；
- token/模型成本；
- 离线降级次数。

错误必须继续使用稳定 `error_code`，并增加 `package_id`、`capability_id`、`tenant_id`（日志侧）和可操作 remediation。业务包可注册错误目录，但不能覆盖平台错误语义。

## 16. 业务包开发规范

一个合格业务包至少包含：

```text
com.company.domain/
  package.manifest.json
  agents/
  skills/
  mcp/
  connectors/
  knowledge/
  policies/
  ui/
  migrations/
  health/
  evals/
  tests/
  docs/
```

发布门禁：

1. manifest/schema 校验；
2. 不含硬编码租户、机器路径和秘密；
3. 依赖和 capability 可解析；
4. 权限最小化；
5. migration 前进/回滚测试；
6. health checks 通过；
7. Agent/Skill/MCP 契约测试；
8. eval 基线通过；
9. 离线/超时/权限拒绝测试；
10. SBOM、hash、签名和许可证检查；
11. 安装、升级、禁用、卸载、回滚 smoke；
12. 不修改平台核心即可装入测试平台。

## 17. `com.wanding.trade` 的抽取边界

应进入万鼎业务包：

- 报价、库存、Accurate、价格库 Agent；
- 万鼎 Orchestrator 路由贡献；
- quotation/accurate/price-library MCP 和 connector；
- 万鼎 SOP、知识 schema 和种子；
- VANTSING 模板与报价字段规则；
- AOL/Accurate secret requirements；
- 万鼎健康探测参数；
- 报价/库存失败和离线策略；
- 万鼎 Agent eval 和业务 fixtures；
- 业务 UI 卡片、菜单和设置；
- 万鼎安装 migration。

应留在平台或通用能力包：

- ACP 和 Agent Runtime；
- Agent/Skill/MCP Registry；
- 通用权限、配置、秘密引用、健康执行器；
- Office、研究等可复用能力（建议独立 capability package）；
- 包生命周期、更新、审计和可观测性；
- 本地文件访问和通用 UI 容器；
- 通用错误、任务和会话机制。

## 18. 分阶段路线图

### Phase 0：冻结边界与处理安全风险

目标：在继续扩业务前建立红线。

- 轮换仓库/分发物中出现过的业务凭据；
- 启用 secret scanning，禁止新 secret 入库；
- 建立平台禁止业务词/路径清单；
- 定义 `tenant_id`、`package_id`、`capability_id` 命名和 schema 版本策略；
- 明确现有四层运行链不重写。

完成标准：安全债务有处置证据；新增平台代码不再引入万鼎固定身份。

### Phase 1：定义元模型和只读注册表

目标：先建立统一描述，不改变现有运行方式。

- Package/Agent/Skill/MCP/Knowledge/Contribution descriptors；
- manifest JSON Schema；
- legacy ID aliases；
- 读取现有万鼎资产生成 registry snapshot；
- registry lint 和引用完整性检查。

完成标准：平台可从一个 manifest 图回答“某租户有哪些能力及其依赖”，现有脚本仍可运行。

### Phase 2：配置编译与单一权威源

目标：消除重复配置维护。

- 分层配置和 merge policy；
- secret references；
- desired/observed state；
- 从 descriptor 生成 CCB settings、Agent sidecar 和 health plan；
- 输出 provenance 和 drift。

完成标准：同一个 Agent-MCP 关系只声明一次；手工改生成物能被 drift 检测。

### Phase 3：抽取 `com.wanding.trade`

目标：万鼎成为第一个正式业务包。

- 移入 Agent、Skill、MCP、知识、policy、health、eval；
- 平台安装健康不再要求万鼎文件；
- 万鼎包可独立启用、禁用、升级和回滚；
- 保持 legacy 路径适配，避免一次性重构风险。

完成标准：空平台不安装万鼎包也能启动和通过平台健康检查；安装包后恢复现有万鼎能力。

### Phase 4：控制面与租户治理

目标：可管理多个公司环境。

- package catalog、tenant package lock；
- 配置发布、灰度、回滚；
- 权限、审计、health dashboard；
- 物理分租户部署模板；
- OIDC/JWKS 和服务端秘密库。

完成标准：管理员能看到期望状态、实际状态和 drift；业务凭据不落员工机器。

### Phase 5：第二公司试点

目标：验证通用性，而不是验证“万鼎换了目录”。

选择一个业务模型明显不同的公司，例如制造排产或物流异常，而不是另一套报价。要求：

- 不修改平台核心；
- 只新增业务包和 connector；
- 使用不同 Agent 图、MCP、知识 schema、权限和 UI contribution；
- 安装、运行、升级、卸载全链通过。

完成标准：第二业务包落地过程中发现的通用需求进入平台，客户特例留在业务包。

## 19. 优先级 Backlog

### P0：在第二家公司之前必须完成

- 凭据轮换、secret scanning、历史暴露评估；
- manifest/schema 与 registry 基础；
- TenantContext 贯穿控制面数据；
- 配置分层和 secret reference；
- Agent/Skill/MCP 单一描述源；
- 平台健康与万鼎健康拆分；
- OIDC/JWKS 方案和多公司安全门禁；
- `com.wanding.trade` 边界清单。

### P1：形成可运营平台

- package lifecycle 和 lock；
- desired/observed state、drift；
- 管理 UI；
- 通用 health executor；
- 审计事件；
- 动态知识集合；
- capability 与 connector abstraction；
- 包签名、SBOM、兼容矩阵和回滚。

### P2：规模化与体验

- 包仓库和审批流；
- 灰度/分批发布；
- 租户模板；
- 使用量、成本、配额；
- 开发者 SDK/CLI；
- UI contribution 扩展；
- 自动化 conformance/eval 平台。

### 暂不建议

- 重写四层运行链；
- 一开始就共享数据库承载所有公司；
- 允许业务包执行任意未签名 UI/脚本；
- 为追求“插件化”而引入复杂微服务拆分；
- 在 registry 和配置编译器之前继续添加更多业务专用安装脚本。

## 20. 关键架构决策待确认

这些问题需要在正式实施前形成 ADR：

1. 平台产品名是否继续使用 CCB-Wanding，还是拆为平台品牌 + WanD 包品牌？
2. Phase A 是否确认每家公司独立部署控制面？
3. 包格式是目录/zip，还是 OCI artifact？
4. 包签名和发布者信任链采用什么机制？
5. 通用 Office、Research 是平台内建还是独立 capability package？
6. 远端 MCP Gateway 独立服务，还是先作为 org service 模块？
7. 业务包 UI 第一阶段只支持 schema contribution，还是允许代码插件？
8. 租户业务数据卸载后的保留和销毁政策？
9. 本地离线缓存允许哪些数据，最大过期时间如何由包策略声明？
10. 第二家公司选择哪个不同业务域作为平台验收样本？

## 21. 防止“重新杂糅”的强制规则

建议写入后续平台 spec 和 CI：

1. 平台目录禁止出现客户名、客户 Agent ID、客户 MCP 名和客户路径；
2. 业务能力只能通过 package/capability 注册；
3. 配置事实只能有一个声明源，其他文件必须生成或验证；
4. 所有中心数据表、查询、唯一键和审计必须包含 tenant scope；
5. secret value 禁止进入 manifest、Git、日志、健康结果和客户端发行物；
6. 每个包必须可独立禁用，平台仍能启动；
7. 平台升级不得覆盖租户内容和包数据；
8. 包升级必须有兼容检查、migration、health 和 rollback；
9. 新业务需求先判断属于平台能力、通用能力包、垂直包还是租户配置；
10. 第二垂直包通过前，不宣称平台已经实现业务通用化。

## 22. 建议的成功指标

| 指标 | 目标 |
|---|---|
| 平台核心客户硬编码 | 0 |
| Agent/MCP/Skill 重复声明 | 关键关系单一权威源 |
| 新业务包接入 | 不改平台核心 |
| 包安装/回滚 | 自动、有证据 |
| 配置来源 | 100% 可追踪 |
| secret 入库 | 0 |
| 远端业务工具审计 | 100% 带 tenant/user/correlation |
| 平台空载启动 | 不装任何垂直包仍可健康运行 |
| 第二垂直验证 | 至少 1 个非报价/非贸易业务 |
| 升级隔离 | 平台升级不覆盖租户和业务包资产 |

## 23. 最终判断

CCB-Wanding 已经证明了“运行链和一个真实业务可以工作”，这一步价值很高。下一阶段的工程重点应从“继续把功能装进 Wanding”切换为：

> 用统一 manifest 描述能力，用 registry 发现能力，用配置编译器装配能力，用 tenant/policy 隔离能力，用 package lifecycle 交付能力，用 health/eval/audit 证明能力。

最合理的演进不是推倒重来，而是保留当前可靠内核，在其上建立控制面，并把现有万鼎资产逐步吸入 `com.wanding.trade`。当空平台可以独立运行、万鼎包可以独立装卸、第二家完全不同的公司无需修改平台核心即可交付时，系统才真正完成从项目产品到普适性平台的转变。
