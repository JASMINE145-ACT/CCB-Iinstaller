# 资料搜索助手 — 产品决策记录

> **Task:** `06-28-research-agent-toolstack`  
> **Date:** 2026-06-27（讨论锁定）  
> **Status:** 已确认，待 Phase 1 POC 验证

---

## 决策摘要

| # | 议题 | 决定 |
|---|------|------|
| D1 | 入口模式 | **双轨**：Guid 直达 specialist session + `wande-orchestrator` 同步委派 |
| D2 | 受众 | **所有人可用** — 进 CCB keep set，万鼎员工 Guid 卡片可见 |
| D3 | MCP / 工具栈 | **能力探测、分层暴露** — Base Exa/Jina；Extended Scrapling；Experimental Lightpanda；禁止缺失 MCP 污染会话 |
| D4 | 交付权威 | **证据先落盘再交付** — `research/*.md` + `.sources.jsonl`；聊天摘要从证据生成，不能只留在 LLM 上下文 |

---

## D1 — 双轨入口

### 决定

- **轨道 A：** 用户点 Guid「资料搜索助手」→ `research-agent` specialist direct session（同 `quotation-agent` / `word-creator` 模式）
- **轨道 B：** 用户在默认会话描述调研需求 → `wande-orchestrator` 识别意图 → 同步 `Agent(research-agent)` 委派（`run_in_background: false`）

### L1 要求

- `delegatable: true`（orchestrator 可委派）
- 两种入口共用同一 `research-agent.md` 权威；L1 写明「被委派时自己调 MCP，禁止再 Agent()」
- `wande-orchestrator` 路由关键词：调研 / 搜资料 / 查政策 / 竞品 / 行业信息 → `research-agent`

### 与现有碎片

- `ccb-installer/resources/commands/调研简报.md` 为轻量 slash，无 MD 持久化；Phase 2 后应迁移或改为跳转 research-agent，避免两套调研人格。

---

## D2 — 所有人可用

### 决定

- 纳入 `CCB_WANDING_KEEP_AGENT_IDS`
- 新增 `research-agent.md` + `research-agent.aionui.json`（Guid 卡片，建议 display_name：**资料搜索助手**）
- **非**仅开发/运维 Cursor skill 自用

### 部署分层（与 D3 配合）

| 环境 | 能力 |
|------|------|
| 员工 Windows 本机 | 全栈：Agent-Reach + Scrapling + Lightpanda（Lightpanda 可选 WSL） |
| VPS / 无浏览器 | API-only 子集（Exa + Jina）；**不**装 Scrapling browser / Lightpanda — 员工本机仍是主战场 |

---

## D3 — 能力 Profile 与互补路由

### 决定

Agent-Reach 负责安装、配置与 doctor，不是运行时编排器。运行时路由由 `research-agent` L1 负责。工具按本机 capability manifest 暴露：

```
Base         → Exa / Jina / 已通过 doctor 的平台上游
Extended     → Base + Scrapling
Experimental → Extended + Lightpanda
```

### 硬规则

- 未安装或健康检查失败的 MCP 不进入 agent 工具列表
- 工具升级基于失败分类，不使用无条件固定链
- 禁止同一 URL 多工具并行请求
- 404、登录墙、CAPTCHA 不升级为 stealth/browser 绕过
- `mcp-health-manifest.json` 分层探活；Agent-Reach doctor 只覆盖其管理的上游

### 仍开放（实现细节）

- capability manifest 如何映射到 CCB session profile — Phase 1 POC 后定
- Agent-Reach 走 installer helper 还是 skill — Phase 1 POC 后定
- Lightpanda AGPL 商用分发 — Phase 4 前必须审查

---

## D4 — MD 为先、分析在后

### 决定

**每次搜索资料的工作流：**

1. 用搜索/MCP 工具获取原始材料
2. 写入 `research/<date>-<topic-slug>.sources.jsonl` 证据清单
3. 写入会话 workspace `research/<date>-<topic-slug>.md`
4. 再基于证据做分析、摘要、回复用户
5. 聊天中的结论必须可追溯到来源编号和 URL

### MD 最低结构（L1 模板）

```markdown
# <调研主题>

- **查询意图：** …
- **时间：** ISO-8601
- **会话：** workspace 相对路径

## 来源

| # | URL | 抓取工具 | 时间 | 状态 |
|---|-----|----------|------|------|

## 原文要点 / 摘录

（按来源编号）

## 分析

- **事实：** …
- **推断：** …（须标注）
- **未验证：** …

## 抓取失败记录（如有）

- URL — 失败原因 — 已尝试工具链
```

### 交付 gate（Phase 2 落地）

- `research-agent` Stop hook：先 `warn`，稳定后 `block`
- 验收：workspace 存在配对的 MD + sources JSONL，且每项事实可映射来源；禁止「只聊天不落盘」即 end_turn
- 聊天回复须带 MD 路径

### 下游

- `word-creator`：可读 `research/*.md` 出 Word 报告
- `quotation-agent`：**未单独锁定**「自动 feed」；默认任意 agent 可 `Read` workspace MD（见开放问题 O1）

---

## 开放问题（决策后仍待讨论）

| ID | 问题 | 倾向 |
|----|------|------|
| O1 | 调研结果是否显式路由给 `quotation-agent`？ | MD 持久化已铺好路；可默认 Read，不必 orchestrator 转述 |
| O2 | 是否写入 org knowledge？ | 与 org-knowledge write path 对齐时再定 |
| O3 | 工具如何发布？ | 固定版本/哈希/SBOM；Base 可离线降级；浏览器依赖不得无约束在线安装 |
| O4 | Delivery gate 如何判断质量？ | 独立来源数 + claim 映射 + 来源质量 + 冲突标注，不以 URL 数量单独判断 |

---

## Phase 0 验收（本文件即满足项）

- [x] 入口：双轨
- [x] 用户：所有人 / keep set
- [x] MCP：capability profile 分层互补
- [x] 交付：MD + sources manifest，证据先落盘
- [x] 记录于 `research/decisions.md`

---

## References

- `research/toolstack-complementarity.md` — 工具职责矩阵与 fallback 链
- `prd.md` — 分阶段路线（已同步本决策）
- `.trellis/spec/integration/agents-unified-model.md` — specialist / delegatable / delivery gate 模式
