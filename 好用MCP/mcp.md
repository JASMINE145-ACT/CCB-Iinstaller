# Claude Code MCP Server 配置指南

## MCP 配置路径

Claude Code 支持两种级别的 MCP 配置：

| 级别 | 文件位置 | 作用域 |
|------|----------|--------|
| **全局** | `~/.claude/settings.json` 的 `mcpServers` | 所有项目 |
| **项目级** | `<project>/.mcp.json` | 仅当前项目 |

**推荐做法**：项目级配置优先于全局配置。项目级配置也更易于版本控制。

## 配置字段说明

每个 MCP server 可配置以下字段：

```json
{
  "command": "可执行文件路径或命令名",
  "args": ["参数列表"],
  "env": {
    "环境变量名": "值"
  },
  "description": "MCP 描述（显示在 MCP 管理对话框中）"
}
```

### 常用字段说明

- **command**: 可执行文件的绝对路径或可在 PATH 中找到的命令名
- **args**: 启动参数数组，会传递给 command
- **env**: 环境变量，传递给 MCP server 进程
- **description**: 可选，描述该 MCP 的功能，会显示在 MCP 管理界面中

## 完整配置流程

### 1. 获取 MCP server

MCP server 通常有以下分发形式：

- **独立可执行文件**（`.exe`）：直接下载，解压即用
- **.mcpb 包**：MCP 官方分发格式，解压后包含 `server/<name>.exe`
- **.vsix 扩展**：VS Code Marketplace 分发格式
- **npm/npx 包**：通过 Node.js 运行
- **Python 包**：通过 `uvx` / `pip` / `python` 运行
- **.NET tool**：`dotnet tool install --global` 安装

### 2. 放置可执行文件

建议统一放在 `~/.claude/mcp-servers/` 目录下，便于管理：

```
~/.claude/mcp-servers/
├── excel-mcp/
│   ├── server/
│   │   └── excel-mcp-server.exe   ← 可执行文件
│   └── ...其他文件
└── another-mcp/
    └── ...
```

### 3. 写入 .mcp.json

在项目根目录创建或编辑 `.mcp.json`：

```json
{
  "mcpServers": {
    "excel-mcp": {
      "command": "C:/Users/<username>/.claude/mcp-servers/excel-mcp/server/excel-mcp-server.exe",
      "description": "Excel MCP Server v1.8.67 - 23 tools for Excel automation"
    }
  }
}
```

### 4. 重启 Claude Code

配置文件修改后必须重启 Claude Code 才能生效。

### 5. 验证连接

启动后在 Claude Code 中输入 `/mcp` 打开 MCP 管理对话框，确认 server 状态为 `✔ connected`。

## 常见问题

### Q: MCP server 显示 `✘ failed`？
排查步骤：
1. 确认可执行文件路径正确
2. 运行 `<exe> --help` 确认文件可执行
3. 用 `echo '...' | <exe>` 测试 stdio 模式（不报语法错误即正常）
4. 检查是否有缺少的运行时依赖（如 Excel、.NET、Python 等）
5. 运行 `claude --debug` 查看详细错误日志

### Q: 全局配置和项目配置冲突？
项目级 `.mcp.json` 会与全局 `settings.json` 中的 `mcpServers` 合并。若同名 server，项目级优先。

### Q: 如何升级 MCP server？
1. 下载新版可执行文件
2. 替换 `~/.claude/mcp-servers/<name>/` 下的文件
3. 重启 Claude Code

### Q: .mcp.json 的 JSON 语法注意？
- 每个 server 配置对象之间用 `,` 分隔（最后一个不需要）
- `env` 对象内部键值对也需要 `,` 分隔
- 推荐用 IDE 格式化验证 JSON 语法

## excel-mcp 配置示例

```json
{
  "mcpServers": {
    "excel-mcp": {
      "command": "C:/Users/<username>/.claude/mcp-servers/excel-mcp/server/excel-mcp-server.exe",
      "description": "Excel MCP Server v1.8.67 - 23 tools, 214+ operations for AI-powered Excel automation via COM API (Windows only, requires Excel 2016+)"
    }
  }
}
```

### excel-mcp 快速安装

```powershell
# 1. 下载最新 Release
# https://github.com/sbroenne/mcp-server-excel/releases/latest
# 访问上方 URL 获取最新版本号，然后下载：
# https://github.com/sbroenne/mcp-server-excel/releases/download/v<version>/ExcelMcp-MCP-Server-<version>-windows.zip

# 2. 解压到指定目录
Expand-Archive -Path 'ExcelMcp-MCP-Server-<version>-windows.zip' -DestinationPath 'C:\Users\<username>\.claude\mcp-servers\excel-mcp'

# 3. 在项目 .mcp.json 中添加配置（如上所示）

# 4. 重启 Claude Code
```

**注意**：excel-mcp 仅支持 Windows 系统，需要安装 Microsoft Excel 2016 或更高版本。

## 管理 MCP server

```bash
claude mcp                    # 交互式管理 MCP servers
claude mcp add <name> <cmd>   # 添加 MCP server
claude mcp remove <name>      # 移除 MCP server
claude mcp list               # 列出已配置的 MCP servers
```

## 参考

- [Claude Code MCP 官方文档](https://code.claude.com/docs/en/mcp)
- [excel-mcp 官方仓库](https://github.com/sbroenne/mcp-server-excel)