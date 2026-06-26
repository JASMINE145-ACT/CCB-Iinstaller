# CCB-Wanding 平台架构总览（讨论稿）

> **用途：** 把散落在 Trellis / 部署手册里的「本机 aioncore vs 中心 aioncore vs CCB 后端 vs MCP」合成一份，供团队对齐现状、缺口与演进方向。  
> **版本：** 2026-06-17（讨论稿，非运维 SOP）  
> **运维部署请仍读：** [`org-knowledge-deploy.md`](./org-knowledge-deploy.md)

---

## 1. 一句话

员工桌面跑 **四层链**（AionUI → 本机 aioncore → route-b → CCB `--acp`），业务 MCP（报价/账务）和 Accurate 凭证 **仍在每台机器本地**；**中心 aioncore**（`:13401`）目前只管 **组织账号 + 8 篇 MD 知识库 API**，且 Python 运行时 **只 API 消费其中 `wanding_business_knowledge`**。下一阶段共识方向：**中心 MCP 服务化**（凭证与价格库不上员工机）。

---

## 2. 运行时平面（现在有几套「核」）

| 平面 | 进程 / 地址 | 职责 | 数据落点 | 登录 |
|------|-------------|------|----------|------|
| **AionUI 桌面** | `AionUI.exe` | UI、Guid、组织知识库页、`/tasks` | `%APPDATA%\AionUi\` | 见下双 JWT |
| **本机 aioncore** | `127.0.0.1:<动态端口>` | 聊天会话桥、本机 SQLite、工作任务 API、WebUI 生命周期 | 本机 `data-dir` | 本机 JWT `aionui-session-token` |
| **中心 org aioncore** | `http://<中心IP>:13401` | 组织用户、8 篇 MD 知识库 REST、历史/乐观锁 | `/opt/aionorg/data-org/`（SQLite） | 组织 JWT `aionui-org-session-token` |
| **CCB-Wanding 后端** | `D:\CCB-Wanding\dist\cli.js --acp`（子进程） | ACP、Agent 委派、MCP 工具调用、会话 transcript | `%LOCALAPPDATA%\CCB-Wanding\.claude\` | 用 settings 里 MiniMax 等，非 org |
| **业务 MCP（本地 stdio）** | quotation / accurate 子进程 | 查价、库存、填单、Accurate 汇总 | 本机 `vendor/wanding/data/` + **bundled AOL 凭证** | 无独立登录 |

**关键区分：**

- **本机 aioncore ≠ 中心 aioncore**：同二进制族（自编译 `aionui-app`），不同 `--data-dir`、不同部署位置、不同 JWT 域。
- **CCB 后端不是 aioncore**：由 route-b 拉起，持有 MCP 与 agent 逻辑；aioncore 只做 ACP 与 HTTP 桥。

---

## 3. 四层链（Route B — 当前主路径）

```text
AionUI.exe
  → aioncore.exe（本机，动态端口）
  → route-b（patches/aionui-ccb-route-b/index.js）
  → bun.exe + CCB-Wanding/dist/cli.js --acp
  → AcpAgent / QueryEngine
  → settings.json mcpServers → 本机 stdio MCP（quotation, accurate, excel-mcp, …）
```

| 层 | 可改表面 | 说明 |
|----|----------|------|
| 1 桌面 | `aionui-src` | 纯 UI、组织知识库页、/tasks |
| 2 本机 aioncore | `AionCore/` fork | 工作任务、本机 auth；bundled 旧版可能缺 work-tasks |
| 3 route-b | `ccb-installer/patches/` | 启动 CCB、设 `CLAUDE_CONFIG_DIR` |
| 4 CCB 后端 | `claude-code-B/src` → build → `CCB-Wanding/dist` | Agent、MCP 注册、ACP 事件 |

权威边界： [`.trellis/spec/integration/aionui-ccb-boundary.md`](../.trellis/spec/integration/aionui-ccb-boundary.md)

---

## 4. 双 JWT（本机 vs 组织）

| | 本机 | 组织（中心） |
|---|------|----------------|
| **用途** | 聊天、本机 `/tasks`、本机设置 | `/org-knowledge` UI、Python **读**业务知识 API |
| **Base URL** | `http://127.0.0.1:__backendPort` | `ORG_SERVER_URL` / `org-server.json` |
| **Token 存储** | `sessionStorage` `aionui-session-token` | `aionui-org-session-token` + `%APPDATA%/AionUi/aionui/org-session.token`（MCP 用） |
| **HTTP 模块** | `httpBridge.ts` | `orgHttpBridge.ts`（不得混用本机 token） |
| **互不影响** | 本机登出 ≠ 组织登出 | |

