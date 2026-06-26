# CCB 定制化安装包实现路径

本文记录 `CCB-Wanding-1.0.1` 的实现方式，后续打造更多行业版、客户版、MCP 内置版 CCB 时，可以按这个路径复制。

## 核心原则

定制版应该是独立产品，不要污染主 CCB。

## 2026-06-05 经验补充：定制包必须交付完整依赖闭包

这次 `CCB-Wanding-1.0.1` 的关键修正是：不能只把 `quotation-server`、业务 Python 代码和 Excel 数据打进安装包，还必须把它运行所需的 Python runtime 和第三方 Python 包一起交付。

原因很直接：

- MCP server 本身是 Node/Bun 进程，但 `quotation` 的核心业务逻辑会继续 spawn Python。
- 如果 MCP 配置没有固定 `PYTHON_EXECUTABLE`，它会退回使用目标机器 PATH 里的 `python` / `python3`。
- 普通用户机器可能没有 Python，也可能 Python 版本不一致，或者缺少 `pandas/openpyxl/numpy`。
- 这种问题不会在 `/mcp` 列表阶段暴露，通常会在真正调用工具时失败。

因此定制包的验收标准不是“安装包能安装、`/mcp` 能看到工具”，而是：

1. MCP 能被加载。
2. MCP 能启动。
3. MCP 能调用内置 runtime。
4. 内置 runtime 能 import 所需依赖。
5. 工具能完成一条真实业务 smoke test。

本次最终做法：

```text
ccb-installer/
  vendor/
    python-wanding/
      python.exe
      python311.dll
      Lib/
      DLLs/
      Scripts/
```

并在 `ensure-wanding-settings.ps1` 中写死：

```powershell
PYTHON_EXECUTABLE = $pythonExe
```

这样安装后 `quotation` MCP 调用的是：

```text
%LOCALAPPDATA%\Programs\CCB-Wanding\vendor\python-wanding\python.exe
```

不是目标机器自带的 Python。

本次体积变化：

```text
未内置 Python runtime: 198121418 bytes
内置 Python runtime:   240525445 bytes
```

体积增加是可接受的，因为换来的是可用性确定性。

## 2026-06-05 经验补充（2）：依赖必须真正进入 bundle，不能被 roaming site-packages 掩盖

`CCB-Wanding-1.0.2` 发现了一个比 1.0.1 更隐蔽、更严重的问题：**1.0.1 的内置 Python 其实不是自包含的。**

排查时用内置 `python.exe` 跑 `import pandas` 看似成功，但加上 `__file__` 才暴露真相：

```text
ROAMING  pandas   C:\Users\<me>\AppData\Roaming\Python\Python311\site-packages\pandas\__init__.py
ROAMING  requests ...\Roaming\Python\Python311\site-packages\requests\__init__.py
```

`pandas / numpy / openpyxl / requests / python-dotenv` 全部是从**开发机的 roaming 用户级 site-packages** 加载的，根本不在 `vendor\python-wanding\Lib\site-packages` 里。原因：这个内置 python 的 `ENABLE_USER_SITE = True`，会自动把 `%APPDATA%\Python\Python311\site-packages` 加进 `sys.path`。

后果：1.0.1 文档里那条“验证”命令

```powershell
& '...\python-wanding\python.exe' -c "import pandas,openpyxl,numpy; print('ok')"
```

在开发机上**永远是假阳性**——它导入的是开发机全局包。换一台没装这些包的客户机，第一次调用 `match_quotation`（报价）或 `get_inventory_by_code`（查库存）就会 `ModuleNotFoundError` 崩溃。`/mcp` 列表阶段同样不会暴露。

### 正确做法

1. 把完整依赖闭包**实际复制进** `vendor\python-wanding\Lib\site-packages`。本次报价+查库存的闭包是 14 个：
   `pandas, numpy, openpyxl, et_xmlfile, requests, urllib3, certifi, charset_normalizer, idna, dateutil, pytz, tzdata, dotenv, six`
   （注意连 `numpy.libs` 这种放 DLL 的目录也要一起复制。）
2. 在 MCP env 里写死 `PYTHONNOUSERSITE = "1"`，让内置 python **忽略目标机器的 roaming/用户级 site-packages**，既保证用我们打进去的包，也避免客户机上某个冲突版本干扰。
3. 验证必须模拟干净机器：**带 `PYTHONNOUSERSITE=1`** 跑导入，并断言每个模块的 `__file__` 落在 `python-wanding` 目录内（不是 Roaming）。只有这样才能真正发现缺包。

```powershell
$env:PYTHONNOUSERSITE=1
& '...\python-wanding\python.exe' -c "import pandas;print('BUNDLED' in '' )"  # 改用 __file__ 断言
```

### 同批修掉的两个查库存 blocker

- `python\inventory\agents\__init__.py` 顶部 `from inventory.agents.plan_agent import ...` 引用了一个**已删除的模块**，导致 `import InventoryTableAgent` 整条链报 `ModuleNotFoundError`——查库存在开发机上也是坏的。改为防御式导入：TableAgent 必须可用，可选 Agent 缺失不应拖垮整个库存子系统。
- 库存按描述搜索用错了 Accurate 过滤参数：`filter.keywords=Tee` 返回 0，而 `filter.name=Tee` 返回 20。`_call_list_api` 名称搜索改为优先 `filter.name`、回退 `filter.keywords`，查库存按描述（`search_inventory`）才真正可用。

### 查库存必须把 AOL 凭证写进 MCP env

库存走 Accurate Online API，需要 `AOL_ACCESS_TOKEN / AOL_SIGNATURE_SECRET / AOL_DATABASE_ID`。1.0.1 的 `ensure-wanding-settings.ps1` 没写，所以装到客户机后查库存静默失败（返回 null）。1.0.2 把这三个凭证（+ `AOL_API_BASE_URL`）和 `PYTHONNOUSERSITE` 一起写进 `quotation` MCP 的 env（同时进 `settings.json` 和 `ccb-mcp.json`）。凭证会过期，轮换方式：改 `ensure-wanding-settings.ps1` 里的值后重装或重打包。

### 自包含之后再瘦身（白名单裁剪）

直接 robocopy 整个开发机 Python 会带进大量与业务无关的包（本次 `googleapiclient` 94MB、`tree_sitter_*` 60MB、`google`、`pip` 等）。先保证自包含、再用**白名单**裁剪最安全：

