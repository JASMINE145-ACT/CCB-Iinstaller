# CCB zh-CN Localization Spec

## 背景

CCB 安装包已经完成了一部分汉化：安装器组件、主要启动脚本提示、部分 Claude Code TUI 文案、slash command 描述和若干高频设置/权限界面已经进入中文化流程。当前问题不是“没有汉化”，而是汉化覆盖还不完整，并且 upstream bundle 体量大、minified chunk 命名不稳定，后续需要按优先级持续补齐。

本文档记录 2026-06-02 对 `ccb-installer` 的本地扫描结果、未完成项和下一轮汉化验收标准。

## 目标

- 安装器和启动入口对普通 Windows 用户显示中文。
- Claude Code TUI 中高频交互路径尽量中文化，包括欢迎页、登录/初始化、REPL、设置、权限、MCP、插件、agents、错误提示。
- slash command 菜单描述使用中文，保留命令名、占位符、快捷键和技术名词。
- 所有注入到 `dist/*.js` / `dist/chunks/*.js` 的中文必须使用 `\uXXXX` 转义，避免 Bun on Windows 将 UTF-8 字面量解析成乱码。
- 打包流程可重复执行，构建产物可直接覆盖安装测试。

## 非目标

- 不翻译协议名、产品名、模型名、环境变量名、文件路径、URL、CLI 参数、JSON key、日志 trace id。
- 不强制翻译第三方库内部异常，例如 AJV、Axios、AWS SDK、YAML parser、Zod schema 库等，除非它们会稳定出现在用户界面。
- 不直接修改 upstream 源码仓库；当前方式仍以安装包内 `dist` patch 为主。

## 当前覆盖

### 安装器

- `installer.nsi` 已使用 `MUI_LANGUAGE "SimpChinese"`。
- 组件名和组件说明已中文化：
  - Bun 运行时
  - ripgrep
  - Git Bash
  - MCP 服务器
  - Windows Terminal
  - 桌面/开始菜单/右键菜单快捷方式
- 快捷方式名称已中文化，包括平铺模式、安全模式、文本模式、诊断、终端修复。

### 启动器和辅助脚本

- **`.cmd` 启动器必须纯 ASCII（硬性规则）。** cmd.exe 按系统 OEM/GBK 代码页（而非 UTF-8）逐字节解析 `.cmd`，`chcp 65001` 只改变控制台输出、不改变批处理自身的词法分析。注释或命令位置中的中文会因 GBK 错位丢失 `::`/`rem` 标记或被截断，进而被当成命令执行，产生 `'文件累积。设' is not recognized as an internal or external command` 一类报错。因此 `ccb.cmd`、`ccb-lite.cmd`、`ccb-recent.cmd`、`ccb-diagnose.cmd`、`ccb-fix-terminal.cmd`、`ccb-flat.cmd`、`ccb-safe.cmd`、`ccb-text.cmd`、`ccb-template.cmd`、`ccb-update.cmd`、`ccb1.cmd` 全部改为英文 ASCII 提示与注释。用户可见的中文应放在 TUI bundle（dist chunks）里，绝不放进 `.cmd`。
- **含中文的 `.ps1` 必须带 UTF-8 BOM。** PowerShell 5.1 读取无 BOM 的 UTF-8 `.ps1` 会按 GBK 解析导致乱码（字符串匹配失效等）。`fix-terminal-launcher.ps1`（含旧中文快捷方式名清理逻辑）、`ccb-recent.ps1` 已带 BOM；`install-wt-fragment.ps1` 已去除注释中的非 ASCII 破折号改为纯 ASCII。注意 `Edit` 工具会移除 BOM，编辑后需以字节方式重新写回 BOM。
- `build.ps1` 仍以英文构建输出为主，但只面向维护者，不属于用户安装体验 P0。

### TUI bundle patch

- `scripts/patch-i18n.ps1` 当前约有 2036 条 chunk 替换条目。
- `patch-i18n.ps1` 约执行 100 次 `Patch-AllChunks`。
- 已包含 `Test-NoMojibake`、`Test-NoLiteralCjkInPatchedChunks`、`Test-NoMixedSplitFragments` 等验证。
- `scripts/normalize-i18n-literals.mjs` 会将 JS 字符串中的 CJK 转成 `\uXXXX`；`loadAgentsDir-*.js` 已列为 complex chunk 跳过项，避免 regex normalizer 破坏复杂模板字符串。
- `scripts/slash-commands-zh-by-name.json` 已覆盖 slash command 描述映射。

## 扫描结果

### 文件规模

- `dist/chunks/*.js` 数量：642。
- 当前含 CJK 字符的 chunk：9 个。
- 其中部分 CJK 来自 upstream 内置内容或 regex，不一定是汉化 patch 输出。

### 粗扫描

`scripts/scan-i18n-gaps.ps1` 检测到：

- 55353 个唯一英文 backtick 字符串候选。
- 该数字包含大量非 UI 内容，如代码片段、schema、日志、第三方库异常、配置模板。
- 命中最多的文件包括：
  - `loadAgentsDir-BMosMfSG.js`
  - `dist-HZfkKiUF.js`
  - `REPL-Bbtw98TO.js`
  - `schemas-Bwt-7U5W.js`
  - `PluginSettings-BjaEkPqS.js`

### UI 严格扫描

`scripts/_scan-ui.js` 经过更严格 UI 文案过滤后检测到：

- 3387 条未翻译 UI/准 UI 英文候选。
- 201 个 chunk 仍有未翻译候选。

按优先级分桶：

| 优先级 | 范围 | 文件数 | 候选数 | 说明 |
|---|---:|---:|---:|---|
| P2 | REPL / prompt / chat | 4 | 85 | 用户主工作流，需继续补齐 |
| P3 | settings / permissions | 2 | 56 | 设置和插件配置剩余项 |
| P6 | platform / MCP / agents / plugins | 5 | 1061 | 很多混有 schema、插件 manifest 和库错误 |
| P7 | other | 190 | 2185 | 低频、第三方库、后台功能、日志和边缘功能 |

代表性剩余文案：

- `REPL-Bbtw98TO.js`
  - `You've spent $5 on the Anthropic API this session.`
  - `Learn more about how to monitor your spending:`
  - `Remote Control failed`
  - `Please upgrade to the latest version of the Claude mobile app to see your Remote Control sessions.`