契约详情： [`.trellis/spec/integration/org-knowledge.md`](../.trellis/spec/integration/org-knowledge.md)

---

## 5. 中心 org aioncore（已实现 · 部署中）

### 5.1 提供什么

| 能力 | API / 机制 |
|------|------------|
| 组织用户 + RBAC | 与 work-tasks 同一套用户表；`work_task_role` 等 |
| 8 篇 MD 知识库 | `GET/PUT /api/org-knowledge/{slug}`、history、revert、409 乐观锁 |
| 种子导入 | 环境变量 `AIONUI_ORG_KNOWLEDGE_SEED_DIR` → 仓库 `data/*.md` |
| CORS | 生产 `--cors-any`（仍要 Bearer JWT） |
| 不提供 | 聊天会话、本机 MCP 代理、价格 xlsx 托管、Accurate 凭证保管（**尚未**） |

### 5.2 种子 slug（8 个）

`wanding_business_knowledge` · `ccb-wanding-claude-index` · `ccb-wanding-pricing-system` · `ccb-wanding-update-server` · `ccb-wanding-quotation` · `ccb-wanding-accurate` · `data-md` · `wanding-matching-architecture`

实现：`AionCore/crates/aionui-org-knowledge/`

### 5.3 部署形态

| 路径 | 场景 | 手册章节 |
|------|------|----------|
| **A** Windows 内网 | 机房常开机 | `org-knowledge-deploy.md` §3 |
| **B** Linux VPS | 当前 `67.216.206.3`，SSH `39222`，HTTP `13401` | §4 |

**已部署（2026-06-19）：** `67.216.206.3:13401`，`systemd` `aionorg.service` active；员工 `org-server.json` 指向中心。**待办：** `ufw` 限制 13401 来源 IP；AionUI 组织登录 + MCP Org API smoke。

---

## 6. 本机 aioncore（员工桌面）

### 6.1 提供什么

| 能力 | 路由示例 |
|------|----------|
| ACP / 聊天桥 | 经 aioncore 转发，桌面不直接解析 ACP |
| 工作任务 | `/api/work-tasks/*`（需自编译 ≥ v0.1.29） |
| 本机用户 / 设置 | `/api/auth/*`、`/api/settings/*` |
| 定时任务 | `/api/cron/*`（与工作任务域分离） |

**不提供：** 组织知识库（在中心 `:13401`）。

### 6.2 开发启动

| 脚本 | 用途 |
|------|------|
| `scripts/start-aionui-dev-work-tasks.ps1` | 聊天 + `/tasks` + 自编译 aioncore |
| `scripts/start-org-aioncore.ps1` | 本机试验中心 org（Windows） |
| `scripts/build-aioncore-work-tasks.cmd` | 构建含 work-tasks + org-knowledge 的 `aioncore.exe` |

详情： [`.trellis/spec/integration/aioncore-work-tasks.md`](../.trellis/spec/integration/aioncore-work-tasks.md)

---

## 7. 业务 MCP 层（报价 + 账务）— 现状与风险

### 7.1 工具面

| Server | 代表工具 | 实现 |
|--------|----------|------|
| `quotation` | `match_quotation`, `search_inventory`, `fill_quotation_sheet`, … | `mcp_servers/quotation-server` + `python/` |
| `accurate` | `accurate_search_records`, `accurate_summarize_records`, … | `vendor/mcp-servers/accurate-mcp` + Python AOL client |

Spawn 配置：`%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json`（安装时 `ensure-wanding-settings.ps1` 写入）。

### 7.2 本机数据与凭证（每台员工机一份）

| 资产 | 路径 /  env | 中心是否托管 |
|------|-------------|--------------|
| 价格库 xlsx | `vendor/wanding/data/*.xlsx` | ❌ |
| 业务知识 md | 本机 data + **中心 API**（仅 knowledge） | 部分 |
| Accurate AOL 凭证 | `AOL_*` 写在 quotation/accurate MCP `env` | ❌ **bundled 到安装包** |
| 匹配逻辑 | 本机 Python 进程 | ❌ |

**安全风险：** 生产级 Accurate token/secret 随 exe 分发到各桌面，轮换需重装或重跑 ensure 脚本。