1. 只保留闭包内的包 + 它们的 `.libs` / `*.dist-info` + `setuptools/pkg_resources` 机制，其余**移动**到备份目录（不是删除）。
2. 用 `PYTHONNOUSERSITE=1` 重跑导入断言 + 一条真实业务 smoke test。
3. 通过后再删备份；不通过就从备份恢复、把缺的包加进白名单重试。

本次裁掉约 164MB（site-packages 330MB→161MB，runtime 381MB→212MB），报价/查库存全部回归通过。注意 `openai` 是惰性导入且只在已关闭的 LLM/向量路径用到，因此**不打进包**，核心报价/查库存不会触发它。

> 一句话教训：**“内置 runtime 能 import” 不等于 “bundle 自包含”。** 验证内置依赖时一定要先用 `PYTHONNOUSERSITE=1` 把用户级 site-packages 摘掉，再断言加载路径，否则开发机会一直骗你。

## 依赖闭包检查清单

凡是定制版内置 MCP，都要按这个顺序检查依赖闭包：

1. MCP server 入口是什么：`node`、`bun`、`python`、`exe`、还是其它 runtime。
2. MCP server 是否再调用二级 runtime，例如 Node MCP spawn Python。
3. 二级 runtime 是否需要第三方包。
4. 是否依赖业务数据文件、Excel、SQLite、模型文件、向量缓存、配置文件。
5. 是否依赖环境变量。
6. 是否依赖目标机器 PATH。
7. 是否依赖网络服务/API key。
8. 是否依赖 Office/Excel 等外部桌面软件。

结论写法：

- 能打包的，打进 `vendor/<custom-runtime>`。
- 必须外部安装的，在安装器或启动阶段做明确自检。
- 绝不能静默依赖目标机器 PATH。

## Python runtime 打包策略

本次为了先保证可用，采用“复制开发机可用 Python runtime 并裁剪无关目录”的方式：

```powershell
robocopy 'D:\Python311' 'ccb-installer\vendor\python-wanding' /E /XD Doc Tools tcl include libs __pycache__ test tests /XF *.pyc *.pyo
```

复制后必须验证：

```powershell
& 'ccb-installer\vendor\python-wanding\python.exe' -c "import pandas,openpyxl,numpy; print('ok')"
```

这个方式不是最小体积方案，但工程风险最低。后续可以再优化为：

- Python embeddable runtime
- 精简 site-packages
- PyInstaller/Nuitka 封装 quotation Python 入口
- 单独构建 `quotation-mcp.exe`

在没有完成这些优化之前，优先保证业务可用。

必须独立的内容：

- 安装目录：`%LOCALAPPDATA%\Programs\<ProductName>`
- 配置目录：`%LOCALAPPDATA%\<ProductName>\.claude`
- 日志目录：`%LOCALAPPDATA%\<ProductName>\logs`
- 启动脚本：`ccb-<custom>.cmd`
- settings/MCP 修复脚本：`ensure-<custom>-settings.ps1`
- 安装脚本：`installer-<custom>.nsi`
- 桌面/开始菜单快捷方式名称
- 注册表产品名和右键菜单 key

可以共用的内容：

- `dist/` Claude Code/CCB 主程序和汉化结果
- `vendor/bun`
- `vendor/git`
- `vendor/ripgrep`
- 通用 MCP，例如 `exa`、`excel-mcp`
- 通用启动修复脚本，例如 Windows Terminal fragment、终端修复脚本

## CCB-Wanding 本次落地文件

本次新增/派生文件：

```text
ccb-installer/
  CCB-Wanding-1.0.1.exe
  installer-wanding.nsi
  ccb-wanding.cmd
  ccb-wanding-recent.cmd
  scripts/
    ensure-wanding-settings.ps1
  vendor/
    python-wanding/
  resources/
    wanding/
      wanding_business_knowledge.md
```

本次引用的业务资产：

```text
mcp_servers/
  quotation-server/

python/
  main.py
  inventory/
  quotation/

data/
  wanding_price_lib.xlsx
  wanding_business_knowledge.md
  mapping_table.xlsx
```

## 独立安装目录

`installer-wanding.nsi` 中设置：

```nsi
!define APPNAME "CCB-Wanding"
!define COMPANYNAME "CCB-Wanding"
!define VERSIONMAJOR 1
!define VERSIONMINOR 0
!define VERSIONBUILD 1

OutFile "CCB-Wanding-${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}.exe"
InstallDir "$LOCALAPPDATA\Programs\CCB-Wanding"
InstallDirRegKey HKCU "Software\${COMPANYNAME}\${APPNAME}" "InstallDir"
```

这样不会覆盖主 CCB：

```text
%LOCALAPPDATA%\Programs\CCB
%LOCALAPPDATA%\Programs\CCB-Wanding
```

## 独立配置和日志目录

`ccb-wanding.cmd` 中设置：

```bat
set "CCB_CONFIG_DIR=%LOCALAPPDATA%\CCB-Wanding\.claude"
set "CLAUDE_CONFIG_DIR=%CCB_CONFIG_DIR%"
set "CCB_LOG_DIR=%LOCALAPPDATA%\CCB-Wanding\logs"
```

这样主 CCB 和 Wanding 版的登录、memory、MCP、commands、agents、日志不会互相污染。

## 启动脚本

从主 CCB 的 `ccb.cmd` 派生：

```text
ccb.cmd -> ccb-wanding.cmd
```

必须检查：

- `CCB_CONFIG_DIR` 是否改成定制版目录
- `CCB_LOG_DIR` 是否改成定制版目录
- 默认模型是否和当前主 CCB 对齐
- 是否仍然通过 `--mcp-config "%CCB_INSTALL_DIR%\ccb-mcp.json"` 启动
- 对小型专用 MCP 包，是否关闭 deferred tool search，避免模型反复 `SearchExtraTools`

`ccb-wanding-recent.cmd` 从 `ccb-recent.cmd` 派生，只改最终调用：

```bat
call "%CCB_INSTALL_DIR%\ccb-wanding.cmd" %*
```

## 专用 MCP 包建议关闭 deferred tool search

2026-06-05 发现一个 Wanding 版实际问题：

用户输入：

```text
查询 直接50 价格
```

模型反复执行：

```text
SearchExtraTools("select:mcp__quotation__match_quotation")
SearchExtraTools("discover:mcp__quotation__match_quotation")
...
```

