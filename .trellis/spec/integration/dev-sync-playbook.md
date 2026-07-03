# Dev Sync Playbook — 修改如何进 dev / 是否生效

> **Read this when:**「我改了代码，但 dev 里没变化」「报价结果和 repo 不一致」「旧会话内容乱入」等——先查**同步链**，再查业务逻辑。
>
> **Conceptual map（七层链、build vs HMR、决策树）：** [`dev-runtime-layers.md`](./dev-runtime-layers.md) — **不懂全貌时先读**。
>
> **Related:** [`../frontend/dev-test-ship.md`](../frontend/dev-test-ship.md) § Symptom table · [`route-b-sync.md`](./route-b-sync.md) · [`../backend/build-deploy-verify.md`](../backend/build-deploy-verify.md) · [`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md) §5

---

## 1. 核心原则

**Save ≠ Deploy。** 本仓库有多条独立运行时路径；只改 repo 文件、不跑对应 sync/build，dev 会继续跑**旧副本**。

### Rule 0 — 唯一 dev 主线（2026-06-27，强制）

**所有 dev 启动、smoke、parity 测试只允许一条命令链：**

```powershell
# 日常（已 bootstrap 过；默认 sync repo→vendor）：
.\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap

# 纯 UI 改动、确认不需要 python/data/MCP dist 同步：
.\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap -SkipVendorSync

# 首次 / 怀疑 baseline 陈旧：
.\ccb-installer\scripts\start-dev-full.ps1

# AionCore 刚改完 Rust（默认已 -BuildAioncore；可显式关闭加速）：
.\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap -BuildAioncore
```

**禁止作为 dev 入口（已退役或重定向）：**

| 禁止 | 原因 |
|------|------|
| 裸 `bun run dev` | 无 SSO / 无 route-b sync / 无 vendor sync / 无 aioncore inject |
| `start-aionui-dev.ps1` | 曾 `AIONUI_BYPASS_AUTH=1` → 重定向 `start-dev-full` |
| `start-aionui-dev-work-tasks.ps1` | 旁路 launcher → 重定向 |
| `org-phase0/start-aionui-dev-org-test.ps1` | 缺 bootstrap/route-b → 重定向 |

`start-dev-full.ps1` 固定顺序：**preflight → bootstrap（可选 Skip）→ route-b sync → `sync-dev-wanding-vendor`（默认；`-SkipVendorSync` 跳过）→ `deploy-seed-agents -ForceMd`（含退役 prune）→ `sync-dev-aioncore`（默认 `-Build` + smoke：price-library / work-tasks / org-knowledge 均 401 非 404）→ org SSO env → kill stale → `bun run dev`**。

| 原则 | 说明 |
|------|------|
| **按层同步** | 改哪一层，跑哪条 deploy 链；不要假设「保存后 HMR 全能覆盖」 |
| **dev 数据隔离** | `%APPDATA%\AionUi-Dev\` ≠ `%APPDATA%\AionUi\`（Roaming exe）；会话/DB 不互通 |
| **新会话验证** | ACP session、slash manifest、assistant profile、MCP 冷启动等——**必须新建 conversation** 再 smoke |
| **混合态最危险** | 常见：新 frontend + 旧 route-b + 新 CCB dist + 旧 vendor python → 症状像「随机 bug」 |
| **deploy-seed 同步 keep set** | `deploy-seed-agents -ForceMd` 复制 repo seed → live `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\`；并按 `config/agents/retired-agent-ids.json` **自动 prune** 退役 `.md` / `.aionui.json`（2026-06-30 起 `start-dev-full` 每轮必跑） |
| **Guid 卡片 = live agents 目录** | Renderer 读 `ccbAgentsService.listAgents` → `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\*.md`；与 `%APPDATA%\AionUi-Dev\` SQLite **无关**（CCB authority 路径） |

---

## 2. dev 实际在跑什么（canonical — 仅 start-dev-full）

**唯一启动脚本：** `ccb-installer/scripts/start-dev-full.ps1`（见 §1 Rule 0）。

| 组件 | 来源 |
|------|------|
| Renderer | `aionui-src` HMR `http://localhost:5173/` |
| aioncore | `sync-dev-aioncore.ps1` 注入 `D:\CCB-Wanding\AionUi\resources\bundled-aioncore\win32-x64\`（自编译 `AionCore/target/release`，含 work-tasks + org-knowledge + price-library） |
| Auth | `AIONUI_SSO_MODE=org-idp` + `JWT_SECRET` from `scripts/org-phase0/env.local` |
| Org API | `ORG_SERVER_URL=http://67.216.206.3:13401` |
| ACP / CCB | route-b sync → `managed-tools/acp/.../index.js` → `D:\CCB-Wanding\dist\cli.js` |

~~曾有多脚本并列（`start-aionui-dev` bypass、`work-tasks` 专用、`org-test` 最小）—— **2026-06-27 废止**，全部重定向 canonical launcher。~~

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
| `aionui-src/packages/desktop/src/renderer/**` | ✅ HMR 通常够 | 结构性 import / main / preload → **全量重启**；怀疑缓存 → `start-dev-full.ps1 -Clean` | 改 UI 文案立即可见 |
| `aionui-src/.../process/**`（main/preload） | ❌ | Ctrl+C → 重启 dev | — |
| `ccb-installer/patches/aionui-ccb-route-b/index.js` | ❌ | `sync-aionui-ccb-route-b.ps1` + 杀 aioncore | hash 与 patch 一致（§5） |
| `ccb-installer/patches/aionui-acp/acp-agent.js` | ❌ | **见 §4.1.1** — bundled 已有 marker 时 sync 不会从 repo 拉新；需 **force copy** | live 含 `loadSession replay suppressed`（§5.1） |
| `D:\claude-code-B\src/**` 或 `ccb-installer/claude-code-b-src` | ❌ | `bun run build` → `deploy-claude-code-b-to-wanding.ps1` → route-b sync | `D:\CCB-Wanding\dist\cli.js` mtime |
| `python/inventory/**`, `python/quotation/**`, `python/admin/org_*.py` | ❌ | `sync-dev-wanding-vendor.ps1`（§4.3） | live `admin/org_http_csrf.py` hash = repo |
| `data/*.xlsx`, `data/wanding_business_knowledge.md` | ❌ | robocopy → `CCB-Wanding\vendor\wanding\data`（§4.2） | MCP 查价命中新编码 |
| `mcp_servers/quotation-server/dist/**` | ❌ | robocopy → `vendor\mcp-servers\quotation-server\dist` | quotation MCP 工具行为；含 `append_business_rule`（2026-06-28） |
| `ccb-installer/packages/vertical/com.wanding.trade/agents/quotation-agent.md`（org 知识库写入规则） | ❌ | `deploy-seed-agents.ps1 -ForceMd` + vendor sync + **新会话** | agent 禁止 Edit shadow；追加走 MCP |
| `ccb-installer/config/skills/ccb-subagent-gate/**`（PreToolUse 强制 Read） | ❌ | `deploy-subagent-gate-skill.ps1` + **新会话** | `pre-match-knowledge-gate.py` 存在；`modes.json` → `quotation-agent:knowledge` = **block** |
| `AionCore/crates/**` | ❌ | 重启 **`start-dev-full.ps1 -SkipBootstrap`**（默认 `-BuildAioncore`） | sync smoke：work-tasks + org-knowledge **401** |
| `AionCore` **CCB profile `acp_meta` passthrough** | ❌ | 同上；fork 必须把 `extra.acp_meta` 打进 `session/new` `_meta` | CCB log: `session profile id from session meta: word-creator`（非 handoff） |
| `ccb-installer/config/agents/**`（keep set / 退役） | ❌ | `start-dev-full.ps1` 内建 `deploy-seed-agents -ForceMd`（含 prune）；单独改 agent 也可手动跑同命令 | Guid **5** 张预设卡（见 `agents-unified-model.md` §713） |
| `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\*.md` | ❌ | `deploy-seed-agents.ps1` 或手动复制 | **新建** Guid 卡片会话 |
| `.trellis/spec/**` | — | 不影响运行时 | — |

### 3.2 组合场景（常见遗漏）

| 场景 | 遗漏点 |
|------|--------|
| 修了 match_quotation / 0.6MPa 候选 | 只改 repo python，**未跑 `sync-dev-wanding-vendor.ps1`** |
| Agent 改了 shadow `wanding_business_knowledge.md` | 只影响本机；fleet 需 `#/org-knowledge` 或 MCP `append_business_rule` — 见 [`org-knowledge.md`](./org-knowledge.md) § Common mistakes |
| 更新了价格库 xlsx | 文件在 `claude-code-best/data/`，**vendor/data 无文件** |
| 今天 build 了 CCB dist | **未跑 route-b sync** → ACP 槽仍昨天 |
| 修了 idle 旧消息 replay | 只改 aionui-src，**未 -Clean 重启** 或仍用**旧 conversation_id** |
| 修了 greeting 重复 | 需 CCB `agent.ts` deploy；前端 dedup 只是 interim |
| repo 已退役 agent（如 cowork）但 Guid 仍显示 | live agents 未 prune；或 dev 未走 `start-dev-full` 主线 | 跑 `deploy-seed-agents.ps1 -ForceMd` 或完整 `start-dev-full.ps1`（§4.7） |

---

## 4. 标准同步命令

### 4.1 停进程

```powershell
Get-Process electron,aioncore -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
```

### 4.1.1 `acp-agent.js` 强制同步（2026-06-29）

`sync-aionui-ccb-route-b.ps1` 在 bundled `acp-agent.js` 已含 `CCB_WANDING_QUERY_NEXT_TIMEOUT_DEFAULT_MS` 时，**以 bundled 为 source**，不会自动应用 repo `patches/aionui-acp/acp-agent.js` 的新增 marker。改 WanD acp-agent patch 后必须 force copy：

```powershell
$repoPatch = "D:\Projects\claude-code-best\ccb-installer\patches\aionui-acp\acp-agent.js"
$distRel = "managed-resources\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\acp-agent.js"
$pkgRel  = "runtime\managed-tools\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\acp-agent.js"
@(
  "D:\CCB-Wanding\AionUi\resources\bundled-aioncore\win32-x64\$distRel",
  "$env:APPDATA\AionUi\aionui\$pkgRel",
  "$env:APPDATA\AionUi-Dev\aionui\$pkgRel"
) | ForEach-Object { if (Test-Path (Split-Path $_ -Parent)) { Copy-Item $repoPatch $_ -Force } }
.\ccb-installer\scripts\sync-aionui-ccb-route-b.ps1 -InstallDir D:\CCB-Wanding
Get-Process aioncore,aionui-web -ErrorAction SilentlyContinue | Stop-Process -Force
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

- 将 `python/` → `D:\CCB-Wanding\vendor\wanding\python\`（robocopy；排除 `tests` / `tools` 等，与 ship 对齐）
- 复制 `data/`：**所有 `*.md`（denylist 除外）+ 所有 `*.xlsx`** — 与 `build-wanding.ps1` staging 同规则；实现于 `ccb-installer/scripts/lib/sync-wanding-data.ps1`
- 同步 `mcp_servers/quotation-server/dist`
- `-UpdateSettings`：刷新 `%LOCALAPPDATA%\CCB-Wanding\.claude\settings.json`（去掉旧 `LEGACY_PRICE_LIBRARY_PATH` 等）；写入 `AIONUI_APPDATA_PROFILE` + profile-scoped `ORG_SESSION_TOKEN_FILE`（dev 由 `start-dev-full` 设为 `AionUi-Dev`）
- `-Smoke`：用 live vendor python 跑 `HDPE 0.6MPa dn125 6M` → 期望 `8010036693`

与 [`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md) §5.3–5.4 一致的手动 robocopy（脚本失败时 fallback）：