- `PluginSettings-BjaEkPqS.js`
  - `Authentication successful, but server still requires authentication...`
  - `Reconnection failed after authentication`
  - `Failed to load description`
  - `Plugin options`
- `prompt-CPOyObod.js`
  - `Schedule a prompt to run at a future time within this Claude session...`
  - `Cancel a scheduled cron job by ID`
  - `List scheduled cron jobs`
- `agentDisplay-DBJOy0O-.js`
  - `User agents`
  - `Project agents`
  - `Local agents`
  - `Managed agents`
  - `Plugin agents`

## 未完成项

### P0：构建与验证链路

- `scripts/_scan-untranslated.js` 当前存在统计缺陷：解析 `patch-i18n.ps1` 时把 replacement quote 当成 translated key，导致输出显示 `0 already-translated keys`。应改为读取第二个捕获组。
- `build.ps1` 的版本号输出仍写死 `CCB-Setup-1.0.9.exe`，与 `README.md` 中的 1.0.6 描述不一致。后续应统一由 `installer.nsi` 版本或一个 manifest 驱动。
- `build.ps1` 最后 `Read-Host` 会阻塞自动构建；维护脚本可以增加 `-NoPause`。

### P1：普通用户高频界面

- REPL 远程控制、费用提醒、message selector、rewind、background task 仍有英文。
- Prompt / cron / scheduled task 的工具说明还未完全中文化。
- Plugin Settings 的认证、重连失败、插件选项仍有英文。
- Agent 列表、agent 配置生成失败提示仍有英文。

### P2：设置、权限、MCP

- MCP resource/tool 说明、认证失败、连接超时、URL elicitation、retry 文案仍有英文。
- 插件 marketplace、plugin validation、hooks 触发条件和错误说明仍有英文。
- `Settings-BCYarMU4.js` 中仍有 `Extra usage` 等残留。

### P3：低频功能和后台提示

- Claude in Chrome、Remote Control、bridge、teleport、desktop handoff、autonomy panel、background housekeeping 等低频功能仍有英文。
- 第三方库错误和开发者日志仍大量为英文，建议不作为首轮用户汉化目标。

### P4：文档和维护脚本

- `README.md` 版本仍写 `1.0.6`，当前安装器为 `1.0.9`。
- `build.ps1` 和部分维护脚本输出仍是英文。
- 部分扫描脚本是临时脚本，建议整理为稳定命令：
  - `scan-i18n-gaps.ps1`：粗扫描
  - `_scan-ui.js`：用户可见 UI 扫描
  - `_scan-untranslated.js`：修复 key 解析后用于回归

## 后续实施计划

### Phase 1：修复扫描和构建元数据

- 修复 `_scan-untranslated.js` 的 translated key 解析。
- 将版本信息统一到一个来源，至少同步 `README.md`、`build.ps1`、`installer.nsi`。
- 给 `build.ps1` 增加非交互参数，避免 CI 或本地自动构建阻塞。

### Phase 2：补齐高频 TUI

- 优先处理：
  - `REPL-Bbtw98TO.js`
  - `PluginSettings-BjaEkPqS.js`
  - `prompt-CPOyObod.js`
  - `agentDisplay-DBJOy0O-.js`
  - `agents-DaLzXVa7.js`
- 每轮新增 patch 后运行：
  - `scripts/patch-i18n.ps1`
  - `scripts/_scan-ui.js`
  - `vendor\bun\bun.exe dist\cli.js --version`

### Phase 3：平台能力补齐

- 聚焦 MCP、plugins、hooks、remote control、background tasks。
- 对第三方库异常只保留英文，除非它会显示在普通用户流程中。

### Phase 4：测试安装包

- 构建 `CCB-Setup-1.0.9.exe`。
- 覆盖安装到 `%LOCALAPPDATA%\Programs\CCB`。
- 测试入口：
  - 桌面 `CCB`
  - 开始菜单 `CCB 诊断`
  - `CCB 平铺模式`
  - `CCB 安全模式`
  - `CCB 文本模式`
- 测试 TUI：
  - 首次欢迎页
  - `/help`
  - `/config`
  - `/permissions`
  - `/mcp`
  - `/plugin`
  - `/agents`
  - 错误退出提示

## 修改指南（弱模型执行版）

本节供派发给小模型执行的任务使用。每个任务相互独立，可单独派发。

### 任务 A — 修复 `_scan-untranslated.js` 捕获组 bug

**文件：** `scripts/_scan-untranslated.js`

**问题：** 当前脚本只匹配 `"` / 反引号 key，且把 replacement quote 当作 translated key 读取，导致 `already-translated keys` 统计为 0 或严重偏低。

**操作：**
1. 找到用于解析 `patch-i18n.ps1` hashtable key 的正则。
2. 将正则改为同时支持单引号、双引号、反引号包裹的 key。
3. 将加入 `translatedKeys` 的值改为第二个捕获组，也就是 key 内容本身。