这不是 quotation MCP 业务逻辑的问题，而是 CCB 的 deferred tools 机制和当前模型配合不好。

正常协议应该是：

1. `SearchExtraTools({"query":"select:mcp__quotation__match_quotation"})`
2. `ExecuteExtraTool({"tool_name":"mcp__quotation__match_quotation","params":{"keywords":"直接50","customer_level":"B"}})`

但部分模型会卡在第 1 步，反复搜索，不进入第 2 步。

对 `CCB-Wanding` 这种专用包，MCP 数量少且目标明确，不需要 deferred search 节省上下文。更稳的做法是在启动脚本中关闭 deferred search，让 MCP 工具直接作为核心工具暴露：

```bat
set "ENABLE_SEARCH_EXTRA_TOOLS=auto:100"
```

注意：当前 CCB 代码识别的是 `auto:N` 格式。`auto:100` 会把自动启用阈值抬到 100% 上下文，最终解析为 `standard` mode，也就是不启用 `SearchExtraTools` 延迟加载。不要写成裸 `100`；裸 `100` 会被当前解析器判为非法值并回落默认阈值，反而仍可能启用 deferred search。

加入位置：`ccb-wanding.cmd` 的颜色/终端环境变量之后、正式启动 CLI 之前。

适用判断：

- 行业定制包、客户定制包、MCP 数量少：建议关闭 deferred search。
- 通用 CCB、MCP 很多、工具 schema 很大：可以保留 deferred search。
- 如果出现反复 `SearchExtraTools` 而不 `ExecuteExtraTool`：优先关闭 deferred search。

## 内置 MCP 的正确路径

不要只写用户 settings。稳定路径是：

1. 安装 MCP server 文件到安装目录。
2. 安装时生成运行时 MCP 配置 `ccb-mcp.json`。
3. 启动 CCB 时显式传入 `--mcp-config "%CCB_INSTALL_DIR%\ccb-mcp.json"`。

本次 `quotation` MCP 注册在：

```powershell
ccb-installer\scripts\ensure-wanding-settings.ps1
```

核心结构：

```powershell
$bunExe = Join-Path $InstallDir "vendor\bun\bun.exe"
$pythonExe = Join-Path $InstallDir "vendor\python-wanding\python.exe"
$quotationServer = Join-Path $InstallDir "vendor\mcp-servers\quotation-server\dist\index.js"
$wandingRoot = Join-Path $InstallDir "vendor\wanding"
$wandingDataDir = Join-Path $wandingRoot "data"
$wandingPythonDir = Join-Path $wandingRoot "python"
```

MCP server 配置：

```powershell
$quotation = [pscustomobject]@{
    command = $bunExe
    args = @($quotationServer)
    env = [pscustomobject]@{
        CCB_PROJECT_ROOT = $wandingRoot
        DATA_DIR = $wandingDataDir
        PYTHON_EXECUTABLE = $pythonExe
        PYTHONPATH = $wandingPythonDir
        PYTHONUTF8 = "1"
        PYTHONIOENCODING = "utf-8"
        WANDING_PRICE_LIB_PATH = $wandingPriceLib
        PRICE_LIBRARY_PATH = $wandingPriceLib
        WANDING_BUSINESS_KNOWLEDGE_PATH = $wandingKnowledge
        ENABLE_WANDING_VECTOR = "0"
        INVENTORY_ENABLE_RESOLVER_VECTOR = "0"
        USE_RESOLVER_FALLBACK = "0"
    }
    description = "Wanding quotation MCP: match quotation items, fill quotation sheets, and use bundled Wanding business knowledge."
}
```

同时写入：

- `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json`
- `%LOCALAPPDATA%\Programs\CCB-Wanding\ccb-mcp.json`

其中 `ccb-mcp.json` 是运行时可靠加载的关键。

## 打包业务资产

`installer-wanding.nsi` 中新增必选 section：

```nsi
Section "Wanding quotation MCP and knowledge base (required)" SecWanding
    SectionIn RO
    SetOutPath "$INSTDIR\vendor\mcp-servers\quotation-server"
    File /r "..\mcp_servers\quotation-server\*.*"
    SetOutPath "$INSTDIR\vendor\wanding\python"
    File /r /x ".pytest_cache" /x "__pycache__" "..\python\*.*"
    SetOutPath "$INSTDIR\vendor\wanding\data"
    File "..\data\wanding_price_lib.xlsx"
    File "..\data\wanding_business_knowledge.md"
    File /nonfatal "..\data\mapping_table.xlsx"
SectionEnd
```

约定：

- MCP server 放到 `vendor\mcp-servers\<server-name>`
- 业务代码放到 `vendor\<business>\python`
- 业务数据放到 `vendor\<business>\data`
- MCP 配置通过环境变量指向这些安装后路径

## 内置 Python runtime

Wanding 版不能依赖目标机器已有 Python。安装包需要内置 quotation MCP 所需的 Python runtime 和依赖：

```text
ccb-installer/
  vendor/
    python-wanding/
      python.exe
      python311.dll
      Lib/
        site-packages/
          pandas/
          openpyxl/
          numpy/
```

`installer-wanding.nsi` 中新增必选 section：

```nsi
Section "Wanding Python runtime (required)" SecWandingPython
    SectionIn RO
    SetOutPath "$INSTDIR\vendor\python-wanding"
    File /r "vendor\python-wanding\*.*"
SectionEnd
```

`ensure-wanding-settings.ps1` 必须把 `PYTHON_EXECUTABLE` 写入 `quotation` MCP 的 env：

```powershell
PYTHON_EXECUTABLE = $pythonExe
```

这样 quotation server 调用 Python 时会使用：

```text
%LOCALAPPDATA%\Programs\CCB-Wanding\vendor\python-wanding\python.exe
```

而不是目标机器 PATH 里的 `python`。

## 注入业务知识库到 CLAUDE.md

定制版业务知识应该进入定制版自己的 CLAUDE.md：

```text
%LOCALAPPDATA%\CCB-Wanding\.claude\CLAUDE.md
```

本次用 marker 包裹，便于重复安装时更新而不是无限追加：

```markdown
<!-- CCB-WANDING-KNOWLEDGE:START -->
# Wanding business knowledge

...
<!-- CCB-WANDING-KNOWLEDGE:END -->
```

`ensure-wanding-settings.ps1` 的逻辑：

