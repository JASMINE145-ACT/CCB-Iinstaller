# CCB 与 CCB Lite 的关系

## 一句话结论

当前阶段，CCB Lite 和 CCB 的关系是：

**构建时共用核心，安装后相互独立。**

CCB Lite 不是完全重新开发的一套产品，也不是完整 CCB 的简单改名版。它复用 CCB 1.0.9 的核心运行时、汉化成果、MCP、Skills、Plugin、Agents/Team 能力，只是在安装包、配置目录、用户可见入口和办公预置命令上做 Lite 化。

---

## 构建时：共用核心

在开发目录中，完整版和 Lite 版共用大部分核心文件：

```text
ccb-installer/
  dist/                 # 共用 Claude Code/CCB 核心运行时与汉化后的前端/TUI 代码
  vendor/               # 共用 Bun、Git、ripgrep、MCP servers 等依赖
  scripts/              # 共用 MCP 配置、终端启动、i18n 等脚本
  resources/settings/   # 共用默认配置基线
  resources/commands/   # 共用内置 slash commands，Lite 额外加入办公命令

  installer.nsi         # 打完整版 CCB 安装包
  installer-lite.nsi    # 打 CCB Lite 安装包
  ccb.cmd               # 完整版启动脚本
  ccb-lite.cmd          # Lite 启动脚本
```

因此：

- 修改 `ccb-installer/dist` 里的汉化、TUI、agent、MCP、runtime 逻辑，会影响下一次重新打包出来的完整版和 Lite。
- 修改 `vendor` 或 MCP 服务器，也会影响下一次重新打包出来的完整版和 Lite。
- 修改 `scripts` 中的通用脚本，也可能同时影响完整版和 Lite。
- 修改 `installer.nsi` 只影响完整版安装包。
- 修改 `installer-lite.nsi` 只影响 Lite 安装包。
- 修改 `ccb.cmd` 只影响完整版启动。
- 修改 `ccb-lite.cmd` 只影响 Lite 启动。

---

## 安装后：目录独立

安装到用户电脑后，完整版和 Lite 使用不同程序目录：

```text
%LOCALAPPDATA%\Programs\CCB
%LOCALAPPDATA%\Programs\CCB-Lite
```

所以已经安装好的完整版和 Lite 不会互相覆盖程序文件。

---

## 配置与日志：相互隔离

完整版配置目录：

```text
%LOCALAPPDATA%\CCB\.claude
```

Lite 配置目录：

```text
%LOCALAPPDATA%\CCB-Lite\.claude
```

完整版日志目录：

```text
%LOCALAPPDATA%\CCB\logs
```

Lite 日志目录：

```text
%LOCALAPPDATA%\CCB-Lite\logs
```

因此：

- 完整版的登录、MCP 配置、memory、commands、agents 不会直接污染 Lite。
- Lite 的办公命令、Lite 配置、Lite memory 也不会直接污染完整版。
- 两边可以并行安装、并行测试。

---

## 对 CCB 的修改会不会影响 Lite？

分两种情况。

### 1. 已经安装好的 Lite

不会自动受影响。

你修改开发目录里的 CCB 代码后，用户电脑上已经安装好的 `CCB-Lite` 不会自动变化，除非重新安装或覆盖安装新的 Lite 安装包。

### 2. 下一次重新打包 Lite

会受影响。

因为 Lite 当前复用 `ccb-installer/dist`、`vendor`、`scripts` 等共享基线，所以你对 CCB 核心代码、汉化、agent、MCP、runtime 的修改，会进入下一次构建出来的 Lite 安装包。

这也是当前阶段刻意采用的策略：CCB 还在持续修复汉化、agents、MCP 和 runtime，Lite 应该继续继承这些修复，而不是过早分叉成另一套难维护的代码。

---

## 当前 Lite 的定位

当前 `ccb-lite1.0.9`（与完整版同核心版本号）是 **认知 Lite**，不是完全物理裁剪版。

它做的是：

- 保留 CCB 1.0.9 的核心能力
- 保留 MCP / Skills / Plugin / Agents Team
- 独立安装目录和配置目录
- 只暴露一个 Lite 主入口
- 去掉多模式快捷方式、右键菜单、组件选择页等开发者噪音
- 砍掉开发者命令 `/modo`（TUI 模式选择器）：安装器以 `File /x "modo.md"` 排除，只发办公命令
- 增加办公预置命令：`/写邮件`、`/总结`、`/会议纪要`、`/翻译`、`/写报告`、`/表格分析`、`/调研简报`、`/协作小组`
- 单一入口默认展示「最近对话」，可一键恢复历史会话（跨天继续工作），无历史时不打断
- 启动时自动清理旧日志（仅保留最近 40 个），避免 `CCB-Lite\logs` 无限膨胀

