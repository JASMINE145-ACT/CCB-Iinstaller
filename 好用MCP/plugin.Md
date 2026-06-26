在 Claude Code 里，一个 **合格的 plugin** 本质上应该是：

> **一个可分享、可版本管理、可安装的 Claude Code 扩展包**，里面可以打包 Skills、Agents、Hooks、MCP Servers、LSP Servers、Monitors 等能力。官方定义里，plugin 是一个 self-contained directory，用来扩展 Claude Code；组件可以包括 skills、agents、hooks、MCP servers、LSP servers 和 monitors。([Claude Code][1])

---

## 先理解：Plugin 不是 Skill，而是“打包容器”

关系大概是：

```text
Plugin
├── Skills       # 教 Claude 怎么做某类任务
├── Agents       # 专门的子代理，比如 code-reviewer / security-reviewer
├── Hooks        # 自动触发脚本，比如写完代码后自动 format
├── MCP Servers  # 连接外部工具/API/数据库
├── LSP Servers  # 代码智能，比如 Python/TS/Rust 语言服务
├── Monitors     # 后台监控日志、状态、部署结果
└── README / 配置 / 示例
```

如果你只是自己用一个简单流程，用 `.claude/skills/xxx/SKILL.md` 就够了。
如果你想 **发给别人、多个项目复用、团队共享、走 marketplace、长期维护版本**，才适合做 plugin。Claude Code 官方也明确说：standalone `.claude/` 适合个人/项目实验，plugins 适合团队共享、多项目复用、版本更新和 marketplace 分发。([Claude Code][2])

---

## 一个合格 Plugin 至少应该有这些

### 1. 清楚的定位

不要做成“万能插件”。一个好 plugin 应该解决一个明确场景，比如：

```text
create-mcp-server
wechat-publisher
code-review-toolkit
data-analysis-helper
indonesia-business-research
```

不好的名字：

```text
my-tools
helper
auto-agent
do-everything
```

Plugin 名字会成为命名空间，比如插件叫 `my-first-plugin`，里面的 skill `hello` 会变成 `/my-first-plugin:hello`。官方这样设计是为了避免多个插件之间命令冲突。([Claude Code][2])

---

### 2. 标准目录结构

一个比较合格的 plugin 结构可以这样：

```text
create-mcp-server-plugin/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── create-mcp-server/
│       ├── SKILL.md
│       ├── reference.md
│       └── templates/
│           ├── typescript-mcp-template.md
│           └── python-mcp-template.md
├── agents/
│   └── mcp-architect.md
├── hooks/
│   └── hooks.json
├── .mcp.json
├── scripts/
│   └── validate-plugin.sh
├── README.md
├── CHANGELOG.md
└── LICENSE
```

注意：**`.claude-plugin/` 里面只放 `plugin.json`**。`skills/`、`agents/`、`hooks/`、`.mcp.json` 都应该放在 plugin root，不要放进 `.claude-plugin/` 里面。官方文档特别提醒这是常见错误。([Claude Code][2])

---

### 3. `plugin.json` 要写清楚

最低限度，manifest 里 `name` 是唯一必填字段；但一个合格 plugin 不应该只写 `name`。官方说明 `plugin.json` 用来定义插件的 metadata 和 configuration。([Claude Code][1])

建议这样写：

```json
{
  "name": "create-mcp-server",
  "displayName": "Create MCP Server",
  "description": "Help Claude Code design, scaffold, test, and package MCP servers.",
  "version": "1.0.0",
  "author": {
    "name": "Jiacheng You"
  },
  "homepage": "https://github.com/yourname/create-mcp-server-plugin",
  "repository": "https://github.com/yourname/create-mcp-server-plugin",
  "license": "MIT",
  "keywords": ["mcp", "server", "tools", "claude-code", "plugin"]
}
```

其中 `description` 很重要，因为用户在 `/plugin` 里看插件时会看到它；`version` 也重要，如果设置了版本号，用户只有在你 bump version 后才会收到更新。([Claude Code][2])

