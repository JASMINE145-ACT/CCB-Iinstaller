# CCB 一键安装包实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建 CCB 一键安装包，使普通用户双击 exe 即可完成安装和配置

**Architecture:** 
- 安装器: NSIS (Nullsoft Scriptable Install System)
- 入口脚本: `ccb.cmd` (batch 脚本，临时 PATH 注入)
- 配置隔离: `%LOCALAPPDATA%\CCB\.claude` (独立于系统配置)
- 安装路径: `%LOCALAPPDATA%\Programs\CCB` (用户可选择)

**Tech Stack:** NSIS, Bun, PowerShell, Batch

---

## 文件结构

```
ccb-installer/
├── installer.nsi              # NSIS 主安装脚本
├── resources/                  # 内嵌资源
│   ├── bun/                    # Bun 运行时 (~50MB)
│   ├── ripgrep/                # ripgrep (~15MB)
│   └── python/                  # Python (可选, ~30MB)
└── scripts/
    ├── build-resources.ps1     # 下载/准备资源
    └── verify-installer.ps1     # 验证脚本
```

---

## Task 1: 准备资源目录结构

**Files:**
- Create: `ccb-installer/resources/bun/.gitkeep`
- Create: `ccb-installer/resources/ripgrep/.gitkeep`
- Create: `ccb-installer/resources/python/.gitkeep`
- Create: `ccb-installer/scripts/build-resources.ps1`
- Create: `ccb-installer/scripts/verify-installer.ps1`

- [ ] **Step 1: 创建目录结构**

Run: 
```bash
mkdir -p ccb-installer/resources/{bun,ripgrep,python}
mkdir -p ccb-installer/scripts
```

Expected: 目录创建成功

- [ ] **Step 2: 创建 .gitkeep 占位文件**

Run:
```bash
touch ccb-installer/resources/bun/.gitkeep
touch ccb-installer/resources/ripgrep/.gitkeep
touch ccb-installer/resources/python/.gitkeep
```

- [ ] **Step 3: 创建资源下载脚本**

Create: `ccb-installer/scripts/build-resources.ps1`

```powershell
#!/usr/bin/env pwsh
# build-resources.ps1 - 下载 CCB 安装包所需资源

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$ResourcesDir = Split-Path -Parent $PSCommandPath

function Get-Bun {
    $Version = "1.2.18"
    $Url = "https://github.com/oven-sh/bun/releases/download/bun-v$Version/bun-windows-x64.zip"
    $Output = "$ResourcesDir/bun/bun-windows-x64.zip"
    
    Write-Host "Downloading Bun $Version..."
    Invoke-WebRequest -Uri $Url -OutFile $Output
    Expand-Archive -Path $Output -DestinationPath "$ResourcesDir/bun" -Force
    Remove-Item $Output -Force
    Write-Host "Bun downloaded to $ResourcesDir/bun"
}

function Get-Ripgrep {
    $Version = "14.1.1"
    $Url = "https://github.com/BurntSushi/ripgrep/releases/download/$Version/ripgrep-$Version-x86_64-pc-windows-msvc.zip"
    $Output = "$ResourcesDir/ripgrep/ripgrep.zip"
    
    Write-Host "Downloading ripgrep $Version..."
    Invoke-WebRequest -Uri $Url -OutFile $Output
    Expand-Archive -Path $Output -DestinationPath "$ResourcesDir/ripgrep" -Force
    Remove-Item $Output -Force
    Write-Host "ripgrep downloaded to $ResourcesDir/ripgrep"
}

Get-Bun
Get-Ripgrep
Write-Host "Resources prepared successfully!"
```

- [ ] **Step 4: 创建验证脚本**

Create: `ccb-installer/scripts/verify-installer.ps1`

```powershell
#!/usr/bin/env pwsh
# verify-installer.ps1 - 验证安装包完整性

param(
    [string]$InstallDir = "$env:LOCALAPPDATA\Programs\CCB"
)

$ErrorActionPreference = "Stop"
$results = @{}

function Test-File {
    param([string]$Path, [string]$Name)
    $exists = Test-Path $Path
    $results[$Name] = $exists
    if ($exists) {
        Write-Host "[PASS] $Name exists" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $Name missing" -ForegroundColor Red
    }
}

Write-Host "=== CCB Installer Verification ===" -ForegroundColor Cyan
Write-Host "Install Dir: $InstallDir`n"