```powershell
$src = "D:\Projects\claude-code-best"
$dst = "D:\CCB-Wanding\vendor"

# Python（排除测试）
robocopy "$src\python" "$dst\wanding\python" /E /XD tests __pycache__ .pytest_cache /XF test_*.py smoke_*.py _tmp_*.txt

# 业务数据（与 build-wanding 同规则：denylist md + 全 xlsx；脚本优先）
# 手动 fallback 见 sync-dev-wanding-vendor.ps1 + lib/sync-wanding-data.ps1

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
D:\Projects\claude-code-best\ccb-installer\scripts\start-dev-full.ps1 -Clean
# 或 work-tasks 专用：
# D:\Projects\claude-code-best\ccb-installer\scripts\start-dev-full.ps1
```

### 4.6 一键「全层对齐」（日常推荐）

**2026-06-30：** `start-dev-full.ps1` **默认**调用 `sync-dev-wanding-vendor.ps1`（route-b 之后、aioncore 之前）。日常只需：

```powershell
.\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap
```

纯 UI、不需要 vendor 对齐时：`-SkipVendorSync`。`start-dev-full` **默认** `-VendorUpdateSettings`（刷新 `ccb-mcp.json` / org MCP env / **`AIONUI_APPDATA_PROFILE`** 等）。需要 org_api + supplier 断言：加 `-VendorSmoke`。

