# CCB 终端 TUI 中文乱码排查与修复思路

日期：2026-05-27（更新：2026-05-29）

---

## 背景

CCB 在 Windows 上汉化 Claude Code 欢迎屏、侧边栏提示、底部状态栏等 UI 文案后，出现典型现象：

- 探针 / `console.log` 输出的中文**正常**
- Ink TUI 里的中文显示为 `æ¬¢è¿` / `å¿«é` 这类 **Latin-1 式乱码**
- 即使 `Active code page: 65001`，TUI 仍乱
- **常见变体**：欢迎屏、侧边栏已正常，只有底部一行仍乱，例如 `? å¿«æ·é®`（本应是 `? 快捷键`）

这不是「没装 Windows Terminal」或「字体缺字」那么简单，而是 **Bun 运行时 + dist 汉化写法** 的组合问题。

---

## 先分清三种「乱码」

| 现象 | 更可能原因 | 处理方向 |
|------|------------|----------|
| `æ¬¢è¿` / `å¿«é`（Latin-1 味） | UTF-8 字节被错误解码 | 本文 |
| 问号 / 方块 | 终端 code page 或字体 | `chcp 65001`、换 Cascadia / 等宽字体 |
| 边框 / 图标方块 | 字体不支持 Powerline / 框线字符 | 换 Nerd Font，见终端显示文档 |

**Latin-1 味乱码的特征**：`欢迎回来` 的 UTF-8 字节 `E6 AC A2 E8 BF 8E …` 被当成单字节字符显示，就会得到 `æ¬¢è¿åæ¥`。  
`? å¿«æ·é®` 同理，是 `? 快捷键`（`E5 BF AB E6 8D B7 E9 94 AE`）被误读后的结果。

---

## 排查思路（由浅到深）

### 第 1 步：确认 code page（必要但不充分）

```powershell
chcp
[Console]::OutputEncoding
```

期望：`65001` + UTF-8。

CCB 启动链里应包含：

- `cmd /c "chcp 65001 >nul"`
- `[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)`
- `LANG=zh_CN.UTF-8` 等 locale 变量

**若探针中文已正常、TUI 仍乱 → 不要停在 code page，继续往下查。**

---

### 第 2 步：区分「文件层」和「运行时层」

#### 2a. 文件里写的是不是正确 UTF-8？

```powershell
# 看 chunk 原始字节（示例：欢迎回来）
Format-Hex D:\...\dist\chunk-65nnj3bk.js | Select-Object -First 20
```

正确 UTF-8 应看到类似：`E6 AC A2 E8 BF 8E E5 9B 9E E6 9D A5`（欢迎回来）。

若文件层已是乱码字节 → 问题在 **patch / 构建 / PowerShell 写文件编码**，先修 patch 脚本。

若文件层正确 → 继续 2b。

#### 2b. Bun **import 模块** 后，内存里的字符串对不对？

这是本次问题的**决定性测试**：

```powershell
$bun = "...\vendor\bun\bun.exe"
$chunk = ".../dist/chunk-65nnj3bk.js"

& $bun -e "import { formatWelcomeMessage } from '$chunk'; const m = formatWelcomeMessage(null); console.log(m); console.log([...m].map(c=>'U+'+c.codePointAt(0).toString(16)).join(' '));"
```

| 结果 | 含义 |
|------|------|
| `U+6b22 U+8fce U+56de U+6765`（欢 迎 回 来） | 运行时字符串正确 |
| `U+e6 U+ac U+a2 U+e8 U+bf U+8e …` | **Bun 已把 UTF-8 字面量读成 Latin-1 字节字符** → TUI 必乱 |

对比探针（通常用 `-e "console.log('\u6b22\u8fce...')"`）：

- `\uXXXX` 写在 **ASCII 源码**里 → Bun 解析正确 → 探针正常
- `"欢迎回来！"` 写在 **UTF-8 字面量**里 → Bun 在 Windows 上 import 时可能读错 → TUI 乱

**关键结论**：同一窗口里「探针正常 + TUI 乱」并不矛盾，说明问题不在终端，而在 **dist 字符串如何被 Bun 加载**。

#### 2c. 「大部分正常、只有底部一行乱」→ 查另一个 chunk

欢迎屏修好后仍见底部 `? å¿«æ·é®`，说明 **还有别的 dist 文件含 UTF-8 字面量**，不在 welcome 那三个 chunk 里。

底部快捷键提示在：

```text
ccb-installer/dist/chunk-avnn2wav.js
  children: "? 快捷键"   ← 应规范化为 "? \u5feb\u6377\u952e"
  （搜索关键字：shortcuts-hint）
```

**经验**：按 UI 区域反查 chunk，不要假设「欢迎屏 chunk 修完 = 全 UI 修完」。

