# CCB 终端鼠标 / 滑轮问题解决方案记录

日期：2026-05-29

---

## 背景

CCB（Claude Code Bundle）在 Windows 上用 `ccb.cmd` 启动，支持多种终端。
用户反映：**无论哪个模式，鼠标滑轮不能滚动，也无法拖动选取文字**。

---

## 根因分析

### 核心矛盾：鼠标追踪 ON/OFF 的影响

| 状态 | 滑轮 | 拖动选字 |
|---|---|---|
| 鼠标追踪 **ON** | 事件发给 App（TUI 处理） | ❌ 终端无法选字（需 Shift+拖） |
| 鼠标追踪 **OFF** | 终端原生 scrollback | ✅ 直接拖动 |

### 原始 Bug

`ccb.cmd` 在普通 CMD / ConHost 下：
- 全屏（alternate screen）= OFF（`CLAUDE_CODE_NO_FLICKER=0`）
- 鼠标追踪 = ON（未设置 `CLAUDE_CODE_DISABLE_MOUSE`）

**结果**：滑轮事件发给 App，但 App 没有全屏画布接不住；终端也被剥夺了原生控制权 → 滑轮和选字**全部失效**。

`ccb-flat.cmd` 同理：明确关了全屏，但仍保留鼠标追踪，导致同样失效。

---

## 解决方案

### 修复 1：`ccb.cmd` — 所有非 WT/VSCode 路径关掉鼠标追踪

**原逻辑**（错误）：
```cmd
set "CLAUDE_CODE_DISABLE_MOUSE="    :: 空 = 不禁用
set "CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL="
set "CLAUDE_CODE_DISABLE_TUI_RESIZE="
```

**修复后**：
```cmd
set "CLAUDE_CODE_NO_FLICKER=0"
if defined WT_SESSION set "FORCE_CODE_TERMINAL=1"
if /i "%TERM_PROGRAM%"=="vscode" set "FORCE_CODE_TERMINAL=1"

if not "%CCB_SAFE_MODE%"=="1" if not "%CCB_FLAT_MODE%"=="1" (
    set "CLAUDE_CODE_DISABLE_MOUSE=1"
    set "CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL=1"
    set "CLAUDE_CODE_DISABLE_TUI_RESIZE=1"
)
```

全屏关闭（保留终端 scrollback），鼠标追踪关闭（终端原生接管滑轮和选字）。

### 修复 2：`ccb-flat.cmd` — 同样关掉鼠标追踪

```cmd
set "CLAUDE_CODE_DISABLE_MOUSE=1"    :: 之前是空值，错误
```

---

## 副作用：状态栏消失

设置 `CLAUDE_CODE_NO_FLICKER=0` 后，Claude Code TUI 的底部状态栏行为改变：

- `isFullscreenEnvEnabled()` 返回 `false`
- 状态栏在无活跃内容时返回 `null`（整行消失）
- `(shift+tab to cycle)` 等提示文字不再渲染

**权衡**：用户优先选择"滑轮 scrollback + 直接拖动选字"，接受状态栏提示消失。

**补救**：新增 `/modo` 斜杠指令，让用户随时查看模式说明和 `Shift+Tab` 切换方法。

---

## 坑：测试脚本断言方向相反

`test-terminal-local.ps1` 原有断言：
```powershell
if (Select-String -LiteralPath $entry -Pattern 'set "CLAUDE_CODE_DISABLE_MOUSE=1"' -Quiet) {
    throw "Normal ccb.cmd must not disable mouse; use ccb-safe.cmd for compatibility."
}
```

这条断言和修复方向**完全相反**，导致测试一直失败。

**解决**：删除该断言，改为检查 `WT_SESSION` 条件门控是否存在：
```powershell
if (-not (Select-String -LiteralPath $entry -SimpleMatch "WT_SESSION" -Quiet)) {
    throw "Normal ccb.cmd must gate mouse/scroll flags on WT_SESSION."
}
```

同时将 `ccb-flat.cmd` 的断言改为**要求** `CLAUDE_CODE_DISABLE_MOUSE=1`：
```powershell
if (-not (Select-String -LiteralPath $flatEntry -SimpleMatch 'CLAUDE_CODE_DISABLE_MOUSE=1' -Quiet)) {
    throw "Staged ccb-flat.cmd must set CLAUDE_CODE_DISABLE_MOUSE=1."
}
```

