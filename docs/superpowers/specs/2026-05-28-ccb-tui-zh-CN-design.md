# CCB TUI 汉化设计方案

> **目标**：在不修改上游 CCB 源码的前提下，为 CCB installer 构建一个可维护的中文翻译层。
> **版本**：v2（修正技术路线）
> **日期**：2026-05-28

## 0. 技术调研结论（路线修正依据）

通过实际分析 CCB `dist/` 目录，确认以下关键事实：

| 发现 | 影响 |
|------|------|
| `ThemedText` 在 minify 后仍命名清晰 | React 组件层字符串可定位 |
| `jsxDEV` 是所有 React 元素创建的单点 | 但各 chunk 独立 require，无法全局可靠 patch |
| chunk-xg5k46jr.js 有 **6.6MB**，包含大量 command description 纯 JS 对象 | 这些字符串不走 React 组件渲染，component-level patch 失效 |
| 无中心化 MESSAGES 常量 | 字符串散布在 JSX props、对象属性、字面量中 |
| 字符串存在拼接模式 | 如 `["Press ", keyName, " again to exit"]` 不能简单整体替换 |

**关键结论**：在预构建的 minified bundle 上做运行时 Monkey Patch 可靠性极低。最实际的路径是 **build 时静态字符串替换**。这不影响方案的整体架构设计，只是 patch 生成时机从"运行时注入"改为"构建时生成替换产物"。

## 1. 背景与动机

CCB installer 的 `dist/` 目录是 CCB 的预构建 JS bundle，所有 UI 字符串以硬编码字面量散布在 130+ 个 chunk 文件中。当前没有任何 i18n 机制。

现有的 CCB installer 已有版本管理意识（配置保留、preflight 校验、分层降级），汉化方案需要与之对齐：
- 上游 CCB 频繁更新，不能每次人工 diff
- 用户拿到的是打包后的 installer，不应有多余操作步骤
- 翻译维护者可能不懂构建，需要低门槛参与

## 2. 方案选型

**采用方案 A（翻译与代码解耦）+ 方案 C（分发整合）**

### 核心机制：构建时静态字符串替换

在 CCB installer 打包流程中，增设一个 post-patch 步骤：

1. `build-locale.js` 读取 `zh_CN.json` 翻译表
2. 遍历 `dist/chunk-*.js`，用**精确字符串替换**（replace exact literal）
3. 生成汉化后的 chunk 文件，打入 installer

**关键**：替换的是字面量字符串，不改代码结构。每次上游更新后，重新运行替换脚本即可。

### 为什么不采用运行时 Monkey Patch

| 方案 | 问题 |
|------|------|
| Patch `jsxDEV` | 各 chunk 独立 require，无法全局拦截 |
| Patch `ThemedText` | 不覆盖纯 JS 对象字符串（command description 等） |
| Patch 全局变量 | CCB 无中心化字符串常量 |
| 直接改 chunk | CCB 版本更新后需重新替换，维护成本高 |

静态替换在构建时完成，用户安装的就是汉化版产物，与 CCB 源码完全解耦。

### 翻译表格式

使用**语义 key + 原文 + 译文分离**的格式，便于版本变化检测：