- 如果 `CLAUDE.md` 不存在，创建。
- 如果 marker 已存在，替换 marker 中间内容。
- 如果 marker 不存在，追加到文件末尾。

## 不要卸载共享 Windows Terminal Fragment

当前主 CCB 和 Wanding 版共用 WT profile `CCB`。为了避免卸载 Wanding 时破坏主 CCB，`installer-wanding.nsi` 的 uninstall 逻辑跳过 fragment 删除：

```nsi
Section "Uninstall"
    ; Keep the shared CCB WT Fragment because regular CCB may use it too.
    Goto wt_frag_done
```

如果以后每个定制版需要独立 WT profile，再为每个版本创建独立 fragment 名称和 GUID。

## 构建命令

```powershell
& 'D:\NSIS\makensis.exe' 'D:\Projects\claude-code-best\ccb-installer\installer-wanding.nsi'
```

输出：

```text
D:\Projects\claude-code-best\ccb-installer\CCB-Wanding-1.0.1.exe
```

## 验证清单

构建前：

- `ccb-wanding.cmd` 指向 `%LOCALAPPDATA%\CCB-Wanding\.claude`
- `ccb-wanding.cmd` 仍然带 `--mcp-config`
- `installer-wanding.nsi` 的 `InstallDir` 是 `Programs\CCB-Wanding`
- `ensure-wanding-settings.ps1` 同时写 settings 和 `ccb-mcp.json`
- `quotation` MCP 的 `command` 使用内置 Bun
- `quotation` MCP 的 `args` 指向安装目录下的 `quotation-server\dist\index.js`
- 业务 Python 和 data 都进入安装包
- 业务知识库进入 `CLAUDE.md`

构建后：

```powershell
Get-Item .\ccb-installer\CCB-Wanding-1.0.1.exe
```

脚本 smoke test：

```powershell
$tmpInstall = 'D:\Projects\claude-code-best\$tmp\ccb-wanding-script-test'
$tmpConfig = 'D:\Projects\claude-code-best\$tmp\ccb-wanding-config-test\.claude'
New-Item -ItemType Directory -Force -Path $tmpInstall | Out-Null
& '.\ccb-installer\scripts\ensure-wanding-settings.ps1' -InstallDir $tmpInstall -ConfigDir $tmpConfig
Get-Content (Join-Path $tmpInstall 'ccb-mcp.json') -Raw | ConvertFrom-Json | Out-Null
Get-Content (Join-Path $tmpConfig 'settings.json') -Raw | ConvertFrom-Json | Out-Null
```

业务逻辑 smoke test：

```powershell
node -e "const {spawn}=require('child_process'); const p=spawn('python',['python/main.py'],{cwd:process.cwd(),stdio:['pipe','pipe','pipe']}); p.stdout.pipe(process.stdout); p.stderr.pipe(process.stderr); p.stdin.end(JSON.stringify({tool:'match_quotation',params:{keywords:'PPR hot water pipe 3/4',customer_level:'B'}})+'\n');"
```

注意：这个测试依赖当前开发机 Python 环境。

定制包 runtime smoke test：

```powershell
node -e "const {spawn}=require('child_process'); const py='D:/Projects/claude-code-best/ccb-installer/vendor/python-wanding/python.exe'; const p=spawn(py,['python/main.py'],{cwd:process.cwd(),stdio:['pipe','pipe','pipe']}); p.stdout.pipe(process.stdout); p.stderr.pipe(process.stderr); p.stdin.end(JSON.stringify({tool:'match_quotation',params:{keywords:'PPR hot water pipe 3/4',customer_level:'B'}})+'\n');"
```

这个测试更重要，因为它验证的是安装包内置 Python runtime，而不是开发机全局 Python。

注意：不要用 PowerShell 字符串管道直接喂 JSON 给 Python 入口作为唯一验证。JSON-lines stdin 在 PowerShell/cmd 下容易被引号或编码干扰，出现 `JSONDecodeError`。MCP 实际是 stdio 进程通信，用 Node `spawn(..., stdio:['pipe','pipe','pipe'])` 更接近真实调用链。

## Python 依赖策略

`quotation` MCP 的 Python 侧依赖：

- `pandas`
- `openpyxl`
- `numpy`

`CCB-Wanding-1.0.1` 已内置 `vendor\python-wanding`，并在 MCP env 中固定 `PYTHON_EXECUTABLE`。因此基础报价匹配和 Excel 读写不应依赖目标机器预装 Python。

后续更严格的商业交付版仍可继续优化：

- 使用 Python embeddable runtime 进一步缩小体积
- 精简 site-packages 中的测试文件和无关依赖
- 把 quotation MCP 编译/封装成单 exe
- 安装时做 Python 依赖自检
- `/mcp` 或启动时给出更明确的依赖缺失提示

## 新定制版复制模板

以后做 `CCB-<Customer>-<Version>` 时，按这个顺序：

1. 从 `ccb.cmd` 复制 `ccb-<customer>.cmd`。
2. 改配置目录和日志目录。
3. 从 `ccb-recent.cmd` 复制 `ccb-<customer>-recent.cmd`。
4. 从 `ensure-mcp-settings.ps1` 复制 `ensure-<customer>-settings.ps1`。
5. 注册该定制版专属 MCP 和业务环境变量。
6. 如有业务知识库，用 marker 注入定制版 `CLAUDE.md`。
7. 做 MCP 依赖闭包检查：runtime、二级 runtime、site-packages、业务数据、环境变量、外部软件。
8. 如有 Python/Node/其它 runtime 依赖，打进 `vendor\<custom-runtime>`，不要依赖目标机器 PATH。
9. 从 `installer.nsi` 复制 `installer-<customer>.nsi`。
10. 改 `APPNAME`、`COMPANYNAME`、`OutFile`、`InstallDir`、快捷方式、注册表 key。
11. 新增业务资产 section 和 runtime section。
12. 构建安装包。
13. 验证 settings、`ccb-mcp.json`、`CLAUDE.md`、MCP 入口。
14. 用安装包内置 runtime 跑真实业务 smoke test。

## 业务工具调用策略

业务知识库可以放进定制版 `CLAUDE.md`，但不要只放业务资料。对“报价查询、合同生成、库存查询”这类固定工具链，还应该额外写一段工具调用策略，并用独立 marker 管理：

