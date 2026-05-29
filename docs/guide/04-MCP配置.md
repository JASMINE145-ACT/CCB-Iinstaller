# MCP 配置指南

MCP（Model Context Protocol）是让 Claude Code 调用外部工具的协议。通过 MCP，Claude 可以搜索网页、读写文件、操作数据库等。

---

## CCB 内置 MCP

CCB 安装后自动配置以下 MCP 服务器：

| 名称 | 类型 | 功能 |
|------|------|------|
| exa | HTTP（远程） | 神经网络搜索、URL 内容抓取 |
| excel-mcp | 本地可执行文件 | 读写 Excel / CSV 文件 |

启动时通过 `--mcp-config ccb-mcp.json` 自动加载，无需手动配置。

---

## 验证 MCP 是否正常

启动 CCB 后，在对话框输入：

```
/mcp
```

看到如下输出说明正常：

```
✔ exa          connected
✔ excel-mcp    connected
```

若某项显示 `✘ failed`，参考本文末尾的排错部分。

---

## exa — 网络搜索

### 能力

- **`web_search_exa`**：神经网络语义搜索，比关键词搜索更智能
- **`web_fetch_exa`**：抓取指定 URL 的内容，自动提取关键信息

### 使用示例

```
# 让 Claude 搜索
搜索一下 Python asyncio 最新的最佳实践

# 让 Claude 抓取页面
读一下 https://docs.python.org/3/library/asyncio.html 告诉我核心概念
```

Claude 会自动判断是否需要调用 exa，也可以明确要求：

```
用 exa 搜索一下 React 19 的新特性
```

### 配置位置

```json
// %LOCALAPPDATA%\Programs\CCB\ccb-mcp.json
{
  "mcpServers": {
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp"
    }
  }
}
```

> exa 是纯 HTTP 服务，无需安装任何本地依赖。基础功能免费，无需 API Key。

---

## excel-mcp — Excel 操作

### 能力

- 读取 Excel / CSV 文件内容
- 写入数据到 Excel
- 处理工作表结构

### 使用示例

```
# 让 Claude 读取 Excel
读一下 D:\data\sales.xlsx，告诉我总销售额是多少

# 让 Claude 生成报表
把这些数据写入 D:\output\report.xlsx，按月份分组
```

### 配置位置

excel-mcp 以本地可执行文件方式运行：

```json
// %LOCALAPPDATA%\Programs\CCB\ccb-mcp.json
{
  "mcpServers": {
    "excel-mcp": {
      "command": "%LOCALAPPDATA%\\Programs\\CCB\\vendor\\mcp-servers\\excel-mcp\\mcp-excel.exe",
      "args": []
    }
  }
}
```

---

## 两层配置说明

CCB 使用两个配置文件：

### 1. `ccb-mcp.json`（MCP 专用，稳定）

```
%LOCALAPPDATA%\Programs\CCB\ccb-mcp.json
```

- 由安装时 `ensure-mcp-settings.ps1` 生成
- 通过 `--mcp-config` 参数传入 Claude Code
- **这是内置 MCP 实际生效的配置**

### 2. `settings.json`（用户配置）

```
%LOCALAPPDATA%\CCB\.claude\settings.json
```

- Claude Code 的通用设置
- 用户可以在这里添加自己的 MCP 服务器
- 升级时保留，不会被覆盖

> 不要只依赖 `settings.json` 来加载内置 MCP，某些情况下 `/mcp` 只显示 built-in 服务器。始终通过 `--mcp-config` 加载内置 MCP。

---

## 添加自定义 MCP

### 方法一：编辑 settings.json（推荐）

```json
// %LOCALAPPDATA%\CCB\.claude\settings.json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["C:\\path\\to\\my-mcp-server\\index.js"]
    }
  }
}
```

### 方法二：HTTP 类型 MCP

```json
{
  "mcpServers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp"
    }
  }
}
```

修改后重启 CCB 生效。

---

## 推荐的免费 HTTP MCP

| 名称 | 地址 | 功能 |
|------|------|------|
| exa（已内置） | `https://mcp.exa.ai/mcp` | 搜索 + 抓取 |
| context7 | `https://mcp.context7.com/mcp` | 库文档查询 |

### 添加 context7 示例

```json
// 在 settings.json 中添加
{
  "mcpServers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp"
    }
  }
}
```

使用：
```
用 context7 查一下 Next.js 15 的 App Router 文档
```

---

## 排错

### exa 显示 `failed`

1. 检查网络是否可以访问 `https://mcp.exa.ai`
2. 如果在公司网络，可能需要配置代理
3. 尝试重启 CCB

### excel-mcp 显示 `failed`

1. 检查可执行文件是否存在：
   ```powershell
   Test-Path "$env:LOCALAPPDATA\Programs\CCB\vendor\mcp-servers\excel-mcp\mcp-excel.exe"
   ```
2. 如果不存在，可能被杀毒软件隔离，添加信任后重新安装

### /mcp 什么都不显示

说明 `ccb-mcp.json` 未生成或路径有误，手动触发：
```powershell
& "$env:LOCALAPPDATA\Programs\CCB\scripts\ensure-mcp-settings.ps1" `
  -InstallDir "$env:LOCALAPPDATA\Programs\CCB" `
  -ConfigDir "$env:LOCALAPPDATA\CCB\.claude"
```