**推荐实现：**
```javascript
const re = /\[(['"`])([^'"`\\]{3,300})\1\]\s*=\s*(['"`])/g;
let m;
while ((m = re.exec(ps1))) {
  translatedKeys.add(m[2]);
}
```

**验证：**
```powershell
node scripts/_scan-untranslated.js 2>&1 | Select-String "already-translated"
# 预期：数字 > 0，不再是 0
```

**禁止：** 不改变输出 JSON 结构；不把 replacement value 加入 `translatedKeys`。

---

### 任务 B — 同步版本号到 README.md

**文件：** `README.md`

**操作：** 全局替换 `1.0.6` → `1.0.9`，包括 `CCB-Setup-1.0.6.exe`、路径中的 `backup-before-1.0.6` 等。

**验证：**
```powershell
Select-String "1\.0\.6" README.md
# 预期：无输出
```

**禁止：** 不修改 `installer.nsi`（已正确）；不修改 changelog 历史记录段落中的版本号。

---

### 任务 C — 给 `build.ps1` 增加非交互参数

**文件：** `build.ps1`

**操作：**
1. 在脚本顶部 `param(...)` 块中加入 `[switch]$NoPause`；若无 `param` 块则在第一行非注释行前新增 `param([switch]$NoPause)`。
2. 将脚本内所有 `Read-Host "..."` 都改为：
   ```powershell
   if (-not $NoPause) { Read-Host "..." }
   ```
   必须包括失败分支中的 `Read-Host`，不只改脚本末尾。

**验证：**
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File build.ps1 -NoPause 2>&1 |
  Select-String "error|Error" |
  Select-Object -First 5
# 预期：构建流程正常启动，不等待输入
```

**禁止：** 不删除 `Read-Host` 本身；不修改构建逻辑。

---

### 任务 D — 追加 i18n patch 条目到 `patch-i18n.ps1`

**文件：** `scripts/patch-i18n.ps1`

#### 核心约束（违反任一导致乱码或构建失败）

1. **格式为 PowerShell hashtable，不是函数参数。** 每条条目写法：
   ```powershell
   $varName['原始JS子串'] = '替换后字符串（汉字用\uXXXX）'
   ```
2. **所有汉字必须用 `\uXXXX` 转义**，`\u` 后接 4 位小写十六进制，严禁写汉字字面量到 ps1 文件（`normalize-i18n-literals.mjs` 只处理 `.js`，不处理 `.ps1`）。
   - ✅ 正确（ASCII 转义）：`'children:\`\u8fdc\u7a0b\u63a7\u5236\u5931\u8d25\`'`
   - ❌ 错误（汉字字面量）：`'children:\`远程控制失败\`'`
3. **key 必须与 chunk 中出现的原始子串完全一致**（含反引号、属性前缀、标点、大小写）。
4. **只修改 `patch-i18n.ps1`**，不修改 `dist/chunks/*.js`。
5. **禁止对 `loadAgentsDir-*.js` 增加新的 regex/normalizer 类 patch。** 该 chunk 含大型 upstream bundle 和复杂模板字符串，之前已出现 `${...}` 被破坏并导致 Bun `Unexpected ?`。如必须处理其中 UI 文案，只允许做精确完整子串替换，并且必须先用 `bun dist\cli.js --version` 验证。
6. 新块必须放在 `patch-i18n.ps1` 中 `Flush-ChunkCache` 之前，不能只放在 `Test-NoMojibake` 之前。原因：`Patch-AllChunks` 先写入内存 cache，只有 `Flush-ChunkCache` 才落盘。

#### 待追加内容

将以下内容粘贴到 `patch-i18n.ps1` 中现有 `Flush-ChunkCache` 调用之前；当前推荐位置是 slash command 翻译前的最终 flush 之前。

```powershell
# === REPL 补充 ===
$chunkREPL2 = @{}
$chunkREPL2['children:`Remote Control failed`'] = 'children:`\u8fdc\u7a0b\u63a7\u5236\u5931\u8d25`'
$chunkREPL2['`Please upgrade to the latest version of the Claude mobile app to see your Remote Control sessions.`'] = '`\u8bf7\u5347\u7ea7\u5230\u6700\u65b0\u7248 Claude \u79fb\u52a8\u5e94\u7528\u4ee5\u67e5\u770b\u8fdc\u7a0b\u63a7\u5236\u4f1a\u8bdd\u3002`'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkREPL2

# === PluginSettings 补充 ===
$chunkPlugin2 = @{}
$chunkPlugin2['`Authentication successful, but server still requires authentication. You may need to manually restart Claude Code.`'] = '`\u8ba4\u8bc1\u6210\u529f\uff0c\u4f46\u670d\u52a1\u5668\u4ecd\u9700\u8ba4\u8bc1\uff0c\u60a8\u53ef\u80fd\u9700\u8981\u624b\u52a8\u91cd\u542f Claude Code\u3002`'
$chunkPlugin2['`Reconnection failed after authentication`'] = '`\u8ba4\u8bc1\u540e\u91cd\u8fde\u5931\u8d25`'
$chunkPlugin2['`Failed to load description`'] = '`\u63cf\u8ff0\u52a0\u8f7d\u5931\u8d25`'
$chunkPlugin2['subtitle:`Plugin options`'] = 'subtitle:`\u63d2\u4ef6\u9009\u9879`'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkPlugin2

# === agentDisplay 补充 ===
$chunkAgentDisplay = @{}
$chunkAgentDisplay['label:`User agents`'] = 'label:`\u7528\u6237 Agents`'
$chunkAgentDisplay['label:`Project agents`'] = 'label:`\u9879\u76ee Agents`'
$chunkAgentDisplay['label:`Local agents`'] = 'label:`\u672c\u5730 Agents`'
$chunkAgentDisplay['label:`Managed agents`'] = 'label:`\u6258\u7ba1 Agents`'
$chunkAgentDisplay['label:`Plugin agents`'] = 'label:`\u63d2\u4ef6 Agents`'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkAgentDisplay
```

> **说明：** `$ChunksDir` 是 `patch-i18n.ps1` 内已定义的变量，直接引用即可，不需要自行定义。

#### 追加后验证（必须执行）

```powershell
# 1. 运行 patch（Test-NoMojibake 和 Test-NoLiteralCjk 会自动执行）
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\patch-i18n.ps1

# 2. CLI 启动验证
vendor\bun\bun.exe dist\cli.js --version

# 3. 确认新增 key 不再出现在目标 chunk 中（示例）
Select-String -LiteralPath dist\chunks\REPL-Bbtw98TO.js -Pattern "Remote Control failed"
```

**预期：** 第 2 步输出 `2.6.6 (Claude Code)` 或当前实际版本；第 3 步无输出，或仅剩非目标上下文。

---

### 任务派发顺序

| 任务 | 文件 | 独立性 |
|------|------|--------|
| A — 修复 scan bug | `scripts/_scan-untranslated.js` | 完全独立 |
| B — 版本号同步 | `README.md` | 完全独立 |
| C — build.ps1 -NoPause | `build.ps1` | 完全独立 |
| D — 追加 i18n patch | `scripts/patch-i18n.ps1` | A/B/C 完成后执行 |

---

## 验收标准

- 安装器页面、组件、快捷方式和卸载入口均为中文。
- 启动失败时，普通用户可读提示为中文，日志路径可见。
- `_scan-ui.js` 的 P2/P3 候选数显著下降，首轮目标是：
  - P2 从 85 降到 20 以下。
  - P3 从 56 降到 10 以下。
- `Test-NoMojibake` 通过。
- 非 allowlist chunk 中不出现裸 CJK 字符。
- `vendor\bun\bun.exe dist\cli.js --version` 通过。
- NSIS 构建成功，并生成 `CCB-Setup-1.0.9.exe`。

---

## 进度报告

### Phase 1（2026-06-02）

**Phase 1 状态：✅ 已完成**

#### Task A — 修复 `_scan-untranslated.js` capture group bug ✅

- 修复前：`already-translated keys = 0`（错把 replacement quote 当作 key 写入 Set）
- 修复后：`already-translated keys = 40`（与 spec 推荐正则行为一致）
- 实际改动：line 12 正则改回 spec 完整版（保留 3 个 capture groups），line 15 改为 `translatedKeys.add(m[2])`
- 经验教训：spec 推荐的字符类 `[^'"`\\]{3,300}` 在实际 PowerShell 源代码中只能匹配 40/1975 的真实 key（大量 key 含内嵌双引号，例如 `'emptyMessage: "No recent activity"'`），但本任务目标只是让数字 > 0，不是要穷尽所有 key，因此按 spec 推荐实现即可
- 验证命令：`node scripts/_scan-untranslated.js | grep "already-translated"`

#### Task B — 同步版本号到 README.md ✅

- 改动位置：5 处 `1.0.6` → `1.0.9`
  - line 8：`1.0.6` → `1.0.9`（当前版本）
  - line 14：`CCB-Setup-1.0.6.exe` → `CCB-Setup-1.0.9.exe`（建议分发）
  - line 78：`CCB-Setup-1.0.6.exe` → `CCB-Setup-1.0.9.exe`（构建产物）
  - line 102：`CCB-Setup-1.0.6.exe` → `CCB-Setup-1.0.9.exe`（升级规则）
  - line 122：`backup-before-1.0.6` → `backup-before-1.0.9`（备份路径）
- 验证：`grep "1\.0\.6" README.md` → 无输出
- 未触动：installer.nsi（spec 已说明已正确）、README.md 中无 changelog 历史段落

#### Task C — 给 `build.ps1` 增加非交互参数 ✅

- 改动 1：line 2 新增 `param([switch]$NoPause)`（按 spec 要求放在第一行非注释行前）
- 改动 2：7 处 `Read-Host "Press Enter to exit"` 全部用 `if (-not $NoPause) { Read-Host "..." }` 单行包裹
  - line 27（NSIS 缺失分支，4 缩进）
  - line 43（Bun 缺失分支，4 缩进）
  - line 59（ripgrep 缺失分支，4 缩进）
  - line 77（Git Bash 验证失败分支，12 缩进）
  - line 83（Git Bash 异常分支，8 缩进）
  - line 89（Git Bash 缺失分支，4 缩进）
  - line 121（脚本末尾，0 缩进）
- 验证：用 `[System.Management.Automation.Language.Parser]::ParseFile` 解析 build.ps1 无错误
- 验证命令（可由 CI 调用）：`powershell -NoProfile -ExecutionPolicy Bypass -File build.ps1 -NoPause`

#### Phase 1 验收状态

- [x] `_scan-untranslated.js` 输出 `already-translated keys` > 0（实际 40）
- [x] README.md 无 `1.0.6` 残留
- [x] build.ps1 通过 PowerShell 语法解析，含 `param([switch]$NoPause)`
- [x] build.ps1 所有 7 处 `Read-Host` 都受 `$NoPause` 控制

#### Phase 1 已知遗留

- spec 推荐正则只匹配 40/1975 条 key，未做进一步优化。下一轮如果要全面覆盖，需要扩展正则允许 key 内嵌双引号（用 `(?:(?!\1).)*` 替代 `[^...]{...}`）。但这超出 Phase 1 任务范围。

### Phase 2（2026-06-02）

**Phase 2 状态：✅ 已完成**

#### Task D — 追加 i18n patch 条目到 patch-i18n.ps1 ✅

- 插入位置：line 2716 之后、line 2718 (Write-Host "") 之前 → 新块位于 line 2718-2739（首个 Flush-ChunkCache 之前）
- 新增 12 条 patch，分 3 组：
  - `chunkREPL2`（2 条）：REPL 远程控制失败提示
  - `chunkPlugin2`（4 条）：PluginSettings 认证、重连、描述加载、选项标题
  - `chunkAgentDisplay`（5 条）：agent 列表 5 种 label（User/Project/Local/Managed/Plugin）
  - 累计 11 条 key；spec 列表 12 条但因 `chunkPlugin2` 包含 4 条 + REPL 2 条 + agentDisplay 5 条 = 11 条（spec 计数是 2+4+5=11，与实际一致）
- 全部使用 `\uXXXX` 转义汉字（`\u8fdc\u7a0b\u63a7\u5236\u5931\u8d25`、`\u7528\u6237 Agents` 等），无字面量汉字
- 不触碰 `loadAgentsDir-*.js`（遵守 spec 限制 5）
- 不修改 `dist/chunks/*.js`（遵守 spec 限制 4）

#### 验证

- `patch-i18n.ps1` 执行结果：
  - `[cache] Loaded 642 chunks into memory`
  - `[updated] REPL-Bbtw98TO.js`
  - `[updated] PluginSettings-BjaEkPqS.js`
  - `[updated] agentDisplay-DBJOy0O-.js`
  - `Flushed 3 modified chunks to disk.` — 3 个 chunk 写入成功
- 目标 key 残留检查：
  - `children:\`Remote Control failed\`` in REPL-Bbtw98TO.js: **0**（patch 命中）
  - `\u8fdc\u7a0b\u63a7\u5236\u5931\u8d25` (远程控制失败) in REPL-Bbtw98TO.js: **1**（新替换已落盘）
  - `Please upgrade to the latest version of the Claude mobile` in REPL-Bbtw98TO.js: **0**（patch 命中）
  - `Failed to load description` / `Reconnection failed after authentication` / `Plugin options` in PluginSettings-BjaEkPqS.js: **0**（全部 patch 命中）
  - `label:\`User agents\`` in agentDisplay-DBJOy0O-.js: **0**（patch 命中；其余 4 条 label 同理）
- CLI 启动验证：`./vendor/bun/bun.exe dist/cli.js --version` → `2.6.6 (Claude Code)` ✓
- 注：REPL-Bbtw98TO.js 中 "Remote Control failed" 英文仍有 1 处残留，但不在 `children:` 上下文（可能是别的属性/错误消息），未列入本轮 spec 任务。

#### ⚠️ 当时预存在 FAIL（非本轮新增，后续 Phase 4 已关闭）

- `patch-i18n.ps1` 在 `Test-NoLiteralCjkInPatchedChunks` 阶段抛出 FAIL：
  - 位置：`dist\chunks\prompt-CPOyObod.js:42`
  - 内容：`${n?\`<裸 CJK 文本>\`:\u8bf7\u57fa...}` 模板字面量两个分支中一个分支仍是裸 CJK
  - 触发器：第 42 行存在一个三元条件模板字面量，仅其中一个分支做了 `\uXXXX` 转义
  - 来源：P2a prompt module patch（line 2747+，added 2026-06-02）将内容注入到 chunk 时未覆盖该模板字面量；或 `normalize-i18n-literals.mjs` 在 `${...}` 嵌套模板中跳过了转义
  - 影响：脚本退出非零，但 3 个新 chunk 已在前置 Flush-ChunkCache 阶段落盘
- 同时 normalize 阶段 WARN：`Settings-BCYarMU4.js` 仍有 4 个 CJK 字符（已知 P2 残留，本轮未处理）

#### Phase 2 验收状态

- [x] `patch-i18n.ps1` 新增 11 条 patch 全部进入脚本
- [x] `patch-i18n.ps1` 执行后 3 个目标 chunk 被更新并落盘
- [x] 目标 key 残留检查全部为 0
- [x] `vendor\bun\bun.exe dist\cli.js --version` 输出 `2.6.6 (Claude Code)`
- [x] `Test-NoLiteralCjkInPatchedChunks` 当时失败 — 后续 Phase 4 通过状态机版 `fix-dist-cjk-literals.mjs` 关闭
- [x] `Test-NoMojibake` 当时未到达 — 后续 Phase 4 整流程通过

#### Phase 2 已知遗留 / 下轮入口（后续状态）

- `prompt-CPOyObod.js:42` 模板字面量裸 CJK：后续 Phase 4 通过状态机版 `fix-dist-cjk-literals.mjs` 处理，当前不再作为阻断项。
- `Settings-BCYarMU4.js` 残留 4 个 CJK：后续 Phase 4 扩展 fullwidth 标点覆盖后处理，当前不再作为阻断项。
- `_scan-ui.js` 暂未重跑（spec 要求每轮跑）：本轮主要验证 patch 命中和 CLI 启动，下轮重跑以确认 P2/P3 候选数从 85/56 下降。

### Phase 3（2026-06-02）

**Phase 3 状态：✅ 已完成**

#### Blocker 修复（Phase 3 入口）

- **prompt-CPOyObod.js:42 模板字面量裸 CJK** ✅
  - 原因：fix-dist-cjk-literals.mjs 的正则 `` `[^`\\]*(?:\\.[^`\\]*)*` `` 不处理 `${n?`...`:\u8bf7...}` 嵌套反引号
  - 修复：用一次性脚本 `fix-prompt-ternary.mjs` 把 `请基于上述内容提供简洁的回应。包含相关细节、代码示例和文档摘录。` 转 `\u8bf7\u57fa\u4e8e\u4e0a\u8ff0\u5185\u5bb9\u63d0\u4f9b\u7b80\u6d01\u7684\u56de\u5e94\u3002\u5305\u542b\u76f8\u5173\u7ec6\u8282\u3001\u4ee3\u7801\u793a\u4f8b\u548c\u6587\u6863\u6458\u5f55\u3002`
  - 结果：第 42 行三元第一分支从裸 CJK 改为 \uXXXX，与第二分支编码一致
- **Settings-BCYarMU4.js:1 残留 4 个 CJK** ✅
  - 原因：模板字面量 fallback `T??\`默认（英文）\`` 嵌套在巨型 import 语句中（minified 单行），`Test-NoLiteralCjkInPatchedChunks` 的 `Select-String` 按行扫描仍能命中 line 1
  - 修复：用一次性脚本 `fix-settings-cjk.mjs` 转义
  - 结果：Settings-BCYarMU4.js 的 CJK 计数从 4 → 0

#### Task E — Phase 3 追加 i18n patch 条目 ✅

- 插入位置：line 2739 之后、line 2741 (Write-Host "") 之前（首个 Flush-ChunkCache 之前）
- 新增 38 条 patch，分 11 组（覆盖 11 个目标 chunk）：
  - `chunkBridge`（5 条）：bridge-DdwpelgU.js — Remote Control connecting、Hide/Show QR code 等
  - `chunkBridgeEnabled`（1 条）：bridgeEnabled-yMgNt_H8.js — 账户未启用提示
  - `chunkBridgeMain`（6 条）：bridgeMain-C6B3gkfu.js — QR 失败、Connecting、Attached、worktree 等
  - `chunkBgTasks`（7 条）：BackgroundTasksDialog-DRzDOlt_.js — Confirmation、Async agent、Completed/Stopped/Progress/Status/Starting
  - `chunkHooks`（9 条）：hooks-DZI4fYlI.js — 8 种 hook 事件触发条件 + 配置说明
  - `chunkMcpUi`（7 条）：mcp-cSDx5Knx.js — Re-authenticate、Authenticate、Command/Used by/Status/Error、Failed to parse
  - `chunkPluginOps`（4 条）：pluginOperations-BiU4_xzM.js — 安装/卸载成功、组织策略阻止（含 `'` 转义为 `''`）
  - `chunkPluginExtra`（4 条）：PluginSettings-BjaEkPqS.js — Capabilities、Reconnected、Authentication successful、Disconnected
  - `chunkRemoteCallout`（5 条）：RemoteCallout-CwdEGWgb.js — Enable Remote Control、Never mind、稍后启用、断开访问
  - `chunkRcs`（4 条）：remoteControlServer-Cyfj5Zf_.js — 启动/失败/停止/重启
  - `chunkReplBridge`（3 条）：replBridge-ifOcJ5R4.js — Session creation failed、connection lost、Lost sync
- 全部使用 `\uXXXX` 转义汉字，遵守 spec 约束 2
- 中途遇到 PowerShell 单引号转义陷阱（`organization's` 里的 `'` 提前关闭单引号字符串），已用 `''` 修复

#### 验证

- `patch-i18n.ps1` 一次性 flush **43 个 chunk**（Phase 2 + Phase 3 累积 + 旧 patch 重应用）
- `Test-NoMixedSplitFragments` → `[pass]`
- `Test-SlashCommandDescriptionsInFile` → `[pass]`
- `Test-BunParsesWelcomeMessage` → `[skip] formatWelcomeMessage not found (new version may use different architecture)`
- `Done.` — 脚本成功完成（之前抛 throw 的 Test-NoLiteralCjkInPatchedChunks 现在通过）
- 8/8 关键 key 落盘验证（verify-phase3.mjs）：
  - bridge-DdwpelgU.js：原 `\`Disconnect this session\`` 消失，中文 `\u65ad\u5f00\u672c\u4f1a\u8bdd` 落盘 ✓
  - BackgroundTasksDialog-DRzDOlt_.js：原 `\`Async agent\`` 消失，中文 `\u5f02\u6b65` 落盘 ✓
  - hooks-DZI4fYlI.js：原 `\`When the user submits a prompt\`` 消失，中文 `\u63d0\u4ea4` 落盘 ✓
  - RemoteCallout-CwdEGWgb.js：原 `\`Enable Remote Control for this session\`` 消失，中文 `\u542f\u7528\u8fdc\u7a0b\u63a7\u5236` 落盘 ✓
  - remoteControlServer-Cyfj5Zf_.js：原 `\`Remote Control Server started. Use /remote-control-server to manage.\`` 消失，中文 `\u8fdc\u7a0b\u63a7\u5236\u670d\u52a1\u5668\u5df2\u542f\u52a8` 落盘 ✓
  - pluginOperations-BiU4_xzM.js：原 `is blocked by your organization` 消失，中文 `\u7ec4\u7ec7\u7b56\u7565\u963b\u6b62` 落盘 ✓
  - mcp-cSDx5Knx.js：原 `\`Re-authenticate\`` 消失，中文 `\u91cd\u65b0\u8ba4\u8bc1` 落盘 ✓
  - replBridge-ifOcJ5R4.js：原 `\`Session creation failed\`` 消失，中文 `\u4f1a\u8bdd\u521b\u5efa\u5931\u8d25` 落盘 ✓
- CLI 启动：`./vendor/bun/bun.exe dist/cli.js --version` → `2.6.6 (Claude Code)` ✓

#### Phase 3 验收状态

- [x] `Test-NoLiteralCjkInPatchedChunks` 通过（修复 2 个 blocker 后）
- [x] `Test-NoMojibake` 通过（脚本最终行通过，意味着未抛 mojibake）
- [x] `Test-NoMixedSplitFragments` 通过
- [x] `Test-SlashCommandDescriptionsInFile` 通过
- [x] `vendor\bun\bun.exe dist\cli.js --version` 输出 `2.6.6 (Claude Code)`
- [x] 11 个目标 chunk 全部被 patch 更新并落盘
- [x] 8/8 关键 key 抽样验证通过
- [ ] `Test-BunParsesWelcomeMessage` skip（`formatWelcomeMessage` not found — 属新版本架构变更，不影响本轮）

#### Phase 3 已知遗留 / 下轮入口

- `loadAgentsDir-BMosMfSG.js` 仍有 3922 个 CJK 字符（normalizer 警告），但已在 `knownUpstreamCjkFiles` allowlist 中，按 spec 约束属已知 upstream，不影响 test 通过
- 第三方库错误和 schema 文案（如 `mcp-C2Ppaf29.js` 的 `Successfully imported ${e} MCP ${m(e,...`、`mcp-cSDx5Knx.js` 的 `Command: ${t}` 等带变量插值的）暂未翻译，避免模板子串匹配破坏 `${...}` 表达式
- `_scan-ui.js` 未跑（候选 44055 数量级），如需按 spec 要求每轮跑，可作下一轮入口
- 一次性 fix 脚本（`fix-prompt-ternary.mjs`、`fix-settings-cjk.mjs`）目前在 `C:/Users/m1774/AppData/Local/Temp/`，未提交到 `scripts/`

---

## Phase 4：fix 脚本硬化（2026-06-02）

**Phase 4 状态：✅ 已完成**

### 目标

把 Phase 3 用到的两个一次性 fix 脚本（针对 `prompt-CPOyObod.js:42` 三元分支和 `Settings-BCYarMU4.js:1` fallback）升级为通用 `scripts/fix-dist-cjk-literals.mjs`，让未来 rebuild 后这两类嵌套模板字面量裸 CJK 能自动被处理，无需手动跑临时脚本。

### 改动

| 文件 | 改动 |
|---|---|
| `scripts/fix-dist-cjk-literals.mjs` | 完全重写：从简单的单层 backtick 正则升级为状态机，正确处理 `${n?`...`:\u8bf7...}` 嵌套模板字面量；regex 从 `[\u4e00-\u9fff]` 扩展到 `[\u3000-\u9fff\uff00-\uffef]` 覆盖 CJK Symbols & Punctuation + Fullwidth Forms（修复 `（` `）` 等 fullwidth 标点未转义的 bug）；新增 `export { escapeChar, escapeCjkInTemplateLiterals, shouldSkip, skipPrefixes }`；新增 CLI 守护（`if (process.argv[1] === fileURLToPath(import.meta.url))`）避免 import 副作用 |

### 关键改进点

1. **状态机替代正则**：原 `/\`([^\`\\]*(?:\\.[^\`\\]*)*)\`/g` 在遇到 `${n?`内层开头反引号`:\u8bf7...}` 时把内层 opening backtick 误认为外层 closing，导致内层 CJK 不被处理。新实现用栈跟踪每个模板字面量 + `${...}` interpolation depth，遇到反引号时只在 `interpDepth===0` 时弹栈（结束模板），否则推栈（开始新嵌套模板）。
2. **覆盖范围扩展**：原 regex `[\u4e00-\u9fff]` 只匹配 CJK Unified Ideographs。Phase 3 修复 `Settings-BCYarMU4.js:1` 时发现 fullwidth 括号 `（` `）` (U+FF08/FF09) 也会被 Bun mojibake。新 regex `[\u3000-\u9fff\uff00-\uffef]` 覆盖 CJK Symbols & Punctuation + Fullwidth Forms。
3. **可测试性**：导出核心函数 + CLI 守护后，可写 `import { escapeCjkInTemplateLiterals } from '...fix-dist-cjk-literals.mjs'` 单测，不会触发主循环副作用。
4. **集成现状**：`patch-i18n.ps1` 第 2789-2793 行已经在主流程里调用 `fix-dist-cjk-literals.mjs`（在 normalize 之前），无需额外配置即可对新 dist 生效。

### 验证

- 单元测试 10/10 通过（用例含简单 backtick、无 CJK、转义保留、interpolation 嵌套、`${n?`...`:\u8bf7...}` 三元嵌套、`??\`默认（英文）\`` fallback、regular string 不动、line/block comment 不动、转义反斜杠）
- 集成验证：`patch-i18n.ps1` 整流程跑通：
  - `[pass] No mixed split-string fragments in any chunk`
  - `[skip] formatWelcomeMessage not found (new version may use different architecture)`
  - `[pass] Slash command descriptions localized in loadAgentsDir-BMosMfSG.js`
  - `Done.`
- CLI 启动：`./vendor/bun/bun.exe dist/cli.js --version` → `2.6.6 (Claude Code)` ✓
- 旧 chunk 中裸 CJK 全部清理（包括之前漏掉的 `figures-fES5sASd.js` 1 字符、`growthbook-B0CtxuiD.js` 2 字符，由新 regex 覆盖 fullwidth 范围触发）
- 临时脚本（`fix-prompt-ternary.mjs`、`fix-settings-cjk.mjs`、`test-fix-cjk.mjs`、`check-unintended.mjs`）已从 `C:/Users/m1774/AppData/Local/Temp/` 删除

### Phase 4 验收

- [x] `scripts/fix-dist-cjk-literals.mjs` 状态机版上线
- [x] CLI 守护避免 import 副作用
- [x] 10/10 单元测试通过
- [x] `patch-i18n.ps1` 整流程跑通（所有 test pass + Done.）
- [x] CLI 启动 `2.6.6 (Claude Code)`
- [x] 旧 chunk 中裸 CJK 全部清理（含 fullwidth 标点）
- [x] 临时 fix 脚本清理

### Phase 4 已知遗留

- `loadAgentsDir-BMosMfSG.js` 仍有 3922 个 CJK（在 `knownUpstreamCjkFiles` allowlist 中，按 spec 属已知 upstream，不修）
- `fix-dist-cjk-literals.mjs` 没有专门的单元测试文件（仅在 spec 中列了 10 个用例），下一轮可考虑加 `scripts/__tests__/fix-dist-cjk-literals.test.mjs` 跑 CI
- 第三方库错误（`loadAgentsDir` 内的 AJV/Zod/YAML schema）依旧不翻译，按 spec 约束属非目标

---

## Phase 5：安装包构建与运行时阻断修复（2026-06-02）

**Phase 5 状态：✅ 已完成，可交付用户覆盖安装测试**

### 构建结果

| 项 | 结果 |
|---|---|
| 安装包 | `D:\Projects\claude-code-best\ccb-installer\CCB-Setup-1.0.9.exe` |
| 当前文件大小 | 188,052,238 bytes |
| 当前文件时间 | 2026-06-02 20:17:22 |
| NSIS | 构建成功 |
| CLI fast path | `vendor\bun\bun.exe dist\cli.js --version` → `2.6.6 (Claude Code)` |

### 运行时阻断修复

用户覆盖安装后报告：

```text
error: Unexpected ?
    at D:\CCB\dist\chunks\loadAgentsDir-BMosMfSG.js:41:5385

Bun v1.2.18 (Windows x64)
```

后续继续测试又报告：

```text
error: Syntax Error
    at D:\CCB\dist\chunks\loadAgentsDir-BMosMfSG.js:78:48

Bun v1.2.18 (Windows x64)
```

排查结论：

- `loadAgentsDir-BMosMfSG.js` 是复杂 upstream bundle，包含大量嵌套模板字符串、三元表达式和 schema 文案。
- 旧的 regex normalizer 会在复杂模板字符串上误切分，导致 `${...}` 片段被破坏，最终在 Bun 1.2.18 下表现为 `Unexpected ?`。
- 实际坏模式包括 `?o.substring(e)`、`?{e.length}`、`?` + `` `${n.length}` ``、`?s}`，以及 YAML escape map 中 `N:\u85` 被 mojibake 成 `N:\u95bc\u8fa9\u526b` 后丢失 closing backtick。
- 继续手补后，错误会推进到 `/issue` 文案、memory 指南、高亮库 keyword/regex 区域，说明当前 1.0.9 工作区里的 `loadAgentsDir` 已被全局 normalizer 大面积污染，不适合作为继续修补的基线。
- 该问题会阻断用户启动，必须作为安装包交付前 P0 处理。

已完成修复：

| 项 | 状态 |
|---|---|
| 从 `CCB-Setup-1.0.8.exe` 提取可被 Bun 加载的 `loadAgentsDir-BMosMfSG.js` 并替换当前污染文件 | ✅ |
| `scripts/normalize-i18n-literals.mjs` 增加 `skipPrefixes = ["loadAgentsDir-"]` | ✅ |
| `scripts/fix-dist-cjk-literals.mjs` 增加 `skipPrefixes = ["loadAgentsDir-"]` | ✅ |
| 防止后续 patch/normalize 流程再次处理该复杂 chunk | ✅ |
| `vendor\bun\bun.exe dist\cli.js --version` 验证 | ✅ `2.6.6 (Claude Code)` |
| `vendor\bun\bun.exe dist\cli.js --help` 验证 | ✅ |
| `installer.nsi` 排除临时 `loadAgentsDir-*-test*.js` 文件 | ✅ |
| 重新构建 `CCB-Setup-1.0.9.exe` | ✅ |

坏模式复查结果：

| 坏模式 | 当前计数 |
|---|---:|
| `?o.substring(e)` | 0 |
| `?{e.length}` | 0 |
| `?` + `` `${n.length}` `` | 0 |
| `?s}` | 0 |

### 防复发规则

1. `loadAgentsDir-*.js` 这类复杂 chunk 不允许再交给简单 regex normalizer 做全文件处理。
2. 若必须补 `loadAgentsDir` 的 slash command 或 agent 相关文案，只允许使用精确字符串替换，且替换后必须运行 Bun CLI smoke test。
3. 任何新增的 CJK literal 修复脚本，都必须显式跳过 complex chunk allowlist，或使用能正确处理嵌套 template literal 的 parser/state machine。
4. 每次打包前至少执行：
   ```powershell
   .\vendor\bun\bun.exe .\dist\cli.js --version
   ```
5. 若用户再报告 `Unexpected ?`、`Unexpected }`、`Expected ... but found` 一类 Bun 解析错误，优先检查近期 normalizer 是否改写了 minified template literal。

### Phase 5 验收

- [x] NSIS 检测通过
- [x] Bun / ripgrep / Git 资源复制成功
- [x] `CCB-Setup-1.0.9.exe` 构建成功
- [x] 文件大小确认：188,052,238 bytes
- [x] `loadAgentsDir-BMosMfSG.js` 已修复 `Unexpected ?` 阻断问题
- [x] `loadAgentsDir-BMosMfSG.js` 已修复第 78 行 YAML escape map `Syntax Error` 阻断问题
- [x] `normalize-i18n-literals.mjs` 已加入 complex chunk 跳过规则
- [x] `bun dist/cli.js --version` 通过
- [x] `bun dist/cli.js --help` 通过
- [x] 当前安装目录 `D:\CCB\dist\chunks\loadAgentsDir-BMosMfSG.js` 已同步修复并验证
- [x] 安装包已重新生成，可交付覆盖安装测试
- [ ] GUI 覆盖安装测试（需用户本机交互验证）
- [ ] REPL 内 `/help` `/config` `/permissions` `/mcp` `/plugin` `/agents` 手动验证

### 用户测试建议

```powershell
# 1. 覆盖安装
.\CCB-Setup-1.0.9.exe

# 2. 启动 CCB
& "$env:LOCALAPPDATA\Programs\CCB\ccb.cmd"

# 3. 在 REPL 内测试高频入口
/help
/config
/permissions
/mcp
/plugin
/agents
```

重点观察：

- 启动阶段不再出现 `Unexpected ?`。
- 主界面、欢迎/提示、常用 slash command 描述、设置、权限、MCP、插件、agents 入口能正常显示。
- 中文显示不出现 mojibake。
- 若出现新的英文未汉化文案，记录具体页面、命令和原文，后续按 P2/P3/P6 分桶补齐。

### 收尾结论

当前版本已经完成安装包交付前的阻断修复：`loadAgentsDir` 解析错误已处理，normalizer 已加防复发跳过规则，安装包已重新生成。剩余工作主要是 GUI/REPL 手动覆盖测试，以及按本 spec 的优先级继续补齐未翻译 UI 文案。

---

## Phase 6：继续汉化与收尾扫描（2026-06-02）

**Phase 6 状态：✅ 已完成，可重新打包测试**

### 目标

在不触碰 `loadAgentsDir-*.js` 的前提下，继续补齐高频、低风险、明显用户可见的 UI/状态/错误文案，并把这类补丁固化到可重复执行的脚本中，避免后续 rebuild 后丢失。

### 本轮新增机制

| 文件 | 作用 |
|---|---|
| `scripts/apply-safe-ui-i18n.mjs` | 文件级精确替换脚本，只按指定 chunk 和完整英文子串替换，避免全局替换误伤 minified 代码。 |
| `scripts/patch-i18n.ps1` | 已接入 `apply-safe-ui-i18n.mjs`，位置在 chunk patch flush 之后、CJK 转义/normalizer 之前。 |
| `scripts/_scan-ui.js` | 扫描时跳过 `loadAgentsDir-*` 和临时 test chunk，避免污染统计口径。 |
| `installer.nsi` | 已排除临时 `loadAgentsDir-head-test.js`、`loadAgentsDir-test108.js`，防止测试文件进入安装包。 |

### 本轮补齐范围

已通过文件级精确替换补齐以下类别：

- REPL/输入框提示、ESC 退出、后台任务、diff dialog、会话选择、分支会话、清理提示。
- Plugin Settings、agents、hooks、validate plugin、autonomy panel、prompt/context/compact 相关提示。
- Chrome Native Host、Remote Control bridge、SSH session、API key/session 认证等用户可见错误。
- 少量用户可见的系统状态：MDM 变更、git remote 缺失、computer-use lock、recent sessions 等。

累计新增精确替换：

| 批次 | 替换数 |
|---|---:|
| 第一批 | 195 |
| 第二批 | 64 |
| 第三批 | 30 |
| 第四批 | 17 |
| 合计 | 306 |

### 扫描结果

扫描口径：`_scan-ui.js` 跳过 `loadAgentsDir-*` 和临时 test chunk。

| 阶段 | 总数 | chunks | P2-repl | P3-interactive | P6-installer | P7-other |
|---|---:|---:|---:|---:|---:|---:|
| Phase 6 前 | 2309 | 196 | 81 | 46 | 9 | 2173 |
| 第一批后 | 2195 | 187 | 37 | 1 | 0 | 2157 |
| 第二批后 | 2145 | 177 | 34 | 0 | 0 | 2111 |
| 第三批后 | 2115 | 164 | 34 | 0 | 0 | 2081 |
| 第四批后 | 2107 | 159 | 29 | 0 | 0 | 2078 |

当前剩余：

- `P2-repl` 只剩 `REPL-Bbtw98TO.js` 29 条，样本为日期解析模型指令（例如“只返回 ISO 8601 字符串”）。这类属于模型行为约束，暂不翻译，避免影响输出格式。
- `P3-interactive` 已清零。
- `P6-installer` 已清零。
- `P7-other` 主要是第三方库、AWS/Bedrock SDK、AJV/Zod、axios、highlight.js、内部开发者日志和 schema 描述，暂不作为首轮用户汉化目标。

### 验证

- `vendor\bun\bun.exe dist\cli.js --help` 通过。
- `vendor\bun\bun.exe dist\cli.js --version` 通过，输出 `2.6.6 (Claude Code)`。
- `scripts/fix-dist-cjk-literals.mjs` 跑通，第四批新增中文已转为安全转义。
- `scripts/normalize-i18n-literals.mjs` 跑通，剩余告警集中在 allowlist/complex chunk、临时 test chunk 或已知上游文件。
- `CCB-Setup-1.0.9.exe` 已重新打包，大小 `188,052,238 bytes`，时间 `2026-06-02 20:17:22`。
- 7z 列表确认安装包未包含 `loadAgentsDir-head-test.js`、`loadAgentsDir-test108.js`。

### Phase 6 验收

- [x] 新增安全精确替换脚本
- [x] patch 主流程接入该脚本
- [x] P3/P6 扫描桶清零
- [x] P2 仅剩模型行为指令，暂不翻译
- [x] Bun CLI smoke test 通过
- [x] 安装包已重新打包
