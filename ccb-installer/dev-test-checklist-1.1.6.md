# Dev 测试清单 — 1.1.6 packaging backlog

> **入口：** 仅用 [`scripts/start-dev-full.ps1`](scripts/start-dev-full.ps1) 启动 dev（Rule 0）。  
> **Backlog：** [`packaging-backlog-1.1.6.md`](packaging-backlog-1.1.6.md)  
> **记录：** 每项打 `[x]` 并附 F12 / CCB log 一句证据。

**Deploy 后启动：**

```powershell
# 若刚 deploy CCB（本清单默认已做）：
.\ccb-installer\scripts\start-dev-full.ps1

# 二次启动、跳 bootstrap（skills/agents 已部署）：
.\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap
```

---

## 0. 启动门禁（start-dev-full 自带）

| # | 检查项 | Pass |
|---|--------|------|
| 0.1 | Org SSO 登录成功 | [ ] |
| 0.2 | 左侧 **万鼎报价专家** Guid 可见 | [ ] |
| 0.3 | Settings → Tools：quotation / accurate / excel | [ ] |
| 0.4 | 万鼎报价专家首聊 MCP warmup ≤ ~15s | [ ] |

**Skills 路径（Issue 1）：** `%LOCALAPPDATA%\CCB-Wanding\.claude\skills\quotation-learn-by-data\SKILL.md` 存在（`start-dev-full` 会跑 `deploy-ccb-skills.ps1`）

---

## Issue 1 — 五个 user skills 必须部署

**路径：** `%LOCALAPPDATA%\CCB-Wanding\.claude\skills\`（与「我的技能」UI 一致）

| # | Skill | `SKILL.md` 存在 | Pass |
|---|-------|-----------------|------|
| 1.1 | `ccb-subagent-gate` | [ ] |
| 1.2 | `ppt-master` | [ ] |
| 1.3 | `price-library-edit` | [ ] |
| 1.4 | `quotation-learn-by-data` | [ ] |
| 1.5 | `wanding-deep-research` | [ ] |
| 1.6 | UI **设置 → 技能** 列表 = **5** 项 | [ ] |

| 1.7 | `/learn-by-data` 或「按数据学习」可触发 skill | [ ] |
| 1.7b | `%LOCALAPPDATA%\CCB-Wanding\.claude\commands\learn-by-data.md` 存在（bootstrap / `deploy-wanding-commands`） | [ ] |
| 1.8 | `-SkipBootstrap` 重启后 1.1–1.6 仍通过 | [ ] |

**Log 关键词：** `[ok] CCB skills` · bootstrap `deploy-ccb-skills OK` · `deploy-wanding-commands OK` · `Deployed learn-by-data`

---

## Issue 2 — 多品查价主表（非 candidates 大表）

| # | 步骤 | 期望 | Pass |
|---|------|------|------|
| 2.1 | Guid **万鼎报价专家** 新会话 | — | [ ] |
| 2.2 | 发送三行询价，例如：`直接50`、`三通50`、`弯头50 各查价` | 主表 **3 行**（每 keyword 一行推荐） | [ ] |
| 2.3 | 检查回复 | **禁止** 10×3 candidates 大表；可有 ≤4 bullet「其他可能」 | [ ] |
| 2.4 | 单品 `直接50` | 1 推荐 + 可选 bullet（现有规则） | [ ] |

**Note：** 若 2.2–2.3 仍失败，属 backlog 待实施项；记录 transcript 供 1.1.6 fix。

---

## Issue 3 — Orchestrator dispatch（Trellis `07-04-orchestrator-dispatch-hardening`）

> 详表： [`.trellis/tasks/07-04-orchestrator-dispatch-hardening/delivery-smoke-matrix.md`](../.trellis/tasks/07-04-orchestrator-dispatch-hardening/delivery-smoke-matrix.md)

| # | 会话类型 | Prompt | 期望 | Pass |
|---|----------|--------|------|------|
| 3.1 | **默认**（无 Guid） | 查直接50价格 | `Agent(quotation-agent)` → 同轮价格 | [ ] |
| 3.2 | **默认** | 1-5月销售额 | `Agent(accurate-agent)` → 表格 | [ ] |
| 3.3 | **默认** | 帮我做一个 Word，标题测试委派 | `Agent(word-creator)` 成功（WS C bypass 已 deploy） | [ ] |
| 3.4 | Guid **万鼎报价专家** | 查直接50价格 | 直接 `match_quotation`，无 Agent 卡片 | [ ] |
| 3.5 | Guid **万鼎账务专家** | 1-5月销售额 | 直接 accurate MCP | [ ] |
| 3.6 | Guid 报价 idle resume | 开聊 → 等 ≥5min 或关窗重开 → `查库存` | log：`agent session profile applied: quotation-agent`；无 orchestrator guard | [ ] |

**CCB log：** `%LOCALAPPDATA%\CCB-Wanding\logs\` 或 F12 → `[ACP] agent session profile applied: …`

---

## Issue 4 — Research Exa+Tavily 双源（Trellis `07-04-07-05-research-dual-source-deep-framework`）

| # | 步骤 | 期望 | Pass |
|---|------|------|------|
| 4.1 | 确认 skill | `skills\wanding-deep-research\SKILL.md` 存在 | [ ] |
| 4.2 | Guid **资料搜索助手** / research-agent | 深度调研 prompt（行业政策/竞品） | [ ] |
| 4.3 | 交付物 | `research/*.md` + `.sources.jsonl` | [ ] |
| 4.4 | Transcript | 无 `Task` / 后台 `Agent` 子 agent | [ ] |
| 4.5 | （有 Tavily key） | 同时出现 exa + tavily MCP 调用 | [ ] |

**CLI 探针（可选）：**

```powershell
& .\ccb-installer\scripts\probe-research-capabilities.ps1 -InstallDir D:\CCB-Wanding
```

---

## Issue 5 — View Steps 工具名（AionUI renderer）

| # | 步骤 | 期望 | Pass |
|---|------|------|------|
| 5.1 | 任意 Guid 触发工具（价库改 supplier / 查价） | View Steps 展开 | [x] dev 2026-07-04 |
| 5.2 | 首行工具名 | 非空白（title / MCP 名 / 路径 / kind） | [x] dev 2026-07-04 |

**打包注意：** 修复在 `aionui-src`，1.1.6 exe 须重打 AionUI；见 backlog Issue 5。

---

## 汇总 → packaging-backlog 勾选

完成 dev 测试后，在 [`packaging-backlog-1.1.6.md`](packaging-backlog-1.1.6.md) 底部勾选对应项：

| Backlog 行 | 本清单覆盖 |
|------------|------------|
| Issue 1 skill 部署链 | §1（dev 路径；生产 reset 仍待 1.1.6 代码） |
| Issue 2 主表对齐 | §2 |
| Issue 3 dispatch smoke | §3 |
| Issue 4 research 双源 | §4 |
| Issue 5 View Steps 工具名 | §5（dev ✓；exe 待 1.1.6 重打 AionUI） |

---

## Deploy 记录（操作员填写）

| 字段 | 值 |
|------|-----|
| CCB deploy 时间 | |
| `sync-claude-code-b-mcp-prefetch -Build -Deploy` | |
| `start-dev-full` 命令 | |
| 测试人 | |
