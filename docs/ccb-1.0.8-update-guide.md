# CCB 1.0.8 / 1.0.9 版本升级与汉化维护指南

本文记录从 CCB 1.0.7 升级到 1.0.8/1.0.9 的完整过程，重点说明 Vite code splitting 带来的工具链变化、汉化脚本的优化方法，以及上游 v2.6.6 引入的运行时 bug 的修复。供下次升级参考。

---

## 版本变化概览

| 项目 | 1.0.7 | 1.0.8 | 1.0.9 |
|------|-------|-------|-------|
| 上游版本 | v1.x | v2.6.6 | v2.6.6 |
| chunk 位置 | `dist/chunk-*.js` | `dist/chunks/*.js` | `dist/chunks/*.js` |
| chunk 命名 | `chunk-随机hash.js` | `语义名-hash.js` | `语义名-hash.js` |
| chunk 数量 | 534 | 642 | 642 |
| 字符串引号 | `name: "..."` | `` name:`...` `` | `` name:`...` `` |
| Bun 内存占用 | ~966 MB | ~35 MB | ~35 MB |
| patch 耗时 | 5–8 分钟 | < 10 秒 | < 10 秒 |
| 启动崩溃修复 | — | ❌ 存在 | ✅ 已修复 |
| Config 守卫修复 | — | ❌ 存在 | ✅ 已修复 |
| 主界面 UI 汉化 | ✅ | ❌ 全部 miss | ✅ 新增 33 条 |

---

## 升级流程（每次升级执行）

### 第一步：同步上游代码

```powershell
cd D:\Projects\claude-code

# 拉取上游最新
git fetch upstream
git stash
git merge upstream/main --no-edit

# 解决冲突（源码文件取 upstream，.gitignore 保留双方规则）
# 恢复本地设置
git stash pop

# 重新安装依赖（每次合并后必须执行）
bun install
```

详见 `docs/upstream-sync-guide.md`。

### 第二步：编译新版源码

```powershell
cd D:\Projects\claude-code
bun run build:vite
```

输出在 `dist/chunks/`（新版）或 `dist/chunk-*.js`（旧版）。

### 第三步：复制 dist 到 ccb-installer

```powershell
$src = "D:\Projects\claude-code\dist"
$dst = "D:\Projects\claude-code-best\ccb-installer\dist"

Remove-Item $dst -Recurse -Force
New-Item -ItemType Directory -Path $dst | Out-Null
Copy-Item "$src\cli.js"      $dst -Force
Copy-Item "$src\cli-bun.js"  $dst -Force
Copy-Item "$src\cli-node.js" $dst -Force
Copy-Item "$src\chunks"      "$dst\chunks" -Recurse -Force
Copy-Item "$src\vendor"      "$dst\vendor" -Recurse -Force -ErrorAction SilentlyContinue
```

### 第四步：运行汉化补丁

```powershell
cd D:\Projects\claude-code-best\ccb-installer
.\scripts\patch-i18n.ps1 -DistDir ".\dist"
```

正常输出：

```
=== CCB i18n patch ===
Chunks: ...\dist\chunks
  [cache] Loaded 642 chunks into memory
  Flushed N modified chunks to disk.
[slash-i18n] patched N commands across N files
[slash-i18n] OK
[ok] i18n literals normalized
Done.
```

### 第五步：更新版本号

**installer.nsi**（第11行）：
```nsi
!define VERSIONBUILD 9   ← 改这里（当前为 1.0.9）
```

**build.ps1**（第104行）：
```powershell
$installerName = "CCB-Setup-1.0.9.exe"   ← 改这里
```

### 第六步：构建安装包

```powershell
.\build.ps1
```

输出 `CCB-Setup-1.0.9.exe`，约 180 MB。

---

## 工具链适配说明（1.0.8/1.0.9 的核心改动）

### patch-i18n.ps1

**内存缓存优化**

旧版每个 map 调用 `Patch-AllChunks` 都读写一遍全部文件（72 × 642 = 46,224 次 I/O）。
新版改为：

```powershell
# 第一次调用时把全部 chunk 读入内存
$script:_chunkCache = Dictionary[string,string]

# 72 个 map 全部在内存里操作

# 最后统一写回磁盘
Flush-ChunkCache
```

速度从 5–8 分钟降至 10 秒以内。

**自适应 chunk 路径**