---

### 第 3 步：排除 Ink / 备用屏等干扰（可选）

曾怀疑 alternate screen、同步输出（`DECSET 2026`）、raw mode 等改变编码路径。

实测在简单脚本里模拟 Ink 写屏 + 中文，在 code page 65001 下仍可正常显示。  
因此 **主因不是 Ink 单独写坏编码**，而是 **传给 Ink 的字符串在 import 阶段已经损坏**。

---

## 根因（最终结论）

```
dist/chunk-*.js 里用 UTF-8 字面量写中文
        ↓
Bun 在 Windows 上 import 该 .js 模块
        ↓
字符串在内存中已是 æ¬¢è¿… / å¿«æ…（Latin-1 误读）
        ↓
Ink TUI 原样渲染 → 用户看到乱码
```

`chcp 65001` 只影响控制台如何显示**已正确的 Unicode**；若 JS 字符串本身已错，改 code page 无效。

这与 Claude Code 社区在 Windows 上报告的 TUI Unicode 问题方向一致：**问题出在 bundled JS 字符串 + Windows 上 Bun/终端栈的组合，而不是用户 locale 设错一项就能好**。

---

## 修复方案

### 原则

**汉化写入 dist 时，禁止 UTF-8 字面量中文，一律用 JavaScript `\uXXXX` 转义（源码保持 ASCII）。**

示例：

```javascript
// ❌ 错误：Bun import 后在 Windows 可能乱码
return "欢迎回来！";

// ✅ 正确
return "\u6b22\u8fce\u56de\u6765\uff01";
```

模板字符串同理：

```javascript
return `\u6b22\u8fce\u56de\u6765\uff0c${username}\uff01`;
```

底部 footer 示例：

```javascript
// ❌ 错误
children: "? 快捷键"

// ✅ 正确
children: "? \u5feb\u6377\u952e"
```

### CCB 仓库里的实现

| 文件 | 作用 |
|------|------|
| `ccb-installer/scripts/patch-i18n.ps1` | 英文 → 中文（`\u` 转义）；脚本本身 ASCII-only |
| `ccb-installer/scripts/normalize-i18n-literals.mjs` | 扫描 dist 里所有含 CJK 的 `chunk-*.js`，把 UTF-8 字面量批量转成 `\u` |
| `ccb-installer/dist/chunk-65nnj3bk.js` | 欢迎语、API 用量计费等 |
| `ccb-installer/dist/chunk-qkhazzm0.js` | 快速入门、最近活动等 |
| `ccb-installer/dist/chunk-smxezvfx.js` | /init 引导文案 |
| `ccb-installer/dist/chunk-avnn2wav.js` | **主 TUI**：底部 `? 快捷键`、Esc 取消、Enter 查看、对话框 hint 等 |
| `ccb-installer/dist/chunk-xg5k46jr.js` 等 | 工具摘要（读取文件、写入文件等），按需被 normalizer 自动发现 |

流程：

```text
patch-i18n.ps1（替换英文字符串，ASCII-only）
    → normalize-i18n-literals.mjs（全 dist 扫 chunk-*.js，清掉字面量 CJK）
    → Test-NoLiteralCjkInPatchedChunks（所有 chunk-*.js 不得残留字面量中文）
    → Test-BunParsesWelcomeMessage（import 后 code point 必须是 0x6B22）
```

### normalizer 实现要点（2026-05-29 补充）

1. **扫描范围**：固定列表 + 自动发现  
   凡 `dist/chunk-*.js` 文件内容含 CJK，都纳入规范化（不只 welcome 三个 chunk）。