```md
<!-- CCB-<CUSTOMER>-TOOLING:START -->
# <Customer> tool calling policy

For natural-language quotation queries, use the bundled quotation MCP.
Required params:
- `keywords`: exact product phrase from the user.
- `customer_level`: default customer level.

Correct call:
`ExecuteExtraTool({"tool_name":"mcp__quotation__match_quotation","params":{"keywords":"直接50","customer_level":"B"}})`

Do not call quotation tools with empty params.
Do not repeatedly call SearchExtraTools after the tool has already been found.
<!-- CCB-<CUSTOMER>-TOOLING:END -->
```

这层提示只能提高模型稳定性，不能替代 MCP schema 和后端校验。标准做法是三层一起做：

1. `CLAUDE.md`：告诉模型什么时候用哪个工具、默认参数是什么、错误时怎么重试。
2. MCP tool description/schema：在工具发现结果里直接写清楚参数名、例子、不要空调用。
3. Python/Node 后端：缺参数时返回清晰业务错误，必要时兼容 `query`、`product_name` 等常见别名，避免裸 `KeyError`。

Wanding 这次的典型问题是模型执行了空参数调用：

```text
ExecuteExtraTool(mcp__quotation__match_quotation)
KeyError: 'keywords'
```

修复后应该变成：

```json
{"tool":"match_quotation","params":{"keywords":"直接50","customer_level":"B","show_candidates":false}}
```

## CCB-Wanding 1.0.3 收尾记录

`CCB-Wanding-1.0.3` 是在 1.0.2 基线上做的窄范围业务增强，不重新 patch/build 主 `dist`。本版目标是把 VANTSING 标准报价单回填能力和标准报价单模板一起交付。

本次增量：

- `installer-wanding.nsi` 升级到 `VERSIONBUILD 3`，输出 `CCB-Wanding-1.0.3.exe`。
- `SecWanding` 打入 `data\空白标准报价单.xlsx` 和 `data\已填标准报价单.xlsx`。
- `python/quotation/quote_tools.py` 适配 VANTSING 标准表布局：F/G/I/K/M/N 列，第 8 行起写入数据。
- `quotation` MCP 暴露 `fill_quotation_sheet`，模型报价和查库存后可以直接调用 fill tool，不再依赖 skill。
- 新增 `ccb-installer\scripts\smoke-wanding-e2e.ps1`，并随安装包复制到 `$INSTDIR\scripts`。

构建命令仍然走独立安装器，避免主 CCB/Lite 构建流程带来 dist 漂移：

```powershell
cd D:\Projects\claude-code-best\ccb-installer
& "D:\NSIS\makensis.exe" installer-wanding.nsi
```

发布前验证分两层：

```powershell
$env:PYTHONNOUSERSITE = "1"
& "D:\Projects\claude-code-best\ccb-installer\vendor\python-wanding\python.exe" "D:\Projects\claude-code-best\python\test_vantsing_fill.py"

$env:PYTHONNOUSERSITE = "1"
& "D:\Projects\claude-code-best\ccb-installer\vendor\python-wanding\python.exe" -c "import pandas, openpyxl, numpy; import pandas as p; assert 'python-wanding' in p.__file__.replace('\\','/').lower(); print('bundle imports OK')"
```

安装后验证优先使用实际安装目录。如果用户安装到 `D:\CCB-Wanding`：

```powershell
& "D:\CCB-Wanding\scripts\smoke-wanding-e2e.ps1" -InstallDir "D:\CCB-Wanding"
```

如果只想用仓库里的 smoke 脚本验证安装目录：

```powershell
& "D:\Projects\claude-code-best\ccb-installer\scripts\smoke-wanding-e2e.ps1" -InstallDir "D:\CCB-Wanding"
```

验收点：

- `$InstallDir\vendor\wanding\data` 下有 `wanding_price_lib.xlsx`、`wanding_business_knowledge.md`、`mapping_table.xlsx`、`空白标准报价单.xlsx`、`已填标准报价单.xlsx`。
- `fill_quotation_sheet` 能从空白标准报价单复制副本并写入真实匹配结果。
- smoke 对 `直接50` 的端到端链路通过：报价匹配、库存查询可用性检查、回填 Excel、读取行 8 校验。
- 库存 API 因网络或 AOL 凭证不可用时，smoke 要明确 WARN；报价和 Excel 回填仍应独立通过。

## 给后续模型的正确路线

如果后续不用 Codex，换 Cursor、Claude、Gemini 或其它模型继续做 Wanding 定制包，建议严格按下面路线执行。不要一上来大范围改 `dist`、汉化、启动器，也不要把固定业务流程做成复杂 skill。报价单回填这种机械任务，优先做成明确的 MCP fill tool。

### 一、先定边界

每个小版本先写清楚“只改什么、不改什么”。

例如 `CCB-Wanding-1.0.3` 的边界是：

- 只改 Wanding 定制包。
- 只增加 VANTSING 标准报价单回填。
- 只新增标准报价单模板和 smoke test。
- 不重新 patch/build 主 `dist`。
- 不碰主 CCB、Lite、通用汉化逻辑。

这个边界非常重要。定制包越多，越不能把主 CCB、Lite、客户包混在一起改。

### 二、业务功能优先做成工具，不优先做成 skill

Wanding 的正确业务链路是：

```text
用户询价
-> quotation MCP 查询价格
-> quotation MCP 查询库存
-> 模型整理结构化 items
-> quotation MCP 直接调用 fill_quotation_sheet
-> 输出已填报价单 xlsx
```

也就是说，模型只负责理解用户意图和整理参数，Excel 细节必须放到后端工具里：

- 复制空白模板。
- 识别模板布局。
- 固定列写入。
- 保留公式和格式。
- 保存输出文件。
- 返回成功/失败、输出路径、回填数量、错误信息。

不要让模型自己用 excel-mcp 一格一格写标准报价单。那样容易错列、覆盖公式、丢格式，也不利于回归测试。

### 三、fill tool 的三层稳定性

固定业务工具必须同时做三层约束：

1. MCP schema：参数名、类型、示例必须写清楚。
2. Tool description：告诉模型什么时候用这个工具，不要空参调用。
3. Python/Node 后端：缺参数时返回清晰错误，不能裸 `KeyError` 或 traceback。

Wanding 的 `fill_quotation_sheet` 至少应支持：

```json
{
  "quotation_path": "待回填报价单路径",
  "output_path": "输出报价单路径",
  "customer_level": "B"
}
```