---

## 4. 至少要有一个真正有用的组件

一个 plugin 不是“空壳”。它至少应该包含一个明确组件。

### 最常见：Skill

```text
skills/
└── create-mcp-server/
    └── SKILL.md
```

`SKILL.md` 里要有清楚的 `description`，让 Claude 知道什么时候自动调用它。官方文档说，plugin 里的 skills 会自动发现，并且 Claude 可以根据上下文自动调用。([Claude Code][1])

例如：

```markdown
---
description: Use this skill when the user wants to design, create, debug, or package an MCP server for Claude Code, Cursor, Codex, Claude Desktop, or other MCP clients.
---

# Create MCP Server

When invoked, help the user:

1. Clarify the MCP use case.
2. Decide whether to expose tools, resources, prompts, or all three.
3. Choose TypeScript or Python.
4. Generate project structure.
5. Implement MCP server code.
6. Add config examples for Claude Code, Claude Desktop, Cursor, and Codex.
7. Add tests and security notes.
```

---

## 5. 如果涉及外部工具，就加 MCP Server

如果 plugin 只是“指导 Claude 做事”，用 Skill 就够了。
如果 plugin 要让 Claude 真正连接外部系统，比如：

```text
微信公众号 API
Google Sheets
数据库
ERP
天眼查
Excel 文件系统
公司内部报价系统
```

那就应该加 `.mcp.json` 或在 `plugin.json` 里声明 MCP Server。官方说明 plugin 可以通过 `.mcp.json` 或 inline `plugin.json` 打包 MCP servers；插件启用后，MCP server 会自动启动，工具也会出现在 Claude 的工具集中。([Claude Code][3])

比如：

```json
{
  "mcpServers": {
    "wechat-publisher": {
      "command": "${CLAUDE_PLUGIN_ROOT}/server/start.sh",
      "env": {
        "WECHAT_APP_ID": "${WECHAT_APP_ID}",
        "WECHAT_APP_SECRET": "${WECHAT_APP_SECRET}"
      }
    }
  }
}
```

重点：**不要把密钥写死在 plugin 里**。用环境变量或 user config。

---

## 6. 要有 README，不然别人不会用

一个合格 plugin 的 README 至少写：

```text
1. 这个 plugin 是干什么的
2. 适合什么场景
3. 安装方法
4. 启用方法
5. 提供哪些 skills / agents / MCP tools
6. 常见命令
7. 环境变量
8. 示例 prompt
9. 安全注意事项
10. 常见错误排查
```

例如：

````markdown
# Create MCP Server Plugin

## What it does

This plugin helps Claude Code create MCP servers from scratch.

## Commands

- `/create-mcp-server:create-mcp-server`

## Example usage

```text
/create-mcp-server:create-mcp-server 帮我做一个微信公众号 MCP，支持上传图片、新建草稿、发布文章
````

## Environment variables

None required for basic scaffolding.

## Security

This plugin does not store API keys. Generated MCP servers should use `.env` files or environment variables.

````

---

## 7. 要能测试和验证

官方推荐用本地 plugin 路径测试：

```bash
claude --plugin-dir ./my-first-plugin
````

然后在 Claude Code 里运行：

```text
/my-first-plugin:hello
```

官方 quickstart 也是这样测试 plugin 的。([Claude Code][2])

如果要验证 plugin 或 marketplace，可以用：

```bash
claude plugin validate .
```

或者在 Claude Code 里：

```text
/plugin validate .
```

官方文档也建议用这个检查 JSON、schema、frontmatter、hooks 等问题。([Claude Code][4])

---

## 8. 要注意安全

这是非常重要的。Plugin 可以包含 MCP servers、hooks、scripts，这些东西可能会运行代码、访问文件、调用外部 API。Anthropic 官方 plugin directory 也提醒：安装、更新、使用 plugin 前必须信任它，因为 Anthropic 不能保证插件里的 MCP server、文件或其他软件一定安全或不会变化。([GitHub][5])