```jsonc
{
  "_meta": {
    "ccb_version": "2.1.888",  // 翻译表基于的 CCB 版本
    "locale": "zh_CN",
    "generated_at": "2026-05-28"
  },
  // 语义 key 便于索引，原文便于变化检测，译文即翻译内容
  "input.placeholder.accept": {
    "en": "tell Claude what to do next",
    "zh": "告诉 Claude 要做什么"
  },
  "input.placeholder.reject": {
    "en": "tell Claude what to do differently",
    "zh": "告诉 Claude 要做什么调整"
  },
  "welcome.title": {
    "en": "Welcome to Claude Code for ",
    "zh": "欢迎使用 Claude Code"
  },
  "prompt.needs_input": {
    "en": "Claude Code needs your input",
    "zh": "Claude Code 需要您的输入"
  },
  "session.no_bg_agents": {
    "en": "No background agents running",
    "zh": "无后台 agent 在运行"
  },
  "perm.denied_hook": {
    "en": "Permission denied by hook",
    "zh": "Hook 拒绝了权限"
  },
  "perm.user_denied": {
    "en": "User denied permission",
    "zh": "用户拒绝了权限"
  },
  "error.user_aborted": {
    "en": "User aborted",
    "zh": "用户已中止"
  },
  "error.unknown": {
    "en": "Unknown error",
    "zh": "未知错误"
  },
  "error.websocket": {
    "en": "WebSocket connection error",
    "zh": "WebSocket 连接错误"
  },
  "nav.enter_select": {
    "en": "Enter to select",
    "zh": "按 Enter 选择"
  },
  "nav.press_up_queue": {
    "en": "Press Up to edit queued messages",
    "zh": "按 ↑ 编辑队列消息"
  },
  "tip.ide_connect": {
    "en": "Use /ide to connect Claude to your IDE",
    "zh": "使用 /ide 连接 Claude 到您的 IDE"
  },
  "cmd.add_dir": {
    "en": "Add a new working directory",
    "zh": "添加新的工作目录"
  },
  "cmd.btw": {
    "en": "Ask a quick side question without interrupting the main conversation",
    "zh": "快速提问，不中断主对话"
  },
  "plan.enter_prompt": {
    "en": "Claude wants to enter plan mode to explore and design an implementation approach.",
    "zh": "Claude 想要进入计划模式，探索并设计实现方案。"
  },
  "plan.confirm_proceed": {
    "en": "Claude has written up a plan and is ready to execute. Would you like to proceed?",
    "zh": "Claude 已制定了计划并准备执行。是否继续？"
  },
  "plan.ultraplan_refine": {
    "en": "No, refine with Ultraplan on Claude Code on the web",
    "zh": "不，在 Claude Code 网页版使用 Ultraplan 优化"
  },
  "plan.tell_change": {
    "en": "Tell Claude what to change",
    "zh": "告诉 Claude 需要修改什么"
  },
  "toggle.thinking": {
    "en": "Toggle thinking mode",
    "zh": "切换思考模式"
  },
  "remote.reconnecting": {
    "en": "Remote Control reconnecting",
    "zh": "远程控制重新连接中"
  },
  "example.fix_typecheck": {
    "en": "fix typecheck errors",
    "zh": "修复类型检查错误"
  },
  "example.log_error": {
    "en": "how do I log an error?",
    "zh": "如何记录错误？"
  },
  "tip.terminal_setup": {
    "en": "Run /terminal-setup...",
    "zh": "运行 /terminal-setup..."
  },
  "tip.memory": {
    "en": "Use /memory to view and manage Claude memory",
    "zh": "使用 /memory 查看和管理 Claude 记忆"
  },
  "tip.multi_session": {
    "en": "Running multiple Claude sessions? Use /color and /rename...",
    "zh": "运行多个 Claude Code 会话？使用 /color 和 /rename..."
  },
  "tip.enter_queue": {
    "en": "Hit Enter to queue up additional messages...",
    "zh": "按 Enter 将消息加入队列..."
  },
  "dialog.press_x_exit": {
    "en": "Press X again to exit",
    "zh": "再次按 X 退出"
  },
  "perm.make_edit": {
    "en": "Do you want to make this edit to",
    "zh": "是否进行此编辑"
  },
  "perm.allow_all": {
    "en": "Yes, allow all edits in",
    "zh": "是，允许对该目录的所有编辑"
  },
  "perm.allow_session_settings": {
    "en": "Yes, and allow Claude to edit its own settings for this session",
    "zh": "是，同时允许 Claude 在本会话中修改自己的设置"
  },
  "deferred.tools_note": {
    "en": "Deferred tools appear by name in <system-reminder> messages.",
    "zh": "延迟工具会以名称形式出现在 <system-reminder> 消息中。"
  },
  "session.continue_previous": {
    "en": "Continue from where you left off.",
    "zh": "从上次中断处继续。"
  },
  "coordinator.enter_mode": {
    "en": "Entered coordinator mode to match resumed session.",
    "zh": "已进入协调模式以匹配恢复的会话。"
  }
}
```