```powershell
$ChunksDir = Join-Path $DistDir "chunks"
if (-not (Test-Path $ChunksDir)) { $ChunksDir = $DistDir }
```

自动兼容新版（子目录）和旧版（根目录）两种布局。

**验证函数动态查找 chunk**

三个验证函数均改为动态查找，不再依赖写死的文件名：

```powershell
# 查找 welcome message 所在 chunk
$chunkPath = Get-ChildItem -LiteralPath $ChunksDir -Filter '*.js' |
    Where-Object { $content -match 'formatWelcomeMessage' } |
    Select-Object -First 1 -ExpandProperty FullName

# 查找 slash command registry 所在 chunk
$chunkPath = Get-ChildItem -LiteralPath $ChunksDir -Filter '*.js' |
    Where-Object { $c -match 'name: "add-dir"' -or $c -match 'name:`add-dir`' } |
    Select-Object -First 1 -ExpandProperty FullName
```

**正则修复**

`Test-NoMixedSplitFragments` 里的 pattern 必须用 `\\uXXXX`（匹配 ASCII 字面量），不能用 `\uXXXX`（匹配 Unicode 字符）：

```powershell
# 错误（匹配 Unicode 字符 按，不匹配文件里的 按）
'按[^"]{0,120}" anytime"'

# 正确（匹配 ASCII 字符串 按）
'\\u6309[^"]{0,120}" anytime"'
```

### apply-slash-command-i18n.mjs

**动态 chunk 查找**

```javascript
const chunksDir = existsSync(join(distDir, "chunks"))
  ? join(distDir, "chunks") : distDir;

function findChunkContaining(marker) {
  for (const f of readdirSync(chunksDir).filter(f => f.endsWith(".js"))) {
    if (readFileSync(join(chunksDir, f), "utf8").includes(marker)) return join(chunksDir, f);
  }
  return null;
}

// 用 command name 而不是 description 做标记（name 不会被 patch 替换）
const chunkPath = findChunkContaining('name: "add-dir"') || findChunkContaining("name:`add-dir`");
const efPath = findChunkContaining("name:`schedule`") || findChunkContaining('name: "schedule"');
```

**直接正则替换（不依赖 registry）**

新版完全重写，直接从 chunk 里正则匹配英文描述并替换，不再依赖 `slash-commands-registry.json`：

```javascript
// 支持双引号格式（旧版）
const re1 = /name: "cmdname"[\s\S]{0,300}?description: "([^"]*)"/m;
// 支持反引号格式（新版）
const re2 = /name:`cmdname`[^}]{0,300}?description:`([^`]*)`/m;
```

**1.0.9 新增：backtick 格式统一用 `\uXXXX` 转义**

1.0.8 中 backtick 格式直接插入原始汉字，导致 `normalize-i18n-literals.mjs` 需要二次处理该文件。normalize 的 dotall 正则在处理含嵌套 `${}` 的复杂 template literal 时存在边界情况。

1.0.9 修复：新增 `escJsBacktick()` 函数，所有中文在写入 backtick 字符串前统一转为 `\uXXXX`，normalize 不再需要处理该文件：

```javascript
function escJsBacktick(s) {
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp > 127) out += "\\u" + cp.toString(16).padStart(4, "0");
    else if (ch === "\\") out += "\\\\";
    else if (ch === "`") out += "\\`";
    else out += ch;
  }
  return out;
}
// backtick 替换时使用：
content = content.replace(re2, `$1\`${escJsBacktick(zh)}\``);
```

**不要把源码模板变量写入翻译文本**

斜杠命令描述来自打包后的运行时代码。翻译表里的值会直接替换到 `description` 字段里，因此不能保留上游源码里的模板变量，例如：

```text
${CCR_TERMS_URL}
${CCR_TERMS_URL2}
```

这类变量在源码模块里可能存在，但在被替换后的 chunk 作用域中不一定可见。1.0.8 曾因 `/ultrareview` 和 `/ultraplan` 的汉化描述保留这些变量，导致启动时加载 `loadAgentsDir-*.js` 直接抛出 `ReferenceError`。

处理方式：

```javascript
function cleanupUnsafeRuntimeTemplateVars(content) {
  return content
    .replace(/\$\{CCR_TERMS_URL\}/g, "https://code.claude.com/docs/en/claude-code-on-the-web")
    .replace(/\$\{CCR_TERMS_URL2\}/g, "https://code.claude.com/docs/en/claude-code-on-the-web");
}
```

翻译表中也应使用纯文本或 `\\uXXXX` 字面量，不要出现 `${...}`：

```json
"ultrareview": "~10\\u201320 \\u5206\\u949f \\u00b7 \\u5728 Claude Code \\u7f51\\u9875\\u7248\\u67e5\\u627e\\u5e76\\u9a8c\\u8bc1\\u5206\\u652f\\u4e2d\\u7684 bug",
"ultraplan": "~10\\u201330 \\u5206\\u949f \\u00b7 Claude Code \\u7f51\\u9875\\u7248\\u8d77\\u8349\\u9ad8\\u7ea7\\u8ba1\\u5212\\uff0c\\u53ef\\u7f16\\u8f91\\u540e\\u6279\\u51c6"
```

### normalize-i18n-literals.mjs

**自适应 chunk 路径 + 支持换行的 template literal**

```javascript
const chunksDir = existsSync(join(distDir, "chunks"))
  ? join(distDir, "chunks") : distDir;

