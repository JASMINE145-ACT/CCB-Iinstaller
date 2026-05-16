# CCB - Claude Code Bundle

CCB (Claude Code Bundle) 一键安装包 - 为 Windows 用户提供简单的 AI 编程助手安装体验。

## 功能特点

- **一键安装**: 双击 exe 即可完成安装
- **独立配置**: 不影响系统其他程序
- **自动配置**: 自动安装 Bun 运行时和 ripgrep
- **保留配置**: 卸载后用户配置保留

## 安装

1. 从 [Releases](https://github.com/JASMINE145-ACT/CCB-Iinstaller/releases) 页面下载 `CCB-Setup-1.0.0.exe`
2. 双击运行
3. 按照向导完成安装

## 从源码构建

### 前置条件

- [NSIS](https://nsis.sourceforge.io/) - 用于编译安装包
- [PowerShell](https://docs.microsoft.com/powershell/) 7+

### 构建步骤

```bash
# 1. 下载资源
pwsh -ExecutionPolicy Bypass -File scripts/build-resources.ps1

# 2. 构建安装包
makensis installer.nsi

# 3. 验证
pwsh -ExecutionPolicy Bypass -File scripts/verify-installer.ps1
```

### 使用 Make

```bash
make resources    # 下载资源 (Bun + ripgrep)
make installer    # 构建安装包
make test         # 验证安装
make clean        # 清理资源
```

## 目录结构

```
ccb-installer/
├── installer.nsi           # NSIS 安装脚本
├── ccb.cmd                  # 入口脚本
├── ccb-template.cmd         # 入口脚本模板
├── README.md                # 本文件
├── Makefile                 # 构建自动化
├── resources/               # 内嵌资源 (由 build-resources.ps1 下载)
│   ├── bun/                 # Bun 运行时
│   ├── ripgrep/             # ripgrep
│   └── python/              # Python (可选)
└── scripts/
    ├── build-resources.ps1   # 资源下载脚本
    └── verify-installer.ps1  # 安装验证脚本
```

## 安装后结构

```
%LOCALAPPDATA%\Programs\CCB\    # 程序目录
├── bun\                        # Bun 运行时
├── dist\                       # CCB 代码
├── vendor\ripgrep\             # ripgrep
└── ccb.cmd                     # 入口脚本

%LOCALAPPDATA%\CCB\.claude\     # 配置目录 (保留)
├── settings.json               # 用户配置
├── memory\                     # 记忆文件
└── skills\                     # 技能配置
```

## 卸载

- **开始菜单** → **CCB** → **Uninstall**
- 或者: 设置 → 应用 → CCB → 卸载

**注意**: 卸载后 `%LOCALAPPDATA%\CCB\.claude` 配置目录会保留。

## 开发

### CI/CD

发布标签时会自动构建安装包:

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions 会自动:
1. 安装 NSIS
2. 下载 Bun + ripgrep 资源
3. 编译安装包
4. 创建 Release 并上传 exe

### 添加资源到 Git

由于内嵌资源 (Bun/ripgrep) 较大，它们通过 `build-resources.ps1` 脚本下载，不包含在 git 中。

## 许可证

MIT

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2026-05-16 | 初始版本 |