**Org JWT profile（2026-07-02）：** `start-dev-full` 在 vendor sync 前设置 `$env:AIONUI_APPDATA_PROFILE = 'AionUi-Dev'`；`-UpdateSettings` 写入 quotation MCP env，使 Python `org_session` 读 Dev `org-session.token`（非 stale Prod）。改 MCP env 后须 **新开 Guid 会话**。详见 [`org-knowledge.md`](./org-knowledge.md) § MCP `org_session` profile contract。

**手动分层**（脚本失败或只需 vendor 时）仍可用 §4.1 → §4.2 → §4.3 → §4.5（§4.4 仅 AionCore 有改动时）：

```powershell
Get-Process electron,aioncore -ErrorAction SilentlyContinue | Stop-Process -Force
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\sync-dev-wanding-vendor.ps1 -UpdateSettings -Smoke
# 若 route-b / CCB dist 有改动再加：
# .\ccb-installer\scripts\deploy-claude-code-b-to-wanding.ps1 -Backup
# .\ccb-installer\scripts\sync-aionui-ccb-route-b.ps1 -RestartAionUiWeb
.\ccb-installer\scripts\start-dev-full.ps1 -Clean
```

### 4.7 Agent keep-set 退役 / Guid 卡片对齐（2026-06-27；自动 prune 2026-06-30）