它暂时不做的是：

- 不单独 fork 一份 dist
- 不大规模删除 runtime 能力
- 不砍 MCP / Skills / Plugin / Agents Team
- 不为了安装包体积优先牺牲稳定性

---

## 后续演进建议

短期建议继续保持：

```text
共用核心 + 独立安装器 + 独立配置目录
```

这样 CCB 的修复可以继续同步给 Lite。

等完整版 CCB 的汉化、MCP、agents/team、plugin/skills 系统稳定后，再考虑是否做更彻底的物理裁剪：

- 独立 Lite dist
- 独立 Lite command registry
- 独立 Lite 默认 agents
- 独立 Lite plugin/skill 市场
- 更小的安装包体积

但在当前阶段，优先级应该是：

```text
稳定性 > 办公体验 > 安装包体积
```

---

## 终端界面与完整版对齐（1.0.9）

Lite 与完整版共用 `dist`、启动环境变量（`FORCE_COLOR`、`COLORTERM=truecolor`、`theme: dark`）和 Windows Terminal Fragment 路径（`%LOCALAPPDATA%\Microsoft\Windows Terminal\Fragments\CCB\ccb.json`）。

### 白屏原因（已修复）

早期 Lite 安装包存在两点差异，导致 TUI 在**白底终端**上显示，而完整版 1.0.9 为深色：

1. **未执行安装后终端对齐**：完整版 `installer.nsi` 会运行 `install-wt-fragment.ps1` + `fix-terminal-launcher.ps1`；旧版 `installer-lite.nsi` 未运行，桌面快捷方式直接指向 `ccb-lite.cmd`，启动时经 WT 的 **CCB Light**（`#FFFFFF` 背景）配置。
2. **Fragment 配色**：`install-wt-fragment.ps1` 曾使用 `CCB Light` 白底方案，与 `settings.json` 中 `theme: dark` 不一致。

### 当前对齐策略

| 项目 | 完整版 CCB 1.0.9 | CCB Lite 1.0.9 |
|------|------------------|----------------|
| 核心 `dist` / 汉化 | 共用 | 共用 |
| TUI `theme` | `dark`（`ensure-mcp-settings.ps1`） | 同左，配置目录为 `CCB-Lite\.claude` |
| WT Fragment | `CCB Dark` 配色 | 同左（共用 Fragment 文件） |
| 版本号 | 1.0.9 | 1.0.9（已与完整版对齐） |
| 安装 Windows Terminal | `install-windows-terminal.ps1`（含离线 MSIXBundle，回退 winget） | 同左（Lite 也安装 WT，确保无 WT 机器上同为深色） |
| 安装后脚本 | `ensure-mcp-settings` + `install-wt-fragment` + `fix-terminal-launcher` | 同左，末项为 `fix-terminal-launcher.ps1 -Variant Lite` |
| 桌面快捷方式 | `wt.exe --profile "CCB"`（深色）→ `ccb.cmd`，无 WT 时回退 `cmd.exe` | 同模式 → `ccb-lite.cmd` |
| 阉割差异 | 多快捷方式 / 组件页 / 右键菜单等 | 仅保留 Lite 入口与办公命令 |

### 白/黑不一致修复（2026-06）

此前主快捷方式由 `fix-terminal-launcher.ps1` 生成为纯 `cmd.exe` + `CCB_DISABLE_WT_RELAUNCH=1`，会停留在默认（常为浅色）控制台、不应用深色 `CCB` profile；而「最近对话」等入口经 `ccb.cmd` 自身 relaunch 进入 WT `--profile "CCB"`（深色）——于是同一套 CCB 出现一个白、一个黑。现已让 `fix-terminal-launcher.ps1` 在检测到 `wt.exe` 时直接用 `Get-WtArgs`（`wt.exe --profile "CCB"`，深色 `#1E1E1E`），完整版与 Lite 共用同一逻辑，桌面/开始菜单快捷方式统一深色。已安装用户运行「CCB 终端修复」(`ccb-fix-terminal.cmd`) 或重装即可生效。

> 另：所有 `.cmd` 启动器已改为纯 ASCII。cmd.exe 按 OEM/GBK 解析 `.cmd`（非 UTF-8），中文注释会被误当命令执行，产生 `'文件累积。设' is not recognized as an internal or external command` 报错——详见 `ccb-installer/I18N-SPEC.md`。

构建 Lite：`.\build.ps1 -Lite` → `ccb-lite1.0.9.exe`。

已安装旧版 Lite 的用户：重新安装 `ccb-lite1.0.9.exe`，或在安装目录执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\Programs\CCB-Lite\scripts\install-wt-fragment.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\Programs\CCB-Lite\scripts\fix-terminal-launcher.ps1" -Variant Lite -NoPrompt
```
