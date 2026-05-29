# CCB 安装包问题修复记录

> **日期:** 2026-05-19
> **修复日期:** 2026-05-20
> **状态:** ✅ 全部完成，安装包已构建

---

## 问题汇总

| # | 问题 | 严重性 | 状态 |
|---|------|--------|------|
| 1 | 内置 Git Bash 不完整，缺 bash.exe | 高 | ✅ 已修复（已补全 bash.exe + 5个DLL） |
| 2 | build.ps1 的 Git 检测仅用 Test-Path，未实际执行验证 | 中 | ✅ 已修复 |
| 3 | ccb.cmd 的 Bun 路径指向错误目录 | 高 | ✅ 已修复 |
| 4 | 系统 Git 检测的路径推导有误 | 中 | ✅ 已修复 |

---

## 问题 1：内置 Git Bash 不完整

### 现状

当前 `vendor/git/` 只包含了最少的一组文件（共 26MB）：

```
vendor/git/
├── bin/bash.exe         (48KB)
├── bin/git.exe          (48KB)
├── bin/sh.exe          (48KB)
├── mingw64/bin/git.exe         (4MB)
├── mingw64/bin/libiconv-2.dll  (1.1MB)
├── mingw64/bin/libintl-8.dll   (212KB)
├── mingw64/bin/libpcre2-8-0.dll (692KB)
├── mingw64/bin/libwinpthread-1.dll (60KB)
├── mingw64/bin/zlib1.dll  (120KB)
└── usr/bin/msys-2.0.dll  (19MB)
```

### 问题

运行 `vendor\git\bin\bash.exe -lc "git --version"` 会失败，因为缺少其他必要的 dll 和资源文件。

### 修复方案

准备**完整的 MinGit** 目录，不要只复制少量 dll。建议从以下来源之一获取：

- **MinGit 官方压缩包**（推荐）：
  - 下载 `MinGit-2.47.0.2-64-bit.zip` from https://github.com/git-for-windows/git/releases
  - 解压后直接作为 `vendor/git/` 的内容
  - 约 45MB，比当前方案大但完全可用

- **或者复制完整的本地 Git 安装**（不推荐，体积太大）

### 验收标准

```
%CCB_INSTALL_DIR%\vendor\git\bin\bash.exe -lc "git --version"
```
必须成功输出类似 `git version 2.47.0.windows.1`

---

## 问题 2：build.ps1 的 Git 检测仅用 Test-Path

### 现状

`build.ps1` 第 60-61 行：
```powershell
$GitSrc = "$InstallerDir\vendor\git\bin\bash.exe"
if (Test-Path $GitSrc) {
    Write-Host "    [OK] Git Bash found ($GitSrc)"
```

### 问题

只要文件存在就认为通过，没有实际验证 bash.exe 能否运行。

### 修复方案

```powershell
$GitSrc = "$InstallerDir\vendor\git\bin\bash.exe"
if (Test-Path $GitSrc) {
    try {
        $output = & $GitSrc -lc "git --version" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    [OK] Git Bash verified: $output"
        } else {
            Write-Host "    [FAIL] Git Bash exists but cannot run git: $output"
            exit 1
        }
    } catch {
        Write-Host "    [FAIL] Git Bash exists but execution failed: $_"
        exit 1
    }
} else {
    Write-Host "    [ERROR] Git Bash not found: $GitSrc"
    exit 1
}
```

---

## 问题 3：ccb.cmd 的 Bun 路径指向错误目录

### 现状

`ccb.cmd` 第 70 行：
```batch
set "PATH=%CCB_INSTALL_DIR%\bun;%CCB_INSTALL_DIR%\vendor\ripgrep;%PATH%"
```

第 76 行检查：
```batch
if not exist "%CCB_INSTALL_DIR%\bun\bun.exe"
```

### 问题

NSIS 安装脚本将 Bun 安装到 `$INSTDIR\vendor\bun`，但 `ccb.cmd` 检查的是 `$INSTDIR\bun`。路径不匹配。

### 修复方案

修改 `ccb.cmd` 中的所有 `bun` 路径为 `vendor\bun`：

```batch
:: 修正前
set "PATH=%CCB_INSTALL_DIR%\bun;..."
if not exist "%CCB_INSTALL_DIR%\bun\bun.exe"

:: 修正后
set "PATH=%CCB_INSTALL_DIR%\vendor\bun;..."
if not exist "%CCB_INSTALL_DIR%\vendor\bun\bun.exe"
```

同时修改：
- 第 103 行：`"%CCB_INSTALL_DIR%\bun\bun.exe"` → `"%CCB_INSTALL_DIR%\vendor\bun\bun.exe"`

---

## 问题 4：系统 Git 检测的路径推导有误

### 现状

`ccb.cmd` 第 38-44 行：
```batch
:: GIT_DIR = .../Git/cmd/  -> go up two levels to Git/
for %%i in ("!GIT_DIR!.") do set "GIT_ROOT=%%~fi"
set "CCB_GIT_BASH_PATH=!GIT_ROOT!\usr\bin\bash.exe"
```

### 问题