2. **正则不能跨行**（重要）  
   Claude Code 的 chunk 是多行 JSX 编译产物。若用：

   ```javascript
   /"((?:\\.|[^"\\])*)"/g   // ❌ [^"\\] 会吃掉换行，跨行误匹配，漏掉短字符串
   ```

   会把从很远的 `"` 到 `"? 快捷键"` 之间的整段当成一个字符串，导致 **`"? 快捷键"` 从未被单独转义**。  
   正确写法：

   ```javascript
   /"((?:\\.|[^"\\\r\n])*)"/g   // ✅ 双引号字符串不跨行
   /`((?:\\.|[^`\\\r\n]|(\$\{[^}]*\}))*)`/g   // ✅ 模板字符串同理
   ```

3. **多轮迭代**：`normalizeDoubleQuoted` → `normalizeTemplateLiteral` 重复最多 5 轮，直到稳定。

### 构建 / 测试时注意

1. **改 dist 后必须跑** `.\scripts\patch-i18n.ps1`
2. **本地终端测试** `.\scripts\test-terminal-local.ps1 -PrepareOnly` 会在复制沙盒后自动再跑一遍 patch
3. **打安装包前** 确认 `installer.nsi` 同时打包 `patch-i18n.ps1` 和 `normalize-i18n-literals.mjs`

---

## 推荐验证命令

```powershell
cd D:\Projects\claude-code-best\ccb-installer

# 1. 规范化 + 门禁
.\scripts\patch-i18n.ps1

# 2. 准备沙盒
.\scripts\test-terminal-local.ps1 -PrepareOnly

# 3. 交互目测（WT）
.\scripts\test-terminal-local.ps1 -Mode Modern -EncodingProbe
```

WT 窗口期望：

```text
Active code page: 65001
[CCB UTF-8 probe] 中文编码测试：欢迎回来     ← 探针正常
欢迎回来！ / 快速入门提示 / API 用量计费      ← 欢迎区正常
? 快捷键                                      ← 底部 footer 也应正常（不是 ? å¿«æ·é®）
```

Bun 门禁（脚本内已做，也可手跑）：

```text
formatWelcomeMessage(null) 第一个码位 = 6b22（欢）
```

可选：确认 footer 源码已转义：

```powershell
Select-String -Path dist\chunk-avnn2wav.js -Pattern '5feb\\6377\\952e|shortcuts-hint'
# 应看到 children: "? \u5feb\u6377\u952e"
```

---

## 踩坑记录

### 坑 1：以为 `chcp 65001` 修好了，其实只修了探针

探针用 `\u` 转义或 PowerShell UTF-8 输出，不经过「import 含字面量的 chunk」这条路径。  
**必须做 Bun import 测试，不能只看探针。**

### 坑 2：`patch-i18n.ps1` 里直接写中文键名

PowerShell 脚本若含 UTF-8 中文字面量，在 GBK 控制台下键名会损坏，Replace 匹配失败。  
**patch 脚本保持 ASCII-only；中文只出现在 `\u` 转义或 Bun normalizer 处理的 dist 里。**

### 坑 3：dist 文件「看起来是中文」≠ 运行时正确

编辑器 / `grep` 显示 `欢迎回来` 只说明 **磁盘 UTF-8 正确**。  
**最终以 Bun import 的 code point 为准。**

### 坑 4：只改 launcher 不改 dist

`launch-ccb.ps1`、`chcp 65001`、locale 变量都值得保留，但 **解决不了字面量 import 问题**。  
launcher 与 dist 转义是两层防护，不能互相替代。

### 坑 5：测试沙盒未跑 patch

若 `test-terminal-local.ps1` 只复制 dist、不跑 `patch-i18n.ps1`，可能测到旧字面量。  
现已在沙盒 `Copy-Item` 后自动执行 patch。

### 坑 6：只规范化 welcome 三个 chunk，底部仍乱

早期只处理 `chunk-65nnj3bk.js`、`chunk-qkhazzm0.js`、`chunk-smxezvfx.js`。  
欢迎屏正常后，**底部 `? 快捷键` 仍在 `chunk-avnn2wav.js`**，必须纳入 normalizer 或扩大自动扫描。

典型用户反馈：「其他都很好，就最下面一行乱码」→ 优先查 **avnn2wav** 及 normalizer 是否跑全。

### 坑 7：normalizer 正则跨行误匹配

在多行 chunk 上对全文件跑 `"((?:\\.|[^"\\])*)"` 时，可能 0 次命中 CJK 字面量，但文件里明明有 `"? 快捷键"`。  
**修复**：禁止 `\r` / `\n` 出现在字符类里（见上文 normalizer 要点）。

---

## 与其他 CCB 终端问题的关系

| 文档 / 问题 | 关系 |
|-------------|------|
| [CCB终端鼠标滑轮问题解决方案.md](./CCB终端鼠标滑轮问题解决方案.md) | 鼠标 / 滚轮 / 选字；与中文乱码独立 |
| [00_CCB打包MCP正确路径.md](./00_CCB打包MCP正确路径.md) | MCP 路径；与 TUI 编码无关 |
| `docs/终端显示乱码修复.md` | 终端 / 字体 / 兼容模式总览；本文是其中 **TUI 汉化专项** |

公司电脑若同时有「滚轮翻历史 + 中文乱码」，应 **分开排查**：  
乱码先按本文修 dist；交互问题再试 Flat / Safe / Text 模式。

---

## 一句话总结

> **Windows 上 CCB 的 TUI 中文乱码，优先怀疑 dist 里用了 UTF-8 字面量而非 `\u` 转义；用 Bun import 验证 code point，而不是只看 `chcp 65001` 或探针 `console.log`。欢迎屏修好后若底部仍乱，查 `chunk-avnn2wav.js` 并确保 normalizer 扫全 `chunk-*.js`、且正则不跨行。**