Test-File "$InstallDir\bun\bun.exe" "Bun Runtime"
Test-File "$InstallDir\dist\cli.js" "CCB Entry (cli.js)"
Test-File "$InstallDir\ccb.cmd" "Entry Script (ccb.cmd)"

$rgPath = Get-ChildItem "$InstallDir\vendor\ripgrep\rg.exe" -ErrorAction SilentlyContinue
if ($rgPath) {
    Write-Host "[PASS] ripgrep found" -ForegroundColor Green
    $results["ripgrep"] = $true
} else {
    Write-Host "[FAIL] ripgrep missing" -ForegroundColor Red
    $results["ripgrep"] = $false
}

$passed = ($results.Values | Where-Object { $_ -eq $true }).Count
$total = $results.Count
Write-Host "`nPassed: $passed / $total"

if ($passed -eq $total) {
    Write-Host "All checks passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some checks failed!" -ForegroundColor Red
    exit 1
}
```

- [ ] **Step 5: 提交**

```bash
git add ccb-installer/
git commit -m "feat: add CCB installer directory structure and scripts"
```

---

## Task 2: 创建 NSIS 安装脚本

**Files:**
- Create: `ccb-installer/installer.nsi`

- [ ] **Step 1: 创建 NSIS 主脚本**

Create: `ccb-installer/installer.nsi`

```nsis
; CCB Installer - NSIS Script
!include "MUI2.nsh"

!define APPNAME "CCB"
!define COMPANYNAME "CCB"
!define DESCRIPTION "Claude Code Bundle"
!define VERSIONMAJOR 1
!define VERSIONMINOR 0
!define VERSIONBUILD 0

Name "${APPNAME}"
OutFile "CCB-Setup-${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}.exe"
InstallDir "$LOCALAPPDATA\Programs\CCB"
InstallDirRegKey HKCU "Software\${COMPANYNAME}\${APPNAME}" "InstallDir"
RequestExecutionLevel user

!define MUI_ABORTWARNING
!insertmacro MUI_LANGUAGE "English"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; 组件定义
Section "Bun Runtime (Required)" SecBun
    SectionIn RO
    SetOutPath "$INSTDIR\bun"
    File /r "resources\bun\*.*"
SectionEnd

Section "ripgrep (Required)" SecRg
    SectionIn RO
    SetOutPath "$INSTDIR\vendor\ripgrep"
    File /r "resources\ripgrep\*.*"
SectionEnd

Section "Python for MCP (Optional)" SecPython
    SetOutPath "$INSTDIR\python"
    File /r "resources\python\*.*"
SectionEnd

Section "Create Desktop Shortcut" SecDesk
    CreateShortCut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\ccb.cmd"
SectionEnd

Section "Create Start Menu Shortcut" SecStart
    CreateDirectory "$SMPROGRAMS\${APPNAME}"
    CreateShortCut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\ccb.cmd"
    CreateShortCut "$SMPROGRAMS\${APPNAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe"
SectionEnd

; 安装逻辑
Section "-Main Installation"
    WriteRegStr HKCU "Software\${COMPANYNAME}\${APPNAME}" "InstallDir" "$INSTDIR"
    CreateDirectory "$INSTDIR"
    CreateDirectory "$INSTDIR\bun"
    CreateDirectory "$INSTDIR\vendor\ripgrep"
    SetOutPath "$INSTDIR"
    File /r "..\dist\*.*"
    File "..\ccb.cmd"
    WriteUninstaller "$INSTDIR\uninstall.exe"
    WriteRegStr HKCU "Software\${COMPANYNAME}\${APPNAME}" "" "${DESCRIPTION}"
SectionEnd

; 卸载逻辑
Section "Uninstall"
    RMDir /r "$INSTDIR"
    Delete "$DESKTOP\${APPNAME}.lnk"
    Delete "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk"
    Delete "$SMPROGRAMS\${APPNAME}\Uninstall.lnk"
    RMDir "$SMPROGRAMS\${APPNAME}"
    DeleteRegKey HKCU "Software\${COMPANYNAME}\${APPNAME}"
    ; 保留配置目录
SectionEnd