**版本变化检测**：`update-strings.js` 对比 `zh_CN.json` 中的 `en` 字段与 chunk 中实际字符串，若 `en` 值在 chunk 中找不到（被改了），则标记为"可能已变更，需复查"。

## 3. 架构设计

```
ccb-installer/
  translations/
    zh_CN.json          ← 翻译表（唯一维护对象）
    README.md            ← 贡献指南，说明 key 命名规则
  scripts/
    extract-strings.js  ← 从 chunk 文件提取可翻译字符串，生成初始模板
    build-locale.js      ← 读取翻译表，生成汉化 chunk 文件到 dist-zh/
    update-strings.js    ← 对比新旧版本 chunk，提示变更
  dist/                  ← 原版 CCB chunk 文件（不修改）
  dist-zh/               ← 汉化后的 chunk 文件（build-locale.js 生成）
  ccb.cmd                ← 保留原版 launcher
  ccb-zh.cmd             ← 汉化版 launcher（复制 ccb.cmd，设 CCB_LANG=zh_CN）
  installer.nsi           ← 增加中文版打包配置
```

**分发方式**：`dist-zh/` 目录打入 NSIS installer，生成 `CCB-Setup-CN-x.x.x.exe`。

**双版本共存**：用户安装后同时拥有 `ccb.cmd`（原版）和 `ccb-zh.cmd`（汉化版），按需选择。

## 4. 构建脚本设计

### build-locale.js

```javascript
// 输入：zh_CN.json（翻译表）+ dist/（原版 chunk）
// 输出：dist-zh/（汉化后的 chunk）
// 流程：
// 1. 读取 zh_CN.json，跳过 _meta 提取所有条目
// 2. 复制 dist/ 到 dist-zh/
// 3. 遍历每个 chunk 文件，对每个条目的 en 值做精确 replace
// 4. 拼接模式（如 ["Press ", keyName, " again to exit"]）不做替换，跳过
// 5. 报告替换了多少处、多少文件、多少 key 未命中
// 6. 写入 dist-zh/ 对应文件
```

**未命中的 key**：输出警告，指出该字符串在 chunk 中未找到（可能被上游改名或删除）。不影响其他翻译继续。

**防止误替换**：只替换 JS 字符串字面量（用正则精确匹配 `"原文字符串"` 或 `'原文字符串'`），不匹配注释、变量名。

### extract-strings.js

```javascript
// 输入：dist/
// 输出：translations/zh_CN.json.template（初始模板）
// 流程：
// 1. 遍历所有 chunk 文件
// 2. 用正则提取 JS 字符串字面量（长度 5-500 字符，纯字母/数字/标点）
// 3. 过滤技术字符串（URL、路径、正则、错误码）
// 4. 按出现文件+行号去重
// 5. 生成模板 JSON，key 用语义短名 human-readable slug
// 6. 标注：用户需人工填 zh 字段
```

### update-strings.js

```javascript
// 输入：旧 zh_CN.json + 新版 dist/
// 输出：变更报告
// 检测内容：
// - 新增 key：模板中有但翻译表中没有 en 值的条目
// - 变更 key：en 值与 chunk 中实际字符串不匹配的条目
// - 删除 key：翻译表中有 en 值但 chunk 中找不到的条目
// 限制：拼接类字符串无法可靠检测，需人工验收
```

## 5. 翻译优先级

### 高优先级（核心 UI，~20 个）

| 类别 | 数量 |
|------|------|
| 输入框提示 | 2 |
| 权限提示 | 4 |
| 错误信息 | 4 |
| 键盘导航 | 3 |
| Plan mode | 4 |

### 中优先级（引导语、Tips，~20 个）