**触发：** repo `ccb-installer/config/agents/` 或 `CCB_WANDING_KEEP_AGENT_IDS` 删了 agent（例：`cowork`、`word-form-creator`），但 dev Guid 仍显示旧卡片（7 张而非 5 张）。

**原因链（历史）：**

```text
repo config/agents/          live .claude/agents/           Guid UI
  (无 cowork.md)      ≠        cowork.md 仍在          →    仍显示 Cowork
       │                            ▲
       └── deploy-seed（旧）────────┘  只 copy/skip，不 unlink
```

**主线（2026-06-30 起）：** `deploy-seed-agents.mjs` 读取 `config/agents/retired-agent-ids.json`，每次 deploy 后 **自动 prune** live 目录中的退役 `.md` / `.aionui.json`。`start-dev-full.ps1` **每轮**在 vendor sync 之后执行 `deploy-seed-agents.ps1 -ForceMd`（含 `-SkipBootstrap` 路径）。

**当前 keep set（Guid 预设 5 卡）：** `quotation-agent`、`accurate-agent`、`word-creator`、`ppt-creator`、`excel-creator`（`wande-orchestrator` 隐藏，默认会话路由）。详见 [`agents-unified-model.md`](./agents-unified-model.md) §613–618、§713。

**退役列表（单一真相源）：** `ccb-installer/config/agents/retired-agent-ids.json` — 新增退役 id 时更新此文件 + `config/agents/README.md` + AionUI `CCB_WANDING_KEEP_AGENT_IDS`（`ccbAgentCatalog.ts`）。

