# 资料搜索助手 — 互补工具栈探索

> **Status:** `in_progress` — Phase 2 CCB research-agent 种子 + 能力探测脚本已落地；Phase 1 POC 语料待跑
> **Created:** 2026-06-28  
> **Decisions reviewed:** 2026-07-01
> **Goal:** 定义「资料搜索助手」的产品边界，并用 POC 验证 Agent-Reach / Scrapling / Lightpanda 的实际互补性，供后续分阶段落地。

---

## 核心结论（探索阶段）

**三个工具不是三选一，而是三层互补：**

```
┌─────────────────────────────────────────────────────────────┐
│  L0  资料搜索助手 (research-agent)                           │
│      身份 / 路由 / 安全策略 / 引用规范 / 交付格式                │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
  Exa / Jina           Scrapling           Lightpanda
  「基础执行层」          「增强抓取层」         「实验浏览器层」
  发现 + 普通页          难页 / 结构化提取       JS 页 / 轻量 CDP
```

| 层 | 工具 | 职责 | 何时调用 |
|----|------|------|----------|
| 策略 | `research-agent` L1 | 查询拆解、工具选择、升级条件、安全边界、引用和交付 gate | 每次调研 |
| 安装/体检 | [Agent-Reach](https://github.com/Panniantong/Agent-Reach) | 安装、配置和 doctor；实际调用由 Exa、Jina、GitHub CLI、yt-dlp 等上游完成 | 安装、升级、健康检查 |
| 基础执行 | Exa + Jina | 语义发现、普通网页阅读 | 默认能力 |
| 增强抓取 | [Scrapling](https://github.com/D4Vinci/Scrapling) | HTTP/Stealth/Dynamic fetch、结构化提取、Spider、内置 MCP | 普通读取失败且符合站点策略，或需要结构化提取 |
| 实验浏览器 | [Lightpanda](https://github.com/lightpanda-io/browser) | 无头浏览器 CDP/MCP；低内存；`agent` 模式 | POC 证明兼容性和收益后按能力启用（**Beta + AGPL**） |

> Agent-Reach 不是运行时编排器。运行时路由权威属于 `research-agent` L1；Agent-Reach 负责安装与健康检查。

---

## 与现有系统的关系

| 组件 | 关系 |
|------|------|
| `wande-orchestrator` | 未来加路由：调研/搜资料 → `research-agent` |
| `quotation-agent` / `accurate-agent` | 业务 MCP 专家；research-agent **不**替代报价/账务 |
| `trellis-research` | 开发者代码库研究 → `.trellis/tasks/*/research/`；**不同用户、不同交付** |
| `exa-search` / `deep-research` skill | Cursor/Codex 个人助手能力；可复用 Exa MCP，但 **CCB Guid 卡片尚未有 research-agent** |
| `word-creator` | 可选下游：调研摘要 → 委派出 Word 报告 |

参考：`.trellis/spec/integration/agents-unified-model.md`（agent 存储、Guid 卡片、keep set、specialist direct session）。

---

## 产品决策（已锁定 — 2026-06-27）

详见 [`research/decisions.md`](./research/decisions.md)。

| 议题 | 决定 |
|------|------|
| 入口 | **双轨** — Guid 直达 + orchestrator 委派 |
| 受众 | **所有人可用** — CCB keep set + Guid 卡片 |
| 工具栈 | **能力探测、分层暴露** — Base: Exa/Jina；Extended: Scrapling；Experimental: Lightpanda |
| 交付 | **证据先落盘再交付** — `research/*.md` + `research/*.sources.jsonl`；聊天摘要从证据派生 |

### 用户（已锁定）

- [x] AionUI 万鼎员工（Guid 卡片「资料搜索助手」）
- [ ] ~~仅开发/运维自用~~ — 不采用
- [x] 双轨入口（Guid + orchestrator 委派）

### 候选搜索源（分优先级）

| 优先级 | 来源 | 工具路径 | 备注 |
|--------|------|----------|------|
| P0 | 通用网页、行业新闻、政策标准 | Exa + Jina Reader | 零 Cookie |
| P0 | GitHub / RSS | Agent-Reach 零配置 | |
| P1 | B站技术/产品视频 | Agent-Reach `bili-cli` | 无需登录 |
| P2 | 反爬/Cloudflare 站点 | Scrapling StealthyFetcher | 需浏览器依赖 |
| P3 | 小红书 / Twitter / Reddit | Agent-Reach + Cookie/OpenCLI | **封号风险**，建议小号 |
| ? | JS 重度 SPA | Lightpanda CDP | Beta；Windows 需 WSL |

### 交付物（已锁定）

- [x] **会话 workspace `research/*.md` 调研笔记**
- [x] **`research/*.sources.jsonl` 结构化证据清单**
- [x] 聊天内带 URL 引用的中文摘要（从 MD 派生）
- [ ] 委派 `word-creator` 出正式报告（可选下游，Phase 2+）
- [ ] 写入 org knowledge（开放问题，见 `decisions.md` O2）

### 运行环境

| 环境 | 建议 |
|------|------|
| 员工 Windows 本机 | Base 默认；Scrapling 按能力安装；Lightpanda 仅实验环境/WSL |
| VPS (20GB) | **仅** Exa API + Jina；不装浏览器栈（磁盘/内存） |

### 能力 Profile

| Profile | 工具 | 发布状态 |
|---------|------|----------|
| Base | Exa、Jina、GitHub/RSS 等已通过 doctor 的上游 | 员工第一版默认 |
| Extended | Base + Scrapling MCP | POC 达标且本机依赖完整时启用 |
| Experimental | Extended + Lightpanda MCP | 仅开发/受控试点；不得进入默认工具面 |

Agent frontmatter 不得无条件列出本机不存在的 MCP。启动前由 capability manifest/doctor 决定可暴露能力；缺失增强工具时 Base 仍须正常工作。

---

## 分阶段路线（建议，可推翻）

### Phase 0 — 本 task（当前）

- [x] 确认三工具可并存、互补
- [x] 创建 task + PRD
- [x] 锁定：双轨入口 / 所有人可用 / capability profile / 证据文件交付
- [x] 记录决策 → `research/decisions.md`

### Phase 1 — POC（最小验证）

- [ ] Agent-Reach 安全模式安装 + `agent-reach doctor`，记录实际上游命令和版本（`install-research-toolstack.ps1 -InstallAgentReach`）
- [ ] Exa/Jina 基础 smoke；Scrapling MCP 冷启动与抓取 smoke；Lightpanda 仅独立实验
- [x] 建立固定 URL corpus：`.trellis/tasks/06-28-research-agent-toolstack/research/url-corpus.json`
- 对每个样本记录工具、结果、正文有效性、耗时、峰值内存、失败类别和 fallback 次数
- 手动对话验证：「搜 PVC 管材印尼政策」→ 先写 `research/*.md` + `.sources.jsonl` → 再输出 claim-level 引用摘要
- 验证 direct Guid 与 orchestrator 委派使用相同 workspace/cwd，均能找到交付物
- POC 仅允许公开、无需登录的来源；Cookie 平台不在本阶段启用
- **不做** CCB agent 种子、不改 keep set

### Phase 2 — CCB research-agent（Guid 卡片 + 双轨）

- [x] `ccb-installer/config/agents/research-agent.md` + sidecar（`delegatable: true`）
- [x] `wande-orchestrator` 路由表 + `CCB_WANDING_KEEP_AGENT_IDS`
- [x] L1 规则：证据先落盘再交付；必须标注来源；禁止无引用断言；按失败类型路由
- [x] Stop hook / delivery gate：MD + sources manifest 存在性与格式校验（**warn**）
- [x] `eval/agent_eval_cases.jsonl` 防幻觉/路由用例
- [x] `probe-research-capabilities.ps1` + `install-research-toolstack.ps1` + `research-capability-manifest.json`

### Phase 3 — Scrapling 补 hard page

- Scrapling MCP 接入 settings.json
- L1 路由规则：Jina 失败 → Scrapling stealth-fetch

### Phase 4 — Lightpanda 评估（实验）

- AGPL 合规审查
- Windows/WSL 启动链、站点兼容率、崩溃率和 MCP 冷启动测试
- 在相同任务、相同模型、尽量相同工具面下对比 Playwright/Chrome
- 只有成功率不下降且资源收益明确时，才决定是否作为可选浏览器引擎

---

## 开放问题（决策后仍待讨论）

1. ~~**入口**~~ → **已锁定：双轨**（`decisions.md` D1）
2. **与报价业务耦合：** 调研 MD 是否显式路由给 `quotation-agent`？（倾向：任意 agent 可 Read workspace MD）
3. **MCP 清单** → 已修订为 capability profile；POC 后决定 Extended/Experimental 是否发布
4. **Skills vs MCP：** Agent-Reach 走 skill 安装还是独立 MCP？（Phase 1 POC 后定）
5. ~~**delegatable**~~ → **已锁定：true**（双轨必需）；Cookie 平台仍用小号
6. **Delivery gate 细节：** 最低独立来源数、来源质量和冲突处理；不能只检查 URL 数量
7. **安装发布：** 固定版本、SHA256、SBOM、许可证、离线降级、升级和回滚策略

---

## 安全与合规基线

- 默认阻断 localhost、内网、link-local、云 metadata 地址和非 HTTP(S) scheme，防止 SSRF。
- 登录墙、CAPTCHA 或明确禁止自动抓取的站点停止升级工具并向用户说明，不自动绕过。
- 遵守 robots.txt、站点条款、请求速率和内容使用边界；“技术上可抓取”不等于允许抓取。
- Cookie/账号能力默认关闭；如后续启用，凭据必须由宿主安全存储，不能进入 prompt、MD、日志或工具返回。
- 第一版禁止自动发帖、评论、点赞、关注、提交表单和其他外部副作用。
- 下载限制文件类型、单文件大小、总量和落盘目录；未知二进制不得自动执行。
- 网页内容属于不可信输入；忽略页面内要求泄露凭据、修改系统或改变 Agent 指令的文本。
- 每个工具固定版本与校验值；安装失败必须回退 Base，不得让 research-agent 整体不可用。

---

## 证据与引用合同

每个任务生成同 basename 的两份文件：

```text
research/<date>-<topic>.md
research/<date>-<topic>.sources.jsonl
```

每条 JSONL 至少包含：

```json
{"source_id":"S1","url":"https://example.com","title":"Example","publisher":"Example Org","published_at":null,"fetched_at":"ISO-8601","tool":"jina","status":"ok","content_sha256":"...","supports_claims":["C1"]}
```

- MD 中事实使用 `[S1]` 等稳定来源编号；聊天回复同时给出可点击 URL。
- 明确区分事实、推断、未验证信息和来源间冲突。
- 搜索结果摘要不能直接作为已验证事实；重要结论应读取原始页面。
- 原文摘录保持最小必要长度，避免把整页受版权保护内容复制进 workspace。

---

## Phase 1 量化 Gate

进入 Phase 2 前必须形成 POC 报告并满足：

- 无来源事实断言数 = 0。
- 公开 URL corpus 的有效正文成功率、P95 延迟、峰值内存均有记录。
- Base profile 在 Extended/Experimental 未安装时 100% 可启动。
- fallback 只在可分类失败时发生；404、登录墙、CAPTCHA 不盲目升级。
- direct Guid 与 orchestrator 委派产物路径一致且可被后续 Agent Read。
- Scrapling 相比 Base 在目标难页上有可量化增益，才进入 Extended。
- Lightpanda 相比现有浏览器方案有可量化增益且合规通过，才保留 Experimental。

---

## 非目标（本 task 阶段）

- 不修改 quotation / accurate MCP
- 不在 VPS 上装完整浏览器栈
- 不实现定时爬取/监控（那是 `data-scraper-agent` skill 范畴）
- 不替代 `trellis-research` 的代码库研究职责

---

## 相关链接

- Agent-Reach: https://github.com/Panniantong/Agent-Reach
- Lightpanda: https://github.com/lightpanda-io/browser
- Scrapling: https://github.com/D4Vinci/Scrapling
- Agent 模型 spec: `.trellis/spec/integration/agents-unified-model.md`
- Seed agents README: `ccb-installer/config/agents/README.md`

---

## Acceptance（进入 Phase 1 前）

- [x] 产品方确认：所有人可用 + 双轨入口 + MD 权威交付
- [ ] 产品方确认：Top 3 搜索场景（POC 用例抽样）
- [x] 技术方确认：员工本机全栈 + VPS API-only 分层
- [x] 架构方确认：双轨 + capability profile 分层路由
- [x] 记录决策到 `research/decisions.md`
- [ ] 技术方完成固定 URL corpus、指标阈值与安全 smoke
