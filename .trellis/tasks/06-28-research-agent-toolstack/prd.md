# 资料搜索助手 — 互补工具栈探索

> **Status:** `planning` — 讨论型任务，暂无实现 deadline  
> **Created:** 2026-06-28  
> **Goal:** 定义「资料搜索助手」的产品边界，并确认 Agent-Reach / Scrapling / Lightpanda **可并存、互补** 的分层方案，供后续分阶段落地。

---

## 核心结论（探索阶段）

**三个工具不是三选一，而是三层互补：**

```
┌─────────────────────────────────────────────────────────────┐
│  L0  资料搜索助手 (research-agent)                           │
│      身份 / 路由 / 引用规范 / 交付格式                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
  Agent-Reach           Scrapling           Lightpanda
  「能力编排层」          「抓取执行层」         「浏览器引擎层」
  发现 + 平台路由         难页 / 反爬 / 爬取      JS 重页 / 轻量 CDP
```

| 层 | 工具 | 职责 | 何时调用 |
|----|------|------|----------|
| 编排 | [Agent-Reach](https://github.com/Panniantong/Agent-Reach) | 安装/体检/路由；Exa 语义搜索；Jina 读页；GitHub/YouTube/B站/RSS 等平台 CLI | **默认入口** — 发现资料、读普通页、跨平台搜索 |
| 抓取 | [Scrapling](https://github.com/D4Vinci/Scrapling) | HTTP/Stealth/Dynamic fetch；Spider 爬取；内置 MCP | Agent-Reach/Jina **失败** 或需结构化提取、反 Cloudflare |
| 浏览器 | [Lightpanda](https://github.com/lightpanda-io/browser) | 无头浏览器 CDP/MCP；低内存；`agent` 模式 | Scrapling Playwright 过重，或 VPS 需轻量 JS 渲染（**Beta + AGPL**） |

**类比：** Agent-Reach = 给 Agent 装「互联网操作系统」；Scrapling = 「难啃的网页怎么抓」；Lightpanda = 「要不要开一整台 Chrome」。

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

## 产品方向（待讨论）

### 候选用户

- [ ] AionUI 万鼎员工（Guid 卡片「资料搜索助手」）
- [ ] 仅开发/运维自用（Cursor + skill，不进 CCB keep set）
- [ ] 两者都要

### 候选搜索源（分优先级）

| 优先级 | 来源 | 工具路径 | 备注 |
|--------|------|----------|------|
| P0 | 通用网页、行业新闻、政策标准 | Exa + Jina Reader | 零 Cookie |
| P0 | GitHub / RSS | Agent-Reach 零配置 | |
| P1 | B站技术/产品视频 | Agent-Reach `bili-cli` | 无需登录 |
| P2 | 反爬/Cloudflare 站点 | Scrapling StealthyFetcher | 需浏览器依赖 |
| P3 | 小红书 / Twitter / Reddit | Agent-Reach + Cookie/OpenCLI | **封号风险**，建议小号 |
| ? | JS 重度 SPA | Lightpanda CDP | Beta；Windows 需 WSL |

### 候选交付物

- [ ] 聊天内带 URL 引用的中文摘要
- [ ] 会话 workspace 内 `.md` 调研笔记
- [ ] 委派 `word-creator` 出正式报告
- [ ] 写入 org knowledge（与 `06-19-agent-org-knowledge-write-sync` 对齐？）

### 运行环境

| 环境 | 建议 |
|------|------|
| 员工 Windows 本机 | 可装 Agent-Reach + Scrapling；Lightpanda 可选 WSL |
| VPS (20GB) | **仅** Exa API + Jina；不装浏览器栈（磁盘/内存） |

---

## 分阶段路线（建议，可推翻）

### Phase 0 — 本 task（当前）

- [x] 确认三工具可并存、互补
- [x] 创建 task + PRD
- [ ] 讨论并锁定：用户 / 搜索源 / 交付物 / 入口模式

### Phase 1 — POC（最小验证）

- Agent-Reach 本机安装 + `agent-reach doctor`
- Exa MCP 语义搜索 smoke
- 手动对话验证：「搜 PVC 管材印尼政策」→ 带引用摘要
- **不做** CCB agent 种子、不改 keep set

### Phase 2 — CCB research-agent（Guid 卡片）

- `ccb-installer/config/agents/research-agent.md` + sidecar
- `wande-orchestrator` 路由表 + `CCB_WANDING_KEEP_AGENT_IDS`
- L1 规则：必须标注来源；禁止无引用断言；read-only ROE 豁免
- `eval/agent_eval_cases.jsonl` 防幻觉用例

### Phase 3 — Scrapling 补 hard page

- Scrapling MCP 接入 settings.json
- L1 路由规则：Jina 失败 → Scrapling stealth-fetch

### Phase 4 — Lightpanda 评估（可选）

- AGPL 合规审查
- VPS/本机内存对比 POC
- 是否替代 Scrapling 的 Playwright 后端

---

## 开放问题（后续讨论清单）

1. **入口：** Guid 直达 vs orchestrator 委派 vs 两者都要？
2. **与报价业务耦合：** 调研结果要不要 feed 给 `quotation-agent`（如竞品价、政策）？
3. **MCP 清单：** 第一期 frontmatter `mcpServers` 放哪些？（exa / scrapling / lightpanda 子集）
4. **Skills vs MCP：** Agent-Reach 走 skill 安装还是独立 MCP？
5. **权限与安全：** Cookie 平台用小号；research-agent 是否 `delegatable: true`？
6. **Delivery gate：** research 只读 — ROE `:roe-judge` 应 pass（`no_roe_scope`）；是否要「必须 N 个来源才允许 end_turn」的专用 gate？
7. **安装包体积：** CCB installer 是否捆绑 Python/browser 依赖，还是 post-install 脚本？

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

- [ ] 产品方确认：主要用户 + Top 3 搜索场景
- [ ] 技术方确认：Phase 1 运行环境（本机 only / 含 VPS API-only）
- [ ] 架构方确认：入口模式（Guid / 委派 / 双轨）
- [ ] 记录决策到 `research/decisions.md`（讨论后）