如果未来改成直接传结构化 items，也应该保留清晰 schema：

```json
{
  "template_path": "空白标准报价单.xlsx",
  "output_path": "输出报价单.xlsx",
  "items": [
    {
      "code": "8020022917",
      "name": "P型存水弯印尼(日标)PVC-U管件(D排水系列)灰色 DN50 (2\") 联塑",
      "spec": "DN50",
      "quantity": 1,
      "unit_price": 9206,
      "stock": "qty_warehouse=276, qty_available=0"
    }
  ]
}
```

### 四、模板适配要从样例反推，不要猜

遇到新客户报价单模板时，先读取两个文件：

- 空白模板。
- 已填样例。

反推出：

- sheet 名称。
- 表头行。
- 数据起始行。
- 产品编号、名称、规格、数量、单价、金额分别在哪一列。
- 哪些列是公式，哪些列允许写入。
- 合计行、备注行、日期行的位置。

Wanding VANTSING 标准表当前关键布局是：

- 数据从第 8 行开始。
- F 列：产品编号。
- G 列：报价名称。
- I 列：规格。
- K 列：数量。
- M 列：单价。
- N 列：金额。

这些规则应该集中放在 `python/quotation/quote_tools.py` 的 layout 定义里，不能散落在 prompt 或多个脚本里。

### 五、安装包必须带完整依赖闭包

客户机不能假设有 Python、pandas、openpyxl、numpy、Node 或其它开发环境。

Wanding 包的正确做法是：

- `vendor\python-wanding` 内置 Python runtime。
- site-packages 内置 `pandas/openpyxl/numpy/requests` 等依赖。
- `ensure-wanding-settings.ps1` 固定 `PYTHON_EXECUTABLE`。
- `PYTHONNOUSERSITE=1`，避免偷偷使用用户机器上的全局 Python 包。
- smoke test 断言 pandas 路径必须来自 `python-wanding`。

依赖断言命令：

```powershell
$env:PYTHONNOUSERSITE = "1"
& "D:\Projects\claude-code-best\ccb-installer\vendor\python-wanding\python.exe" -c "import pandas, openpyxl, numpy; import pandas as p; assert 'python-wanding' in p.__file__.replace('\\','/').lower(); print('bundle imports OK')"
```

### 六、安装器改动要最小化

Wanding 定制包只改自己的安装器：

```text
ccb-installer\installer-wanding.nsi
```

常见必要改动：

- 升 `VERSIONBUILD`。
- 在 `SecWanding` 增加业务 data 文件。
- 在 `$INSTDIR\scripts` 增加 smoke 脚本。
- 确认 `File /r "..\python\*.*"` 能把业务 Python 打进去。
- 确认 `File /r "..\mcp_servers\quotation-server\*.*"` 能把 MCP 包打进去。

构建时直接跑：

```powershell
cd D:\Projects\claude-code-best\ccb-installer
& "D:\NSIS\makensis.exe" installer-wanding.nsi
```

不要为了 Wanding 小版本去跑主 `build.ps1`，除非明确要重建主 `dist`。

### 七、smoke test 必须分两层

发布前至少跑两层测试。

Layer 1：模板写入单元测试。

```powershell
$env:PYTHONNOUSERSITE = "1"
& "D:\Projects\claude-code-best\ccb-installer\vendor\python-wanding\python.exe" "D:\Projects\claude-code-best\python\test_vantsing_fill.py"
```

它验证：

- 模板识别。
- 固定列写入。
- 合计金额。
- 日期/页脚等关键位置不坏。

Layer 2：安装后端到端测试。

```powershell
& "D:\CCB-Wanding\scripts\smoke-wanding-e2e.ps1" -InstallDir "D:\CCB-Wanding"
```

它验证：

- 使用安装目录里的内置 Python。
- 使用安装目录里的 data。
- `直接50` 能真实报价匹配。
- 库存查询能调用，失败时要明确 WARN。
- Excel 能回填真实编号、名称、数量、单价、金额。
- bundle import 通过。

只有仓库测试通过不够，必须跑安装后的 `$INSTDIR`。

### 八、安装路径不能写死

默认安装路径是：

```text
%LOCALAPPDATA%\Programs\CCB-Wanding
```

但用户可能安装到：

```text
D:\CCB-Wanding
```

所以脚本和文档必须支持：

- 显式 `-InstallDir`。
- 注册表 `HKCU\Software\CCB-Wanding\CCB-Wanding\InstallDir`。
- 默认 fallback。

不要在业务代码里写死 `D:\CCB-Wanding` 或 `%LOCALAPPDATA%\Programs\CCB-Wanding`。

### 九、每次收尾要记录四件事

完成一个定制版后，必须记录：

1. 改了哪些文件。
2. 安装包路径、大小、时间。
3. 安装目录和注册表版本。
4. smoke test 的关键结果。

`CCB-Wanding-1.0.3` 最终记录：

```text
安装包: D:\Projects\claude-code-best\ccb-installer\CCB-Wanding-1.0.3.exe
大小: 263,166,221
安装目录: D:\CCB-Wanding
注册表版本: 1.0.3
Layer 1: PASS
Layer 2: PASS
bundle imports: PASS
测试商品: 直接50
匹配编号: 8020022917
库存: qty_warehouse=276, qty_available=0
Excel 回填: row 8 F=8020022917, M=9206, N=9206
```

### 十、给后续模型的最短执行提示

可以把下面这段直接发给后续模型：

```text
你在 D:\Projects\claude-code-best 工作。当前目标是维护 CCB-Wanding 定制包。
不要动主 CCB、Lite 或通用 dist，除非我明确要求。
Wanding 报价单回填走 quotation MCP 的 fill tool，不走 skill，不让模型手动操作 Excel。
所有业务 Python 在 python/quotation，MCP 包在 mcp_servers/quotation-server，安装器是 ccb-installer/installer-wanding.nsi。
构建只跑 D:\NSIS\makensis.exe ccb-installer\installer-wanding.nsi。
安装后必须跑 D:\CCB-Wanding\scripts\smoke-wanding-e2e.ps1 -InstallDir D:\CCB-Wanding。
验收必须看到 Layer 1 PASS、Layer 2 PASS、bundle imports OK。
```

### 十一、2026-06-05 direct fill 修正

实际使用中发现一个不顺手路径：

