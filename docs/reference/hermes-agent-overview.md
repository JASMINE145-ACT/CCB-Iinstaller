# Hermes Agent — 本地学习摘要

> 源仓库：[NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)（MIT，Nous Research）  
> 完整树：[`hermes-agent/`](./hermes-agent/)（gitignore，不提交）  
> 抓取日期：2026-07-15（`main` zip）  
> 官网文档：https://hermes-agent.nousresearch.com/docs/

## 一句话

**自进化 AI agent**：内置学习闭环（从经验创建/改进 skills、持久化记忆、跨会话搜索、用户建模），CLI/TUI + Telegram/Discord/Slack/WhatsApp/Signal 等 messaging gateway；模型可换（Nous Portal / OpenRouter / OpenAI / 自建端点…）。

## 能力要点（对照 README）

| 能力 | 说明 |
|------|------|
| TUI | 多行编辑、斜杠补全、历史、中断重定向、流式工具输出 |
| Messaging gateway | 多平台一体进程；语音转写、跨端连续性 |
| Learning loop | Agent 管理记忆 + 定期 nudge；复杂任务后自主建 skill；技能使用中自改进；FTS5 会话搜索 + LLM 摘要；Honcho 用户建模；兼容 [agentskills.io](https://agentskills.io) |
| Cron | 自然语言定时任务，投递到任意平台 |
| 并行 | 隔离子 agent；Python 脚本经 RPC 调工具 |
| 运行时后端 | local / Docker / SSH / Singularity / Modal / Daytona（后两者可 serverless 休眠） |
| Research | batch trajectory 生成与压缩（训工具调用模型） |
| ACP | 仓库含 `acp_adapter` / `acp_registry`（与本仓 ACP 生态可对照学习） |
| MCP | 文档有 MCP Integration；可选 `optional-mcps` |

## 安装（上游）

```bash
# Linux / macOS / WSL2 / Termux
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

```powershell
# Windows native
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
```

常用命令：`hermes` · `hermes model` · `hermes tools` · `hermes gateway` · `hermes setup` · `hermes doctor`

## 本地树入口

| 路径 | 用途 |
|------|------|
| `hermes-agent/README.md` / `README.zh-CN.md` | 官方说明 |
| `hermes-agent/AGENTS.md` | Agent 协作约定（上游维护） |
| `hermes-agent/agent/` · `tools/` · `skills/` | 核心循环 / 工具 / 技能 |
| `hermes-agent/gateway/` · `tui_gateway/` · `ui-tui/` | 网关与 TUI |
| `hermes-agent/acp_adapter/` · `acp_registry/` | ACP |
| `hermes-agent/docs/` · `website/` | 上游文档源 |
| `hermes-agent/cli.py` · `run_agent.py` · `hermes_cli/` | CLI / runner |

## 与本仓关系

仅作 **对照学习**（记忆闭环、skills 标准、gateway、ACP/MCP）。**不是** CCB-Wanding / AionUI 运行时依赖，勿把此树当产品路径。
