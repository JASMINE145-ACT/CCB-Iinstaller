# CCB Installer

CCB Installer 是 Claude Code Bundle 的 Windows 安装包工程，目标是让普通 Windows 用户可以一键安装、升级并运行 CCB。

## 当前版本

```text
1.0.6
```

当前建议分发：

```text
CCB-Setup-1.0.6.exe
```

不要再分发 1.0.4 或更早版本。旧版本没有完整的 MCP 加载和终端修复链路。

## 主要能力

- 安装 Claude Code CLI 运行文件。
- 内置 Bun、ripgrep、Git Bash 等运行依赖。
- 内置 MCP 配置：
  - `exa`
  - `excel-mcp`
- 生成运行时 `ccb-mcp.json`，并通过 `--mcp-config` 启动 Claude Code。
- 升级时保留用户配置。
- 安装时尝试安装 Windows Terminal。
- 自动生成 `CCB` 和 `CCB Flat Mode` 快捷方式。
- 提供诊断入口 `ccb-diagnose.cmd`。
- 提供门户网站静态页 `portal/`。

## 目录结构

```text
ccb-installer/
  installer.nsi
  ccb.cmd
  ccb-template.cmd
  ccb-diagnose.cmd
  ccb-fix-terminal.cmd
  build.ps1
  scripts/
    ensure-mcp-settings.ps1
    fix-terminal-launcher.ps1
    install-windows-terminal.ps1
    test-terminal-local.ps1
    verify-installer.ps1
  resources/
    ccb.ico
    settings/
      settings.json
  vendor/
    mcp-servers/
    windows-terminal/
  portal/
```

## 构建

需要先安装 NSIS。

```powershell
cd D:\Projects\claude-code-best\ccb-installer
.\build.ps1
```

或者直接运行：

```powershell
& 'D:\NSIS\makensis.exe' 'D:\Projects\claude-code-best\ccb-installer\installer.nsi'
```

构建产物：

```text
CCB-Setup-1.0.6.exe
```

## 验证

验证本地安装包工程完整性：

```powershell
cd D:\Projects\claude-code-best\ccb-installer
.\scripts\verify-installer.ps1 -InstallDir 'D:\Projects\claude-code-best\ccb-installer'
```

验证终端沙盒：

```powershell
.\scripts\test-terminal-local.ps1 -PrepareOnly -SandboxRoot D:\tmp\ccb-terminal-test
.\scripts\test-terminal-local.ps1 -Mode Modern -SandboxRoot D:\tmp\ccb-terminal-test
```

## 升级规则

给已安装用户升级时，直接让用户运行新的完整安装包覆盖安装：

```text
CCB-Setup-1.0.6.exe
```

不要要求用户先卸载旧版本。

用户配置位于：

```text
%LOCALAPPDATA%\CCB\.claude
```

程序文件位于：

```text
%LOCALAPPDATA%\Programs\CCB
```

安装器升级前会备份已有配置到：

```text
%LOCALAPPDATA%\CCB\backup-before-1.0.6
```

## Windows Terminal

安装器提供组件：

```text
Install Windows Terminal if missing (recommended)
```

处理顺序：

1. 检查是否已有 `wt.exe`。
2. 如果没有，优先使用内置 `vendor\windows-terminal\*.msixbundle` 安装。
3. 如果离线安装失败，再尝试 `winget`。
4. 如果公司策略禁止安装，CCB 本体仍继续安装。
5. 最后自动生成 `CCB` 和 `CCB Flat Mode` 快捷方式。

## MCP

CCB 使用两层配置：

```text
%LOCALAPPDATA%\CCB\.claude\settings.json
%LOCALAPPDATA%\Programs\CCB\ccb-mcp.json
```

真正用于稳定加载内置 MCP 的是：

```text
ccb-mcp.json + --mcp-config
```

不要只依赖私有 `settings.json`，否则 `/mcp` 可能只看到 Claude Code 的 built-in MCP。

## 门户

门户静态站位于：

```text
portal/
```

本地预览：

```powershell
cd D:\Projects\claude-code-best\ccb-installer\portal
python -m http.server 8080
```