**标准修复（dev，无需 cargo test）：**

```powershell
# 推荐：走完整主线（含 prune + route-b + vendor）
.\ccb-installer\scripts\start-dev-full.ps1 -SkipBootstrap

# 仅对齐 agent 卡片（不停 dev 也可先跑）：
.\ccb-installer\scripts\deploy-seed-agents.ps1 -ForceMd
```

**手动兜底（deploy 脚本不可用时）：**

```powershell
$agents = "$env:LOCALAPPDATA\CCB-Wanding\.claude\agents"
@('cowork', 'word-form-creator') | ForEach-Object {
  Remove-Item "$agents\$_.md", "$agents\$_.aionui.json" -ErrorAction SilentlyContinue
}
D:\CCB-Wanding\vendor\bun\bun.exe .\ccb-installer\scripts\deploy-seed-agents.mjs --force-md
```

**验证：** Guid「选择助手」仅 **5** 张业务/办公预设卡 +「+」；无 Cowork、无可填表单助手。

**可选（prune 未删净时）：** 在 AionUI settings storage 清 `migration.ccbWandingPrunePresets_v2`，冷启动让 `pruneBundledAgentsNotInKeepSetV2WithFlag` 再跑；通常 **deploy-seed-agents -ForceMd 即可**。

**不要依赖：** 仅 bootstrap Quick 模式内的单次 deploy — 用 `-SkipBootstrap` 时须依赖 `start-dev-full` 内建 deploy 步骤（2026-06-30 起已内建）。

### 4.8 Org HTTP / 知识库 / unified SSO（Electron dev，2026-06-27）

**触发：** 主登录成功、Guid 可用，但 `#/org-knowledge` 仍提示从主登录页登录。

**原因：** Dev renderer（`localhost:5173`）对 org VPS 的 browser `fetch` 会被 CORS 拦截。以下路径必须走 **`orgRawFetch` / `orgHttpRequest`（main IPC `org-http-request`）**：

| 路径 | 模块 |
|------|------|
| `POST /login` | `orgAuthLogin` → `orgRawFetch` |
| `GET /api/auth/user` | `OrgAuthContext` → `orgRawFetch` |
| `/api/org-knowledge/*` | `ipcBridge.orgKnowledge` → `orgHttpGet/Put/Post` |

**验证：** 重启 `start-dev-full.ps1` → 登录 → 侧栏知识库应进入编辑器。详见 [`org-knowledge.md`](./org-knowledge.md)。

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

# acp-agent patch（06-19 backflow fix markers）
$repoAgent = "D:\Projects\claude-code-best\ccb-installer\patches\aionui-acp\acp-agent.js"
$liveAgent = "$env:APPDATA\AionUi-Dev\aionui\runtime\managed-tools\acp\claude-agent-acp\0.39.0\win32-x64\node_modules\@agentclientprotocol\claude-agent-acp\dist\acp-agent.js"
"acp-agent repo/live hash: $((Get-FileHash $repoAgent).Hash.Substring(0,16)) / $((Get-FileHash $liveAgent).Hash.Substring(0,16))"
Select-String -LiteralPath $liveAgent -Pattern 'loadSession replay suppressed','tearing down dirty' -Quiet