```text
用户已经查询出价格和库存
-> 用户要求填写报价单放桌面
-> 模型又去 parse 模板、尝试 excel-mcp 写 B-E 询价列
-> 再调用 fill_quotation_sheet
-> 因模板空白或参数不匹配导致 filled_count=0
```

这是错误路线。报价和库存已经拿到后，不应该再让模型手工操作 Excel，也不应该强制把询价列预填一遍。

修正后的正确路线：

```text
报价/库存结果已经确定
-> 模型整理 selected items
-> 直接调用 mcp__quotation__fill_quotation_sheet
-> 参数传 items 或 fill_items
-> 工具自动使用内置空白标准报价单模板
-> output_path 省略时默认保存到桌面 Wanding-Quotation_<timestamp>.xlsx
```

推荐调用形状：

```json
{
  "items": [
    {
      "code": "8020020755",
      "quote_name": "直通(管箍)PVC-U排水配件白色 dn50",
      "unit_price": 1519,
      "quantity": 100,
      "spec": "dn50"
    },
    {
      "code": "8020022784",
      "quote_name": "短型顺水三通印尼(日标)PVC-U管件(D排水系列)灰色 DN50 (2\") 联塑",
      "unit_price": 4591,
      "quantity": 100,
      "spec": "DN50"
    }
  ]
}
```

后端兼容字段：

- `items` / `fill_items` / `rows` / `lines`
- `qty` / `quantity` / `count`
- `quote_name` / `matched_name` / `name` / `product_name`
- `unit_price` / `price` / `b_price` / `price_b`
- `specification` / `spec` / `model`

同时修复了两个批量工具容错：

- `match_quotation_batch`：`keywords_list` 如果被模型传成对象、嵌套对象、逗号分隔字符串，也会归一化成字符串列表，不再触发 `unhashable type: 'slice'`。
- `get_inventory_by_code_batch`：支持 `codes`、`code`、`item_codes`，也支持对象数组中的 `code/item_code/sku/product_code/no`。

验收命令：

```powershell
$env:PYTHONNOUSERSITE = "1"
$env:WANDING_PRICE_LIB_PATH = "D:\CCB-Wanding\vendor\wanding\data\wanding_price_lib.xlsx"
$env:WANDING_DATA_DIR = "D:\CCB-Wanding\vendor\wanding\data"

# 不传 output_path 时应保存到桌面 Wanding-Quotation_<timestamp>.xlsx
```

这次修复后，用户说“填写报价单并放在桌面”时，模型不应该再调用 excel-mcp 预填单元格；直接调用 `fill_quotation_sheet` 即可。

### 十一补充、direct fill 普世化

实际使用中又发现一个问题：模型调用 `fill_quotation_sheet` 时不一定会把 `match_quotation` 结果里的 `code` 原样带进来，常见错误是：

```text
items[0] missing product code. Pass code/item_code from match_quotation result.
```

这说明工具设计仍偏开发者视角。业务上更合理的行为是：

- 如果模型传了 `code/item_code + unit_price + quote_name`，直接按这些字段填表。
- 如果模型只传了 `keywords/product_name/name + quantity`，工具后端自动做一次报价匹配并补齐 `code/quote_name/unit_price`。
- 如果仍然匹配不到，不抛异常，而是在报价单中写 `无货`，单价和金额为 0。

修正后的 direct fill 支持这些更宽松的 item：

```json
{
  "items": [
    {"keywords": "直接50", "quantity": 100, "spec": "dn50"},
    {"name": "三通50", "qty": 100, "specification": "DN50"}
  ]
}
```

安装态验证结果：

```text
直接50 -> 8020020755, unit_price=1519, total=151900
三通50 -> 8020022784, unit_price=4591, total=459100
```

注意：自动补齐使用确定性规则，不调用 LLM。当前规则会：

- `直接/直通/管箍`：优先常规白色排水配件，没明确日标时不抢日标直通。
- `三通/tee`：优先三通，默认排水，日标/短型可加权。
- 明确 `异径/变径/大小头` 时才偏向异径件。

仍然建议模型在已经有 `match_quotation` 结果时传 `code`，因为这是最确定的路径；但没传 code 时，工具不应再中断用户流程。

### 十二、2026-06-05 deferred search 豁免修正

现象：

```text
ExecuteExtraTool(mcp__quotation__match_quotation_batch)
Tool "mcp__quotation__match_quotation_batch" has not been discovered yet.
You must first use SearchExtraTools to discover this tool before executing it.
```

这不是 quotation MCP schema 缺失，也不是 `CLAUDE.md` 没写清楚。根因是 CCB 的 deferred tools 机制还在生效：模型当前上下文里只有 `SearchExtraTools` 和 `ExecuteExtraTool`，真实 MCP 工具尚未被加载，所以直接调用会被拦截。

`CLAUDE.md` 只能指导模型怎么用工具，不能把 deferred tool 变成已加载工具。要让 Wanding 这类小型专用包的 MCP 直接暴露，需要在启动环境里关闭 deferred search。

错误写法：

```cmd
set "ENABLE_SEARCH_EXTRA_TOOLS=100"
```

当前 dist 的解析逻辑识别的是 `auto:N`，裸 `100` 会被判为非法值，并回落默认阈值，结果仍可能启用 deferred search。

正确写法：

```cmd
set "ENABLE_SEARCH_EXTRA_TOOLS=auto:100"
```

含义：

- `auto:100` 把自动启用阈值抬到 100% 上下文。
- 当前实现会把它解析为 `standard` mode。
- `standard` mode 下不启用 `SearchExtraTools` 延迟加载，MCP 工具直接作为普通工具暴露。

修改位置：

```text
ccb-installer\ccb-wanding.cmd
D:\CCB-Wanding\ccb-wanding.cmd
```

放在颜色/终端环境变量之后、启动 CLI 之前：

```cmd
set "NO_COLOR="
set "CLICOLOR=1"
set "CLICOLOR_FORCE=1"
set "FORCE_COLOR=3"
set "COLORTERM=truecolor"
set "ENABLE_SEARCH_EXTRA_TOOLS=auto:100"
```

验证：

```powershell
$env:CCB_NO_PAUSE = "1"
$env:CCB_DISABLE_WT_RELAUNCH = "1"
& "D:\CCB-Wanding\ccb-wanding.cmd" --version
```

期望输出：

```text
2.6.6 (Claude Code)
```

注意：