Git for Windows 标准安装结构：
- `C:\Program Files\Git\cmd\git.exe` ← git 在 cmd 目录
- `C:\Program Files\Git\bin\bash.exe` ← bash 在 bin 目录（不是 usr\bin）

当前推导 `Git\cmd\` → `Git\` → `Git\usr\bin\bash.exe` 是错误的。

### 修复方案

```batch
:: 修正前（错误）
set "CCB_GIT_BASH_PATH=!GIT_ROOT!\usr\bin\bash.exe"

:: 修正后（正确）
set "CCB_GIT_BASH_PATH=!GIT_ROOT!\bin\bash.exe"
```

同时注意：内置 Git 的 `bin/bash.exe` 是 MSYS2 环境，可以独立工作；而系统 Git 的 `bin/bash.exe` 依赖 `usr/bin/msys-2.0.dll`。如果要完全兼容两种场景，内置 Git 也需要完整目录结构。

---

## 修复后的预期结构

```
CCB 安装目录
├── ccb.cmd                      ← 入口脚本（需修复路径）
├── dist/                        ← 业务代码
│   ├── cli.js
│   └── chunk-*.js
└── vendor/
    ├── bun/
    │   └── bun.exe              ← Bun 运行时（NSIS 打包到此处）
    ├── ripgrep/
    │   └── x64-win32/
    │       └── rg.exe
    └── git/                     ← 完整 MinGit（需重新准备）
        ├── bin/
        │   ├── bash.exe
        │   ├── git.exe
        │   └── sh.exe
        ├── mingw64/
        │   ├── bin/
        │   │   ├── git.exe
        │   │   └── *.dll
        │   └── libexec/
        └── usr/
            └── bin/
                └── msys-2.0.dll
```

---

## 修复任务清单

- [x] **Task 1:** 补充 `usr/bin/bash.exe` 及必要 DLL — MinGit 不含 bash，需从完整 Git 复制
- [x] **Task 2:** 修改 `build.ps1` 的 Git 检测，实际执行 `bash.exe -lc "git --version"` 验证
- [x] **Task 3:** 修改 `ccb.cmd` 的所有 `bun` 路径为 `vendor\bun`
- [x] **Task 4:** 修正 `ccb.cmd` 中系统 Git 检测的路径推导（`usr\bin` → `bin`）
- [x] **Task 5:** 重新构建安装包 (96MB) ✅

---

## 修复详情

### Task 2: build.ps1 Git 检测增强

**修复前（第 60-73 行）：**
```powershell
if (Test-Path $GitSrc) {
    Write-Host "    [OK] Git Bash found ($GitSrc)"
    ...
}
```

**修复后：** 实际执行 `& $GitSrc -lc "git --version"` 并验证退出码。失败时给出 MinGit 下载链接。

### Task 3: ccb.cmd Bun 路径修正

| 位置 | 修复前 | 修复后 |
|------|--------|--------|
| PATH 设置 (L70) | `%CCB_INSTALL_DIR%\bun` | `%CCB_INSTALL_DIR%\vendor\bun` |
| Bun 检测 (L76-77) | `%CCB_INSTALL_DIR%\bun\bun.exe` | `%CCB_INSTALL_DIR%\vendor\bun\bun.exe` |
| 启动命令 (L103) | `%CCB_INSTALL_DIR%\bun\bun.exe` | `%CCB_INSTALL_DIR%\vendor\bun\bun.exe` |

### Task 4: ccb.cmd 系统 Git 路径推导修正

| 位置 | 修复前 | 修复后 |
|------|--------|--------|
| bash.exe 路径 (L44) | `!GIT_ROOT!\usr\bin\bash.exe` | `!GIT_ROOT!\bin\bash.exe` |
| 注释 (L40) | `bash.exe is in Git/usr/bin` | `bash.exe is in Git/bin` |

---

## 手动操作：补充 bash.exe

> ⚠️ **重要发现**：MinGit 官方包不包含 `bash.exe`！`bin/bash.exe` 是 launcher stub，需 `usr/bin/bash.exe` 才能工作。

**已完成的操作（2026-05-20）：**
从系统 Git (`D:\Git\usr\bin\`) 复制了以下文件到 `vendor/git/usr/bin/`：
- `bash.exe` (2.5MB)
- `msys-2.0.dll` (19MB)
- `msys-readline8.dll` (264KB)
- `msys-iconv-2.dll` (1.1MB)
- `msys-ncursesw6.dll` (341KB)
- `msys-gcc_s-seh-1.dll` (109KB)

**验证命令：**
```powershell
.\vendor\git\bin\bash.exe -lc "git --version"
# 输出: git version 2.54.0.windows.1
```

**vendor/git/ 体积：** 94MB → 112MB（+18MB）

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `ccb-installer/ccb.cmd` | 入口脚本，已修复路径 |
| `ccb-installer/build.ps1` | 构建脚本，已修复 Git 检测 |
| `ccb-installer/installer.nsi` | NSIS 安装脚本 |
| `ccb-installer/vendor/git/` | 内置 Git（已补全 bash） |
| `ccb-installer/CCB-Setup-1.0.0.exe` | **新构建的安装包 (96MB)** |