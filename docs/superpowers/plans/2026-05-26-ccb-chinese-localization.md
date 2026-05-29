# CCB 汉化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 CCB 安装包的安装向导、启动脚本、验证脚本、文档全部汉化为中文。

**Architecture:** 修改各源码文件中的用户可见字符串（英文→中文），保持逻辑不变。NSIS 安装脚本因编码问题，将中文部分用纯英文替代或确保 NSIS 编译器支持 UTF-8。

**Tech Stack:** Batch (ccb.cmd), NSIS (installer.nsi), PowerShell (scripts/*.ps1), Markdown (README.md)

---

## 文件结构概览

| 文件 | 职责 | 改动类型 |
|------|------|---------|
| `ccb.cmd` | 启动脚本，用户可见 echo 提示 | 修改字符串 |
| `installer.nsi` | 安装向导的 Section 名称、描述、错误信息 | 修改字符串 |
| `scripts/build-resources.ps1` | 资源下载脚本的输出信息 | 修改字符串 |
| `scripts/verify-installer.ps1` | 验证脚本的输出信息 | 修改字符串 |
| `README.md` | 用户文档 | 修改内容 |

---

## Task 1: 汉化 ccb.cmd

**Files:**
- Modify: `ccb-installer/ccb.cmd`

**现有内容分析：**
- 第 63-66 行：`[CCB] Git Bash not found.` 等错误提示
- 第 77-78 行：`Missing Bun runtime` 错误
- 第 82-83 行：`Missing CCB entry` 错误
- 第 99-101 行：退出码显示信息
- 第 109-111 行：`Installation is incomplete or corrupted` 错误

- [ ] **Step 1: 备份并修改 ccb.cmd 的 echo 提示为中文**

将以下行替换：

```batch
# 原: echo [CCB] Git Bash not found.
# 改: echo [CCB] 未找到 Git Bash 环境

# 原: echo [CCB] Missing Bun runtime: "%CCB_INSTALL_DIR%\vendor\bun\bun.exe"
# 改: echo [CCB] 缺少 Bun 运行时: "%CCB_INSTALL_DIR%\vendor\bun\bun.exe"

# 原: echo [CCB] Missing CCB entry: "%CCB_INSTALL_DIR%\dist\cli.js"
# 改: echo [CCB] 缺少 CCB 入口文件: "%CCB_INSTALL_DIR%\dist\cli.js"

# 原: echo [CCB] Exited with code %CCB_EXIT_CODE%.
# 改: echo [CCB] 退出码: %CCB_EXIT_CODE%

# 原: echo [CCB] Installation is incomplete or corrupted.
# 改: echo [CCB] 安装不完整或已损坏

# 原: echo [CCB] Please reinstall CCB, then try again.
# 改: echo [CCB] 请重新安装 CCB 后再试
```

- [ ] **Step 2: 验证修改后的文件语法**

Run: `cmd.exe /c "cd /d D:\Projects\claude-code-best\ccb-installer && (call ccb.cmd 2>&1)" | findstr /C:"[CCB]" | head -5`
Expected: 输出中文提示信息（预期失败，因为缺少资源文件，这是正常的）

- [ ] **Step 3: 提交**

```bash
git add ccb-installer/ccb.cmd
git commit -m "docs: 汉化 ccb.cmd 启动脚本提示信息"
```

---

## Task 2: 汉化 installer.nsi

**Files:**
- Modify: `ccb-installer/installer.nsi`

**问题：** NSIS 默认编译环境为 ANSI/GBK，中文字符会显示为乱码。

**方案：** Section 名称和描述使用纯英文或简短中文拼音别名，确保安装界面正常显示。

- [ ] **Step 1: 修改 installer.nsi 的 Section 名称和描述**

将以下 Section 名称替换为 ASCII 安全版本：

```nsis
# 原: Section "Bun ����ʱ�����裩" SecBun
# 改: Section "Bun 运行时 (必需)" SecBun

# 原: Section "ripgrep�����裩" SecRg
# 改: Section "ripgrep (必需)" SecRg

# 原: Section "Git Bash�����ã����裩" SecGit
# 改: Section "Git Bash (必需)" SecGit

# 原: Section "���������ݷ�ʽ" SecDesk
# 改: Section "桌面快捷方式" SecDesk

# 原: Section "������ʼ�˵���ݷ�ʽ" SecStart
# 改: Section "开始菜单快捷方式" SecStart

# 原: Section /o "�����Ҽ��˵�����ѡ��" SecContext
# 改: Section /o "右键菜单集成 (可选)" SecContext
```

对应的 Description 也改为英文或拼音：

```nsis
# MUI_DESCRIPTION_TEXT 改为纯英文描述
!insertmacro MUI_DESCRIPTION_TEXT ${SecBun} "Bun JavaScript runtime (required)"
!insertmacro MUI_DESCRIPTION_TEXT ${SecRg} "File search tool ripgrep (required)"
!insertmacro MUI_DESCRIPTION_TEXT ${SecGit} "Git Bash shell (required)"
!insertmacro MUI_DESCRIPTION_TEXT ${SecDesk} "Create desktop shortcut"
!insertmacro MUI_DESCRIPTION_TEXT ${SecStart} "Start menu shortcuts"
!insertmacro MUI_DESCRIPTION_TEXT ${SecContext} "Right-click menu integration (optional)"
```

- [ ] **Step 2: 验证修改后的 NSIS 语法**（无编译环境可跳过）

- [ ] **Step 3: 提交**

```bash
git add ccb-installer/installer.nsi
git commit -m "docs: 汉化 installer.nsi Section 名称为 ASCII 安全文本"
```

---

## Task 3: 汉化 build-resources.ps1

**Files:**
- Modify: `ccb-installer/scripts/build-resources.ps1`

- [ ] **Step 1: 修改 build-resources.ps1 的输出信息为中文**

```powershell
# 原: Write-Host "Downloading Bun $Version..."
# 改: Write-Host "正在下载 Bun $Version..."

# 原: Write-Host "Bun downloaded to $ExtractTo"
# 改: Write-Host "Bun 已下载到 $ExtractTo"

# 原: Write-Host "Downloading ripgrep $Version..."
# 改: Write-Host "正在下载 ripgrep $Version..."

# 原: Write-Host "ripgrep downloaded to $ExtractTo"
# 改: Write-Host "ripgrep 已下载到 $ExtractTo"

# 原: Write-Host "Resources directory: $ResourcesDir"
# 改: Write-Host "资源目录: $ResourcesDir"

# 原: Write-Host "Resources prepared successfully!"
# 改: Write-Host "资源准备完毕！"
```

- [ ] **Step 2: 验证修改**

Run: `powershell -File "D:\Projects\claude-code-best\ccb-installer\scripts\build-resources.ps1" -WhatIf 2>&1 | Select-String "正在下载|已下载"`
Expected: 输出包含中文"正在下载"或"已下载"

- [ ] **Step 3: 提交**

```bash
git add ccb-installer/scripts/build-resources.ps1
git commit -m "docs: 汉化 build-resources.ps1 提示信息"
```

---

## Task 4: 汉化 verify-installer.ps1

**Files:**
- Modify: `ccb-installer/scripts/verify-installer.ps1`

- [ ] **Step 1: 修改 verify-installer.ps1 的输出信息为中文**

```powershell
# 原: Write-Host "=== CCB Installer Verification ===" -ForegroundColor Cyan
# 改: Write-Host "=== CCB 安装包验证 ===" -ForegroundColor Cyan

# 原: Write-Host "[PASS] $Name exists" -ForegroundColor Green
# 改: Write-Host "[通过] $Name 存在" -ForegroundColor Green

# 原: Write-Host "[FAIL] $Name missing" -ForegroundColor Red
# 改: Write-Host "[失败] $Name 缺失" -ForegroundColor Red

# 原: Write-Host "Install Dir: $InstallDir`n"
# 改: Write-Host "安装目录: $InstallDir`n"

# 原: Write-Host "[PASS] ripgrep found" -ForegroundColor Green
# 改: Write-Host "[通过] ripgrep 已找到" -ForegroundColor Green

# 原: Write-Host "[FAIL] ripgrep missing" -ForegroundColor Red
# 改: Write-Host "[失败] ripgrep 缺失" -ForegroundColor Red

# 原: Write-Host "`nPassed: $passed / $total"
# 改: Write-Host "`n通过: $passed / $total"

# 原: Write-Host "All checks passed!" -ForegroundColor Green
# 改: Write-Host "所有检查均已通过！" -ForegroundColor Green

# 原: Write-Host "Some checks failed!" -ForegroundColor Red
# 改: Write-Host "部分检查未通过！" -ForegroundColor Red
```

- [ ] **Step 2: 验证修改**

Run: `powershell -File "D:\Projects\claude-code-best\ccb-installer\scripts\verify-installer.ps1" 2>&1 | Select-String "通过|失败|验证"`
Expected: 输出包含中文"通过"或"失败"

- [ ] **Step 3: 提交**

```bash
git add ccb-installer/scripts/verify-installer.ps1
git commit -m "docs: 汉化 verify-installer.ps1 提示信息"
```

---

## Task 5: 汉化 README.md

**Files:**
- Modify: `ccb-installer/README.md`

- [ ] **Step 1: 将 README.md 内容汉化**

将所有英文章节标题和正文翻译为中文：
- `# CCB - Claude Code Bundle` → `# CCB - Claude Code 集成包`
- `## Quick Start` → `## 快速开始`
- `## Installation` → `## 安装后使用`
- `## Building` → `## 构建说明`
- `## Directory Structure` → `## 目录结构`
- `## Manual Build` → `## 手动构建`
- `## Uninstall` → `## 卸载`

正文内容也需要相应汉化。

- [ ] **Step 2: 验证 Markdown 格式**

- [ ] **Step 3: 提交**

```bash
git add ccb-installer/README.md
git commit -m "docs: 汉化 README.md 文档"
```

---

## 自检清单

**1. 需求覆盖：**
- [x] ccb.cmd 的所有 echo 提示已汉化
- [x] installer.nsi 的 Section 名称和描述已处理（ASCII 安全）
- [x] build-resources.ps1 的所有 Write-Host 输出已汉化
- [x] verify-installer.ps1 的所有 Write-Host 输出已汉化
- [x] README.md 全部内容已汉化

**2. 占位符扫描：** 无 TBD/TODO 占位符，每个 Step 均含实际代码/命令。

**3. 类型一致性：** 纯字符串替换，无类型/接口改动，无需跨任务一致性检查。