// 旧版不支持换行
/`((?:\\.|[^`\\\r\n]|(\$\{[^}]*\}))*)`/g

// 新版支持换行
/`((?:\\[\s\S]|[^`\\])*)`/g
```

### patch-i18n.ps1（1.0.9 新增）

**PowerShell 5.1 normalize stderr 问题**

normalize 脚本发现剩余 CJK 时调用 `console.warn`（写 stderr）。PowerShell 5.1 在 `$ErrorActionPreference = "Stop"` 下把 native 进程的 stderr 当作 NativeCommandError，终止脚本。

修复：用 `try/catch` 包围 normalize 调用，捕获 NativeCommandError 但继续检查 exit code：

```powershell
try {
    & $BunExe $NormalizeScript $DistDir 2>&1 | ForEach-Object { Write-Host $_ }
} catch {
    Write-Host "  [note] normalize warning: $_" -ForegroundColor Yellow
}
if ($LASTEXITCODE -ne 0) { throw "normalize failed" }
```

**上游新增文件白名单**

v2.6.6 新增的 skill 功能文件（`skillGapStore-*`, `skillPanel-*`, `skillSearchPanel-*`）和 `sessionObserver-*` 包含上游中文（skill 描述、用户指令检测正则）。`schemas-*` 包含 zod 验证库的日文。这些需要加入 `knownUpstreamCjkFiles` 白名单：

```powershell
$knownUpstreamCjkFiles = @(
    'useVoice-',        # 语言名称列表
    'intl-',            # 国际化字符串
    'schemas-',         # Zod 验证库日文
    'sessionObserver-', # 用户指令检测正则（含中文）
    'skillGapStore-',   # v2.6.6 Skill 功能
    'skillPanel-',      # v2.6.6 Skill 功能
    'skillSearchPanel-' # v2.6.6 Skill 功能
)
```

**React Context 修复（v2.6.6 上游 bug）**

v2.6.6 的 `loadAgentsDir-*.js` chunk 因 Vite 代码分包，出现两套 AppState 实现共存：

- `mA` 模块：`Z2e = createContext(null)` → `uA()` / `hA()` 使用
- `EA` 模块：`wA = createContext(null)` → `AppStateProvider (a4e)` 提供

`h5e` 组件通过 `hA() → uA() → Z2e` 读取 context，但 Provider 只提供 `wA`，两者是不同对象，导致 `useContext(Z2e)` 永远返回 null，应用启动崩溃：

```
ERROR  useAppState/useSetAppState cannot be called outside of an <AppStateProvider />
```

**根本原因**：Vite 分包后同一模块被打包进不同 chunk，产生两份 `createContext(null)` 调用，生成两个不同的 context 对象。

**修复方案**：在 `mA` 模块初始化时复用 `EA` 已创建的 `wA` context。渲染顺序保证 `EA`（AppStateProvider）先于 `mA`（h5e）初始化，因此 `wA` 在 `mA` 运行时已存在：

```javascript
// 原来（总是创建新 context，导致 Z2e !== wA）
Z2e=pA.createContext(null),pA.createContext(!1)

// 修复（复用 wA，使 Z2e === wA）
Z2e=wA||pA.createContext(null),pA.createContext(!1)
```

该修复已写入 `patch-i18n.ps1`，会自动应用到所有含此模式的 chunk：

```powershell
$chunkReactCtxFix = New-ReplacementMap
$chunkReactCtxFix['Z2e=pA.createContext(null),pA.createContext(!1)'] = 'Z2e=wA||pA.createContext(null),pA.createContext(!1)'
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkReactCtxFix
```

---

## 常见问题

### patch 运行后 0 chunks 被修改

**原因**：969 条旧翻译字符串在新版代码里找不到了（上游重构了 UI 代码）。

**影响**：主界面 UI 字符串翻译减少，但斜杠命令描述（63 个）正常。

**解决**：需要重新对照新版 chunk，更新 `patch-i18n.ps1` 里的映射表。这是一次性人工工作，不需要每次升级都做。

### `[WARN] Chinese characters remain in useVoice-2y28rCLm.js`

**原因**：上游源码在代码里直接写了中文（语音提示 prompt），不是我们 patch 写入的。这些字符在 regex 或变量赋值里，normalize 脚本无法转义。

**影响**：Bun 在 Windows 上可能对这几个字符 mojibake。如果语音功能出问题可以深入排查，否则可以暂时忽略。

### `Cannot find chunk containing formatWelcomeMessage`

**原因**：新版把欢迎界面重写成了 React 组件，`formatWelcomeMessage` 函数不再存在。

**影响**：Bun 编码验证测试被跳过，不影响实际功能。

### bun install 报模块缺失

每次 `git merge upstream/main` 后都必须运行 `bun install`，否则新增的 workspace 包无法被识别。

### `ReferenceError: CCR_TERMS_URL is not defined`

**现象**：安装后的 CCB 启动失败，堆栈类似：

```text
ReferenceError: CCR_TERMS_URL is not defined
  at <anonymous> (...\dist\chunks\loadAgentsDir-*.js:4643:420)
```

**原因**：`slash-commands-zh-by-name.json` 中 `/ultrareview` 或 `/ultraplan` 的汉化描述保留了 `${CCR_TERMS_URL}` / `${CCR_TERMS_URL2}`。这些模板变量被写进打包后的 `description:\`...\``，但当前运行作用域里没有对应变量。

**修复**：

1. 修改 `scripts/slash-commands-zh-by-name.json`，移除这两个 `${...}`。
2. 在 `scripts/apply-slash-command-i18n.mjs` 加入 `cleanupUnsafeRuntimeTemplateVars()`，清理已经污染过的 dist。
3. 重新执行：

```powershell
cd D:\Projects\claude-code-best\ccb-installer
.\vendor\bun\bun.exe .\scripts\apply-slash-command-i18n.mjs .\dist
```

**验证**：

```powershell
.\vendor\bun\bun.exe -e "import('./dist/chunks/loadAgentsDir-BMosMfSG.js').then(()=>console.log('IMPORT_OK')).catch(e=>{console.error(e.stack||e);process.exit(1)})"
Select-String -LiteralPath ".\dist\chunks\loadAgentsDir-BMosMfSG.js" -SimpleMatch '${CCR_TERMS_URL}' | Measure-Object
```

期望结果：

```text
IMPORT_OK
Count = 0
```

修复后必须重新构建 `CCB-Setup-1.0.8.exe` 并重新安装。已经安装到本机的旧目录不会自动更新。

---

### v2.6.6 UI 字符串全部用 backtick 格式（旧映射全部失效）

**现象**：patch 显示 "Flushed 0 modified chunks to disk"，主界面 UI 全英文。

**原因**：v2.6.6 的 Vite 输出把几乎所有 UI 字符串引号从 `"..."` 改为 `` `...` ``（backtick 模板字符串格式）。969 条旧映射全部使用双引号格式，均不匹配。

**修复**：在 `patch-i18n.ps1` 添加新的 `$chunkUiV2` 映射，使用 backtick 格式，值用 `\uXXXX` 纯 ASCII（不用原始汉字）：

```powershell
$chunkUiV2 = New-ReplacementMap
$chunkUiV2['children:`Toggle thinking mode`'] = 'children:`切换思考模式`'
$chunkUiV2['label:`Yes, enter plan mode`'] = 'label:`是，进入计划模式`'
# ... 33 条 UI 字符串
Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkUiV2
```

**重要**：PS1 文件中 values 必须用纯 ASCII `\uXXXX`，不能用原始汉字。原因：PowerShell 5.1 默认用 CP1252 读取脚本文件，UTF-8 汉字会被错误解码为 Latin-1，写入 JS 文件时产生 mojibake。Bun 脚本（如 `apply-slash-command-i18n.mjs`）用 `escJsBacktick()` 处理所以安全，但 PS1 直接字符串不安全。

**PS1 中的 `\uXXXX` 在 JSON 上下文的坑**：Edit 工具的参数是 JSON，`\uXXXX` 在 JSON 中会被解析为 Unicode 字符。所以无法通过 Edit 工具直接写入 `\uXXXX` 文字。解决方法：用 Bun 脚本直接修改 PS1 文件的字节：

```javascript
// fix_ps1_cjk.mjs
const fixed = block.replace(/ = '([^']+)'/g, (full, val) => {
  if (!/[^\x00-\xFF]/.test(val)) return full;
  return ` = '${escValue(val)}'`;
});
```

---

### `Config accessed before allowed` / MessagesBoundary 错误

**现象**：CCB 能启动，但消息区域显示 React 错误：

```
React Rendering Error
Config accessed before allowed.
Boundary: MessagesBoundary
```

**原因**：`growthbook-*.js` chunk 同样存在重复模块 bug：
- `cv` 模块：声明 `ov` 标志，`enable_configs()` 调用时设置 `ov=!0`，`L_()` 读 config 时验证 `!ov`
- `Tk` 模块：声明 `wk=!1`，但没有对应的 enable 函数，`pk()` 读 config 时验证 `!wk`

因此 `pk()` **永远**会抛出 "Config accessed before allowed"，因为 `wk` 永远是 `false`。

**修复**：让 `pk()` 使用 `ov`（与 `L_()` 共用同一个正确初始化的标志）：

```javascript
// 原来（wk 永远是 false → 永远抛出）
function pk(e,t,n){if(!wk)throw Error(`Config accessed before allowed.`)...

// 修复（使用 ov，由 enable_configs 正确设置）
function pk(e,t,n){if(!ov)throw Error(`Config accessed before allowed.`)...
```

已写入 `patch-i18n.ps1` 自动修复。

---

### CCB 启动崩溃（`useAppState cannot be called outside AppStateProvider`）

**现象**：安装 1.0.8 后，启动 CCB 立即抛出 React context 错误，应用无法使用：

```
ERROR  useAppState/useSetAppState cannot be called outside of an <AppStateProvider />
  at uA (dist/chunks/loadAgentsDir-BMosMfSG.js:695:10112)
  at hA (dist/chunks/loadAgentsDir-BMosMfSG.js:695:10782)
  at h5e (dist/chunks/loadAgentsDir-BMosMfSG.js:727:23482)
```

**原因**：见上方「patch-i18n.ps1（1.0.9 新增）」中的 React Context 修复说明。

**修复**：升级到 CCB 1.0.9（已内置修复）。或手动执行：

```powershell
# 找到 loadAgentsDir chunk
$chunk = Get-ChildItem "dist\chunks" -Filter "loadAgentsDir-*.js" | Select-Object -First 1
$c = [IO.File]::ReadAllText($chunk.FullName, [Text.Encoding]::UTF8)
$c = $c.Replace('Z2e=pA.createContext(null),pA.createContext(!1)',
                 'Z2e=wA||pA.createContext(null),pA.createContext(!1)')
[IO.File]::WriteAllText($chunk.FullName, $c, [Text.Encoding]::UTF8)
# 重新构建安装包
.\build.ps1
```

---

## 汉化覆盖率说明

| 类别 | 1.0.7 | 1.0.8 | 1.0.9 |
|------|-------|-------|-------|
| 斜杠命令描述 | ✅ 全覆盖 | ✅ 63 个 | ✅ 63 个 |
| 主界面 UI 字符串 | ✅ 969 条 | ⚠️ 大部分 miss | ⚠️ 大部分 miss |
| 安装界面 | ✅ | ✅ | ✅ |
| 错误提示 | ✅ 部分 | ⚠️ 部分 | ⚠️ 部分 |
| 启动稳定性 | ✅ | ❌ 崩溃 | ✅ 已修复 |

1.0.8/1.0.9 的 UI 字符串翻译减少是因为上游 v2.6.6 对界面代码做了大规模重构，旧的英文字符串位置/格式都变了。下一步工作是重新对照新版 chunk 更新映射表。
