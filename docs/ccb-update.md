# CCB 更新机制

## 当前发布方式

CCB 使用完整安装包覆盖升级。不要要求用户先卸载旧版，也不要将
`ccb-update.cmd` 作为发布流程。

用户操作：

1. 退出正在运行的 CCB。
2. 下载并双击最新的 `CCB-Setup-x.y.z.exe`。
3. 按安装向导覆盖原安装目录。

## 为什么配置不会丢

程序与配置存储在不同位置：

```text
%LOCALAPPDATA%\Programs\CCB\     程序文件，升级时替换
%LOCALAPPDATA%\CCB\.claude\      用户配置，升级和卸载都保留
```

安装器只在首次安装且不存在 `settings.json` 时写入默认配置。已有的
`settings.json`、登录信息、会话及用户自定义内容不会被默认文件覆盖。

从 `1.0.3` 起，覆盖升级前还会创建备份。例如安装 `1.0.5` 时：

```text
%LOCALAPPDATA%\CCB\backup-before-1.0.5\.claude\
```

## 开发者发布流程

1. 更新代码、运行时或打包资源。
2. 在 `installer.nsi` 中提升版本号。
3. 构建新的完整安装包。
4. 在本地验证 Bun、Git Bash 和 `dist\cli.js --version` 可运行。
5. 将新的 `CCB-Setup-x.y.z.exe` 发给用户覆盖安装。

完整安装包可以同步更新 `dist`、启动脚本、Bun、Git Bash、诊断脚本和快捷方式，
适用于修复运行时依赖或终端兼容问题。

从 `1.0.5` 起，完整安装包还可以同步更新内置 MCP：

- `exa`：写入 CCB 用户配置中的 HTTP MCP。
- `excel-mcp`：打包到 `%LOCALAPPDATA%\Programs\CCB\vendor\mcp-servers\excel-mcp\mcp-excel.exe`，启动前自动写入配置。

## 恢复配置

如升级后需要恢复旧配置，先退出 CCB，再将对应备份目录中的 `.claude`
内容复制回：

```text
%LOCALAPPDATA%\CCB\.claude\
```

备份目录不会在卸载时被删除。