VIProductVersion "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}.0"
VIAddVersionKey "ProductName" "${APPNAME}"
VIAddVersionKey "CompanyName" "${COMPANYNAME}"
```

- [ ] **Step 2: 提交**

```bash
git add ccb-installer/installer.nsi
git commit -m "feat: add NSIS installer script"
```

---

## Task 3: 创建入口脚本模板

**Files:**
- Create: `ccb-installer/ccb-template.cmd`

- [ ] **Step 1: 创建模板**

Create: `ccb-installer/ccb-template.cmd`

```cmd
@echo off
REM ===== CCB 入口脚本 =====

set "CCB_CONFIG_DIR=%LOCALAPPDATA%\CCB\.claude"
set "CCB_INSTALL_DIR=%LOCALAPPDATA%\Programs\CCB"

REM 检测首次运行
if not exist "%CCB_CONFIG_DIR%\settings.json" (
    set "CCB_FIRST_RUN=1"
)

REM 临时注入 bun 到 PATH
set "PATH=%CCB_INSTALL_DIR%\bun;%PATH%"
cd /d "%CCB_INSTALL_DIR%"

REM 运行 CCB (使用 cli.js 主入口)
"%CCB_INSTALL_DIR%\bun\bun.exe" run dist/cli.js %*
```

- [ ] **Step 2: 提交**

```bash
git add ccb-installer/ccb-template.cmd
git commit -m "feat: add CCB entry script template"
```

---

## Task 4: 创建文档

**Files:**
- Create: `ccb-installer/README.md`
- Create: `ccb-installer/Makefile`

- [ ] **Step 1: 创建 README**

Create: `ccb-installer/README.md`

```markdown
# CCB Installer

CCB 一键安装包构建系统。

## 构建步骤

```bash
# 1. 下载资源
pwsh -ExecutionPolicy Bypass -File scripts/build-resources.ps1

# 2. 构建安装包
makensis installer.nsi

# 3. 验证
pwsh -ExecutionPolicy Bypass -File scripts/verify-installer.ps1
```

## 使用 Make

```bash
make resources    # 下载资源
make installer    # 构建安装包
make test         # 验证
```

## 注意事项

- 安装路径: `%LOCALAPPDATA%\Programs\CCB`
- 配置路径: `%LOCALAPPDATA%\CCB\.claude`
- 卸载保留配置目录
- 不修改系统 PATH
```

- [ ] **Step 2: 创建 Makefile**

Create: `ccb-installer/Makefile`

```makefile
.PHONY: all resources installer test clean

NSIS = makensis

all: resources installer

resources:
	pwsh -ExecutionPolicy Bypass -File scripts/build-resources.ps1

installer: resources
	$(NSIS) installer.nsi

test:
	pwsh -ExecutionPolicy Bypass -File scripts/verify-installer.ps1

clean:
	rm -rf resources/bun/*
	rm -rf resources/ripgrep/*
	rm -f CCB-Setup-*.exe
```

- [ ] **Step 3: 提交**

```bash
git add ccb-installer/README.md ccb-installer/Makefile
git commit -m "docs: add installer README and Makefile"
```

---

## Task 5: CI/CD 集成

**Files:**
- Create: `.github/workflows/release-installer.yml`

- [ ] **Step 1: 创建工作流**

Create: `.github/workflows/release-installer.yml`

```yaml
name: Build CCB Installer

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    runs-on: windows-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Install NSIS
        run: choco install nsis -y
        
      - name: Download resources
        shell: pwsh
        run: |
          cd ccb-installer
          .\scripts\build-resources.ps1
          
      - name: Build installer
        run: |
          cd ccb-installer
          & "C:\Program Files (x86)\NSIS\makensis.exe" installer.nsi
          
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: CCB-Setup
          path: ccb-installer/*.exe
```

- [ ] **Step 2: 提交**

```bash
git add .github/workflows/release-installer.yml
git commit -m "ci: add installer build workflow"
```

---

## 验证清单

- [ ] 安装包生成成功
- [ ] 资源文件完整 (bun.exe, rg.exe)
- [ ] 快捷方式创建正常
- [ ] 卸载后配置目录保留

## 依赖项

1. NSIS: https://nsis.sourceforge.io/
2. Bun: https://bun.sh/
3. ripgrep: https://github.com/BurntSushi/ripgrep