合格 plugin 应该做到：

```text
不硬编码 API Key
不默认读取 .env / secrets
不默认执行危险命令
写清楚会访问哪些文件
写清楚会调用哪些外部服务
写清楚是否有写入/删除/发布等副作用
涉及发布、付款、删除、发邮件等动作时要用户确认
```

尤其你以后如果做：

```text
微信公众号自动发文 plugin
报价系统 plugin
天眼查采集 plugin
Excel/WPS 自动化 plugin
```

都必须把权限边界写清楚。

---

## 9. 如果要分享给别人，要有 marketplace

如果你只是本地用，可以不用 marketplace。
如果要给团队用，最好建一个 marketplace。Claude Code 的 marketplace 本质是一个 catalog，支持集中发现、版本跟踪和自动更新。用户可以通过 `/plugin marketplace add` 添加，然后 `/plugin install` 安装。([Claude Code][4])

基本结构：

```text
my-marketplace/
├── .claude-plugin/
│   └── marketplace.json
└── plugins/
    └── create-mcp-server/
        ├── .claude-plugin/
        │   └── plugin.json
        └── skills/
            └── create-mcp-server/
                └── SKILL.md
```

`marketplace.json` 示例：

```json
{
  "name": "jiacheng-tools",
  "owner": {
    "name": "Jiacheng You"
  },
  "plugins": [
    {
      "name": "create-mcp-server",
      "source": "./plugins/create-mcp-server",
      "description": "Create MCP servers with Claude Code"
    }
  ]
}
```

---

## 我给你一个“合格 Plugin 检查清单”

做完以后，你逐项检查：

```text
□ plugin 名字清晰，kebab-case，没有空格
□ 有 .claude-plugin/plugin.json
□ plugin.json 至少有 name、description、version、author
□ 有 README.md
□ 有明确使用场景
□ 至少包含一个有用组件：skill / agent / hook / MCP / LSP
□ skills 放在 skills/<skill-name>/SKILL.md
□ agents 放在 agents/
□ hooks 放在 hooks/hooks.json
□ MCP 配置放在 .mcp.json 或 plugin.json
□ 不把 skills/agents/hooks 放进 .claude-plugin/
□ 不硬编码密钥
□ 需要外部 API 时用环境变量
□ 有示例 prompt
□ 有安装说明
□ 有测试命令
□ 跑过 claude plugin validate
□ 有 CHANGELOG.md
□ 如果发布给团队，有 marketplace.json
```

---

## 对你现在最实用的建议

你现在要做的应该不是复杂 plugin，而是先做一个：

```text
create-mcp-server plugin
```

第一版只需要：

```text
create-mcp-server/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── create-mcp-server/
│       └── SKILL.md
├── README.md
└── CHANGELOG.md
```

也就是：**先把“创建 MCP 的方法论”做成 Skill，然后用 Plugin 打包**。

等以后你真的需要自动生成文件、调用脚本、检测 MCP 配置，再加：

```text
scripts/
templates/
agents/
hooks/
.mcp.json
```

一句话总结：

> **合格的 Claude Code plugin = 清晰定位 + 标准目录 + 可调用组件 + 安全文档 + 可测试 + 可版本更新。**
> 你现在最适合先做一个 `create-mcp-server` Skill-only Plugin。

[1]: https://code.claude.com/docs/en/plugins-reference "Plugins reference - Claude Code Docs"
[2]: https://code.claude.com/docs/en/plugins "Create plugins - Claude Code Docs"
[3]: https://code.claude.com/docs/en/mcp?utm_source=chatgpt.com "Connect Claude Code to tools via MCP"
[4]: https://code.claude.com/docs/en/plugin-marketplaces "Create and distribute a plugin marketplace - Claude Code Docs"
[5]: https://github.com/anthropics/claude-plugins-official/blob/main/README.md "claude-plugins-official/README.md at main · anthropics/claude-plugins-official · GitHub"