---

## 坑：NSIS 不接受非 ASCII 字符

`installer.nsi` 注释里写了 em dash（`—`），导致编译失败：

```
Bad text encoding: installer.nsi:50
```

**解决**：将 `—` 改为 ASCII 连字符 `-`。  
**记住**：`installer.nsi` 所有注释和字符串必须严格 ASCII。

---

## 坑：`/modo` 命令文件需要重启才生效

新增 `~/.claude/commands/modo.md` 后，当前运行的 CCB 会话**不会自动发现**，`/modo` 不会出现在命令列表里。

**解决**：重启 CCB 后生效。

部署路径：
- 全局用户目录：`C:\Users\<用户名>\.claude\commands\modo.md`
- CCB 专属目录：`%LOCALAPPDATA%\CCB\.claude\commands\modo.md`

---

## 坑：测试脚本 wt.exe 参数中 `&&` 泄漏进 LOCALAPPDATA

**现象**：测试沙盒启动后出现两行"系统找不到指定的路径"，日志路径显示为：

```
D:\tmp\ccb-terminal-test\profile&&\CCB\logs\debug-xxxx.log
```

`&&` 混入了 LOCALAPPDATA 路径，导致目录不存在。

**根因**：测试脚本用字符串拼接方式给 wt.exe 传参：

```powershell
$wtArgs = ('-d "{0}" cmd /k "set ""LOCALAPPDATA={1}""&& set CCB_DISABLE_DEBUG_LOG=1&& ""{2}"""' -f ...)
Start-Process -FilePath $wt.Source -ArgumentList $wtArgs
```

wt.exe 在解析参数时，`""&&` 的引号边界被处理后，`&&` 作为字面字符残留进了 `set` 的值。

**解决**：用临时 `.cmd` 文件代替内联 `&&` 链：

```powershell
$tempLauncher = Join-Path $env:TEMP ("ccb-test-" + [System.IO.Path]::GetRandomFileName().Replace('.','') + ".cmd")
@"
@echo off
set "LOCALAPPDATA=$ProfileDir"
set "CCB_DISABLE_DEBUG_LOG=1"
call "$LauncherPath"
"@ | Set-Content -Path $tempLauncher -Encoding ASCII
$wtArgs = "-d `"$WorkingDir`" cmd /k `"$tempLauncher`""
Start-Process -FilePath $wt.Source -ArgumentList $wtArgs | Out-Null
```

**经验**：通过 `Start-Process` 向 wt.exe 传多条 CMD 命令时，**不要用 `&&` 内联拼接**，改用临时 batch 文件。

---

## 坑：测试沙盒缺少 commands 目录，`/modo` 不出现

**现象**：在测试沙盒启动的 CCB 里输入 `/modo`，命令列表里没有该命令。

**根因**：测试脚本只复制了 `settings.json` 到沙盒 profile，没有复制 `resources/commands/` 目录，导致沙盒的 `CLAUDE_CONFIG_DIR` 下没有 `commands/modo.md`。

**解决**：在测试脚本 profile 初始化阶段添加命令目录复制：

```powershell
$commandsDest = Join-Path $ConfigDir "commands"
New-Item -ItemType Directory -Force -Path $commandsDest | Out-Null
Copy-Item -LiteralPath (Join-Path $InstallerDir "resources\commands\modo.md") -Destination $commandsDest -Force
```

同时在 `$requiredSources` 检查列表里加入 `resources\commands\modo.md`，确保构建前就发现缺失。

**经验**：测试脚本的沙盒 profile 要与安装器实际部署的目录结构保持一致，安装器部署了什么，测试沙盒也要同步。

---

## 最终各模式行为

| 启动方式 | 滑轮 | 拖动选字 | 状态栏 |
|---|---|---|---|
| `ccb.cmd`（WT / CMD） | ✅ 终端 scrollback | ✅ 直接拖动 | 模式切换时可见 |
| `ccb-flat.cmd` | ✅ 终端 scrollback | ✅ 直接拖动 | 同上 |
| `ccb-safe.cmd` | ✅ 终端 scrollback | ✅ 直接拖动 | 同上 |
| `ccb-text.cmd` | ✅ 终端 scrollback | ✅ 直接拖动 | 无 TUI |

模式切换：`Shift+Tab` 循环切换；输入 `/modo` 查看说明。