# CCB transcript trim（在 chunk 内，非 cli.js 字面量）
Select-String -Path D:\CCB-Wanding\dist\chunk-*.js -Pattern 'trimMessagesToCompleteTurnBoundary' -Quiet | Select-Object -First 1

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
| 3b | **新会话** `你好` → `查询直接50报价` → `很好` | 第三条**仅**新回复；无 greeting+旧表拼接（task `06-19`） |
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
| `ccb-installer/patches/aionui-ccb-route-b/index.js` | **3** 个 canonical sync 目标（见 [`route-b-sync.md`](./route-b-sync.md) §2；legacy acp-agent-only 另见 §2b） |
| `D:\claude-code-B\dist\` | `D:\CCB-Wanding\dist\` |
| `python/` | `D:\CCB-Wanding\vendor\wanding\python\` |
| `data/*.xlsx`, `data/*.md`（业务） | `D:\CCB-Wanding\vendor\wanding\data\` |
| `mcp_servers/quotation-server/dist/` | `D:\CCB-Wanding\vendor\mcp-servers\quotation-server\dist\` |
| `AionCore/target/release/aioncore.exe` | dev PATH（`start-dev-full.ps1` 前置） |
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
| Guid 仍显示已退役助手（Cowork / 可填表单等） | **live agents 未删** — 跑 **§4.7** |
| 主登录 OK；知识库要「去登录」 | org HTTP 仍 renderer `fetch` — **§4.8**；重启 dev |

完整表：[`../frontend/dev-test-ship.md`](../frontend/dev-test-ship.md) §4。

---

## 8. 与 release / 安装包的关系

| 环境 | 数据目录 | 更新方式 |
|------|----------|----------|
| `bun run dev` | `%APPDATA%\AionUi-Dev\` | 本节 playbook |
| Roaming exe | `%APPDATA%\AionUi\` | `dist:win` + 覆盖安装槽；route-b target **#2**（[`route-b-sync.md`](./route-b-sync.md) §2） |
| NSIS 安装版 | `$INSTALL` under Program Files | [`wanding-packaging-whitelist.md`](./wanding-packaging-whitelist.md) staging |

dev 验证通过后再 `bun run dist:win`；不要每次 UI 小改都打包。

---

## 9. 维护

- **claude-agent-acp 版本 bump** → 更新 `sync-aionui-ccb-route-b.ps1` 内 `$relativeDist`，并刷新本节 §5.1 路径。
- **新增 vendor 数据文件** → 更新 §4.3 robocopy 列表 + packaging whitelist §5.4。
- **新增 dev 启动脚本** → 更新 §2 表格。
- **Agent keep set 变更 / 退役** → 更新 `config/agents/retired-agent-ids.json` + §4.7 + [`agents-unified-model.md`](./agents-unified-model.md) §613。
- **Org HTTP / 知识库 dev CORS** → §4.8 + [`org-knowledge.md`](./org-knowledge.md)。

**Recorded:** 2026-06-18 — 由「repo 修改未进 dev / 报价 python 落后 10 天 / route-b MISMATCH」排查沉淀；Problem B 加固见 [`../frontend/chat-acp-flow.md`](../frontend/chat-acp-flow.md) § Idle resume hardening。

**Recorded:** 2026-06-30 — **Agent keep-set 自动 prune：** `deploy-seed-agents.mjs` 读 `retired-agent-ids.json` 删 live 退役文件；`start-dev-full.ps1` 每轮 `-ForceMd` deploy（含 `-SkipBootstrap`）。退役列表：`cowork`、`word-form-creator`。Guid 验证：5 预设卡。

**Recorded:** 2026-06-27 — §4.7 agent keep-set 退役同步（历史）：`deploy-seed-agents` 曾只增不删；Guid 7 卡 vs spec 5 卡 → 曾需手动删 live 退役文件。

**Recorded:** 2026-06-27 — §4.8 org HTTP IPC：`OrgAuthContext` + `ipcBridge.orgKnowledge` 对齐 `orgRawFetch`；修复 dev 知识库「请从主登录页登录」误报。

**Recorded:** 2026-06-27 — **aioncore 接线恢复**：`aionui-work-tasks` + `aionui-org-knowledge` 重新加入 workspace 与 `aionui-app` router（此前 crate 在磁盘但未编入 binary → `/tasks` 与 VPS `/api/org-knowledge` 均 404）。本地：`sync-dev-aioncore.ps1 -Build` smoke 期望 work-tasks / org-knowledge 返回 **401**（非 404）。**VPS 2026-06-27 verified：** 手动/修复后 `tar -xzf` + `cargo build` (~18 min) → 三路 **401**；`deploy-org-aioncore-vps.ps1` 解压 bug 已修（`&&` + post-grep）。详见 [`price-library.md`](./price-library.md) § Common mistakes、[`../../../scripts/org-phase0/vps-org-api-deploy-checklist.md`](../../../scripts/org-phase0/vps-org-api-deploy-checklist.md)。

**Recorded:** 2026-06-28 — **VPS price library fleet：** active **v2 / 3082** products（41-field full schema）；admin `POST` 需 CSRF（`price-library.md` § VPS CSRF）；勿用 `/opt/aionorg/bin/aioncore`；验收 `version_number >= 2` + `len(products) == 3082`。

**Recorded:** 2026-06-28 — **Org knowledge agent write：** MCP `append_business_rule` 接线；`quotation-agent` shadow 只读；部署链 `sync-dev-wanding-vendor.ps1` + `deploy-seed-agents.ps1 -ForceMd`。详见 [`org-knowledge.md`](./org-knowledge.md) § Common mistakes、task [`06-28-org-knowledge-agent-write-path`](../../tasks/06-28-org-knowledge-agent-write-path/)。

**Recorded:** 2026-06-29 — **`match_price_and_get_inventory` retired from agent surface：** L1/maint 曾推荐未注册 MCP 工具 → `No such tool available`。价+库存改 `match_quotation` → `get_inventory_by_code`（多品 batch + `get_inventory_by_code_batch`）。Spec：[`agents-unified-model.md`](./agents-unified-model.md) § Quotation price+stock routing；[`mcp-business.md`](../backend/mcp-business.md) § Not MCP-exposed。部署：`deploy-seed-agents.ps1 -ForceMd` + **新 Guid 会话**。

**Recorded:** 2026-06-29 — **Route-B 截图询价 vision 断链：** `agent.prompt()` 曾用 `promptToQueryInput`（丢 `type:image`）→ MiniMax M3 拒读图。Fix：`promptToSubmitInput` + `isEmptyPromptSubmitInput`（`ccb-installer/src/services/acp/`）；`quotation-agent.md` §图片/截图询价。部署：`sync-claude-code-b-mcp-prefetch.ps1 -Build -Deploy` + `deploy-seed-agents.ps1 -ForceMd` + **新 Guid 会话**。Spec：[`agents-unified-model.md`](./agents-unified-model.md) § Quotation image inquiry；[`acp-session-flow.md`](../backend/acp-session-flow.md) § Capability parity audit。

**Recorded:** 2026-06-29 — **ACP prompt parity（HTTP 图 + embeddedContext）：** `promptConversion.ts` 对齐 `acp-agent.js` — `image.uri` http → url source；`resource.text` + uri → `[@name](uri)` + `<context ref>`。测试 `promptConversion.test.ts`（14 cases overlay / 31 claude-code-B gate）。部署：`sync-claude-code-b-mcp-prefetch.ps1 -Build` + `deploy-claude-code-b-to-wanding.ps1`（无 `-Backup` 若磁盘满）+ **新 Guid 会话**。

**Recorded:** 2026-06-29 — **Org knowledge MCP CSRF：** `append_business_rule` PUT 需 VPS double-submit（`GET /api/auth/status` → `aionui-csrf-token` + `x-csrf-token`）；见 [`org-knowledge.md`](./org-knowledge.md) § Mutating writes。部署：`sync-dev-wanding-vendor.ps1` → **重启 dev** + **新会话**（MCP 子进程不热加载 vendor python）。

**Recorded:** 2026-06-29 — **Post-idle replay backflow（task `06-19`）：** … **Operator (2026-06-30)：** 用户 dev 验证「可能真的修好了」。

**Recorded:** 2026-06-30 — **Ship `CCB-Wanding-1.1.3.exe`（未外发重打）：** `ccb-installer\CCB-Wanding-1.1.3.exe` ~851 MB；AionUI fresh `electron-builder --dir` + `build-wanding.ps1 -SkipBuild -SkipAionUiBuild -AioncorePath AionCore\target\release\aioncore.exe`；staging validation OK；acp-agent `loadSession replay suppressed` in bundle。BUILD-INFO: ccb `e3bffd10`, aionui `1bc621b`。Log: `ccb-installer\build-1.1.3-staging.log`。