### 7.3 Python 谁读中心 API？

| slug | 读中心 API？ | 读本机文件？ |
|------|-------------|-------------|
| `wanding_business_knowledge` | ✅ **API 优先**（`org_knowledge_client.py`） | 离线 fallback |
| `ccb-wanding-quotation` | ❌ | 仅维护源；agent 已内联 |
| `ccb-wanding-accurate` | ❌ | 仅维护源；agent 已内联 |
| `ccb-wanding-claude-index` | ❌ | `ensure-wanding-settings` 注入 **本机** CLAUDE.md |

调用链：`main.py` · `llm_selector.py` · `wanding_fuzzy_matcher.py` → `ORG_SERVER_URL` + `org-session.token`

---

## 8. Agent 与知识分层（L0–L4）

配置根：`%LOCALAPPDATA%\CCB-Wanding\.claude\agents\`

| 层 | 载体 | 消费者 | 2026-06-16 状态 |
|----|------|--------|-----------------|
| **L0** 环境 | `CLAUDE.md` ← 本机 `ccb-wanding-claude-index.md` | 全会话 fallback | 中心 index **不参与**运行时 |
| **L1** 人设 | `agents/<id>.md` | CCB `customSystemPrompt` | quotation/accurate **SOP 已内联** |
| **L2** 运行时 | `agents/<id>.aionui.json` `claude_md` | 专家卡覆盖 L0 | 已同步「勿每轮 Read handbook」 |
| **L3** 子 spawn | frontmatter `mcpServers` | `Agent()` 子进程 | quotation / accurate |
| **L4** 业务 SOP | `vendor/wanding/data/*.md` | 按需 Read | 仅 **business_knowledge** 仍按需 Read |

| Agent | 行为摘要 |
|-------|----------|
| `wande-orchestrator` | 只委派，不读业务 SOP、不直接调业务 MCP |
| `quotation-agent` | 直接 quotation MCP；多候选时 Read `wanding_business_knowledge`（`selection_context.knowledge_source`）；match 默认每行 7 候选 |
| `accurate-agent` | 直接 accurate MCP；SOP 全在 L1 内联 |

详情： [`.trellis/spec/integration/agents-unified-model.md`](../.trellis/spec/integration/agents-unified-model.md) · [`.trellis/spec/backend/route-b-status.md`](../.trellis/spec/backend/route-b-status.md) §2026-06-16e/f

---

## 9. 配置所有权（谁改哪）

| 改什么 | 改哪里 |
|--------|--------|
| MCP 列表、MiniMax、AOL env | `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json` |
| Agent 人设 / 内联 SOP | `agents/*.md` + sidecar |
| 组织知识库正文 | 中心 UI 或 `PUT /api/org-knowledge/{slug}` |
| 价格表 | 本机 xlsx 或 Neon（matcher 优先 DB） |
| 聊天 / ACP 行为 | `claude-code-B/src` → deploy dist |
| route-b 启动参数 | `ccb-installer/patches/` → sync |

CCB 运行时权威不在 AionUI DB： [`.trellis/spec/integration/aionui-config-inventory.md`](../.trellis/spec/integration/aionui-config-inventory.md)

---

## 10. 现状 vs 目标（讨论用）

### 10.1 现状（Phase 0–1）

```text
员工机                          中心 VPS :13401
┌─────────────────────┐         ┌──────────────────┐
│ 本机 aioncore       │         │ org aioncore     │
│ CCB + 本地 MCP      │         │ · 用户/RBAC      │
│ · xlsx 价格库       │         │ · 8× MD API      │
│ · AOL 凭证          │         │ · SQLite         │
│ · agent 内联 SOP    │         └────────▲─────────┘
└─────────────────────┘                  │
         │                                 │ 仅 wanding_business_knowledge
         │ 组织登录                         │ （+ UI 编辑其余 7 篇）
         └─────────────────────────────────┘
```

**已解决：** 业务选型知识可中心改、API 下发（需组织登录）。  
**未解决：** 凭证下发、价格库全员同步、handbook/agent 三份漂移、MCP 逻辑版本不一致。

### 10.2 目标共识（Phase 2+ — 待立项）

```text
员工机                          中心
┌─────────────────────┐         ┌────────────────────────────┐
│ 本机 aioncore       │         │ org aioncore :13401        │
│ CCB --acp           │         │ · 用户/RBAC/JWT            │
│ MCP transport:      │  HTTPS  │ · org-knowledge API        │
│   http → 中心 MCP   │ ──────► │ · **中心 MCP 服务**（新）   │
│ （无 AOL_* 本地）   │         │   · quotation / accurate   │
└─────────────────────┘         │   · xlsx / 价格库          │
                                │   · AOL 凭证仅服务端       │
                                │   · 可选 agent-prompt 版本 │
                                └────────────────────────────┘
```

| 收益 | 代价 |
|------|------|
| 凭证不出员工机 | 需 MCP HTTP/SSE 网关 + 鉴权 |
| 价格/规则一处更新 | 中心可用性成为瓶颈（需健康检查 / 可选只读离线） |
| agent SOP 可中心发版 | 填单写桌面等需下载或薄 shim |
| 与现有 org JWT 统一 | 比纯文件中心多一层服务开发 |

Claude Code 已支持 MCP `--transport http|sse`；技术上可行，产品是增量。

---

## 11. 资产矩阵：放中心 vs 放本机（决策表）

| 资产 | 现在 | 建议长期 | 运行时谁消费 |
|------|------|----------|--------------|
| `wanding_business_knowledge.md` | 中心 + API | **中心** | Python MCP + agent 按需 Read |
| 价格 xlsx | 本机 | **中心 MCP 数据源** | fuzzy matcher / fill |
| `ccb-wanding-quotation/acurate.md` | 中心种子 + agent 内联 + 本机文件 | **中心维护源** → 发布到 agent 版本 | agent L1（非 API） |
| `ccb-wanding-claude-index.md` | 本机注入 CLAUDE.md | 本机 L0 或未来中心下发 | 全会话环境 |
| AOL Accurate 凭证 | **本机 env** | **仅中心** | inventory + accurate MCP |
| Agent `*.md` | 本机 agents | 本机缓存 + **中心版本号** | CCB session |
| `memory/` | 本机 | 本机 | 用户偏好 |
| 聊天 transcript | 本机 | 本机 | 隐私 / 体量 |

---

## 12. 仓库与文档索引

| 主题 | 路径 |
|------|------|
| **本讨论稿** | `docs/ccb-wanding-platform-architecture.md` |
| 中心部署 SOP | `docs/org-knowledge-deploy.md` |
| Org API 契约 | `.trellis/spec/integration/org-knowledge.md` |
| 四层边界 | `.trellis/spec/integration/aionui-ccb-boundary.md` |
| Agent 模型 | `.trellis/spec/integration/agents-unified-model.md` |
| 本机 work-tasks | `.trellis/spec/integration/aioncore-work-tasks.md` |
| MCP 业务 | `.trellis/spec/backend/mcp-business.md` |
| Route B 实况 | `.trellis/spec/backend/route-b-status.md` |
| 配置层 | `.trellis/spec/backend/config-layer.md` |
| Trellis 总索引 | `.trellis/spec/index.md` |

---

## 13. 待讨论问题（请在此文档旁开 issue / 会议记结论）

1. **中心 MCP 与 org aioncore 同进程还是独立服务？**（同机不同端口 vs 独立容器）
2. ~~离线策略：中心不可用时是否允许过期价格库只读？凭证是否坚决禁止 fallback 到客户端？~~ ✅ **已决策，见 13.1**
3. **8 篇种子是否瘦身？** quotation/accurate/index 在中心仅文档库、无 API 消费者 — 是否移出种子减噪？
4. ~~agent 内联 SOP：维持手动双写，还是 Phase 2 做 `GET /api/agent-prompts/{id}`？~~ ✅ **已决策，见 13.1**（不新建接口，复用现有 org-knowledge API；具体同步机制见 13.1）
5. **填报价单写桌面：** 中心生成 blob 下载 vs 保留本地 excel-mcp shim？
6. **Neon 价格库：** 与中心 xlsx 谁为 canonical？（当前 matcher 已 DB 优先）
7. **VPS 部署完成后验收清单：** 是否把「仅 knowledge API」与「MCP 未集中」写明给业务方，避免预期错位？

---

### 13.1 已决策方案（2026-06-17）：离线策略 + agent SOP 同步机制

#### #2 离线策略 — 按资产类型分级，不是统一开关

| 资产 | 中心不可达时的行为 | 理由 |
|------|---------------------|------|
| **AOL / Accurate 凭证** | **零本地 fallback**，网关连不上 = 工具直接报错（"服务暂不可用"），绝不退化到本地存一份密钥 | 凭证本机化是现状最大的安全洞，解决方案不能再开后门 |
| **价格目录（报价用）** | **允许只读缓存**，但响应必须带「数据非最新，最后同步于 X」标注 | 报价是高频日常操作，全量 fail-closed 会直接打断业务；过期价格只要可见可核实就能接受 |
| **实时库存** | **零缓存兜底**，fail-closed 报错，不返回任何数字（哪怕标了"可能过期"） | 库存波动快，一个错误数字可能直接导致超卖，不能像价格一样"标注一下就放行" |

这条决策反过来约束 #1（中心 MCP 网关）：网关要能区分"凭证类/库存类调用必须强制在线检查"和"价格类调用允许走只读缓存"两种语义，不能是无差别透明代理。

#### #4 agent SOP 同步机制 — 哨兵区块 + 运行时拉取，不新建接口

**问题（已用代码验证，见 `deploy-seed-agents.ps1` L35-39）：** 当前 agent `.md` 走"目标文件已存在就跳过"的安装期种子逻辑——一旦员工机器装过一次，后续任何安装包更新都不会重新覆盖该 `.md`，哪怕中心种子内容已经修订。这是当前**唯一**让已部署机器拿到 SOP 修复的路径缺口，且无法靠重新安装解决（脚本判断的是文件是否存在，不是版本号）。

**方案：**

1. **`agent .md` 拆成「用户自定义区」+「哨兵区块」**：人设、语气、Do-not 列表等保持手动维护；从中心 `ccb-wanding-quotation`/`ccb-wanding-accurate` 渲染出的 SOP 正文，用版本化哨兵注释包起来：

   ```text
   <!-- SYNCED-SOP:ccb-wanding-quotation v7 -->
   ...(GET /api/org-knowledge/ccb-wanding-quotation 的内容)...
   <!-- /SYNCED-SOP -->
   ```

2. **新增运行时同步任务**（不是 `ccbAgentMigration.ts` 那种一次性 `migration_*_v1` flag，是每次客户端/会话启动都跑的幂等任务）：
   - 带组织 JWT 调 `GET /api/org-knowledge/{slug}`，比较中心版本号 vs 本机哨兵区块里记录的版本号。
   - 中心版本更新 → 只重写哨兵区块**之间**的文本，区块外的人设/自定义保持不动。
   - 中心不可达 → 静默跳过，继续用本机现有内容（SOP 文本沿用上面 #2 的"价格类"容忍度，不是安全敏感数据，不需要 fail-closed）。
   - 用户手动删掉哨兵注释 → 视为"完全接管这部分"，不再自动同步，和现有整文件级"user wins"语义一致，只是粒度细化到区块而不是整个文件。
   - `accurate-agent.md` 同理，对应 `ccb-wanding-accurate` slug。
3. **`deploy-seed-agents.ps1` 角色降级**：只负责"文件完全不存在时给一个离线可用的初始版本"（首次开机、还没连上中心前的兜底），不再充当更新通道——需要在脚本注释里明确写出这一点,避免以后有人以为"重新打包安装器"就能推送 SOP 修复。
4. **`wanding_business_knowledge.md` 不变**：它已经是运行时 API 直读（Python `org_knowledge_client.py`），不需要这套哨兵机制，本身就没有这个问题。

效果：「中心种子 / agent 内联 / 本机文件」三份并存收敛成「中心是唯一权威源，本机哨兵区块是带版本号的可刷新缓存」，且不破坏用户对 agent 人设其余部分的手动定制能力。**尚未实现**，落地时需要：① 给 8 篇种子里 quotation/accurate 两篇的 API 内容定一个轻量渲染格式（avoid 直接吐原始 Markdown 里掺杀 agent 不需要的字段）；② 同步任务挂在哪个生命周期钩子（AionUI 启动 / CCB session 创建前）待定。

---

## 14. 变更记录

| 日期 | 说明 |
|------|------|
| 2026-06-17 | 初稿：合并 Trellis 双 aioncore、org-knowledge、Route B、agent 内联、MCP 集中化方向 |
| 2026-06-17 | §13.1：离线策略分级（凭证零 fallback / 价格只读缓存 / 库存零缓存）+ agent SOP 哨兵区块同步机制方案（解决 `deploy-seed-agents.ps1` 装完不再更新的缺口），#2/#4 标记已决策 |

---

*Trellis 索引： [`.trellis/spec/integration/platform-architecture.md`](../.trellis/spec/integration/platform-architecture.md)*