- 已经打开的 CCB-Wanding 会话不会继承新环境变量，必须关闭窗口并重新从快捷方式启动。
- 对 Wanding 这种 MCP 数量少、业务目标明确的专用包，建议关闭 deferred search。
- 对主 CCB、MCP 很多的通用包，可以保留 deferred search 节省上下文。
- 如果后续又看到模型反复 `SearchExtraTools`，第一步检查 `ccb-wanding.cmd` 是否仍是 `auto:100`，不要退回裸 `100`。

### 十三、2026-06-05 Wanding CLAUDE.md 标准化与同步路径

这次的目标不是只改当前机器上的 `CLAUDE.md`，而是把 Wanding 后续安装包都会生成的标准规则固定下来。

标准来源分两层：

```text
业务知识源文件:
D:\Projects\claude-code-best\data\wanding_business_knowledge.md

工具调用策略生成脚本:
D:\Projects\claude-code-best\ccb-installer\scripts\ensure-wanding-settings.ps1

当前安装目录同步副本:
D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md
D:\CCB-Wanding\scripts\ensure-wanding-settings.ps1

当前快捷方式实际读取:
C:\Users\m1774\AppData\Local\CCB-Wanding\.claude\CLAUDE.md
```

`C:\Users\m1774\Desktop\CCB-Wanding.lnk` 当前指向：

```text
TargetPath: D:\CCB-Wanding\ccb-wanding.cmd
WorkingDirectory: D:\CCB-Wanding
```

而 `ccb-wanding.cmd` 设置：

```cmd
set "CCB_CONFIG_DIR=%LOCALAPPDATA%\CCB-Wanding\.claude"
set "CLAUDE_CONFIG_DIR=%CCB_CONFIG_DIR%"
```

所以用户实际启动后读取的是：

```text
C:\Users\m1774\AppData\Local\CCB-Wanding\.claude\CLAUDE.md
```

不是：

```text
D:\CCB-Wanding\.claude\CLAUDE.md
```

#### 正确修改顺序

1. 修改业务规则时，先改 `data\wanding_business_knowledge.md`。
2. 修改模型工具调用规则时，改 `ccb-installer\scripts\ensure-wanding-settings.ps1` 里的 `CCB-WANDING-TOOLING` 段。
3. `ensure-wanding-settings.ps1` 会把业务知识包进 `CCB-WANDING-KNOWLEDGE` marker，把工具策略包进 `CCB-WANDING-TOOLING` marker。
4. 同步到当前安装目录：

```powershell
Copy-Item -LiteralPath 'D:\Projects\claude-code-best\data\wanding_business_knowledge.md' -Destination 'D:\CCB-Wanding\vendor\wanding\data\wanding_business_knowledge.md' -Force
Copy-Item -LiteralPath 'D:\Projects\claude-code-best\ccb-installer\scripts\ensure-wanding-settings.ps1' -Destination 'D:\CCB-Wanding\scripts\ensure-wanding-settings.ps1' -Force
& 'D:\CCB-Wanding\scripts\ensure-wanding-settings.ps1' -InstallDir 'D:\CCB-Wanding' -ConfigDir 'C:\Users\m1774\AppData\Local\CCB-Wanding\.claude'
```

5. 验证当前运行配置：

```powershell
Select-String -LiteralPath 'C:\Users\m1774\AppData\Local\CCB-Wanding\.claude\CLAUDE.md' -Pattern 'Fill quotation sheet|code is helpful but not required|Do not first use excel-mcp|语言规则|交互规则'

$text = Get-Content -Raw -LiteralPath 'C:\Users\m1774\AppData\Local\CCB-Wanding\.claude\CLAUDE.md'
$bad = [regex]::Matches($text, '[\x00-\x08\x0B\x0C\x0E-\x1F]')
$bad.Count
```

期望 `$bad.Count` 为 `0`。

6. 验证快捷方式仍指向正确安装目录：

```powershell
$sh = New-Object -ComObject WScript.Shell
$s = $sh.CreateShortcut('C:\Users\m1774\Desktop\CCB-Wanding.lnk')
$s.TargetPath
$s.WorkingDirectory
```

7. 重建安装包：

```powershell
& 'D:\NSIS\makensis.exe' 'D:\Projects\claude-code-best\ccb-installer\installer-wanding.nsi'
```

#### 关键坑：PowerShell here-string 必须用单引号

工具策略 Markdown 里有大量反引号，例如：

```text
`name`
`file_path`
`template_path`
```

如果在 `ensure-wanding-settings.ps1` 里用双引号 here-string：

```powershell
$toolingBody = @"
...
"@
```

PowerShell 会把 Markdown 反引号当成转义符，导致生成的 `CLAUDE.md` 出现控制字符污染，例如：

```text
keywords/\ame
rand
ile_path
	emplate_path
```

正确写法必须是单引号 here-string：

```powershell
$toolingBody = @'
...
'@
```

本次已验证：

```text
C:\Users\m1774\AppData\Local\CCB-Wanding\.claude\CLAUDE.md
ControlCharCount = 0
```

#### 当前 Wanding CLAUDE.md 标准

业务知识段以用户确认版本为准，核心包括：

- 万鼎选型知识库
- 品类语义一致性优先
- 热/冷语义高于来源
- 弯头角度规则
- 主径×副径规则
- 场景型业务规则
- PVC 直管默认 D 排水系列
- 中文回复规则
- 拿不准必须询问

工具策略段必须兼容 direct fill：

- 报价查价用 `mcp__quotation__match_quotation`
- 多品用 `mcp__quotation__match_quotation_batch`
- 库存用 `mcp__quotation__get_inventory_by_code` 或 `mcp__quotation__search_inventory`
- 填写报价单直接用 `mcp__quotation__fill_quotation_sheet`
- 不要先用 `excel-mcp` 手工预填模板单元格
- `code` 有最好，但不是必需；只传 `keywords/name + quantity` 时后端应自动匹配
- 不传 `file_path/template_path` 时使用内置空白标准报价单
- 不传 `output_path` 时保存到桌面 `Wanding-Quotation_<timestamp>.xlsx`

重建后安装包记录：

```text
D:\Projects\claude-code-best\ccb-installer\CCB-Wanding-1.0.3.exe
LastWriteTime: 2026-06-05 17:10:09
Length: 263171352
```

注意：已经打开的 CCB-Wanding 会话不会自动加载新的 `CLAUDE.md`，必须关闭窗口并重新从 `CCB-Wanding.lnk` 启动。
