# Dev Sync Playbook — 修改如何进 dev / 是否生效

> **Read this when:**「我改了代码，但 dev 里没变化」「报价结果和 repo 不一致」「旧会话内容乱入」等——先查**同步链**，再查业务逻辑。
>
> **Conceptual map（七层链、build vs HMR、决策树）：** [`dev-runtime-layers.md`](./dev-runtime-layers.md) — **不懂全貌时先读**。
>
> **Related:** [`../frontend/dev-test-ship.md`](../frontend/dev-test-ship.md) § Symptom table · [`route-b-sync.md`](./route-b-sync.md) · [`../backend/build-deploy-verify.md`](../backend/build-deploy-verify.md) · [`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md) §5

---

## 1. 核心原则

**Save ≠ Deploy。** 本仓库有多条独立运行时路径；只改 repo 文件、不跑对应 sync/build，dev 会继续跑**旧副本**。

| 原则 | 说明 |
|------|------|
| **按层同步** | 改哪一层，跑哪条 deploy 链；不要假设「保存后 HMR 全能覆盖」 |
| **dev 数据隔离** | `%APPDATA%\AionUi-Dev\` ≠ `%APPDATA%\AionUi\`（Roaming exe）；会话/DB 不互通 |
| **新会话验证** | ACP session、slash manifest、assistant profile、MCP 冷启动等——**必须新建 conversation** 再 smoke |
| **混合态最危险** | 常见：新 frontend + 旧 route-b + 新 CCB dist + 旧 vendor python → 症状像「随机 bug」 |

---

## 2. dev 实际在跑什么（2026-06-18 实测模板）

启动方式决定 backend 解析顺序：

| 启动脚本 | aioncore 来源 | 典型用途 |
|----------|---------------|----------|
| `ccb-installer/scripts/start-aionui-dev.ps1` | PATH：`AionCore/target/release` **优先**，其次 bundled | 默认 dev；work-tasks 需 fork |
| `scripts/start-aionui-dev-work-tasks.ps1` | 仅自编译 fork | `/tasks` + config-options smoke |
| 手动 `bun run dev`（未设 PATH） | 可能找不到 aioncore 或落到错误 binary | ❌ 不推荐 |

**四层运行时链（AionUI dev 发消息时）：**

```text
AionUI renderer (aionui-src, HMR)
  → aioncore.exe (PATH 上第一个)
  → managed-tools/acp/claude-agent-acp/<ver>/.../dist/index.js  ← route-b patch
  → D:\CCB-Wanding\dist\cli.js --acp
  → MCP: quotation / accurate / excel …
       → PYTHONPATH: D:\CCB-Wanding\vendor\wanding\python
       → data:      D:\CCB-Wanding\vendor\wanding\data\
```

**关键：** `claude-code-best/python/` 和 `claude-code-best/data/` **不会**自动进入 MCP；必须同步到 `D:\CCB-Wanding\vendor\wanding\`（dev）或 `$INSTALL\vendor\wanding\`（装后 Programs 槽 — 见 [`wanding-first-ship.md`](./wanding-first-ship.md) §1.1）。

---

## 3. 改了什么 → 必须做什么

### 3.1 速查表

| 你改的路径 / 内容 | 仅 save 是否够 | 必须额外步骤 | 验证方式 |
|-------------------|----------------|--------------|----------|
| `aionui-src/packages/desktop/src/renderer/**` | ✅ HMR 通常够 | 结构性 import / main / preload → **全量重启**；怀疑缓存 → `start-aionui-dev.ps1 -Clean` | 改 UI 文案立即可见 |
| `aionui-src/.../process/**`（main/preload） | ❌ | Ctrl+C → 重启 dev | — |
| `ccb-installer/patches/aionui-ccb-route-b/index.js` | ❌ | `sync-aionui-ccb-route-b.ps1` + 杀 aioncore | hash 与 patch 一致（§5） |
| `D:\claude-code-B\src/**` 或 `ccb-installer/claude-code-b-src` | ❌ | `bun run build` → `deploy-claude-code-b-to-wanding.ps1` → route-b sync | `D:\CCB-Wanding\dist\cli.js` mtime |
| `python/inventory/**`, `python/quotation/**` | ❌ | robocopy → `CCB-Wanding\vendor\wanding\python`（§4.2） | live `inventory_agent_tools.py` mtime |
| `data/*.xlsx`, `data/wanding_business_knowledge.md` | ❌ | robocopy → `CCB-Wanding\vendor\wanding\data`（§4.2） | MCP 查价命中新编码 |
| `mcp_servers/quotation-server/dist/**` | ❌ | robocopy → `vendor\mcp-servers\quotation-server\dist` | quotation MCP 工具行为 |
| `AionCore/crates/**` | ❌ | `build-aioncore-work-tasks.cmd` + 重启 dev | `where aioncore` → fork path |
| `AionCore` **CCB profile `acp_meta` passthrough** | ❌ | 同上；fork 必须把 `extra.acp_meta` 打进 `session/new` `_meta` | CCB log: `session profile id from session meta: word-creator`（非 handoff） |
| `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\*.md` | ❌ | `deploy-seed-agents.ps1` 或手动复制 | **新建** Guid 卡片会话 |
| `.trellis/spec/**` | — | 不影响运行时 | — |

### 3.2 组合场景（常见遗漏）

| 场景 | 遗漏点 |
|------|--------|
| 修了 match_quotation / 0.6MPa 候选 | 只改 repo python，**未跑 `sync-dev-wanding-vendor.ps1`** |
| 更新了价格库 xlsx | 文件在 `claude-code-best/data/`，**vendor/data 无文件** |
| 今天 build 了 CCB dist | **未跑 route-b sync** → ACP 槽仍昨天 |
| 修了 idle 旧消息 replay | 只改 aionui-src，**未 -Clean 重启** 或仍用**旧 conversation_id** |
| 修了 greeting 重复 | 需 CCB `agent.ts` deploy；前端 dedup 只是 interim |

---

## 4. 标准同步命令

### 4.1 停进程

```powershell
Get-Process electron,aioncore -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
```

### 4.2 CCB 后端 + route-b

```powershell
# 若 claude-code-B 有改动，先 build（OOM 见 build-deploy-verify.md §1）
# cd D:\claude-code-B; bun run build

cd D:\Projects\claude-code-best
.\ccb-installer\scripts\deploy-claude-code-b-to-wanding.ps1 -Backup
.\ccb-installer\scripts\sync-aionui-ccb-route-b.ps1 -RestartAionUiWeb
```

### 4.3 万鼎 Python + 数据 + quotation MCP

**推荐一键脚本（2026-06-18）：**

```powershell
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\sync-dev-wanding-vendor.ps1 -UpdateSettings -Smoke
```

- 将 `python/` → `D:\CCB-Wanding\vendor\wanding\python\`
- 复制 `data/` 业务文件（含 `price_library_cleaned_2026_05_15.xlsx`）
- 同步 `mcp_servers/quotation-server/dist`
- `-UpdateSettings`：刷新 `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json`（去掉旧 `LEGACY_PRICE_LIBRARY_PATH` 等）
- `-Smoke`：用 live vendor python 跑 `HDPE 0.6MPa dn125 6M` → 期望 `8010036693`

与 [`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md) §5.3–5.4 一致的手动 robocopy（脚本失败时 fallback）：

```powershell
$src = "D:\Projects\claude-code-best"
$dst = "D:\CCB-Wanding\vendor"

# Python（排除测试）
robocopy "$src\python" "$dst\wanding\python" /E /XD tests __pycache__ .pytest_cache /XF test_*.py smoke_*.py _tmp_*.txt

# 业务数据（按需增删文件名）
robocopy "$src\data" "$dst\wanding\data" `
  price_library_cleaned_2026_05_15.xlsx `
  wanding_price_lib.xlsx `
  mapping_table.xlsx `
  wanding_business_knowledge.md `
  ccb-wanding-quotation.md

# Quotation MCP dist
robocopy "$src\mcp_servers\quotation-server\dist" "$dst\mcp-servers\quotation-server\dist" /E
```

> **Note:** `robocopy` 退出码 ≥8 才算失败；1–7 表示部分复制成功。

### 4.4 AionCore fork（可选）

```powershell
D:\Projects\claude-code-best\scripts\build-aioncore-work-tasks.cmd
```

### 4.5 重启 dev

```powershell
D:\Projects\claude-code-best\ccb-installer\scripts\start-aionui-dev.ps1 -Clean
# 或 work-tasks 专用：
# D:\Projects\claude-code-best\scripts\start-aionui-dev-work-tasks.ps1
```

### 4.6 一键「全层对齐」（日常推荐）

按顺序执行 §4.1 → §4.2 → **§4.3 `sync-dev-wanding-vendor.ps1 -UpdateSettings -Smoke`** → §4.5（§4.4 仅 AionCore 有改动时）。

```powershell
Get-Process electron,aioncore -ErrorAction SilentlyContinue | Stop-Process -Force
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\sync-dev-wanding-vendor.ps1 -UpdateSettings -Smoke
# 若 route-b / CCB dist 有改动再加：
# .\ccb-installer\scripts\deploy-claude-code-b-to-wanding.ps1 -Backup
# .\ccb-installer\scripts\sync-aionui-ccb-route-b.ps1 -RestartAionUiWeb
.\ccb-installer\scripts\start-aionui-dev.ps1 -Clean
```

---

## 5. 生效验证（改完必做）

### 5.1 路径 / 版本指纹

```powershell
# aioncore 实际用哪个
Get-Process aioncore -ErrorAction SilentlyContinue | Select-Object Path, StartTime

# route-b patch vs dev 运行时
$patch = "D:\Projects\claude-code-best\ccb-installer\patches\aionui-ccb-route-b\index.js"
$live  = "$env:APPDATA\AionUi-Dev\aionui\runtime\managed-tools\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\index.js"
"patch: $((Get-FileHash $patch).Hash.Substring(0,16)) $(Get-Item $patch).LastWriteTime"
"live:  $((Get-FileHash $live).Hash.Substring(0,16))  $(Get-Item $live).LastWriteTime"
# 两者 hash 前缀应一致

# Python 是否落后
"repo:  $((Get-Item D:\Projects\claude-code-best\python\inventory\services\inventory_agent_tools.py).LastWriteTime)"
"live:  $((Get-Item D:\CCB-Wanding\vendor\wanding\python\inventory\services\inventory_agent_tools.py).LastWriteTime)"

# 价格库是否在 vendor
Test-Path D:\CCB-Wanding\vendor\wanding\data\price_library_cleaned_2026_05_15.xlsx
```

### 5.2 业务 smoke（新建万鼎报价会话）

| # | 操作 | 期望 |
|---|------|------|
| 1 | Guid → 万鼎报价专家 → **新会话** | 无旧会话 PE 询价内容 |
| 2 | `HDPE 0.6MPa dn125 6M` | 命中 `8010036693`（python+data 已 sync） |
| 3 | idle 5min 后再发一条 | 无旧 assistant 块 replay（renderer fix + 新 turn） |
| 4 | `/` 菜单 | 除 shell 外有 CCB 命令（warmup 完成后再试） |

### 5.3 日志关键字

| 日志 | 含义 |
|------|------|
| `[warmupConversation] reuse_inflight` | 复用 warmup（Guid 首条正常） |
| `force: true` before send | idle 后发消息应走 force warmup |
| `[useAcpMessage] dropped stale turn stream message` | renderer 丢弃旧 turn 事件 |
| `[ccb-acp-mcp] loaded … quotation` | CCB MCP 加载成功 |

---

## 6. Repo → Live 路径映射

| Repo（编辑） | Live（运行时读取） |
|--------------|-------------------|
| `D:\Projects\aionui-src\` | dev：Vite HMR；ship：`dist:win` → Roaming |
| `ccb-installer/patches/aionui-ccb-route-b/index.js` | 5 个 sync 目标（见 `route-b-sync.md` §2） |
| `D:\claude-code-B\dist\` | `D:\CCB-Wanding\dist\` |
| `python/` | `D:\CCB-Wanding\vendor\wanding\python\` |
| `data/*.xlsx`, `data/*.md`（业务） | `D:\CCB-Wanding\vendor\wanding\data\` |
| `mcp_servers/quotation-server/dist/` | `D:\CCB-Wanding\vendor\mcp-servers\quotation-server\dist\` |
| `AionCore/target/release/aioncore.exe` | dev PATH（`start-aionui-dev.ps1` 前置） |
| `ccb-installer/config/agents/` | `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\` |

**MCP settings 引用（只读确认）：**

```text
%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json
  → mcpServers.quotation.command → vendor\mcp-servers\quotation-server\dist\index.js
  → env.PYTHONPATH → vendor\wanding\python
```

---

## 7. 症状 → 最可能「未 sync 层」

| 症状 | 先查哪层 |
|------|----------|
| UI 改了无变化 | aionui-src HMR / 是否改 main / 是否 -Clean |
| 仍是 vanilla Claude Code | route-b **MISMATCH** |
| quotation MCP Tool not found | CCB dist + route-b + **新会话** |
| 查价缺编码 / 0.6MPa 不存在 | **vendor python + data 未 sync** |
| 旧对话块插入新回答 | aionui-src renderer（`hooks.ts` / `useAcpMessage.ts`）+ **新会话** |
| `/tasks` API 不可用 | bundled aioncore → 换 fork + rebuild |
| Guid 仍像 WanD 而非 Word/Excel preset | agent seed + profile handoff + **新 preset 会话** |

完整表：[`../frontend/dev-test-ship.md`](../frontend/dev-test-ship.md) §4。

---

## 8. 与 release / 安装包的关系

| 环境 | 数据目录 | 更新方式 |
|------|----------|----------|
| `bun run dev` | `%APPDATA%\AionUi-Dev\` | 本节 playbook |
| Roaming exe | `%APPDATA%\AionUi\` | `dist:win` + 覆盖安装槽；route-b target #4 |
| NSIS 安装版 | `$INSTALL` under Program Files | [`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md) staging |

dev 验证通过后再 `bun run dist:win`；不要每次 UI 小改都打包。

---

## 9. 维护

- **claude-agent-acp 版本 bump** → 更新 `sync-aionui-ccb-route-b.ps1` 内 `$relativeDist`，并刷新本节 §5.1 路径。
- **新增 vendor 数据文件** → 更新 §4.3 robocopy 列表 + packaging whitelist §5.4。
- **新增 dev 启动脚本** → 更新 §2 表格。

**Recorded:** 2026-06-18 — 由「repo 修改未进 dev / 报价 python 落后 10 天 / route-b MISMATCH」排查沉淀；Problem B 加固见 [`../frontend/chat-acp-flow.md`](../frontend/chat-acp-flow.md) § Idle resume hardening。
