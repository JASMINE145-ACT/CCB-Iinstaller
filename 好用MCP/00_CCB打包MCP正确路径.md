# CCB 打包 MCP 正确路径

这份文档记录 CCB 安装包内置 MCP 的正确做法，避免以后只改 `settings.json` 但 Claude Code 实际不加载 MCP。

## 核心结论

CCB 这种自带运行时的安装包，不要只依赖：

```text
%LOCALAPPDATA%\CCB\.claude\settings.json
```

正确路径是：

1. 安装时把 MCP server 文件放进 CCB 安装目录。
2. 安装时生成运行时 MCP 配置文件：

```text
%LOCALAPPDATA%\Programs\CCB\ccb-mcp.json
```

3. `ccb.cmd` 启动 Claude Code 时显式传入：

```text
--mcp-config "%CCB_INSTALL_DIR%\ccb-mcp.json"
```

只有这样，`/mcp` 页面才会稳定看到安装包内置的 MCP。

## 推荐目录结构

安装包源码目录：

```text
D:\Projects\claude-code-best\ccb-installer\
  ccb.cmd
  ccb-template.cmd
  installer.nsi
  scripts\
    ensure-mcp-settings.ps1
  vendor\
    mcp-servers\
      excel-mcp\
        mcp-excel.exe
        README.md
        LICENSE
```

用户安装后的目录：

```text
%LOCALAPPDATA%\Programs\CCB\
  ccb.cmd
  ccb-mcp.json
  scripts\
    ensure-mcp-settings.ps1
  vendor\
    mcp-servers\
      excel-mcp\
        mcp-excel.exe
```

用户配置目录：

```text
%LOCALAPPDATA%\CCB\.claude\
  settings.json
```

注意：`settings.json` 可以保留用户配置、也可以写一份 `mcpServers` 作为兼容信息，但 CCB 内置 MCP 的可靠加载路径是 `ccb-mcp.json + --mcp-config`。

## ccb-mcp.json 示例

```json
{
  "mcpServers": {
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp",
      "description": "Exa neural web search and page fetch MCP"
    },
    "excel-mcp": {
      "command": "D:\\Users\\example\\AppData\\Local\\Programs\\CCB\\vendor\\mcp-servers\\excel-mcp\\mcp-excel.exe",
      "description": "ExcelMcp Server v1.8.67 for Microsoft Excel automation. Requires Windows and Microsoft Excel 2016+."
    }
  }
}
```

实际生成时不要写死用户路径，要用安装目录拼出来。

## ccb.cmd 必须这样启动

核心逻辑：

```bat
if exist "%CCB_INSTALL_DIR%\ccb-mcp.json" (
    "%CCB_INSTALL_DIR%\vendor\bun\bun.exe" "%CCB_INSTALL_DIR%\dist\cli.js" --mcp-config "%CCB_INSTALL_DIR%\ccb-mcp.json" %*
) else (
    "%CCB_INSTALL_DIR%\vendor\bun\bun.exe" "%CCB_INSTALL_DIR%\dist\cli.js" %*
)
```

这一步是关键。没有 `--mcp-config`，只写 CCB 私有 `settings.json` 时，Claude Code v2.1.888 的 `/mcp` 可能只显示内置 MCP，例如：

```text
computer-use
mcp-chrome
```

不会显示 `exa`、`excel-mcp`。

## 安装脚本应该做什么

`scripts\ensure-mcp-settings.ps1` 的职责：

1. 读取用户原来的：

```text
%LOCALAPPDATA%\CCB\.claude\settings.json
```

2. 保留用户已有配置和自定义 MCP。
3. 合并 CCB 内置 MCP：

```text
exa
excel-mcp
```

4. 写回 `settings.json`，作为兼容配置。
5. 生成运行时配置：

```text
%LOCALAPPDATA%\Programs\CCB\ccb-mcp.json
```

6. 如果旧 `settings.json` 不是合法 JSON，先备份：

```text
settings.json.invalid-<timestamp>.bak
```

再创建新的合法配置。

## installer.nsi 必须包含

安装 MCP 文件：

```nsi
Section "MCP Servers (required)" SecMcp
  SectionIn RO
  SetOutPath "$INSTDIR\vendor\mcp-servers"
  File /r "vendor\mcp-servers\*.*"
SectionEnd
```

安装并运行配置脚本：

```nsi
SetOutPath "$INSTDIR\scripts"
File "scripts\ensure-mcp-settings.ps1"

ExecWait 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\scripts\ensure-mcp-settings.ps1" -InstallDir "$INSTDIR" -ConfigDir "$LOCALAPPDATA\CCB\.claude"'
```

## 验证方法

先准备本地测试沙盒：

```powershell
cd D:\Projects\claude-code-best\ccb-installer
.\scripts\test-terminal-local.ps1 -PrepareOnly -SandboxRoot D:\tmp\ccb-terminal-test-mcpfix
```

再启动 Modern 终端测试：

```powershell
.\scripts\test-terminal-local.ps1 -Mode Modern -SandboxRoot D:\tmp\ccb-terminal-test-mcpfix
```

进入 Claude Code 后输入：

```text
/mcp
```

正确结果：除了 built-in MCP，还应该看到：

```text
exa
excel-mcp
```

如果只看到：

```text
computer-use
mcp-chrome
```

说明启动链路没有吃到 `--mcp-config`，优先检查：

1. `%LOCALAPPDATA%\Programs\CCB\ccb-mcp.json` 是否存在。
2. `ccb.cmd` 是否包含 `--mcp-config`。
3. `ccb-mcp.json` 里的 `excel-mcp.command` 是否指向真实存在的 `mcp-excel.exe`。
4. 是否还在运行旧测试窗口或旧安装包。

## excel-mcp 单独测试

在 CCB 源码里测试：

```powershell
D:\Projects\claude-code-best\ccb-installer\vendor\mcp-servers\excel-mcp\mcp-excel.exe --help
```

能看到 `Excel MCP Server` 说明 exe 本身能启动。

注意：`excel-mcp` 需要 Windows 和 Microsoft Excel 2016+。没有安装 Excel 时，server 可能能启动，但真正操作 Excel 文件会失败。

## 版本分发规则

这次修复从 CCB `1.0.5` 开始才完整：

```text
D:\Projects\claude-code-best\ccb-installer\CCB-Setup-1.0.5.exe
```

不要分发 `1.0.4`，因为它只写了配置，但 `/mcp` 不一定能看到 `exa` 和 `excel-mcp`。

## 最容易犯错的点

不要以为写了下面这个文件就一定生效：

```text
%LOCALAPPDATA%\CCB\.claude\settings.json
```

对 CCB 安装包来说，稳定方案是：

```text
vendor\mcp-servers\...
scripts\ensure-mcp-settings.ps1
ccb-mcp.json
ccb.cmd --mcp-config ccb-mcp.json
```

这四个环节缺一个，都可能导致 `/mcp` 看不到内置 MCP。