| 类别 | 数量 |
|------|------|
| Onboarding tips | 5 |
| Session tips | 4 |
| Example commands | 3 |
| Remote control | 2 |

### 低优先级

保持英文，避免机器翻译感。不纳入初始版本。

## 6. 维护流程

### 上游 CCB 更新时

```
1. 解压新版 CCB 到 dist/
2. 运行 scripts/update-strings.js --diff
   → 报告：新增 key、变更 key、删除 key
3. 人工翻译新增 key，复查变更 key
4. 编辑 zh_CN.json
5. 运行 scripts/build-locale.js
   → 生成 dist-zh/
   → 报告替换结果（命中/未命中）
6. 重新打包 installer
```

### 局限性声明

- `update-strings.js` 是启发式的，不能检测到所有变化
- 上游修改已有字符串时，只标记为"可能变更"，需人工判断
- 拼接类字符串（如含变量名的复合文本）无法被检测
- **每次更新后必须人工验收关键 UI**，不能完全依赖自动化

## 7. ccb.cmd / ccb-zh.cmd 修改

原版 `ccb.cmd` 保持不变。新增 `ccb-zh.cmd`：

```batch
@echo off
:: 复制 ccb.cmd 全部内容，追加以下行：
set "CCB_LANG=zh_CN"
```

打包 installer 时同时包含两个 launcher。

## 8. 风险与限制

| 风险 | 缓解措施 |
|------|---------|
| 上游改名导致 key 静默失效 | `build-locale.js` 报告未命中 key；用户可在 debug log 中观察 |
| chunk 文件名/结构变化 | 静态替换不依赖内部结构，只做字面量替换，稳健 |
| 翻译表 key 与 chunk 实际字符串不一致 | `update-strings.js` 检测 `en` 字段变化；版本锁定（`ccb_version`）提示用户 |
| 上游修改已有字符串检测不到 | 局限性声明；建议用户每次更新后对比新旧 UI 输出 |
| 拼接类字符串无法翻译 | 不纳入高优先级，用户可通过 `--debug-file` 观察原始字符串 |

### 版本锁定策略

`_meta.ccb_version` 字段记录翻译表基于的 CCB 版本。打包 installer 时：
1. 读取 `CCB_VERSION`（ccb.cmd 调用 `bun cli.js --version` 获得）
2. 与 `_meta.ccb_version` 比对
3. 不匹配时在启动日志输出一行：`[CCB-LOCALE] Warning: translation table based on 2.1.888, CCB version is X.X.X. Some strings may show English.`

用户知情优于静默降级。

## 9. 工作量估算（修订）

| 阶段 | 工作量 | 说明 |
|------|--------|------|
| POC：验证字符串替换可行性 | **1-2 小时** | 写 extract-strings.js，从 1 个 chunk 抽 5 个字符串验证替换有效 |
| 翻译 ~40 个核心字符串 | 1-2 小时 | 人工翻译，填入 zh 字段 |
| 实现 build-locale.js | 1-2 小时 | PowerShell/Bun 脚本，精确 replace |
| 实现 extract-strings.js | 2-3 小时 | 复杂正则，启发式过滤 |
| 实现 update-strings.js | 2-3 小时 | diff 逻辑 + 报告生成 |
| 修改 NSIS 打包配置 + 测试 | 1-2 小时 | 增加中文版 installer |
| **总计** | **8-14 小时** | 上限更保守，拆分 POC 更实际 |

**修订原因**：初始估算假设 Monkey Patch 机制清晰。实际因改用静态替换，脚本实现工作量比预想大，尤其是 extract-strings.js 的正则部分。

## 10. 后续扩展

- **其他语言**：只需新建 `translations/ja_JP.json` / `translations/ko_KR.json`
- **用户自定义翻译**：支持 `~/.claude/translations/zh_CN.json` 覆盖内置翻译（`build-locale.js` 读取时优先用户目录）
- **社区贡献**：独立翻译表文件，PR 只改 JSON，不需要动代码